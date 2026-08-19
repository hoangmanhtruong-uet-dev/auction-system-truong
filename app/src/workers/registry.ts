import type { Worker } from "bullmq";

import { QUEUE_NAMES } from "@/src/lib/queue";
import { createAuctionExpiryWorker } from "@/src/workers/auction-expiry";
import { createAuctionEventsWorker } from "@/src/workers/auction-events";
import { createBidWorker } from "@/src/workers/bid-processor";
import { createNotificationWorker } from "@/src/workers/notification-worker";
import { createSettlementWorker } from "@/src/workers/settlement-worker";

export type WorkerRegistry = { workers: Worker[]; queues: string[] };

export function createWorkerRegistry(financialOperationsEnabled: boolean): WorkerRegistry {
  const workers: Worker[] = [createBidWorker(), createNotificationWorker(), createAuctionExpiryWorker(), createAuctionEventsWorker()];
  const queues: string[] = [QUEUE_NAMES.BID_SIDE_EFFECTS, QUEUE_NAMES.NOTIFICATIONS, QUEUE_NAMES.AUCTION_EXPIRY, QUEUE_NAMES.AUCTION_EVENTS];
  if (financialOperationsEnabled) {
    workers.push(createSettlementWorker());
    queues.push(QUEUE_NAMES.SETTLEMENT);
  }
  return { workers, queues };
}

export async function startWorkers(registry: WorkerRegistry, onFailure: (error: Error, queue: string) => void = () => undefined): Promise<void> {
  for (const worker of registry.workers) {
    void worker.run().catch((cause: unknown) => {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      console.error(JSON.stringify({ event: "worker_run_failed", queue: worker.name, message: error.message }));
      onFailure(error, worker.name);
    });
  }
  await Promise.all(registry.workers.map((worker) => worker.waitUntilReady()));
}

export async function shutdownWorkers(registry: WorkerRegistry): Promise<void> {
  const results = await Promise.allSettled(registry.workers.map((worker) => worker.close(false)));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) throw new AggregateError(failures.map((failure) => failure.reason), "Failed to close workers");
}
