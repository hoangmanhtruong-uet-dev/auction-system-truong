/**
 * Worker: Notifications
 *
 * Nhặt job từ queue "notifications" và gửi:
 * - In-app notification (ghi DB)
 * - Push notification (placeholder – thêm Firebase/OneSignal sau)
 * - Email notification (placeholder – thêm Nodemailer/SES sau)
 *
 * Chạy riêng: `npx tsx app/src/workers/notification-worker.ts`
 */

import { Worker, Job } from "bullmq";
import { prisma } from "@/src/lib/prisma";
import { NotificationType } from "@prisma/client";
import type { NotificationJob } from "@/src/lib/queue";

const workerConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD ?? undefined,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
};

const TYPE_MAP: Record<NotificationJob["type"], NotificationType> = {
  BID_OUTBID: NotificationType.BID_OUTBID,
  AUCTION_WON: NotificationType.BID_WON,
  AUCTION_ENDED: NotificationType.AUCTION_ENDED,
  AUCTION_STARTING: NotificationType.AUCTION_ACTIVATED,
};

async function processNotification(job: Job<NotificationJob>): Promise<void> {
  const data = job.data;
  const typeMapped = TYPE_MAP[data.type] ?? NotificationType.SYSTEM;

  // Check if an identical notification was recently created to prevent double-writes/duplicates
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const existing = await prisma.notification.findFirst({
    where: {
      profileId: data.recipientId,
      auctionId: data.auctionId,
      type: typeMapped,
      createdAt: { gte: oneMinuteAgo }
    }
  });

  if (existing) {
    console.warn(`[NotifWorker] Notification of type ${data.type} was already created recently. Skipping duplicate insert.`);
    return;
  }

  // 1. Ghi in-app notification vào DB
  await prisma.notification.create({
    data: {
      profileId: data.recipientId,
      auctionId: data.auctionId,
      type: typeMapped,
      title: data.title,
      message: data.message,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
    },
  });

  // 2. Push notification (placeholder)
  // ponytail: Thêm Firebase Cloud Messaging hoặc OneSignal khi cần.

  // 3. Email notification (placeholder)
  // ponytail: Thêm Nodemailer/SES khi cần gửi email.

  console.log(`[NotifWorker] Sent ${data.type} to ${data.recipientId} for auction ${data.auctionId}`);
}

// ─── Start Worker ────────────────────────────────────────────────────────────

const worker = new Worker("notifications", processNotification, {
  connection: workerConnection,
  concurrency: 20,
  limiter: {
    max: 200,
    duration: 1000,
  },
});

worker.on("completed", (job) => {
  console.log(`[NotifWorker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[NotifWorker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[NotifWorker] Worker error:", err.message);
});

console.log("[NotifWorker] Started. Waiting for jobs...");