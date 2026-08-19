import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";

import { AuctionStatus, BidStatus, OutboxStatus, UserRole } from "@prisma/client";
import { Job, Queue, Worker } from "bullmq";
import Redis from "ioredis";

import { finishAuction } from "../lib/auction-lifecycle";
import { readiness } from "../lib/health";
import { createOutboxDispatcher, createOutboxEvents, OUTBOX_EVENT_TYPES } from "../lib/outbox";
import { closeAllQueues, getQueue, QUEUE_NAMES } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { checkRateLimit } from "../lib/rate-limit";
import { closeRedisConnections, getBullMqConnection, getRedisConnection } from "../lib/redis";
import { createHeartbeat } from "../workers/heartbeat";

const suffix = crypto.randomUUID().slice(0, 8);
const queuePrefix = `autobid-integration-${suffix}`;
process.env.QUEUE_PREFIX = queuePrefix;

async function pollUntil(predicate: () => Promise<boolean>, timeoutMs = 8_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition was not met within ${timeoutMs}ms`);
}

async function cleanDatabase(): Promise<void> {
  await prisma.outboxEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.balanceFreeze.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.auctionImage.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.profile.deleteMany();
}

async function runWorkerProbe(env: Record<string, string | undefined>): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", path.join(process.cwd(), "scripts", "worker-probe.ts")], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env,
        NODE_ENV: "test",
        ADMIN_PROFILE_ID: "disabled",
        PLATFORM_FEE_PERCENT: "5",
        FINANCIAL_OPERATIONS_ENABLED: "false",
        REAL_MONEY_PAYMENTS_ENABLED: "false",
        WORKER_HEARTBEAT_TTL_SECONDS: "5",
        WORKER_SHUTDOWN_TIMEOUT_MS: "5000",
        REDIS_CONNECT_TIMEOUT_MS: "200",
        REDIS_COMMAND_TIMEOUT_MS: "200",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, output }));
  });
}

async function runOutboxProbe(env: Record<string, string | undefined>): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", path.join(process.cwd(), "scripts", "outbox-dispatch-probe.ts")], {
      cwd: process.cwd(),
      env: { ...process.env, ...env, REDIS_CONNECT_TIMEOUT_MS: "100", REDIS_COMMAND_TIMEOUT_MS: "100" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, output }));
  });
}

before(async () => {
  assert.match(new URL(process.env.DATABASE_URL ?? "").pathname, /_test$/);
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  await getRedisConnection().flushdb();
  await cleanDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  await getRedisConnection().flushdb();
});

after(async () => {
  await cleanDatabase();
  await closeAllQueues();
  await closeRedisConnections();
  await prisma.$disconnect();
});

test("MySQL connects, migrations exist, row locks serialize expiry, and unique constraints reject duplicates", async () => {
  const seller = await prisma.profile.create({ data: { email: `seller-${suffix}@test.invalid`, passwordHash: "test", fullName: "Seller", role: UserRole.SELLER } });
  const winner = await prisma.profile.create({ data: { email: `winner-${suffix}@test.invalid`, passwordHash: "test", fullName: "Winner" } });
  const auction = await prisma.auction.create({
    data: {
      title: "Expired integration auction",
      description: "test",
      startPrice: 100n,
      currentPrice: 150n,
      sellerId: seller.id,
      status: AuctionStatus.ACTIVE,
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() - 1_000),
    },
  });
  await prisma.bid.create({ data: { auctionId: auction.id, bidderId: winner.id, amount: 150n, status: BidStatus.ACTIVE, idempotencyKey: `bid-${suffix}` } });

  const results = await Promise.all([finishAuction(auction.id), finishAuction(auction.id)]);
  assert.equal(results.length, 2);
  const closed = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } });
  assert.equal(closed.status, AuctionStatus.COMPLETED);
  assert.equal(closed.winnerId, winner.id);
  assert.equal(await prisma.outboxEvent.count({ where: { idempotencyKey: `auction:${auction.id}:closed:v1` } }), 1);
  assert.equal(await prisma.outboxEvent.count({ where: { eventType: OUTBOX_EVENT_TYPES.SETTLEMENT_REQUESTED, aggregateId: auction.id } }), 1);

  await prisma.watchlist.create({ data: { profileId: winner.id, auctionId: auction.id } });
  await assert.rejects(prisma.watchlist.create({ data: { profileId: winner.id, auctionId: auction.id } }));
});

test("outbox follows transaction commit/rollback and unique idempotency", async () => {
  const aggregateId = crypto.randomUUID();
  const event = {
    eventType: OUTBOX_EVENT_TYPES.AUCTION_CLOSED,
    aggregateType: "auction" as const,
    aggregateId,
    idempotencyKey: `auction:${aggregateId}:closed:v1`,
    payload: { auctionId: aggregateId, winnerId: null, finalPrice: "0" },
  };
  await assert.rejects(prisma.$transaction(async (tx) => {
    await createOutboxEvents(tx, [event]);
    throw new Error("rollback probe");
  }));
  assert.equal(await prisma.outboxEvent.count({ where: { aggregateId } }), 0);
  await prisma.$transaction((tx) => createOutboxEvents(tx, [event, event]));
  assert.equal(await prisma.outboxEvent.count({ where: { aggregateId } }), 1);
});

test("Redis Lua rate limit is atomic and heartbeat TTL refreshes then becomes stale", async () => {
  const key = `integration-${suffix}`;
  const results = await Promise.all(Array.from({ length: 10 }, () => checkRateLimit(key, { limit: 3, windowMs: 5_000 })));
  assert.equal(results.filter((result) => result.allowed).length, 3);

  const heartbeat = createHeartbeat({
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    REDIS_URL: process.env.REDIS_URL ?? "",
    APP_VERSION: "integration",
    QUEUE_PREFIX: queuePrefix,
    ADMIN_PROFILE_ID: "disabled",
    PLATFORM_FEE_PERCENT: 5,
    WORKER_NAME: `heartbeat-${suffix}`,
    WORKER_HEARTBEAT_INTERVAL_MS: 500,
    WORKER_HEARTBEAT_TTL_SECONDS: 2,
    WORKER_SHUTDOWN_TIMEOUT_MS: 5_000,
    FINANCIAL_OPERATIONS_ENABLED: "false",
    REAL_MONEY_PAYMENTS_ENABLED: "false",
  }, [QUEUE_NAMES.AUCTION_EXPIRY]);
  await heartbeat.write("ready");
  heartbeat.start();
  const redis = getRedisConnection();
  const keyName = `worker:heartbeat:${heartbeat.instanceId}`;
  await pollUntil(async () => (await redis.ttl(keyName)) >= 1);
  heartbeat.stop();
  await pollUntil(async () => (await redis.exists(keyName)) === 0, 5_000);
});

test("Redis lockout TTL expires and idempotency reservation is atomic", async () => {
  const redis = getRedisConnection();
  const lockoutKey = `integration-lockout-${suffix}`;
  await redis.set(lockoutKey, "locked", "EX", 1);
  assert.ok((await redis.ttl(lockoutKey)) >= 0);
  await pollUntil(async () => (await redis.exists(lockoutKey)) === 0, 3_000);

  const idempotencyKey = `integration-idempotency-${suffix}`;
  assert.equal(await redis.set(idempotencyKey, "request-a", "EX", 5, "NX"), "OK");
  assert.equal(await redis.set(idempotencyKey, "request-b", "EX", 5, "NX"), null);
  assert.equal(await redis.get(idempotencyKey), "request-a");
  assert.ok((await redis.ttl(idempotencyKey)) > 0);
});

test("BullMQ produces, consumes, retries, deduplicates, pauses/resumes, and closes cleanly", async () => {
  const name = `integration-queue-${suffix}`;
  const queue = new Queue(name, { connection: getBullMqConnection(), prefix: queuePrefix });
  let calls = 0;
  const worker = new Worker(name, async (job: Job<{ failUntil: number }>) => {
    calls++;
    if (calls <= job.data.failUntil) throw new Error("retryable");
    return "ok";
  }, { connection: getBullMqConnection(), prefix: queuePrefix });
  try {
    await queue.pause();
    await queue.add("probe", { failUntil: 1 }, { jobId: "dedupe-probe", attempts: 2, backoff: { type: "fixed", delay: 50 }, removeOnComplete: false });
    await queue.add("probe", { failUntil: 1 }, { jobId: "dedupe-probe", attempts: 2, removeOnComplete: false });
    assert.equal(await queue.getJobCountByTypes("paused"), 1);
    await queue.resume();
    await pollUntil(async () => (await queue.getJob("dedupe-probe"))?.isCompleted() ?? false);
    assert.equal(calls, 2);

    await queue.add("always-fail", { failUntil: 100 }, { jobId: "max-attempts", attempts: 2, backoff: { type: "fixed", delay: 50 }, removeOnFail: false });
    await pollUntil(async () => (await queue.getJob("max-attempts"))?.isFailed() ?? false);
    await worker.close(false);
    await queue.add("after-close", { failUntil: 0 }, { jobId: "after-close", removeOnComplete: false });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(await (await queue.getJob("after-close"))?.isWaiting(), true);
    await queue.close();
    await queue.close();
  } finally {
    await Promise.allSettled([worker.close(true), queue.close()]);
  }
});

test("outbox dispatcher publishes, recovers stale leases, deduplicates restart, and dead-letters poison events", async () => {
  const auctionId = crypto.randomUUID();
  const event = await prisma.outboxEvent.create({
    data: {
      eventType: OUTBOX_EVENT_TYPES.AUCTION_CLOSED,
      aggregateType: "auction",
      aggregateId: auctionId,
      idempotencyKey: `auction:${auctionId}:closed:v1`,
      payload: { auctionId, winnerId: null, finalPrice: "0" },
      status: OutboxStatus.PROCESSING,
      lockedAt: new Date(Date.now() - 60_000),
      lockedBy: "dead-instance",
    },
  });
  const dispatcher = createOutboxDispatcher(prisma, { instanceId: `dispatcher-${suffix}`, lockTimeoutMs: 100, baseBackoffMs: 10, maxAttempts: 1 });
  try {
    assert.equal(await dispatcher.runOnce(), 1);
    assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).status, OutboxStatus.PROCESSED);
    const queueJobId = event.idempotencyKey.replaceAll(":", "-");
    assert.ok(await getQueue(QUEUE_NAMES.AUCTION_EVENTS).getJob(queueJobId));
    assert.equal(await dispatcher.runOnce(), 0);

    const poison = await prisma.outboxEvent.create({
      data: { eventType: "POISON", aggregateType: "auction", aggregateId: auctionId, idempotencyKey: `poison:${auctionId}`, payload: {} },
    });
    assert.equal(await dispatcher.runOnce(), 1);
    assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: poison.id } })).status, OutboxStatus.DEAD_LETTER);

    const concurrentId = crypto.randomUUID();
    const concurrent = await prisma.outboxEvent.create({
      data: {
        eventType: OUTBOX_EVENT_TYPES.AUCTION_CLOSED,
        aggregateType: "auction",
        aggregateId: concurrentId,
        idempotencyKey: `auction:${concurrentId}:closed:v1`,
        payload: { auctionId: concurrentId, winnerId: null, finalPrice: "0" },
      },
    });
    const secondDispatcher = createOutboxDispatcher(prisma, { instanceId: `dispatcher-second-${suffix}`, lockTimeoutMs: 100, maxAttempts: 1 });
    try {
      const claims = await Promise.all([dispatcher.runOnce(), secondDispatcher.runOnce()]);
      assert.equal(claims.reduce((total, count) => total + count, 0), 1);
      assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: concurrent.id } })).status, OutboxStatus.PROCESSED);
    } finally {
      await secondDispatcher.stop();
    }
  } finally {
    await dispatcher.stop();
  }
});

test("outbox publish timeout retries after Redis returns", { timeout: 20_000 }, async () => {
  const auctionId = crypto.randomUUID();
  const event = await prisma.outboxEvent.create({
    data: {
      eventType: OUTBOX_EVENT_TYPES.AUCTION_CLOSED,
      aggregateType: "auction",
      aggregateId: auctionId,
      idempotencyKey: `auction:${auctionId}:closed:v1`,
      payload: { auctionId, winnerId: null, finalPrice: "0" },
    },
  });
  const unavailable = await runOutboxProbe({
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: "redis://127.0.0.1:1/15",
    OUTBOX_PUBLISH_TIMEOUT_MS: "300",
    OUTBOX_PROBE_INSTANCE: `unavailable-${suffix}`,
  });
  assert.equal(unavailable.code, 0, unavailable.output);
  const retrying = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
  assert.equal(retrying.status, OutboxStatus.PENDING);
  assert.equal(retrying.attemptCount, 1);

  await pollUntil(async () => (await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).availableAt <= new Date());
  const recovered = await runOutboxProbe({
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    OUTBOX_PUBLISH_TIMEOUT_MS: "1000",
    OUTBOX_PROBE_INSTANCE: `recovered-${suffix}`,
  });
  assert.equal(recovered.code, 0, recovered.output);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).status, OutboxStatus.PROCESSED);
});

test("readiness uses real dependency probes and fails closed for malformed/stale heartbeat", async () => {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    APP_ORIGIN: "http://localhost:3000",
    TRUSTED_PROXY_PROVIDER: "none",
    REQUIRE_WORKER_HEARTBEAT: "false",
  };
  assert.equal((await readiness(undefined, env)).ok, true);

  const unavailableRedis = new Redis("redis://127.0.0.1:1", { lazyConnect: true, connectTimeout: 100, maxRetriesPerRequest: 0, retryStrategy: () => null });
  unavailableRedis.on("error", () => undefined);
  const failed = await readiness({
    database: async () => { await prisma.$queryRaw`SELECT 1`; },
    redis: async () => { await unavailableRedis.ping(); },
    queue: async () => { await getQueue(QUEUE_NAMES.AUCTION_EXPIRY).getJobCounts(); },
    worker: async () => undefined,
  }, env);
  assert.equal(failed.ok, false);
  assert.equal(failed.dependencies.redis.ok, false);
  unavailableRedis.disconnect();

  const workerName = `ready-${suffix}`;
  process.env.REQUIRE_WORKER_HEARTBEAT = "true";
  process.env.REQUIRED_WORKER_NAME = workerName;
  process.env.WORKER_HEARTBEAT_TTL_SECONDS = "2";
  await getRedisConnection().set(`worker:heartbeat:${workerName}`, "{}", "EX", 10);
  assert.equal((await readiness()).ok, false);
  await getRedisConnection().set(`worker:heartbeat:${workerName}`, JSON.stringify({
    workerName,
    instanceId: "stale",
    hostname: "integration",
    pid: 1,
    queues: [QUEUE_NAMES.AUCTION_EXPIRY],
    status: "ready",
    lastHeartbeatAt: new Date(Date.now() - 10_000).toISOString(),
  }), "EX", 10);
  assert.equal((await readiness()).ok, false);
  process.env.REQUIRE_WORKER_HEARTBEAT = "false";
  delete process.env.REQUIRED_WORKER_NAME;
  delete process.env.WORKER_HEARTBEAT_TTL_SECONDS;
});

test("worker bootstrap succeeds with real dependencies and fails closed when MySQL or Redis is down", { timeout: 30_000 }, async () => {
  const healthy = await runWorkerProbe({ WORKER_NAME: `probe-${suffix}`, QUEUE_PREFIX: `${queuePrefix}-probe` });
  assert.equal(healthy.code, 0, healthy.output);
  assert.match(healthy.output, /worker_ready/);
  assert.match(healthy.output, /worker_shutdown_complete/);

  const databaseDown = await runWorkerProbe({ DATABASE_URL: "mysql://invalid:invalid@127.0.0.1:1/autobid_test", REDIS_URL: process.env.REDIS_URL });
  assert.equal(databaseDown.code, 1);
  assert.doesNotMatch(databaseDown.output, /worker_ready/);

  const redisDown = await runWorkerProbe({ DATABASE_URL: process.env.DATABASE_URL, REDIS_URL: "redis://127.0.0.1:1/15" });
  assert.equal(redisDown.code, 1);
  assert.doesNotMatch(redisDown.output, /worker_ready/);
});
