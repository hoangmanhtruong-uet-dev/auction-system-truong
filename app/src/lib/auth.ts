import { prisma } from "@/src/lib/prisma";
import { verifyToken } from "@/src/lib/jwt";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";

export const AUTH_COOKIE_NAME = "auth-token";

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

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

/**
 * Get the current authenticated user + profile from Aiven PostgreSQL.
 * Always reads role from DB (never trusts the client token role).
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const userId = await getSessionUserId();

    if (!userId) return null;

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
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