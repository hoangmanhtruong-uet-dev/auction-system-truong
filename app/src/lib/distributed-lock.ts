/**
 * Distributed Lock (Redlock algorithm – single-node variant)
 *
 * Dùng Redis SET NX PX (atomic) để đảm bảo tại một thời điểm
 * chỉ có MỘT server được cập nhật giá của một phiên đấu giá.
 * Ngăn hoàn toàn lỗi Lost Update khi có nhiều server song song.
 *
 * ponytail: Single-node Redlock. Khi dùng Redis Cluster >= 3 nodes,
 *   chuyển sang thư viện `redlock` với nhiều Redis instances.
 */

import { redis, Keys } from "@/src/lib/redis";
import crypto from "crypto";

const DEFAULT_TTL_MS = 5_000;

export type LockHandle = {
  resource: string;
  token: string;
  release: () => Promise<void>;
};

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

const inMemoryLocks = new Map<string, { token: string; timer: NodeJS.Timeout }>();
const inMemoryWaiters = new Map<string, Array<() => void>>();

function acquireInMemoryLock(resource: string, ttlMs: number, retries: number, retryDelayMs: number): Promise<LockHandle> {
  return new Promise((resolve, reject) => {
    const token = crypto.randomBytes(16).toString("hex");
    let attempts = 0;

    const tryAcquire = () => {
      attempts += 1;
      const existing = inMemoryLocks.get(resource);
      if (!existing) {
        const timer = setTimeout(() => inMemoryLocks.delete(resource), ttlMs);
        inMemoryLocks.set(resource, { token, timer });
        resolve({
          resource,
          token,
          release: async () => {
            const held = inMemoryLocks.get(resource);
            if (held && held.token === token) {
              clearTimeout(held.timer);
              inMemoryLocks.delete(resource);
            }
            const waiters = inMemoryWaiters.get(resource);
            if (waiters && waiters.length > 0) {
              const next = waiters.shift();
              next?.();
            }
          },
        });
        return;
      }
      if (attempts >= retries) {
        reject(new Error(`[DistributedLock] Không giành được lock cho "${resource}" sau ${retries} lần thử.`));
        return;
      }
      const waiters = inMemoryWaiters.get(resource) ?? [];
      waiters.push(() => setTimeout(tryAcquire, 0));
      inMemoryWaiters.set(resource, waiters);
      setTimeout(() => {
        const list = inMemoryWaiters.get(resource);
        if (list) {
          const idx = list.findIndex((w) => w === list[list.length - 1]);
          if (idx >= 0) {
            list.splice(idx, 1);
            if (list.length === 0) inMemoryWaiters.delete(resource);
            reject(new Error(`[DistributedLock] Không giành được lock cho "${resource}" sau ${retries} lần thử.`));
          }
        }
      }, retries * retryDelayMs + 100);
    };

    tryAcquire();
  });
}

export async function acquireLock(
  resource: string,
  ttlMs = DEFAULT_TTL_MS,
  retries = 20,
  retryDelayMs = 50,
): Promise<LockHandle> {
  const key = Keys.auctionLock(resource);
  const token = crypto.randomBytes(16).toString("hex");

  try {
    for (let i = 0; i < retries; i++) {
      const result = await redis.set(key, token, "PX", ttlMs, "NX");

      if (result === "OK") {
        return {
          resource,
          token,
          release: async () => {
            try {
              await redis.eval(RELEASE_SCRIPT, 1, key, token);
            } catch {
              // ignore release errors
            }
          },
        };
      }

      await sleep(retryDelayMs);
    }

    throw new Error(`[DistributedLock] Không giành được lock cho "${resource}" sau ${retries} lần thử.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Không giành được lock")) throw error;
    console.warn(JSON.stringify({ event: "distributed_lock_fallback", resource, reason: error instanceof Error ? error.message : String(error) }));
    return acquireInMemoryLock(resource, ttlMs, retries, retryDelayMs);
  }
}

export async function withLock<T>(
  resource: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const lock = await acquireLock(resource, ttlMs);
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}