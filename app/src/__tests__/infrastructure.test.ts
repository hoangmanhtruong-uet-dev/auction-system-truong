import assert from "node:assert/strict";
import test from "node:test";

import { validateWorkerEnv } from "../lib/env";
import {
  AuctionExpiryJobSchema,
  JOB_NAMES,
  QUEUE_NAMES,
  SettlementJobSchema,
  closeAllQueues,
} from "../lib/queue";
import { closeRedisConnections } from "../lib/redis";
import { isHeartbeatFresh } from "../workers/heartbeat";
import { readiness, type ReadinessDependencies } from "../lib/health";

const validWorkerEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "mysql://user:pass@localhost:3306/autobid",
  REDIS_URL: "redis://:pass@localhost:6379/0",
  APP_ORIGIN: "http://localhost:3000",
  TRUSTED_PROXY_PROVIDER: "none",
  SESSION_ABSOLUTE_TIMEOUT_SECONDS: "28800",
  SESSION_IDLE_TIMEOUT_SECONDS: "1800",
  ADMIN_PROFILE_ID: "admin-id",
  PLATFORM_FEE_PERCENT: "5",
  REAL_MONEY_PAYMENTS_ENABLED: "false",
};

test("worker environment accepts safe staging defaults", () => {
  assert.equal(validateWorkerEnv(validWorkerEnv).FINANCIAL_OPERATIONS_ENABLED, "false");
});

test("production rejects placeholder secrets", () => {
  assert.throws(() => validateWorkerEnv({ ...validWorkerEnv, NODE_ENV: "production", JWT_SECRET: "change-this-example-secret-value-123", CRON_SECRET: "change-this-example-secret-value-123" }));
});

test("real-money payments are fail-closed", () => {
  assert.throws(() => validateWorkerEnv({ ...validWorkerEnv, REAL_MONEY_PAYMENTS_ENABLED: "true" }));
});

test("queue contract has one canonical name per producer and worker", () => {
  assert.equal(QUEUE_NAMES.AUCTION_EXPIRY, "auction-expiry");
  assert.equal(QUEUE_NAMES.SETTLEMENT, "settlement");
  assert.equal(JOB_NAMES.CLOSE_AUCTION, "close-auction");
});

test("invalid expiry and settlement payloads are rejected", () => {
  assert.equal(AuctionExpiryJobSchema.safeParse({ auctionId: "a", expectedEndsAt: "tomorrow" }).success, false);
  assert.equal(SettlementJobSchema.safeParse({ auctionId: "a", winnerProfileId: "w", sellerProfileId: "s", finalPrice: "1.5" }).success, false);
});

test("heartbeat freshness expires at its TTL", () => {
  const now = Date.parse("2026-07-21T00:00:30.000Z");
  assert.equal(isHeartbeatFresh("2026-07-21T00:00:01.000Z", 30, now), true);
  assert.equal(isHeartbeatFresh("2026-07-20T23:59:59.000Z", 30, now), false);
});

test("queue and Redis shutdown are idempotent before startup", async () => {
  await Promise.all([closeAllQueues(), closeAllQueues()]);
  await Promise.all([closeRedisConnections(), closeRedisConnections()]);
});

test("readiness is ready when required dependencies are healthy", async () => {
  const healthy: ReadinessDependencies = {
    database: async () => undefined,
    redis: async () => undefined,
    queue: async () => undefined,
    worker: async () => undefined,
  };
  assert.equal((await readiness(healthy, validWorkerEnv)).ok, true);
});

test("readiness fails closed when Redis or database is unavailable", async () => {
  const unavailable: ReadinessDependencies = {
    database: async () => { throw new Error("down"); },
    redis: async () => { throw new Error("down"); },
    queue: async () => undefined,
    worker: async () => undefined,
  };
  const result = await readiness(unavailable, validWorkerEnv);
  assert.equal(result.ok, false);
  assert.equal(result.dependencies.database.ok, false);
  assert.equal(result.dependencies.redis.ok, false);
});
