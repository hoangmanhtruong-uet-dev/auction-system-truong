import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { hasPermission, isAuthorizationError, requirePermission, type Permission } from "@/src/lib/authorization";
import type { SafeUser } from "@/src/lib/auth";
import { emitSecurityEvent } from "@/src/lib/security-events";

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
    emitSecurityEvent("invalid_cron_auth", { requestId: request.headers.get("x-request-id"), reason: "secret_missing" });
    return jsonError("CRON_SECRET is not configured.", 403, "CRON_SECRET_MISSING");
  }

  const allowedIps = process.env.CRON_ALLOWED_IPS
    ?.split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (allowedIps?.length) {
    const provider = process.env.TRUSTED_PROXY_PROVIDER ?? "none";
    const requestIp = provider === "cloudflare"
      ? request.headers.get("cf-connecting-ip")?.trim()
      : provider === "vercel"
        ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
        : provider === "nginx"
          ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          : null;

    if (!requestIp || !allowedIps.includes(requestIp)) {
      emitSecurityEvent("invalid_cron_auth", { requestId: request.headers.get("x-request-id"), reason: "ip_not_allowed" });
      return jsonError("Cron caller IP is not allowed.", 403, "CRON_IP_NOT_ALLOWED");
    }
  }

  const authHeader = request.headers.get("authorization");
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(authHeader ?? "");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    emitSecurityEvent("invalid_cron_auth", { requestId: request.headers.get("x-request-id"), reason: "credential_rejected" });
    return jsonError("Unauthorized", 401, "UNAUTHORIZED");
  }

  return null;
}

export function canReadAuctionDetail(user: SafeUser, auction: { sellerId: string; status: string }) {
  if (hasPermission(user, "auctions.read.all")) return true;
  if (hasPermission(user, "auctions.update.own") && auction.sellerId === user.id) return true;
  return hasPermission(user, "auctions.read.detail") && auction.status !== "CANCELLED";
}
