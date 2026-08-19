import { Queue, Worker } from "bullmq";

import { getBullMqConnection } from "../src/lib/redis";
import { shutdownWorkers, type WorkerRegistry } from "../src/workers/registry";

const queueName = "shutdown-verification";
const prefix = process.env.QUEUE_PREFIX ?? "shutdown-verification";
const jobDurationMs = Number(process.env.PROBE_JOB_DURATION_MS ?? "3000");
const shutdownTimeoutMs = Number(process.env.PROBE_SHUTDOWN_TIMEOUT_MS ?? "10000");
const cleanupDelayMs = Number(process.env.PROBE_CLEANUP_DELAY_MS ?? "0");
const mode = process.env.PROBE_MODE ?? "active";
const queue = new Queue(queueName, { connection: getBullMqConnection(), prefix });
const worker = new Worker(queueName, async (job) => {
  const client = await queue.client;
  await client.set(`probe:${prefix}:started:${job.id}`, "1", { EX: 60 });
  await new Promise((resolve) => setTimeout(resolve, jobDurationMs));
  const completedKey = `probe:${prefix}:completed:${job.id}`;
  const completed = Number(await client.get(completedKey) ?? "0") + 1;
  await client.set(completedKey, completed, { EX: 60 });
}, {
  connection: getBullMqConnection(),
  prefix,
  autorun: false,
  concurrency: 1,
  lockDuration: Number(process.env.PROBE_LOCK_DURATION_MS ?? "2000"),
  stalledInterval: Number(process.env.PROBE_STALLED_INTERVAL_MS ?? "1000"),
  maxStalledCount: 1,
});
const registry: WorkerRegistry = { workers: [worker], queues: [queueName] };

let shutdownPromise: Promise<void> | undefined;
let cleanupExecutions = 0;
let shuttingDown = false;

function shutdown(reason: string): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    shuttingDown = true;
    cleanupExecutions++;
    console.info(JSON.stringify({ event: "probe_shutdown_start", reason, cleanupExecutions }));
    if (cleanupDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, cleanupDelayMs));
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Probe shutdown exceeded ${shutdownTimeoutMs}ms`)), shutdownTimeoutMs);
    });
    try {
      await Promise.race([
        (async () => {
          await shutdownWorkers(registry);
          await queue.close();
        })(),
        timeout,
      ]);
      if (timer) clearTimeout(timer);
      console.info(JSON.stringify({ event: "probe_shutdown_complete", reason, cleanupExecutions }));
      process.exitCode = 0;
    } catch (error) {
      console.error(JSON.stringify({ event: "probe_shutdown_timeout", reason, cleanupExecutions, message: error instanceof Error ? error.message : String(error) }));
      await Promise.allSettled([worker.close(true), queue.close()]);
      process.exitCode = 1;
    }
  })();
  return shutdownPromise;
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => { void shutdown(signal); });
}

async function main(): Promise<void> {
  void worker.run().catch((error) => {
    if (!shuttingDown) throw error;
  });
  await worker.waitUntilReady();
  const client = await queue.client;
  await client.set(`probe:${prefix}:ready`, "1", { EX: 60 });
  if (mode === "active") {
    await queue.add("controlled", {}, { jobId: "first", attempts: 2, removeOnComplete: false, removeOnFail: false });
    await queue.add("controlled", {}, { jobId: "second", attempts: 2, removeOnComplete: false, removeOnFail: false });
  }
  console.info(JSON.stringify({ event: "probe_ready", mode, prefix }));
}

void main().catch(async (error) => {
  console.error(JSON.stringify({ event: "probe_failed", message: error instanceof Error ? error.message : String(error) }));
  await shutdown("bootstrapFailure");
  process.exitCode = 1;
});
