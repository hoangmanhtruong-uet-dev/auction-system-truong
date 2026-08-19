import { getRedisConnection } from "@/src/lib/redis";
import { emitSecurityEvent } from "@/src/lib/security-events";

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; retryAfterSeconds: number; resetAt: number };

const FIXED_WINDOW_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

export async function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const now = Date.now();
  const redisKey = `${process.env.RATE_LIMIT_REDIS_PREFIX ?? "autobid"}:rate-limit:${key}`;
  try {
    const [count, ttl] = (await getRedisConnection().eval(
      FIXED_WINDOW_SCRIPT,
      1,
      redisKey,
      String(options.windowMs),
    )) as [number, number];
    const resetAt = now + Math.max(0, ttl);
    if (count > options.limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)), resetAt };
    }
    return { allowed: true, remaining: Math.max(0, options.limit - count), resetAt };
  } catch (error) {
    const failOpen = process.env.RATE_LIMIT_FAILURE_MODE === "open" && process.env.NODE_ENV !== "production";
    console.error(JSON.stringify({ event: "rate_limit_unavailable", failureMode: failOpen ? "open" : "closed", message: error instanceof Error ? error.message : String(error) }));
    emitSecurityEvent("redis_unavailable", { resourceId: "rate-limit", failureMode: failOpen ? "open" : "closed" });
    if (failOpen) return { allowed: true, remaining: options.limit, resetAt: now + options.windowMs };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)), resetAt: now + options.windowMs };
  }
}

export function getRateLimitErrorMessage(result: Extract<RateLimitResult, { allowed: false }>) {
  return `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${result.retryAfterSeconds} giây.`;
}
