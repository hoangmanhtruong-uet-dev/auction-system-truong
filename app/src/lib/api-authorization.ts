import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasPermission, isAuthorizationError, requirePermission, type Permission } from "@/src/lib/authorization";
import type { SafeUser } from "@/src/lib/auth";

export type ApiGuardResult = { ok: true; user: SafeUser } | { ok: false; response: NextResponse };

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export async function requireApiPermission(permission: Permission): Promise<ApiGuardResult> {
  const user = await requirePermission(permission);
  if (isAuthorizationError(user)) {
    return {
      ok: false,
      response: jsonError(user.message, user.code === "UNAUTHENTICATED" ? 401 : 403, user.code),
    };
  }

  return { ok: true, user };
}

export function requireCronSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return jsonError("CRON_SECRET is not configured.", 403, "CRON_SECRET_MISSING");
  }

  const allowedIps = process.env.CRON_ALLOWED_IPS
    ?.split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (allowedIps?.length) {
    const requestIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip")?.trim();

    if (!requestIp || !allowedIps.includes(requestIp)) {
      return jsonError("Cron caller IP is not allowed.", 403, "CRON_IP_NOT_ALLOWED");
    }
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  }

  return null;
}

export function canReadAuctionDetail(user: SafeUser, auction: { sellerId: string; status: string }) {
  if (hasPermission(user, "auctions.read.all")) return true;
  if (hasPermission(user, "auctions.update.own") && auction.sellerId === user.id) return true;
  return hasPermission(user, "auctions.read.detail") && auction.status !== "CANCELLED";
}
