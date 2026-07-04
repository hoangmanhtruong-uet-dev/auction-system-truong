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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function setAuthCookie(user: { id: string; email: string; role: UserRole }) {
  const token = generateToken(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
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
}

export async function login(data: LoginInput) {
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

  const token = await setAuthCookie(profile);

  return {
    success: true,
    data: {
      userId: profile.id,
      email: profile.email,
      role: profile.role,
      token,
    },
  };
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