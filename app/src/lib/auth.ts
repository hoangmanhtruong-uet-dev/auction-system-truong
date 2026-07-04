import { prisma } from "@/src/lib/prisma";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

export type SafeUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: Date;
};

/**
 * Get the current authenticated user + profile from DB.
 * Always reads role from DB (never trusts the client).
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    // Fetch profile from DB to get the real role
    const profile = await prisma.profile.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        fullName: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return profile;
  } catch {
    return null;
  }
}

/**
 * Require authentication. Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

/**
 * Require a specific role. Redirects to home if not authorized.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SafeUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    redirect("/");
  }
  return user;
}

/**
 * Require ADMIN role.
 */
export async function requireAdmin(): Promise<SafeUser> {
  return requireRole([UserRole.ADMIN]);
}

/**
 * Require SELLER role (or higher).
 */
export async function requireSeller(): Promise<SafeUser> {
  return requireRole([UserRole.SELLER, UserRole.ADMIN]);
}

/**
 * Create or update profile after signup/signin.
 * This ensures a local DB profile exists for every Supabase auth user.
 */
export async function syncProfile(
  authUserId: string,
  email: string,
  fullName?: string | null
): Promise<void> {
  const existing = await prisma.profile.findUnique({
    where: { id: authUserId },
  });

  if (!existing) {
    await prisma.profile.create({
      data: {
        id: authUserId,
        email,
        fullName: fullName || email.split("@")[0],
        role: UserRole.USER,
      },
    });
  } else if (existing.email !== email) {
    await prisma.profile.update({
      where: { id: authUserId },
      data: { email },
    });
  }
}