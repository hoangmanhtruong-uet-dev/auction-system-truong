import { prisma } from "@/src/lib/prisma";
import { verifyToken } from "@/src/lib/jwt";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getJwtSecret } from "@/src/lib/jwt";
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
  address: string | null;
  city: string | null;
  gender: string | null;
  birthday: Date | null;
  bio: string | null;
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
    // Verify JWT_SECRET is properly set (helps debug on Render)
    try {
      getJwtSecret();
    } catch (e) {
      console.error("[Auth] JWT_SECRET not configured:", e);
    }

    const userId = await getSessionUserId();

    if (!userId) return null;

    try {
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
          address: true,
          city: true,
          gender: true,
          birthday: true,
          bio: true,
          deletedAt: true,
        },
      });

      if (!profile || profile.deletedAt) {
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        emailVerified: profile.emailVerified,
        fullName: profile.fullName,
        phone: profile.phone,
        role: profile.role,
        avatarUrl: profile.avatarUrl,
        createdAt: profile.createdAt,
        address: profile.address,
        city: profile.city,
        gender: profile.gender,
        birthday: profile.birthday,
        bio: profile.bio,
      };
    } catch (profileError) {
      console.error("[Auth] extended profile read failed, falling back to core profile:", profileError);

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
          deletedAt: true,
        },
      });

      if (!profile || profile.deletedAt) {
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        emailVerified: profile.emailVerified,
        fullName: profile.fullName,
        phone: profile.phone,
        role: profile.role,
        avatarUrl: profile.avatarUrl,
        createdAt: profile.createdAt,
        address: null,
        city: null,
        gender: null,
        birthday: null,
        bio: null,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const digest =
      typeof err === "object" && err !== null && "digest" in err
        ? String(err.digest)
        : "";

    // Next.js throws this while probing static rendering for routes that read cookies().
    // Keep real auth/database errors visible.
    if (
      message.includes("Dynamic server usage") ||
      message.includes("couldn't be rendered statically") ||
      digest.includes("DYNAMIC_SERVER_USAGE")
    ) {
      return null;
    }

    console.error("[Auth] getCurrentUser error:", err);
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
