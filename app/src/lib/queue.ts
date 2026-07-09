/**
 * Message Queue – BullMQ (Redis-backed)
 *
 * Tách side-effects khỏi hot path của placeBid:
 * - bidSideEffects: Trừ tiền cọc, ghi log DB, gửi notification
 * - auctionExpiry:  TTL-based delayed job → tự đóng phiên khi hết giờ
 *
 * Server chỉ validate + ghi Redis + trả "Thành công" trong vài ms.
 * Workers nhặt job từ queue xử lý từ từ phía sau.
 *
 * ponytail: Single Redis. Khi scale, BullMQ tự hỗ trợ Redis Cluster.
 */

import { Queue } from "bullmq";

// Dùng connection config object thay vì Redis instance để tránh
// type conflict giữa ioredis của project và ioredis bundled trong bullmq.
const queueConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD ?? undefined,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
};

// ─── Queue definitions ──────────────────────────────────────────────────────

/**
 * Queue xử lý side-effects sau khi bid thành công.
 * Jobs: ghi DB audit, gửi notification, trừ tiền cọc, etc.
 */
export const bidSideEffectsQueue = new Queue("bid-side-effects", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

/**
 * Queue xử lý đóng phiên đấu giá khi hết giờ.
 * Mỗi job là một "delayed job" với delay = (endsAt - now).
 * Khi hết delay → job được thực thi → đóng phiên.
 *
 * Tương đương TTL + Dead Letter Exchange trong RabbitMQ.
 */
export const auctionExpiryQueue = new Queue("auction-expiry", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
  },
});

/**
 * Queue xử lý kết toán (settlement) sau khi phiên đấu giá kết thúc.
 */
export const settlementQueue = new Queue("settlement", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
  },
});

/**
 * Queue xử lý đối soát tài chính hàng đêm (reconciliation).
 */
export const reconciliationQueue = new Queue("reconciliation", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 30000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/**
 * Queue gửi notification (push, email, in-app).
 */
export const notificationQueue = new Queue("notifications", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 500 },
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 5000 },
  },
});

// ─── Job types ───────────────────────────────────────────────────────────────

export type BidSideEffectJob = {
  auctionId: string;
  bidId: string;
  bidderId: string;
  bidderName: string;
  amount: string;
  previousPrice: string;
  winnerId: string | null;
  autoExtended: boolean;
  endsAt: string | null;
};

export type AuctionExpiryJob = {
  auctionId: string;
  expectedEndsAt: string;
};

export type SettlementJob = {
  auctionId: string;
  winnerProfileId: string;
  sellerProfileId: string;
  finalPrice: string; // bigint serialized as string
};

export type ForfeitJob = {
  auctionId: string;
  winnerProfileId: string;
  sellerProfileId: string;
  finalPrice: string;
  payByDeadline: string; // ISO string
};

export type ReconciliationJob = {
  date: string; // YYYY-MM-DD
};

export type NotificationJob = {
  type: "BID_OUTBID" | "AUCTION_WON" | "AUCTION_ENDED" | "AUCTION_STARTING";
  recipientId: string;
  auctionId: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

// ─── Enqueue helpers ─────────────────────────────────────────────────────────

/**
 * Enqueue side-effects sau khi bid thành công.
 */
export async function enqueueBidSideEffects(data: BidSideEffectJob): Promise<void> {
  await bidSideEffectsQueue.add("process-bid", data, {
    jobId: `bid-${data.bidId}`, // deduplicate
  });
}

/**
 * Schedule đóng phiên đấu giá.
 * Nếu phiên được gia hạn (anti-snipe), job cũ bị thay thế bằng job mới.
 */
export async function scheduleAuctionExpiry(
  auctionId: string,
  endsAt: Date,
): Promise<void> {
  const delayMs = Math.max(0, endsAt.getTime() - Date.now());
  const jobId = `expiry-${auctionId}-${endsAt.toISOString()}`;

  await auctionExpiryQueue.add(
    "close-auction",
    { auctionId, expectedEndsAt: endsAt.toISOString() } satisfies AuctionExpiryJob,
    { jobId, delay: delayMs },
  );
}

/**
 * Enqueue settlement processing for a won auction.
 */
export async function enqueueSettlement(data: SettlementJob): Promise<void> {
  await settlementQueue.add("process-settlement", data, {
    jobId: `settle-${data.auctionId}`,
  });
}

/**
 * Enqueue notification.
 */
export async function enqueueNotification(data: NotificationJob): Promise<void> {
  await notificationQueue.add(`notify-${data.type}`, data);
}

export async function enqueueForfeit(data: ForfeitJob): Promise<void> {
  await settlementQueue.add("process-forfeit", data, {
    jobId: `forfeit-${data.auctionId}`,
  });
}
