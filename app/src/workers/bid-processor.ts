/**
 * Worker: Bid Side Effects
 *
 * Nhặt job từ queue "bid-side-effects" và xử lý:
 * - Ghi lịch sử đấu giá vào DB
 * - Gửi notification cho người bị outbid
 * - Publish sự kiện Pub/Sub cho realtime clients
 *
 * Chạy riêng: `npx tsx app/src/workers/bid-processor.ts`
 */

import { Worker, Job } from "bullmq";
import { publishBidEvent } from "@/src/lib/pubsub";
import { enqueueNotification } from "@/src/lib/queue";
import type { BidSideEffectJob } from "@/src/lib/queue";
import { prisma } from "@/src/lib/prisma";
import { NotificationType } from "@prisma/client";

const workerConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD ?? undefined,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
};
async function processBidSideEffects(job: Job<BidSideEffectJob>): Promise<void> {
  const data = job.data;

  // 1. Publish realtime event via Redis Pub/Sub
  await publishBidEvent({
    auctionId: data.auctionId,
    bidId: data.bidId,
    bidderId: data.bidderId,
    bidderName: data.bidderName,
    amount: data.amount,
    previousPrice: data.previousPrice,
    endsAt: data.endsAt,
    autoExtended: data.autoExtended,
    timestamp: new Date().toISOString(),
  });

  // 2. Notify previous winner (outbid)
  if (data.winnerId !== data.bidderId) {
    // Tìm người bị outbid (winner cũ)
    const previousBids = await prisma.bid.findMany({
      where: {
        auctionId: data.auctionId,
        status: "LOST",
        bidderId: { not: data.bidderId },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { bidderId: true },
    });

    const outbidUserId = previousBids[0]?.bidderId;
    if (outbidUserId) {
      await enqueueNotification({
        type: "BID_OUTBID",
        recipientId: outbidUserId,
        auctionId: data.auctionId,
        title: "Bạn đã bị vượt giá!",
        message: `Có người đặt giá ${data.amount} cho phiên đấu giá.`,
        metadata: { bidId: data.bidId, newPrice: data.amount },
      });
    }
  }

  // 3. Tạo notification in-app cho seller
  const auction = await prisma.auction.findUnique({
    where: { id: data.auctionId },
    select: { sellerId: true, title: true },
  });

  if (auction) {
    await prisma.notification.create({
      data: {
        profileId: auction.sellerId,
        auctionId: data.auctionId,
        type: NotificationType.BID_PLACED,
        title: "Có lượt đặt giá mới",
        message: `${data.bidderName} đã đặt giá ${data.amount} cho "${auction.title}".`,
        metadata: JSON.parse(JSON.stringify({ bidId: data.bidId, amount: data.amount })),
      },
    });
  }

  console.log(`[BidWorker] Processed bid ${data.bidId} for auction ${data.auctionId}`);
}

// ─── Start Worker ────────────────────────────────────────────────────────────

const worker = new Worker("bid-side-effects", processBidSideEffects, {
  connection: workerConnection,
  concurrency: 10,
  limiter: {
    max: 100,
    duration: 1000,
  },
});

worker.on("completed", (job) => {
  console.log(`[BidWorker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[BidWorker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[BidWorker] Worker error:", err.message);
});

console.log("[BidWorker] Started. Waiting for jobs...");