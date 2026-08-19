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
import { NotificationJobSchema, QUEUE_NAMES, type NotificationJob } from "@/src/lib/queue";
import { getBullMqConnection } from "@/src/lib/redis";

const TYPE_MAP: Record<NotificationJob["type"], NotificationType> = {
  BID_OUTBID: NotificationType.BID_OUTBID,
  AUCTION_WON: NotificationType.BID_WON,
  AUCTION_ENDED: NotificationType.AUCTION_ENDED,
  AUCTION_STARTING: NotificationType.AUCTION_ACTIVATED,
};

async function processNotification(job: Job<NotificationJob>): Promise<void> {
  const data = NotificationJobSchema.parse(job.data);
  const typeMapped = TYPE_MAP[data.type] ?? NotificationType.SYSTEM;

  if (data.idempotencyKey) {
    await prisma.notification.createMany({
      data: [{
        idempotencyKey: data.idempotencyKey,
        profileId: data.recipientId,
        auctionId: data.auctionId,
        type: typeMapped,
        title: data.title,
        message: data.message,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      }],
      skipDuplicates: true,
    });
    return;
  }

  // Legacy jobs without an idempotency key retain bounded duplicate protection.
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

export function createNotificationWorker(): Worker<NotificationJob> {
  const worker = new Worker<NotificationJob>(QUEUE_NAMES.NOTIFICATIONS, processNotification, {
    connection: getBullMqConnection(),
    prefix: process.env.QUEUE_PREFIX ?? "autobid",
    concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY ?? "20"),
    autorun: false,
    limiter: { max: 200, duration: 1000 },
  });
  worker.on("completed", (job) => console.info(JSON.stringify({ event: "job_completed", queue: QUEUE_NAMES.NOTIFICATIONS, jobId: job.id })));
  worker.on("failed", (job, error) => console.error(JSON.stringify({ event: "job_failed", queue: QUEUE_NAMES.NOTIFICATIONS, jobId: job?.id, message: error.message })));
  worker.on("error", (error) => console.error(JSON.stringify({ event: "worker_error", queue: QUEUE_NAMES.NOTIFICATIONS, message: error.message })));
  return worker;
}
