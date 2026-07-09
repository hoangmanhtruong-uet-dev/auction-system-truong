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

const CACHE_TTL_SEC = 3600; // 1 giờ, tự refresh khi có bid mới

/**
 * Nạp thông tin phiên đấu giá vào Redis cache.
 */
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

  await redis.set(key, JSON.stringify(data), "EX", CACHE_TTL_SEC);
}

/**
 * Đọc thông tin phiên đấu giá từ Redis. null nếu chưa cache.
 */
export async function getCachedAuction(auctionId: string): Promise<CachedAuction | null> {
  const raw = await redisRead.get(Keys.auction(auctionId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CachedAuction;
  } catch {
    return null;
  }
}

/**
 * Cập nhật giá hiện tại + winnerId trong cache sau khi bid thành công.
 */
export async function updateCachedPrice(
  auctionId: string,
  newPrice: bigint,
  winnerId: string,
  endsAt?: Date | null,
): Promise<void> {
  const cached = await getCachedAuction(auctionId);
  if (!cached) return; // chưa được warm → bỏ qua

  cached.currentPrice = newPrice.toString();
  cached.winnerId = winnerId;
  if (endsAt !== undefined) {
    cached.endsAt = endsAt?.toISOString() ?? null;
  }

  await redis.set(Keys.auction(auctionId), JSON.stringify(cached), "EX", CACHE_TTL_SEC);
}

/**
 * Xóa cache khi phiên kết thúc / hủy.
 */
export async function evictAuction(auctionId: string): Promise<void> {
  await redis.del(Keys.auction(auctionId));
}