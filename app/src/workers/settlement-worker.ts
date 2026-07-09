/**
 * Worker: Settlement Processing
 *
 * Picks jobs from "settlement" queue and runs the full settleAuction pipeline:
 * freeze → settle → split (platform fee + seller payout) → mark PAID.
 *
 * Run standalone: `npx tsx app/src/workers/settlement-worker.ts`
 */

import { Worker } from "bullmq";
import { prisma } from "@/src/lib/prisma";
import { settleAuction } from "@/src/lib/settlement";
import { processForfeitAuction } from "@/src/lib/auction-lifecycle";
import type { ForfeitJob, SettlementJob } from "@/src/lib/queue";

const workerConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD ?? undefined,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
};

async function processSettlement(job: { data: SettlementJob }): Promise<void> {
  const { auctionId, winnerProfileId, sellerProfileId, finalPrice } = job.data;

  console.log(`[SettlementWorker] Starting settlement for auction ${auctionId}`);

  const result = await prisma.$transaction(async (tx) => {
    return settleAuction(
      auctionId,
      winnerProfileId,
      sellerProfileId,
      BigInt(finalPrice),
      tx as any,
    );
  });

  if (!result.ok) {
    if (result.code === "DUPLICATE_SETTLEMENT") {
      console.warn(`[SettlementWorker] Auction ${auctionId} has already been settled (duplicate job). Marking as success.`);
      return;
    }
    throw new Error(`Settlement failed for auction ${auctionId}: ${result.message}`);
  }

  console.log(
    `[SettlementWorker] Settled auction ${auctionId}: ` +
    `fee=${result.data.platformFee}, sellerPayout=${result.data.sellerPayout}`,
  );
}

async function processForfeit(job: { data: ForfeitJob }): Promise<void> {
  const { auctionId } = job.data;
  console.log(`[SettlementWorker] Processing forfeit for auction ${auctionId}`);

  const result = await prisma.$transaction(async (tx) => {
    return processForfeitAuction(auctionId, tx);
  });

  if (!result || (result as any).code) {
    throw new Error(`Forfeit failed for auction ${auctionId}: ${(result as any).message}`);
  }

  console.log(`[SettlementWorker] Forfeited auction ${auctionId}`);
}

const worker = new Worker("settlement", async (job) => {
  switch (job.name) {
    case "process-settlement":
      await processSettlement(job as any);
      break;
    case "process-forfeit":
      await processForfeit(job as any);
      break;
    default:
      throw new Error(`Unknown job name: ${job.name}`);
  }
}, {
  connection: workerConnection,
  concurrency: 5,
  limiter: { max: 20, duration: 1000 },
});

worker.on("completed", (job) => {
  console.log(`[SettlementWorker] Job ${job?.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[SettlementWorker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[SettlementWorker] Worker error:", err.message);
});

console.log("[SettlementWorker] Started. Waiting for settlement jobs...");