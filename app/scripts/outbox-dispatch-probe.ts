import { createOutboxDispatcher } from "../src/lib/outbox";
import { closeAllQueues } from "../src/lib/queue";
import { prisma } from "../src/lib/prisma";
import { closeRedisConnections } from "../src/lib/redis";

async function main(): Promise<void> {
  const dispatcher = createOutboxDispatcher(prisma, {
    instanceId: process.env.OUTBOX_PROBE_INSTANCE ?? "outbox-probe",
    publishTimeoutMs: Number(process.env.OUTBOX_PUBLISH_TIMEOUT_MS ?? "500"),
    baseBackoffMs: 10,
    maxAttempts: 3,
  });
  try {
    const claimed = await dispatcher.runOnce();
    console.info(JSON.stringify({ event: "outbox_probe_complete", claimed }));
  } finally {
    await dispatcher.stop();
    await Promise.allSettled([closeAllQueues(), closeRedisConnections(), prisma.$disconnect()]);
  }
}

void main().catch((error) => {
  console.error(JSON.stringify({ event: "outbox_probe_failed", message: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
