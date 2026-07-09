/**
 * Worker: Auction Expiry (TTL + Dead Letter pattern)
 *
 * Thay vì quét DB liên tục tìm phiên hết hạn, dùng BullMQ delayed jobs.
 * Khi tạo phiên → schedule job với delay = (endsAt - now).
 * Khi delay hết → job được thực thi → đóng phiên, tìm người thắng.
 *
 * Anti-snipe: Khi phiên gia hạn, job cũ bị xóa, job mới được tạo
 *   với delay mới = (newEndsAt - now).
 *
 * Chạy riêng: `npx tsx app/src/workers/auction-expiry.ts`
 */

import { Worker, Job } from "bullmq";
import { prisma } from "@/src/lib/prisma";
import { evictAuction } from "@/src/lib/auction-cache";
import { publishAuctionEnded } from "@/src/lib/pubsub";
import { enqueueNotification } from "@/src/lib/queue";
import type { AuctionExpiryJob } from "@/src/lib/queue";
import { finishAuction } from "@/src/lib/auction-lifecycle";
import { AuctionStatus } from "@prisma/client";

const workerConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD ?? undefined,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
};

async function processAuctionExpiry(job: Job<AuctionExpiryJob>): Promise<void> {
  const { auctionId, expectedEndsAt } = job.data;

  // Double-check: phiên có thực sự hết giờ không?
  // (Có thể đã bị gia hạn bởi anti-snipe)
  const auction = await prisma.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    select: {
      id: true,
      status: true,
      endsAt: true,
      currentPrice: true,
      winnerId: true,
      title: true,
      sellerId: true,
    },
  });

  if (!auction) {
    console.log(`[ExpiryWorker] Auction ${auctionId} not found, skipping.`);
    return;
  }

  // Nếu phiên đã kết thúc hoặc bị hủy → bỏ qua
  if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.PENDING) {
    console.log(`[ExpiryWorker] Auction ${auctionId} status=${auction.status}, skipping.`);
    return;
  }

  // Nếu phiên đã được gia hạn hoặc endsAt bị null → bỏ qua
  if (!auction.endsAt || auction.endsAt.toISOString() !== expectedEndsAt) {
    console.log(`[ExpiryWorker] Auction ${auctionId} endsAt is null or was extended, skipping stale job.`);
    return;
  }

  // Đóng phiên đấu giá
  const updatedAuction = await prisma.$transaction(async (tx) => {
    // Pessimistic lock
    await tx.$queryRaw`
      SELECT id FROM auctions WHERE id = ${auctionId} AND deleted_at IS NULL FOR UPDATE
    `;

    return finishAuction(auctionId, undefined, tx, new Date());
  });

  if (!updatedAuction || ("success" in updatedAuction && (updatedAuction as any).success === false)) {
    console.log(`[ExpiryWorker] Auction ${auctionId} could not be closed:`, updatedAuction);
    return;
  }

  const finalAuction = updatedAuction as any;

  // Xóa cache
  await evictAuction(auctionId);

  // Publish event realtime
  await publishAuctionEnded(
    auctionId,
    finalAuction.winnerId,
    finalAuction.currentPrice.toString(),
  );

  // Notify winner + seller
  if (finalAuction.winnerId) {
    await enqueueNotification({
      type: "AUCTION_WON",
      recipientId: finalAuction.winnerId,
      auctionId,
      title: "Bạn đã thắng đấu giá!",
      message: `Chúc mừng! Bạn đã thắng phiên đấu giá "${finalAuction.title}".`,
      metadata: { finalPrice: finalAuction.currentPrice.toString() },
    });
  }

  await enqueueNotification({
    type: "AUCTION_ENDED",
    recipientId: finalAuction.sellerId,
    auctionId,
    title: "Phiên đấu giá đã kết thúc",
    message: finalAuction.winnerId
      ? `Phiên "${finalAuction.title}" đã kết thúc với giá ${finalAuction.currentPrice}.`
      : `Phiên "${finalAuction.title}" đã kết thúc mà không có người đặt giá.`,
    metadata: { winnerId: finalAuction.winnerId, finalPrice: finalAuction.currentPrice.toString() },
  });

  console.log(`[ExpiryWorker] Auction ${auctionId} finalized. Winner: ${finalAuction.winnerId ?? "none"}`);
}

// ─── Start Worker ────────────────────────────────────────────────────────────

const worker = new Worker("auction-expiry", processAuctionExpiry, {
  connection: workerConnection,
  concurrency: 5,
});

worker.on("completed", (job) => {
  console.log(`[ExpiryWorker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[ExpiryWorker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[ExpiryWorker] Worker error:", err.message);
});

console.log("[ExpiryWorker] Started. Waiting for delayed jobs...");