import { validateWebEnv } from "@/src/lib/env";
import { pingQueueSubsystem } from "@/src/lib/queue";
import { prisma } from "@/src/lib/prisma";
import { ensureRedisReady, getRedisConnection, Keys } from "@/src/lib/redis";

type Check = { ok: boolean; latencyMs: number; reason?: string };
export type ReadinessDependencies = {
  database: () => Promise<void>;
  redis: () => Promise<void>;
  queue: () => Promise<void>;
  worker: () => Promise<void>;
};

async function timed(name: string, operation: () => Promise<void>, timeoutMs: number): Promise<[string, Check]> {
  const started = Date.now();
  try {
    await Promise.race([
      operation(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return [name, { ok: true, latencyMs: Date.now() - started }];
  } catch (error) {
    const reason = error instanceof Error && error.message === "timeout" ? "timeout" : "unavailable";
    return [name, { ok: false, latencyMs: Date.now() - started, reason }];
  }
}

function defaultDependencies(): ReadinessDependencies {
  return {
    database: async () => { await prisma.$queryRaw`SELECT 1`; },
    redis: () => ensureRedisReady(getRedisConnection()),
    queue: () => pingQueueSubsystem(),
    worker: async () => {
      if (process.env.REQUIRE_WORKER_HEARTBEAT !== "true") return;
      const workerName = process.env.REQUIRED_WORKER_NAME ?? "workers";
      const value = await getRedisConnection().get(Keys.workerHeartbeat(workerName));
      if (!value) throw new Error("worker heartbeat missing");
      const payload: unknown = JSON.parse(value);
      if (typeof payload !== "object" || payload === null) throw new Error("worker heartbeat malformed");
      const heartbeat = payload as Record<string, unknown>;
      if (heartbeat.workerName !== workerName || heartbeat.status !== "ready") throw new Error("worker not ready");
      if (typeof heartbeat.instanceId !== "string" || typeof heartbeat.hostname !== "string" || typeof heartbeat.pid !== "number" || !Array.isArray(heartbeat.queues)) {
        throw new Error("worker heartbeat malformed");
      }
      const lastHeartbeatAt = typeof heartbeat.lastHeartbeatAt === "string" ? Date.parse(heartbeat.lastHeartbeatAt) : Number.NaN;
      const ttlSeconds = Number(process.env.WORKER_HEARTBEAT_TTL_SECONDS ?? "30");
      if (!Number.isFinite(lastHeartbeatAt) || Date.now() - lastHeartbeatAt > ttlSeconds * 1000) throw new Error("worker heartbeat stale");
    },
  };
}

export async function readiness(dependencies = defaultDependencies(), source: NodeJS.ProcessEnv = process.env) {
  const env = validateWebEnv(source);
  const timeoutMs = Number(source.HEALTH_CHECK_TIMEOUT_MS ?? "2000");
  const checks = await Promise.all([
    timed("database", dependencies.database, timeoutMs),
    timed("redis", dependencies.redis, timeoutMs),
    timed("queue", dependencies.queue, timeoutMs),
    timed("worker", dependencies.worker, timeoutMs),
  ]);
  const checksByName = Object.fromEntries(checks) as Record<string, Check>;
  const ok = env.ok && checks.every(([, check]) => check.ok);
  return { ok, dependencies: checksByName, environment: env.ok ? { ok: true } : { ok: false, invalid: env.invalid } };
}
