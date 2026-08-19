import os from "node:os";
import crypto from "node:crypto";

import { Keys, getRedisConnection } from "@/src/lib/redis";
import type { WorkerEnv } from "@/src/lib/env";

export type WorkerStatus = "starting" | "ready" | "shutting_down" | "stopped" | "failed";

export function isHeartbeatFresh(lastHeartbeatAt: string, ttlSeconds: number, now = Date.now()): boolean {
  const timestamp = Date.parse(lastHeartbeatAt);
  return Number.isFinite(timestamp) && now - timestamp <= ttlSeconds * 1000;
}

export function createHeartbeat(env: WorkerEnv, queues: string[]) {
  const instanceId = `${env.WORKER_NAME}-${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  let timer: NodeJS.Timeout | undefined;
  let currentStatus: WorkerStatus = "starting";

  async function write(status: WorkerStatus): Promise<void> {
    currentStatus = status;
    const now = new Date().toISOString();
    const payload = JSON.stringify({
      workerName: env.WORKER_NAME,
      instanceId,
      pid: process.pid,
      hostname: os.hostname(),
      startedAt,
      lastHeartbeatAt: now,
      status,
      version: env.APP_VERSION,
      queues,
    });
    const redis = getRedisConnection();
    await Promise.all([
      redis.set(Keys.workerHeartbeat(instanceId), payload, "EX", env.WORKER_HEARTBEAT_TTL_SECONDS),
      redis.set(Keys.workerHeartbeat(env.WORKER_NAME), payload, "EX", env.WORKER_HEARTBEAT_TTL_SECONDS),
    ]);
  }

  return {
    instanceId,
    write,
    start() {
      if (timer) return;
      timer = setInterval(() => {
        void write(currentStatus).catch((error) =>
          console.error(JSON.stringify({ event: "worker_heartbeat_failed", instanceId, message: error instanceof Error ? error.message : String(error) })),
        );
      }, env.WORKER_HEARTBEAT_INTERVAL_MS);
      timer.unref();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
    getStatus: () => currentStatus,
  };
}
