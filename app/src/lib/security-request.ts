import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { emitSecurityEvent } from "@/src/lib/security-events";
import { getCanonicalAppOrigin } from "@/src/lib/env";

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

  if (!candidate) return;

  const production = process.env.NODE_ENV === "production";
  const configuredOrigin = getCanonicalAppOrigin();
  const proxyProvider = process.env.TRUSTED_PROXY_PROVIDER ?? "none";
  const usingTrustedProxy = ["vercel", "cloudflare", "nginx"].includes(proxyProvider);
  const effectiveHost = usingTrustedProxy
    ? cleanHeader(headerStore.get("x-forwarded-host")) ?? cleanHeader(headerStore.get("host"))
    : cleanHeader(headerStore.get("host"));
  const effectiveProto = usingTrustedProxy
    ? cleanHeader(headerStore.get("x-forwarded-proto"))?.split(",")[0]?.trim() ?? "https"
    : "https";
  if (!isAllowedRequestOrigin(candidate, configuredOrigin, effectiveHost, production, effectiveProto, usingTrustedProxy)) {
    emitSecurityEvent("invalid_origin", {
      requestId: cleanHeader(headerStore.get("x-request-id"), 100) ?? randomUUID(),
      originKey: hashIdentifier(candidate),
      configuredOriginKey: configuredOrigin ? hashIdentifier(configuredOrigin) : null,
      host: effectiveHost,
      trustedProxy: usingTrustedProxy ? proxyProvider : null,
    });
    throw new Error("INVALID_ORIGIN");
  }
}

export function isAllowedRequestOrigin(
  candidate: string,
  configuredOrigin: string | undefined,
  host: string | null,
  production: boolean,
  effectiveProto: string = "https",
  usingTrustedProxy: boolean = false,
) {
  const allowed = new Set<string>();
  try {
    const candidateUrl = new URL(candidate);
    if (configuredOrigin) {
      const configuredUrl = new URL(configuredOrigin);
      allowed.add(configuredUrl.origin);
      if (production && candidateUrl.hostname === configuredUrl.hostname) {
        allowed.add(`https://${configuredUrl.host}`);
        if (usingTrustedProxy) {
          allowed.add(`http://${configuredUrl.host}`);
        }
      }
    } else if (!production) {
      if (host) {
        allowed.add(`http://${host}`);
        allowed.add(`https://${host}`);
      }
    } else {
      if (host && usingTrustedProxy) {
        const trustedProto = effectiveProto === "http" ? "http" : "https";
        allowed.add(`${trustedProto}://${host}`);
      }
    }
    return allowed.has(candidateUrl.origin);
  } catch {
    return false;
  }
}

export function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
