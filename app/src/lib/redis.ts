/**
 * Redis Client Singleton
 *
 * Ba client riêng biệt để tránh block nhau:
 * - `redis`   : Ghi dữ liệu + Pub (phát message)
 * - `redisSub`: Chỉ dùng cho Subscribe (ioredis yêu cầu client riêng khi subscribe)
 * - `redisRead`: Kết nối đến Read Replica – chỉ đọc
 *
 * ponytail: Dùng single-node Redis. Khi scale, chuyển sang Redis Cluster
 *   bằng cách thay `new Redis(...)` thành `new Redis.Cluster([...nodes])`.
 */

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
// Read replica riêng. Nếu không có, fallback về primary.
const REDIS_READ_URL = process.env.REDIS_READ_URL ?? REDIS_URL;

function makeClient(url: string, lazyConnect = true): Redis {
  const client = new Redis(url, {
    lazyConnect,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    enableReadyCheck: true,
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  return client;
}

// ─── Global singletons (Next.js hot-reload safe) ─────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
  // eslint-disable-next-line no-var
  var __redisSub: Redis | undefined;
  // eslint-disable-next-line no-var
  var __redisRead: Redis | undefined;
}

export const redis: Redis = globalThis.__redis ?? makeClient(REDIS_URL);
export const redisSub: Redis = globalThis.__redisSub ?? makeClient(REDIS_URL);
export const redisRead: Redis =
  globalThis.__redisRead ?? makeClient(REDIS_READ_URL);

if (process.env.NODE_ENV !== "production") {
  globalThis.__redis = redis;
  globalThis.__redisSub = redisSub;
  globalThis.__redisRead = redisRead;
}

// ─── Key helpers ─────────────────────────────────────────────────────────────
export const Keys = {
  auction: (id: string) => `auction:${id}`,
  auctionBid: (id: string) => `auction:${id}:bid`,
  auctionLock: (id: string) => `lock:auction:${id}`,
  bidChannel: (id: string) => `channel:bid:${id}`,
  userWallet: (userId: string) => `wallet:${userId}`,
} as const;