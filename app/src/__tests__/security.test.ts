import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";

import { UserRole } from "@prisma/client";

import { hashSessionToken } from "../lib/auth";
import { ACCOUNT_LOCK_MS, isAccountLocked, isSessionFresh, shouldLockAccount } from "../lib/auth-policy";
import { hasPermission } from "../lib/rbac";
import { assertRealMoneyPaymentsEnabled } from "../lib/payments";
import { redactSecurityDetails, routeSecurityAlert } from "../lib/security-events";
import { isAllowedRequestOrigin, resolveTrustedClientIp } from "../lib/security-request";
import { LoginSchema, PlaceBidSchema, RegisterSchema } from "../types";

test("registration rejects weak passwords and oversized identity fields", () => {
  assert.equal(RegisterSchema.safeParse({ email: "a@example.com", password: "password", fullName: "Alice" }).success, false);
  assert.equal(RegisterSchema.safeParse({ email: "a@example.com", password: "StrongPass123", fullName: "A".repeat(101) }).success, false);
  assert.equal(RegisterSchema.safeParse({ email: "a@example.com", password: "StrongPass123", fullName: "Alice" }).success, true);
});

test("login payload length is bounded", () => {
  assert.equal(LoginSchema.safeParse({ email: "a@example.com", password: "x".repeat(129) }).success, false);
});

test("bid idempotency keys are bounded", () => {
  assert.equal(PlaceBidSchema.safeParse({ auctionId: "3d6f0a88-1f2b-4e5d-9a10-123456789abc", bidPrice: 1000, idempotencyKey: "x".repeat(65) }).success, false);
});

test("only administrators can read all notifications", () => {
  assert.equal(hasPermission({ role: UserRole.SUPPORT }, "notifications.read.all"), false);
  assert.equal(hasPermission({ role: UserRole.ADMIN }, "notifications.read.all"), true);
  assert.equal(hasPermission({ role: UserRole.SUPER_ADMIN }, "notifications.read.all"), true);
});

test("same-origin policy rejects attacker and malformed origins", () => {
  assert.equal(isAllowedRequestOrigin("https://app.example.com/path", "https://app.example.com", "app.example.com", true), true);
  assert.equal(isAllowedRequestOrigin("https://evil.example", "https://app.example.com", "app.example.com", true), false);
  assert.equal(isAllowedRequestOrigin("https://app.example.com.attacker.example", "https://app.example.com", null, true), false);
  assert.equal(isAllowedRequestOrigin("https://sub.app.example.com", "https://app.example.com", null, true), false);
  assert.equal(isAllowedRequestOrigin("http://app.example.com", "https://app.example.com", null, true), false);
  assert.equal(isAllowedRequestOrigin("https://app.example.com:444", "https://app.example.com", null, true), false);
  assert.equal(isAllowedRequestOrigin("not-a-url", "https://app.example.com", null, true), false);
  assert.equal(isAllowedRequestOrigin("https://app.example.com", undefined, "app.example.com", true), false);
});

test("proxy headers are ignored by default and validated for an explicitly trusted provider", () => {
  const headers = new Map([
    ["x-forwarded-for", "203.0.113.10, 10.0.0.1"],
    ["cf-connecting-ip", "198.51.100.7"],
  ]);
  const getHeader = (name: string) => headers.get(name) ?? null;
  assert.equal(resolveTrustedClientIp(getHeader, "none"), null);
  assert.equal(resolveTrustedClientIp(getHeader, "nginx"), "203.0.113.10");
  assert.equal(resolveTrustedClientIp(getHeader, "cloudflare"), "198.51.100.7");
  headers.set("x-forwarded-for", "not-an-ip, 203.0.113.10");
  assert.equal(resolveTrustedClientIp(getHeader, "nginx"), null);
});

test("session tokens are stored as one-way hashes", () => {
  const token = "header.payload.signature";
  const hash = hashSessionToken(token);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.equal(hash, hashSessionToken(token));
});

test("account lockout activates after five failures and expires after 15 minutes", () => {
  const now = new Date("2026-07-21T00:00:00.000Z");
  assert.equal(shouldLockAccount(4), false);
  assert.equal(shouldLockAccount(5), true);
  assert.equal(isAccountLocked(new Date(now.getTime() + ACCOUNT_LOCK_MS), now), true);
  assert.equal(isAccountLocked(new Date(now.getTime() - 1), now), false);
});

test("session policy enforces idle and absolute expiry", () => {
  const now = new Date("2026-07-21T00:30:00.000Z");
  assert.equal(isSessionFresh(new Date("2026-07-21T00:29:00.000Z"), new Date("2026-07-21T08:00:00.000Z"), now, 30 * 60 * 1000), true);
  assert.equal(isSessionFresh(new Date("2026-07-20T23:59:59.000Z"), new Date("2026-07-21T08:00:00.000Z"), now, 30 * 60 * 1000), false);
  assert.equal(isSessionFresh(new Date("2026-07-21T00:29:00.000Z"), new Date("2026-07-21T00:29:59.000Z"), now, 30 * 60 * 1000), false);
});

test("seed cannot contain default credentials or password logging", async () => {
  const seed = await readFile(new URL("../../prisma/seed.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(seed, /password123|admin@autobid\.vn/i);
  assert.doesNotMatch(seed, /console\.log\([^\n]*password/i);
  assert.match(seed, /ALLOW_DEMO_SEED/);
});

test("production CSP removes unsafe-eval and sensitive routes disable caching", async () => {
  const config = await readFile(new URL("../../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /Strict-Transport-Security/);
  assert.match(config, /private, no-store/);
  assert.match(config, /poweredByHeader:\s*false/);
  assert.match(config, /isProduction \? "" : " 'unsafe-eval'"/);
});

test("cron mutation is POST-only", async () => {
  const route = await readFile(new URL("../../app/api/auctions/finalize/route.ts", import.meta.url), "utf8");
  assert.match(route, /status:\s*405/);
  assert.match(route, /Allow:\s*"POST"/);
});

test("real-money payments are disabled unless the server environment explicitly enables them", () => {
  assert.throws(() => assertRealMoneyPaymentsEnabled({}), /REAL_MONEY_PAYMENTS_DISABLED/);
  assert.throws(() => assertRealMoneyPaymentsEnabled({ REAL_MONEY_PAYMENTS_ENABLED: "false" }), /REAL_MONEY_PAYMENTS_DISABLED/);
  assert.doesNotThrow(() => assertRealMoneyPaymentsEnabled({ REAL_MONEY_PAYMENTS_ENABLED: "true" }));
});

test("security alerts redact secrets, route to a receiver, and apply cooldown", async () => {
  const received: unknown[] = [];
  const server = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      received.push(JSON.parse(body));
      response.writeHead(204).end();
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const previousUrl = process.env.SECURITY_ALERT_WEBHOOK_URL;
  const previousCooldown = process.env.SECURITY_ALERT_COOLDOWN_MS;
  process.env.SECURITY_ALERT_WEBHOOK_URL = `http://127.0.0.1:${address.port}/alerts`;
  process.env.SECURITY_ALERT_COOLDOWN_MS = "60000";
  try {
    const redacted = redactSecurityDetails({ requestId: "req-1", password: "do-not-send", authorization: "Bearer hidden" });
    assert.equal(redacted.password, "[REDACTED]");
    assert.equal(redacted.authorization, "[REDACTED]");
    assert.equal(await routeSecurityAlert("invalid_origin", { requestId: "req-local", actorId: "actor-local", token: "hidden" }, { now: 1_000 }), "sent");
    assert.equal(await routeSecurityAlert("invalid_origin", { requestId: "req-local-2", actorId: "actor-local", token: "hidden" }, { now: 2_000 }), "cooldown");
    assert.equal(received.length, 1);
    assert.equal((received[0] as { details: { token: string } }).details.token, "[REDACTED]");
  } finally {
    if (previousUrl === undefined) delete process.env.SECURITY_ALERT_WEBHOOK_URL; else process.env.SECURITY_ALERT_WEBHOOK_URL = previousUrl;
    if (previousCooldown === undefined) delete process.env.SECURITY_ALERT_COOLDOWN_MS; else process.env.SECURITY_ALERT_COOLDOWN_MS = previousCooldown;
    server.close();
    server.closeAllConnections();
    await once(server, "close");
  }
});
