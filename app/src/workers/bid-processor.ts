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
import { BidSideEffectJobSchema, JOB_NAMES, QUEUE_NAMES, type BidSideEffectJob } from "@/src/lib/queue";
import { getBullMqConnection } from "@/src/lib/redis";
import { prisma } from "@/src/lib/prisma";
import { NotificationType } from "@prisma/client";

async function processBidSideEffects(job: Job<BidSideEffectJob>): Promise<void> {
  if (job.name !== JOB_NAMES.PROCESS_BID) throw new Error(`Unsupported job: ${job.name}`);
  const data = BidSideEffectJobSchema.parse(job.data);

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

export function createBidWorker(): Worker<BidSideEffectJob> {
  const worker = new Worker<BidSideEffectJob>(QUEUE_NAMES.BID_SIDE_EFFECTS, processBidSideEffects, {
    connection: getBullMqConnection(),
    prefix: process.env.QUEUE_PREFIX ?? "autobid",
    concurrency: Number(process.env.BID_WORKER_CONCURRENCY ?? "10"),
    autorun: false,
    limiter: { max: 100, duration: 1000 },
  });
  worker.on("completed", (job) => console.info(JSON.stringify({ event: "job_completed", queue: QUEUE_NAMES.BID_SIDE_EFFECTS, jobId: job.id })));
  worker.on("failed", (job, error) => console.error(JSON.stringify({ event: "job_failed", queue: QUEUE_NAMES.BID_SIDE_EFFECTS, jobId: job?.id, message: error.message })));
  worker.on("error", (error) => console.error(JSON.stringify({ event: "worker_error", queue: QUEUE_NAMES.BID_SIDE_EFFECTS, message: error.message })));
  return worker;
}
