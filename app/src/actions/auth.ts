"use server";

import { randomUUID } from "node:crypto";
import { AuditAction, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { createAdminAuditLog } from "@/src/lib/audit";
import { AUTH_COOKIE_NAME, getCurrentUser, hashSessionToken } from "@/src/lib/auth";
import { generateToken, verifyToken } from "@/src/lib/jwt";
import { prisma } from "@/src/lib/prisma";
import { checkRateLimit, getRateLimitErrorMessage } from "@/src/lib/rate-limit";
import { assertSameOrigin, getRequestSecurityContext, hashIdentifier } from "@/src/lib/security-request";
import { emitSecurityEvent } from "@/src/lib/security-events";
import { ACCOUNT_LOCK_MS, LOGIN_FAILURE_LIMIT, isAccountLocked, shouldLockAccount } from "@/src/lib/auth-policy";
import { LoginInput, LoginSchema, RegisterInput, RegisterSchema } from "@/src/types";

const SESSION_ABSOLUTE_SECONDS = Number(process.env.SESSION_ABSOLUTE_TIMEOUT_SECONDS ?? "28800");
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = LOGIN_FAILURE_LIMIT;
const LOGIN_IP_LIMIT = 20;
const REGISTER_LIMIT = 5;
const GENERIC_LOGIN_ERROR = "Email hoặc mật khẩu không đúng.";
// Valid bcrypt cost-12 hash used only to equalize unknown-account timing.
const DUMMY_PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx8V8Yx7pG3QG2Yf9Pq5VhVjP2e";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function runtimeError(error: unknown) {
  console.error("[Auth Action] runtime failure", error instanceof Error ? error.name : "unknown");
  return { success: false as const, error: { _errors: ["Không thể xử lý xác thực. Vui lòng thử lại sau."] } };
}

async function setAuthCookie(user: { id: string; email: string; role: UserRole; sessionVersion: number }) {
  const sessionId = randomUUID();
  const context = await getRequestSecurityContext();
  const token = generateToken(
    { userId: user.id, email: user.email, role: user.role, sessionId, sessionVersion: user.sessionVersion },
    SESSION_ABSOLUTE_SECONDS,
  );

  await prisma.authSession.create({
    data: {
      id: sessionId,
      profileId: user.id,
      tokenHash: hashSessionToken(token),
      sessionVersion: user.sessionVersion,
      expiresAt: new Date(Date.now() + SESSION_ABSOLUTE_SECONDS * 1000),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_ABSOLUTE_SECONDS,
  });
}

export async function register(data: RegisterInput) {
  try {
    await assertSameOrigin();
    const parsed = RegisterSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.format() };

    const email = normalizeEmail(parsed.data.email);
    const context = await getRequestSecurityContext();
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit(`register:ip:${context.ipKey}`, { limit: REGISTER_LIMIT, windowMs: AUTH_WINDOW_MS }),
      checkRateLimit(`register:account:${hashIdentifier(email)}`, { limit: REGISTER_LIMIT, windowMs: AUTH_WINDOW_MS }),
    ]);
    const denied = [ipLimit, emailLimit].find((result) => !result.allowed);
    if (denied && !denied.allowed) return { success: false, error: { _errors: [getRateLimitErrorMessage(denied)] } };

    const existing = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
    if (existing) return { success: false, error: { _errors: ["Không thể tạo tài khoản với thông tin này."] } };

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const profile = await prisma.profile.create({
      data: {
        email,
        passwordHash,
        fullName: parsed.data.fullName.trim(),
        phone: parsed.data.phone || null,
        role: UserRole.USER,
        emailVerified: false,
      },
      select: { id: true, email: true, fullName: true, role: true, sessionVersion: true, emailVerified: true },
    });
    await setAuthCookie(profile);
    return {
      success: true,
      data: {
        userId: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
        requiresVerification: !profile.emailVerified,
      },
    };
  } catch (error) {
    return runtimeError(error);
  }
}

export async function login(data: LoginInput) {
  try {
    await assertSameOrigin();
    const parsed = LoginSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.format() };

    const email = normalizeEmail(parsed.data.email);
    const accountKey = hashIdentifier(email);
    const context = await getRequestSecurityContext();
    const [ipLimit, accountLimit, combinationLimit] = await Promise.all([
      checkRateLimit(`login:ip:${context.ipKey}`, { limit: LOGIN_IP_LIMIT, windowMs: AUTH_WINDOW_MS }),
      checkRateLimit(`login:account:${accountKey}`, { limit: LOGIN_LIMIT, windowMs: AUTH_WINDOW_MS }),
      checkRateLimit(`login:combo:${accountKey}:${context.ipKey}`, { limit: LOGIN_LIMIT, windowMs: AUTH_WINDOW_MS }),
    ]);
    const denied = [ipLimit, accountLimit, combinationLimit].find((result) => !result.allowed);
    if (denied && !denied.allowed) {
      emitSecurityEvent("rate_limit_exceeded", { requestId: context.requestId, accountKey, ipKey: context.ipKey });
      return { success: false, error: { _errors: [getRateLimitErrorMessage(denied)] } };
    }

    const profile = await prisma.profile.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        sessionVersion: true,
        deletedAt: true,
        failedLoginCount: true,
        lockedUntil: true,
        mustChangePassword: true,
      },
    });

    if (!profile || profile.deletedAt) {
      await bcrypt.compare(parsed.data.password, DUMMY_PASSWORD_HASH);
      emitSecurityEvent("login_failed", { requestId: context.requestId, accountKey, ipKey: context.ipKey });
      return { success: false, error: { _errors: [GENERIC_LOGIN_ERROR] } };
    }

    const now = new Date();
    if (isAccountLocked(profile.lockedUntil, now)) {
      await bcrypt.compare(parsed.data.password, DUMMY_PASSWORD_HASH);
      return { success: false, error: { _errors: [GENERIC_LOGIN_ERROR] } };
    }
    if (profile.lockedUntil) {
      await prisma.profile.update({ where: { id: profile.id }, data: { failedLoginCount: 0, lockedUntil: null } });
      emitSecurityEvent("account_unlocked", { requestId: context.requestId, accountId: profile.id });
    }

    const passwordValid = await bcrypt.compare(parsed.data.password, profile.passwordHash);
    if (!passwordValid) {
      const failed = await prisma.profile.update({
        where: { id: profile.id },
        data: { failedLoginCount: { increment: 1 } },
        select: { failedLoginCount: true },
      });
      const lockAccount = shouldLockAccount(failed.failedLoginCount);
      if (lockAccount) {
        await prisma.profile.update({ where: { id: profile.id }, data: { lockedUntil: new Date(Date.now() + ACCOUNT_LOCK_MS) } });
      }
      await createAdminAuditLog({
        profileId: profile.id,
        action: AuditAction.ADMIN_ACTION,
        resourceType: "auth",
        resourceId: profile.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        newValues: { operation: lockAccount ? "ACCOUNT_LOCKED" : "LOGIN_FAILED", requestId: context.requestId },
      });
      emitSecurityEvent(lockAccount ? "account_locked" : "login_failed", {
        requestId: context.requestId,
        accountId: profile.id,
        ipKey: context.ipKey,
      });
      return { success: false, error: { _errors: [GENERIC_LOGIN_ERROR] } };
    }

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
      select: { id: true, email: true, role: true, sessionVersion: true, mustChangePassword: true },
    });
    await setAuthCookie(updated);
    await createAdminAuditLog({
      profileId: updated.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: "auth",
      resourceId: updated.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      newValues: { operation: "LOGIN_SUCCEEDED", requestId: context.requestId },
    });
    emitSecurityEvent("login_succeeded", { requestId: context.requestId, accountId: updated.id });
    return { success: true, data: { userId: updated.id, email: updated.email, role: updated.role, requiresPasswordChange: updated.mustChangePassword } };
  } catch (error) {
    return runtimeError(error);
  }
}

export async function logout() {
  await assertSameOrigin();
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? verifyToken(token) : null;
  if (token && payload?.sessionId) {
    await prisma.authSession.updateMany({
      where: { id: payload.sessionId, tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(AUTH_COOKIE_NAME);
  return { success: true };
}

export async function getSession() {
  const user = await getCurrentUser();
  if (!user) return null;
  return { authenticated: true, user: { id: user.id, email: user.email, role: user.role } };
}
