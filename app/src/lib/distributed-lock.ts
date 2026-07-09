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

export async function acquireLock(
  resource: string,
  ttlMs = DEFAULT_TTL_MS,
  retries = 20,
  retryDelayMs = 50,
): Promise<LockHandle> {
  const key = Keys.auctionLock(resource);
  const token = crypto.randomBytes(16).toString("hex");

  for (let i = 0; i < retries; i++) {
    const result = await redis.set(key, token, "PX", ttlMs, "NX");

    if (result === "OK") {
      return {
        resource,
        token,
        release: async () => {
          await redis.eval(RELEASE_SCRIPT, 1, key, token);
        },
      };
    }

    await sleep(retryDelayMs);
  }

  throw new Error(`[DistributedLock] Không giành được lock cho "${resource}" sau ${retries} lần thử.`);
}

/**
 * Tiện ích: Chạy fn bên trong lock, tự release sau khi xong.
 */
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