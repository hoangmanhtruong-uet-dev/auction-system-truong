/**
 * Auction Cache Layer
 *
 * Lưu thông tin phiên đấu giá "HOT" (đang ACTIVE) trong Redis.
 * Đọc giá hiện tại từ RAM thay vì hit Database liên tục.
 *
 * Flow:
 * 1. Khi phiên ACTIVE → nạp vào Redis (warmAuction)
 * 2. Khi bid thành công → cập nhật cache (updateCachedPrice)
 * 3. Khi đọc giá → đọc từ cache trước, fallback DB (getCachedAuction)
 * 4. Khi phiên kết thúc → xóa cache (evictAuction)
 */

import { redis, redisRead, Keys } from "@/src/lib/redis";

export type CachedAuction = {
  id: string;
  currentPrice: string;
  winnerId: string | null;
  endsAt: string | null;
  bidStep: string;
  status: string;
};

const CACHE_TTL_SEC = 3600;
const inMemoryCache = new Map<string, { data: CachedAuction; expiresAt: number }>();

function purgeExpiredInMemory() {
  const now = Date.now();
  for (const [key, val] of inMemoryCache) {
    if (val.expiresAt < now) inMemoryCache.delete(key);
  }
}

export async function warmAuction(auction: {
  id: string;
  currentPrice: bigint;
  winnerId: string | null;
  endsAt: Date | null;
  bidStep: bigint;
  status: string;
}): Promise<void> {
  const key = Keys.auction(auction.id);
  const data: CachedAuction = {
    id: auction.id,
    currentPrice: auction.currentPrice.toString(),
    winnerId: auction.winnerId,
    endsAt: auction.endsAt?.toISOString() ?? null,
    bidStep: auction.bidStep.toString(),
    status: auction.status,
  };

  try {
    await redis.set(key, JSON.stringify(data), "EX", CACHE_TTL_SEC);
  } catch (error) {
    console.warn(JSON.stringify({ event: "auction_cache_warm_redis_failed", auctionId: auction.id, reason: error instanceof Error ? error.message : String(error) }));
  }

  purgeExpiredInMemory();
  inMemoryCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_SEC * 1000 });
}

export async function getCachedAuction(auctionId: string): Promise<CachedAuction | null> {
  const key = Keys.auction(auctionId);

  try {
    const raw = await redisRead.get(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CachedAuction;
        inMemoryCache.set(key, { data: parsed, expiresAt: Date.now() + CACHE_TTL_SEC * 1000 });
        return parsed;
      } catch {
        // ignore parse errors, fall through
      }
    }
  } catch (error) {
    console.warn(JSON.stringify({ event: "auction_cache_read_redis_failed", auctionId, reason: error instanceof Error ? error.message : String(error) }));
  }

  purgeExpiredInMemory();
  const mem = inMemoryCache.get(key);
  return mem?.data ?? null;
}

export async function updateCachedPrice(
  auctionId: string,
  newPrice: bigint,
  winnerId: string,
  endsAt?: Date | null,
): Promise<void> {
  const key = Keys.auction(auctionId);
  const cached = await getCachedAuction(auctionId);
  if (!cached) return;

  cached.currentPrice = newPrice.toString();
  cached.winnerId = winnerId;
  if (endsAt !== undefined) {
    cached.endsAt = endsAt?.toISOString() ?? null;
  }

  try {
    await redis.set(key, JSON.stringify(cached), "EX", CACHE_TTL_SEC);
  } catch (error) {
    console.warn(JSON.stringify({ event: "auction_cache_update_redis_failed", auctionId, reason: error instanceof Error ? error.message : String(error) }));
  }

  inMemoryCache.set(key, { data: cached, expiresAt: Date.now() + CACHE_TTL_SEC * 1000 });
}

export async function evictAuction(auctionId: string): Promise<void> {
  const key = Keys.auction(auctionId);

  try {
    await redis.del(key);
  } catch (error) {
    console.warn(JSON.stringify({ event: "auction_cache_evict_redis_failed", auctionId, reason: error instanceof Error ? error.message : String(error) }));
  }

  inMemoryCache.delete(key);
}