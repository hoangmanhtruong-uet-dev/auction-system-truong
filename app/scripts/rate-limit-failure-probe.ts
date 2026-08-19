import assert from "node:assert/strict";

import { checkRateLimit } from "../src/lib/rate-limit";
import { closeRedisConnections } from "../src/lib/redis";

async function main(): Promise<void> {
  assert.equal(process.env.NODE_ENV, "production");
  const result = await checkRateLimit("redis-unavailable-probe", { limit: 3, windowMs: 1_000 });
  assert.equal(result.allowed, false);
  console.info(JSON.stringify({ event: "rate_limit_failure_probe_passed", allowed: result.allowed }));
}

void main()
  .catch((error) => {
    console.error(JSON.stringify({ event: "rate_limit_failure_probe_failed", message: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeRedisConnections();
  });
