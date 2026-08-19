import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { emitSecurityEvent } from "@/src/lib/security-events";

const MAX_HEADER_LENGTH = 512;

function cleanHeader(value: string | null, maxLength = MAX_HEADER_LENGTH) {
  return value?.replace(/[\r\n]/g, "").slice(0, maxLength) || null;
}

export type TrustedProxyProvider = "none" | "vercel" | "cloudflare" | "nginx";

export function resolveTrustedClientIp(
  getHeader: (name: string) => string | null,
  provider: TrustedProxyProvider,
) {
  if (provider === "none") return null;
  const raw = provider === "cloudflare"
    ? getHeader("cf-connecting-ip")
    : provider === "vercel"
      ? getHeader("x-vercel-forwarded-for")
      : getHeader("x-forwarded-for");
  const candidate = cleanHeader(raw?.split(",")[0]?.trim() ?? null, 45);
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}

function trustedClientIp(headerStore: Awaited<ReturnType<typeof headers>>) {
  const configured = process.env.TRUSTED_PROXY_PROVIDER ?? "none";
  const provider: TrustedProxyProvider = ["vercel", "cloudflare", "nginx"].includes(configured)
    ? configured as TrustedProxyProvider
    : "none";
  return resolveTrustedClientIp((name) => headerStore.get(name), provider);
}

export type RequestSecurityContext = {
  requestId: string;
  ipAddress: string | null;
  ipKey: string;
  userAgent: string | null;
};

export async function getRequestSecurityContext(): Promise<RequestSecurityContext> {
  const headerStore = await headers();
  const ipAddress = trustedClientIp(headerStore);
  const suppliedRequestId = cleanHeader(headerStore.get("x-request-id"), 100);
  return {
    requestId: suppliedRequestId && /^[A-Za-z0-9._:-]+$/.test(suppliedRequestId) ? suppliedRequestId : randomUUID(),
    ipAddress,
    ipKey: createHash("sha256").update(ipAddress ?? "untrusted-or-unknown").digest("hex").slice(0, 24),
    userAgent: cleanHeader(headerStore.get("user-agent")),
  };
}

export async function assertSameOrigin(): Promise<void> {
  const headerStore = await headers();
  const origin = cleanHeader(headerStore.get("origin"));
  const referer = cleanHeader(headerStore.get("referer"));
  const candidate = origin ?? referer;

  // Server-to-server and direct Server Component invocations do not carry browser origin headers.
  // Next.js also validates Server Action Origin against Host. When a browser supplies either
  // header, enforce the configured canonical origin here as defense in depth.
  if (!candidate) return;

  const production = process.env.NODE_ENV === "production";
  const configuredOrigin = production
    ? process.env.APP_ORIGIN
    : process.env.APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL;
  const host = cleanHeader(headerStore.get("host"));
  if (!isAllowedRequestOrigin(candidate, configuredOrigin, host, production)) {
    emitSecurityEvent("invalid_origin", {
      requestId: cleanHeader(headerStore.get("x-request-id"), 100) ?? randomUUID(),
      originKey: hashIdentifier(candidate),
    });
    throw new Error("INVALID_ORIGIN");
  }
}

export function isAllowedRequestOrigin(candidate: string, configuredOrigin: string | undefined, host: string | null, production: boolean) {
  const allowed = new Set<string>();
  try {
    if (configuredOrigin) allowed.add(new URL(configuredOrigin).origin);
    if (host && !production) {
      allowed.add(`http://${host}`);
      allowed.add(`https://${host}`);
    }
    return allowed.has(new URL(candidate).origin);
  } catch {
    return false;
  }
}

export function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
