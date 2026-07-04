"use server";

import { createServerSupabaseClient } from "@/src/lib/supabase-server";
import { syncProfile } from "@/src/lib/auth";

import {
  LoginInput,
  LoginSchema,
  RegisterInput,
  RegisterSchema,
} from "@/src/types";

export async function register(data: RegisterInput) {
  const parsed = RegisterSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const supabase = await createServerSupabaseClient();

  // 1. Sign up with Supabase Auth
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (signUpError) {
    return {
      success: false,
      error: { _errors: [signUpError.message] },
    };
  }

  const authUser = authData.user;
  if (!authUser) {
    return {
      success: false,
      error: { _errors: ["Không thể tạo tài khoản. Vui lòng thử lại."] },
    };
  }

  // 2. Create profile in local DB
  try {
    await syncProfile(
      authUser.id,
      parsed.data.email,
      parsed.data.fullName
    );
  } catch (dbError) {
    // If profile creation fails, still account was created in Supabase Auth
    console.error("Failed to create profile after signup:", dbError);
  }

  return {
    success: true,
    data: {
      userId: authUser.id,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      requiresVerification: !authUser.email_confirmed_at,
    },
  };
}

export async function login(data: LoginInput) {
  const parsed = LoginSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const supabase = await createServerSupabaseClient();

  const { data: authData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

  if (signInError) {
    return {
      success: false,
      error: { _errors: [signInError.message] },
    };
  }

  const authUser = authData.user;
  if (!authUser) {
    return {
      success: false,
      error: { _errors: ["Không thể đăng nhập. Vui lòng thử lại."] },
    };
  }

  // Ensure profile exists in local DB
  try {
    await syncProfile(authUser.id, parsed.data.email, null);
  } catch (dbError) {
    console.error("Failed to sync profile after login:", dbError);
  }

  // Read role from DB, not from client
  const { prisma } = await import("@/src/lib/prisma");
  const profile = await prisma.profile.findUnique({
    where: { id: authUser.id },
    select: { role: true },
  });

  return {
    success: true,
    data: {
      userId: authUser.id,
      email: parsed.data.email,
      role: profile?.role ?? "USER",
      token: authData.session?.access_token ?? "",
    },
  };
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: { _errors: [error.message] } };
  }

  return { success: true };
}

export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}