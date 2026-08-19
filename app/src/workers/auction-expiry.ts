import { AuctionStatus } from "@prisma/client";
import { Job, Worker } from "bullmq";

import { finishAuction } from "@/src/lib/auction-lifecycle";
import type { ErrorResult } from "@/src/lib/error-codes";
import { AuctionExpiryJobSchema, JOB_NAMES, QUEUE_NAMES, type AuctionExpiryJob } from "@/src/lib/queue";
import { prisma } from "@/src/lib/prisma";
import { getBullMqConnection } from "@/src/lib/redis";

function isErrorResult(value: unknown): value is ErrorResult {
  return typeof value === "object" && value !== null && "ok" in value && (value as { ok?: unknown }).ok === false;
}

export async function processAuctionExpiry(job: Job<AuctionExpiryJob>): Promise<void> {
  if (job.name !== JOB_NAMES.CLOSE_AUCTION) throw new Error(`Unsupported job: ${job.name}`);
  const { auctionId, expectedEndsAt } = AuctionExpiryJobSchema.parse(job.data);
  const context = { queue: QUEUE_NAMES.AUCTION_EXPIRY, jobId: job.id, auctionId, attempt: job.attemptsMade + 1 };

  const auction = await prisma.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    select: { id: true, status: true, endsAt: true },
  });

  if (!auction) {
    console.info(JSON.stringify({ ...context, event: "auction_expiry_skipped", result: "not_found" }));
    return;
  }
  if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.PENDING) {
    console.info(JSON.stringify({ ...context, event: "auction_expiry_skipped", result: "terminal_status", status: auction.status }));
    return;
  }
  if (!auction.endsAt || auction.endsAt.toISOString() !== expectedEndsAt) {
    console.info(JSON.stringify({ ...context, event: "auction_expiry_skipped", result: "stale_job" }));
    return;
  }
  if (auction.endsAt.getTime() > Date.now()) {
    throw new Error(`Retryable: auction ${auctionId} is not expired yet`);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${auctionId} AND deleted_at IS NULL FOR UPDATE`;
    return finishAuction(auctionId, undefined, tx, new Date());
  });

  if (isErrorResult(result)) {
    console.warn(JSON.stringify({ ...context, event: "auction_expiry_rejected", code: result.code }));
    return;
  }

  console.info(JSON.stringify({ ...context, event: "auction_expiry_completed", result: "processed", winnerId: result.winnerId }));
}

export function createAuctionExpiryWorker(): Worker<AuctionExpiryJob> {
  const worker = new Worker<AuctionExpiryJob>(QUEUE_NAMES.AUCTION_EXPIRY, processAuctionExpiry, {
    connection: getBullMqConnection(),
    prefix: process.env.QUEUE_PREFIX ?? "autobid",
    concurrency: Number(process.env.AUCTION_EXPIRY_WORKER_CONCURRENCY ?? "5"),
    autorun: false,
  });
  worker.on("failed", (job, error) =>
    console.error(JSON.stringify({ event: "job_failed", queue: QUEUE_NAMES.AUCTION_EXPIRY, jobId: job?.id, auctionId: job?.data.auctionId, message: error.message })),
  );
  worker.on("error", (error) =>
    console.error(JSON.stringify({ event: "worker_error", queue: QUEUE_NAMES.AUCTION_EXPIRY, message: error.message })),
  );
  return worker;
}
