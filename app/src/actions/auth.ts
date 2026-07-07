"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";

import { prisma } from "@/src/lib/prisma";
import { AUTH_COOKIE_NAME } from "@/src/lib/auth";
import { generateToken } from "@/src/lib/jwt";
import { checkRateLimit, getRateLimitErrorMessage } from "@/src/lib/rate-limit";

import {
  LoginInput,
  LoginSchema,
  RegisterInput,
  RegisterSchema,
} from "@/src/types";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT = 10;
const REGISTER_RATE_LIMIT = 5;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@autobid.vn";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAuthRuntimeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  console.error("[Auth Action] Runtime error:", error);

  if (message.includes("JWT_SECRET")) {
    return "Server thiếu hoặc sai JWT_SECRET. Hãy kiểm tra Environment Variables trên Render.";
  }

  if (
    message.includes("Can't reach database server") ||
    message.includes("Connection") ||
    message.includes("connect") ||
    message.includes("timeout") ||
    message.includes("ECONNREFUSED")
  ) {
    return "Không kết nối được database. Hãy kiểm tra DATABASE_URL/SSL và trạng thái database.";
  }

  if (
    message.includes("password_hash") ||
    message.includes("does not exist") ||
    message.includes("Unknown argument") ||
    message.includes("column") ||
    message.includes("relation")
  ) {
    return "Database production chưa đúng schema. Hãy chạy migrate deploy trên Render/database.";
  }

  return `Lỗi server khi xử lý xác thực: ${message}`;
}

async function setAuthCookie(user: { id: string; email: string; role: UserRole; sessionVersion: number }) {
  const token = generateToken(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
    },
    COOKIE_MAX_AGE_SECONDS
  );

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  return token;
}

export async function register(data: RegisterInput) {
  try {
    const parsed = RegisterSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.format() };
    }

    const email = normalizeEmail(parsed.data.email);
    const rateLimit = checkRateLimit(`register:${email}`, {
      limit: REGISTER_RATE_LIMIT,
      windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: { _errors: [getRateLimitErrorMessage(rateLimit)] },
      };
    }

    const existing = await prisma.profile.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: { _errors: ["Email đã được sử dụng."] },
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const profile = await prisma.profile.create({
      data: {
        email,
        passwordHash,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || null,
        role: UserRole.USER,
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        sessionVersion: true,
        emailVerified: true,
      },
    });

    const token = await setAuthCookie(profile);

    return {
      success: true,
      data: {
        userId: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
        token,
        requiresVerification: !profile.emailVerified,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { _errors: [getAuthRuntimeErrorMessage(error)] },
    };
  }
}

export async function login(data: LoginInput) {
  try {
    const parsed = LoginSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.format() };
    }

    const email = normalizeEmail(parsed.data.email);
    const rateLimit = checkRateLimit(`login:${email}`, {
      limit: LOGIN_RATE_LIMIT,
      windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: { _errors: [getRateLimitErrorMessage(rateLimit)] },
      };
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
      },
    });

    if (!profile || profile.deletedAt) {
      return {
        success: false,
        error: { _errors: ["Email hoặc mật khẩu không đúng."] },
      };
    }

    const isPasswordValid = await bcrypt.compare(
      parsed.data.password,
      profile.passwordHash
    );

    if (!isPasswordValid) {
      return {
        success: false,
        error: { _errors: ["Email hoặc mật khẩu không đúng."] },
      };
    }

    if (profile.role === UserRole.ADMIN && profile.email !== ADMIN_EMAIL) {
      return {
        success: false,
        error: { _errors: ["Tài khoản admin không hợp lệ."] },
      };
    }

    // Update session version for non-admin users
    const updatedProfile =
      profile.role === UserRole.ADMIN
        ? profile
        : await prisma.profile.update({
            where: { id: profile.id },
            data: { sessionVersion: { increment: 1 } },
            select: {
              id: true,
              email: true,
              role: true,
              sessionVersion: true,
            },
          });

    const token = await setAuthCookie(updatedProfile);

    return {
      success: true,
      data: {
        userId: updatedProfile.id,
        email: updatedProfile.email,
        role: updatedProfile.role,
        token,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { _errors: [getAuthRuntimeErrorMessage(error)] },
    };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  return { success: true };
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  return {
    access_token: token,
  };
}
