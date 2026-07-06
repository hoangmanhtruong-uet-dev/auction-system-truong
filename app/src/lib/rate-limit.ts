type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; retryAfterSeconds: number; resetAt: number };

// ponytail: In-memory Map tốt cho single-instance MVP.
//   Limitations:
//   - Không hoạt động trên multi-instance/serverless
//   - Không có cleanup → có thể leak memory lâu ngày
//   - Khi deploy multi-instance, mỗi instance sẽ có bucket riêng (tách biệt)
//
//   Production scale:
//   - Thay bằng Redis (ioredis) với cùng interface
//   - Hoặc tạo table `bid_rate_limits` trong DB với TTL
//   Xem KNOWN_ISSUES.md mục "Remaining production risks".
const buckets = new Map<string, RateLimitEntry>();

// Clean expired buckets every 5 minutes để tránh memory leak
// ponytail: Không cần cleanup khi dùng Redis/DB TTL
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function cleanupExpiredBuckets() {
  const now = nowMs();
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function nowMs() {
  return Date.now();
}

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = nowMs();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.limit - 1, resetAt };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function getRateLimitErrorMessage(result: Extract<RateLimitResult, { allowed: false }>) {
  return `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${result.retryAfterSeconds} giây.`;
}

export function clearRateLimitBucketsForTests() {
  buckets.clear();
}

// Start cleanup timer khi module load
// ponytail: Cleanup không cần thiết khi dùng Redis/DB TTL
if (typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "test") {
  cleanupTimer = setInterval(cleanupExpiredBuckets, CLEANUP_INTERVAL_MS);
  // Prevent process from exiting khi chạy trong CLI
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}
