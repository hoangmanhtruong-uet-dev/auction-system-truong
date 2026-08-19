import { prisma } from "@/src/lib/prisma";
import { verifyToken } from "@/src/lib/jwt";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getJwtSecret } from "@/src/lib/jwt";
import { UserRole } from "@prisma/client";
import { createHash } from "node:crypto";
import { isSessionFresh } from "@/src/lib/auth-policy";

export const AUTH_COOKIE_NAME = "auth-token";
const SESSION_IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_SECONDS ?? "1800") * 1000;

export type SafeUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  phone: string | null;
  role: UserRole;
  sessionVersion: number;
  mustChangePassword: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  address: string | null;
  city: string | null;
  gender: string | null;
  birthday: Date | null;
  bio: string | null;
};

export function isPrimaryAdmin(user: Pick<SafeUser, "email" | "role">) {
  return user.role === UserRole.SUPER_ADMIN;
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

/**
 * Get the current authenticated user + profile from the application database.
 * Always reads role from DB (never trusts the client token role).
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    // Verify JWT_SECRET is properly set (helps debug on Render)
    try {
      getJwtSecret();
    } catch (e) {
      console.error("[Auth] JWT_SECRET is not configured", e instanceof Error ? e.name : "unknown");
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    const userId = payload?.userId ?? null;

    if (!userId) return null;

    try {
      if (!payload?.sessionId) return null;

      const now = new Date();
      const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
      const session = await prisma.authSession.findFirst({
        where: {
          id: payload.sessionId,
          profileId: userId,
          tokenHash: hashSessionToken(token),
          revokedAt: null,
          expiresAt: { gt: now },
          lastSeenAt: { gt: idleCutoff },
          sessionVersion: payload.sessionVersion,
        },
        select: {
          id: true,
          lastSeenAt: true,
          expiresAt: true,
          profile: {
            select: {
              id: true,
              email: true,
              emailVerified: true,
              fullName: true,
              phone: true,
              role: true,
              sessionVersion: true,
              mustChangePassword: true,
              avatarUrl: true,
              createdAt: true,
              address: true,
              city: true,
              gender: true,
              birthday: true,
              bio: true,
              deletedAt: true,
            },
          },
        },
      });

      const profile = session?.profile;

      if (!profile || profile.deletedAt) {
        return null;
      }

      if (!isSessionFresh(session.lastSeenAt, session.expiresAt, now, SESSION_IDLE_TIMEOUT_MS)) return null;

      if (payload?.sessionVersion !== profile.sessionVersion) {
        return null;
      }

      if (now.getTime() - session.lastSeenAt.getTime() > 60_000) {
        await prisma.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { lastSeenAt: now },
        });
      }

      return {
        id: profile.id,
        email: profile.email,
        emailVerified: profile.emailVerified,
        fullName: profile.fullName,
        phone: profile.phone,
        role: profile.role,
        sessionVersion: profile.sessionVersion,
        mustChangePassword: profile.mustChangePassword,
        avatarUrl: profile.avatarUrl,
        createdAt: profile.createdAt,
        address: profile.address,
        city: profile.city,
        gender: profile.gender,
        birthday: profile.birthday,
        bio: profile.bio,
      };
    } catch (profileError) {
      console.error("[Auth] session lookup failed", profileError instanceof Error ? profileError.name : "unknown");
      return null;
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

    console.error("[Auth] getCurrentUser failed", err instanceof Error ? err.name : "unknown");
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

