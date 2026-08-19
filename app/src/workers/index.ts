import { validateWorkerEnv } from "@/src/lib/env";
import { createOutboxDispatcher } from "@/src/lib/outbox";
import { closeAllQueues } from "@/src/lib/queue";
import { prisma } from "@/src/lib/prisma";
import { closeRedisConnections, ensureRedisReady, getRedisConnection } from "@/src/lib/redis";
import { createHeartbeat, type WorkerStatus } from "@/src/workers/heartbeat";
import { createWorkerRegistry, shutdownWorkers, startWorkers, type WorkerRegistry } from "@/src/workers/registry";

export interface WorkerRuntime {
  start(): Promise<void>;
  shutdown(reason: string, exitCode?: number): Promise<void>;
  isReady(): boolean;
  getStatus(): WorkerStatus;
}

export function createWorkerRuntime(): WorkerRuntime {
  let registry: WorkerRegistry | undefined;
  let heartbeat: ReturnType<typeof createHeartbeat> | undefined;
  let dispatcher: ReturnType<typeof createOutboxDispatcher> | undefined;
  let status: WorkerStatus = "starting";
  let shutdownPromise: Promise<void> | undefined;
  let started = false;
  let shutdownTimeoutMs = Number(process.env.WORKER_SHUTDOWN_TIMEOUT_MS ?? "30000");

  async function markFailed(error: Error, queue: string): Promise<void> {
    status = "failed";
    heartbeat?.stop();
    await heartbeat?.write("failed").catch((heartbeatError) => {
      console.error(JSON.stringify({ event: "worker_heartbeat_failed", message: heartbeatError instanceof Error ? heartbeatError.message : String(heartbeatError) }));
    });
    console.error(JSON.stringify({ event: "worker_runtime_failed", queue, message: error.message }));
    await runtime.shutdown(`runtimeFailure:${queue}`, 1);
  }

  const runtime: WorkerRuntime = {
    async start(): Promise<void> {
      if (started) return;
      const env = validateWorkerEnv();
      shutdownTimeoutMs = env.WORKER_SHUTDOWN_TIMEOUT_MS;
      await prisma.$queryRaw`SELECT 1`;
      await ensureRedisReady(getRedisConnection());

      registry = createWorkerRegistry(env.FINANCIAL_OPERATIONS_ENABLED === "true");
      heartbeat = createHeartbeat(env, registry.queues);
      dispatcher = createOutboxDispatcher(prisma);
      await heartbeat.write("starting");
      await startWorkers(registry, (error, queue) => {
        if (status === "starting" || status === "ready") void markFailed(error, queue);
      });
      dispatcher.start();
      heartbeat.start();
      await heartbeat.write("ready");
      status = "ready";
      started = true;
      console.info(JSON.stringify({ event: "worker_ready", instanceId: heartbeat.instanceId, queues: registry.queues }));
    },

    shutdown(reason: string, exitCode = 0): Promise<void> {
      if (shutdownPromise) return shutdownPromise;
      shutdownPromise = (async () => {
        status = exitCode === 0 ? "shutting_down" : "failed";
        console.info(JSON.stringify({ event: "worker_shutdown_start", reason }));
        heartbeat?.stop();
        if (heartbeat) await heartbeat.write(status);

        let timeout: NodeJS.Timeout | undefined;
        const timedOut = new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error(`Worker shutdown exceeded ${shutdownTimeoutMs}ms`)), shutdownTimeoutMs);
          timeout.unref();
        });
        const cleanup = (async () => {
          await dispatcher?.stop();
          if (registry) await shutdownWorkers(registry);
          await closeAllQueues();
          if (heartbeat) await heartbeat.write(exitCode === 0 ? "stopped" : "failed");
          await prisma.$disconnect();
          await closeRedisConnections();
        })();

        try {
          await Promise.race([cleanup, timedOut]);
          if (timeout) clearTimeout(timeout);
          status = exitCode === 0 ? "stopped" : "failed";
          process.exitCode = exitCode;
          console.info(JSON.stringify({ event: "worker_shutdown_complete", reason, exitCode }));
        } catch (error) {
          status = "failed";
          process.exitCode = 1;
          console.error(JSON.stringify({ event: "worker_shutdown_failed", reason, unfinishedJobsPossible: true, message: error instanceof Error ? error.message : String(error) }));
          await Promise.allSettled([prisma.$disconnect(), closeRedisConnections()]);
        }
      })();
      return shutdownPromise;
    },

    isReady: () => status === "ready",
    getStatus: () => status,
  };

  return runtime;
}

let activeRuntime: WorkerRuntime | undefined;
let signalsRegistered = false;

export async function bootstrapWorkers(): Promise<WorkerRuntime> {
  activeRuntime ??= createWorkerRuntime();
  registerSignalHandlers();
  await activeRuntime.start();
  return activeRuntime;
}

export function shutdownWorkerProcess(reason: string, exitCode = 0): Promise<void> {
  activeRuntime ??= createWorkerRuntime();
  return activeRuntime.shutdown(reason, exitCode);
}

function registerSignalHandlers(): void {
  if (signalsRegistered) return;
  signalsRegistered = true;
  process.on("SIGTERM", () => { void shutdownWorkerProcess("SIGTERM"); });
  process.on("SIGINT", () => { void shutdownWorkerProcess("SIGINT"); });
  process.once("unhandledRejection", (reason) => {
    console.error(JSON.stringify({ event: "unhandled_rejection", message: reason instanceof Error ? reason.message : String(reason) }));
    void shutdownWorkerProcess("unhandledRejection", 1);
  });
  process.once("uncaughtException", (error) => {
    console.error(JSON.stringify({ event: "uncaught_exception", message: error.message }));
    void shutdownWorkerProcess("uncaughtException", 1);
  });
}

const isEntrypoint = process.argv[1]?.replace(/\\/g, "/").endsWith("/src/workers/index.ts");
if (isEntrypoint) {
  void bootstrapWorkers().catch(async (error) => {
    console.error(JSON.stringify({ event: "worker_bootstrap_failed", message: error instanceof Error ? error.message : String(error) }));
    await shutdownWorkerProcess("bootstrapFailure", 1);
  });
}
