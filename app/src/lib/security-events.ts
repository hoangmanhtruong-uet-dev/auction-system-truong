import { createHash } from "node:crypto";

export type SecurityEvent =
  | "login_succeeded"
  | "login_failed"
  | "account_locked"
  | "account_unlocked"
  | "session_revoked"
  | "rate_limit_exceeded"
  | "invalid_origin"
  | "invalid_cron_auth"
  | "admin_role_changed"
  | "super_admin_changed"
  | "mark_paid"
  | "auction_cancelled"
  | "redis_unavailable"
  | "database_unavailable"
  | "migration_failed";

export type SecuritySeverity = "info" | "warning" | "high" | "critical";
type DetailValue = string | number | boolean | null;

const sensitiveKey = /password|token|cookie|authorization|secret|credential|redis_url|database_url/i;
const cooldowns = new Map<string, number>();

const severityByEvent: Record<SecurityEvent, SecuritySeverity> = {
  login_succeeded: "info",
  login_failed: "warning",
  account_locked: "high",
  account_unlocked: "warning",
  session_revoked: "info",
  rate_limit_exceeded: "warning",
  invalid_origin: "high",
  invalid_cron_auth: "high",
  admin_role_changed: "high",
  super_admin_changed: "critical",
  mark_paid: "high",
  auction_cancelled: "warning",
  redis_unavailable: "critical",
  database_unavailable: "critical",
  migration_failed: "critical",
};

export function redactSecurityDetails(details: Record<string, DetailValue>) {
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : value]),
  );
}

function alertPayload(event: SecurityEvent, details: Record<string, DetailValue>) {
  const sanitized = redactSecurityDetails(details);
  return {
    type: "security_alert",
    event,
    severity: severityByEvent[event],
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
    requestId: sanitized.requestId ?? null,
    actorId: sanitized.actorId ?? sanitized.accountId ?? null,
    resourceId: sanitized.resourceId ?? null,
    details: sanitized,
    timestamp: new Date().toISOString(),
  };
}

export async function routeSecurityAlert(
  event: SecurityEvent,
  details: Record<string, DetailValue>,
  options: { fetchImpl?: typeof fetch; now?: number } = {},
): Promise<"sent" | "disabled" | "cooldown"> {
  const destination = process.env.SECURITY_ALERT_WEBHOOK_URL;
  if (!destination) return "disabled";
  const payload = alertPayload(event, details);
  const cooldownMs = Math.max(1_000, Number(process.env.SECURITY_ALERT_COOLDOWN_MS ?? "60000"));
  const dedupeMaterial = `${event}:${payload.actorId ?? ""}:${payload.resourceId ?? ""}`;
  const dedupeKey = createHash("sha256").update(dedupeMaterial).digest("hex");
  const now = options.now ?? Date.now();
  if ((cooldowns.get(dedupeKey) ?? 0) > now) return "cooldown";
  cooldowns.set(dedupeKey, now + cooldownMs);

  const response = await (options.fetchImpl ?? fetch)(destination, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.SECURITY_ALERT_WEBHOOK_BEARER
        ? { authorization: `Bearer ${process.env.SECURITY_ALERT_WEBHOOK_BEARER}` }
        : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(Number(process.env.SECURITY_ALERT_TIMEOUT_MS ?? "2000")),
  });
  if (!response.ok) throw new Error(`security alert destination returned ${response.status}`);
  return "sent";
}

export function emitSecurityEvent(event: SecurityEvent, details: Record<string, DetailValue>) {
  const sanitized = redactSecurityDetails(details);
  console.warn(JSON.stringify({ type: "security_event", event, ...sanitized, timestamp: new Date().toISOString() }));
  void routeSecurityAlert(event, sanitized).catch((error) => {
    console.error(JSON.stringify({ type: "security_alert_delivery_failed", event, message: error instanceof Error ? error.message : "unknown" }));
  });
}

