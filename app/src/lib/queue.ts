import { Queue } from "bullmq";
import { z } from "zod";

import { getBullMqConnection } from "@/src/lib/redis";

export const QUEUE_NAMES = {
  BID_SIDE_EFFECTS: "bid-side-effects",
  NOTIFICATIONS: "notifications",
  AUCTION_EXPIRY: "auction-expiry",
  AUCTION_EVENTS: "auction-events",
  SETTLEMENT: "settlement",
  RECONCILIATION: "reconciliation",
} as const;

export const JOB_NAMES = {
  PROCESS_BID: "process-bid",
  NOTIFY: "notify",
  CLOSE_AUCTION: "close-auction",
  PROCESS_AUCTION_CLOSED: "process-auction-closed",
  PROCESS_SETTLEMENT: "process-settlement",
  PROCESS_FORFEIT: "process-forfeit",
  RECONCILE: "reconcile",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const id = z.string().min(1).max(64);
const money = z.string().regex(/^\d+$/);
const isoDate = z.string().datetime();

export const BidSideEffectJobSchema = z.object({
  auctionId: id,
  bidId: id,
  bidderId: id,
  bidderName: z.string().min(1).max(255),
  amount: money,
  previousPrice: money,
  winnerId: id.nullable(),
  autoExtended: z.boolean(),
  endsAt: isoDate.nullable(),
});
export type BidSideEffectJob = z.infer<typeof BidSideEffectJobSchema>;

export const AuctionExpiryJobSchema = z.object({ auctionId: id, expectedEndsAt: isoDate });
export type AuctionExpiryJob = z.infer<typeof AuctionExpiryJobSchema>;

export const AuctionClosedJobSchema = z.object({
  auctionId: id,
  winnerId: id.nullable(),
  finalPrice: money,
});
export type AuctionClosedJob = z.infer<typeof AuctionClosedJobSchema>;

export const SettlementJobSchema = z.object({
  auctionId: id,
  winnerProfileId: id,
  sellerProfileId: id,
  finalPrice: money,
});
export type SettlementJob = z.infer<typeof SettlementJobSchema>;

export const ForfeitJobSchema = SettlementJobSchema.extend({ payByDeadline: isoDate });
export type ForfeitJob = z.infer<typeof ForfeitJobSchema>;

export const ReconciliationJobSchema = z.object({ date: z.string().date() });
export type ReconciliationJob = z.infer<typeof ReconciliationJobSchema>;

export const NotificationJobSchema = z.object({
  type: z.enum(["BID_OUTBID", "AUCTION_WON", "AUCTION_ENDED", "AUCTION_STARTING"]),
  recipientId: id,
  auctionId: id,
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(4000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().min(1).max(191).optional(),
});
export type NotificationJob = z.infer<typeof NotificationJobSchema>;

type QueueRegistry = Partial<Record<QueueName, Queue>> & { closing?: Promise<void> };

declare global {
  var __autoBidQueueRegistry: QueueRegistry | undefined;
}

function registry(): QueueRegistry {
  globalThis.__autoBidQueueRegistry ??= {};
  return globalThis.__autoBidQueueRegistry;
}

function queueOptions(name: QueueName) {
  if (name === QUEUE_NAMES.SETTLEMENT) {
    return { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: { count: 500 }, removeOnFail: { count: 2000 } };
  }
  if (name === QUEUE_NAMES.RECONCILIATION) {
    return { attempts: 2, backoff: { type: "fixed", delay: 30000 }, removeOnComplete: { count: 100 }, removeOnFail: { count: 200 } };
  }
  return { attempts: 3, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } };
}

export function getQueue(name: QueueName): Queue {
  const current = registry()[name];
  if (current) return current;

  const queue = new Queue(name, {
    connection: getBullMqConnection(),
    prefix: process.env.QUEUE_PREFIX ?? "autobid",
    defaultJobOptions: queueOptions(name),
  });
  registry()[name] = queue;
  return queue;
}

export async function closeAllQueues(): Promise<void> {
  const state = registry();
  if (state.closing) return state.closing;
  state.closing = (async () => {
    const queues = Object.values(QUEUE_NAMES)
      .map((name) => state[name])
      .filter((queue): queue is Queue => Boolean(queue));
    const results = await Promise.allSettled(queues.map((queue) => queue.close()));
    const failures = results.filter((result) => result.status === "rejected");
    globalThis.__autoBidQueueRegistry = {};
    if (failures.length > 0) throw new AggregateError(failures.map((failure) => failure.reason), "Failed to close queues");
  })();
  return state.closing;
}

export async function pingQueueSubsystem(): Promise<void> {
  await getQueue(QUEUE_NAMES.AUCTION_EXPIRY).getJobCounts("waiting", "active", "delayed", "failed");
}

export async function enqueueBidSideEffects(input: BidSideEffectJob): Promise<void> {
  const data = BidSideEffectJobSchema.parse(input);
  await getQueue(QUEUE_NAMES.BID_SIDE_EFFECTS).add(JOB_NAMES.PROCESS_BID, data, { jobId: `bid-${data.bidId}` });
}

export async function scheduleAuctionExpiry(auctionId: string, endsAt: Date): Promise<void> {
  const data = AuctionExpiryJobSchema.parse({ auctionId, expectedEndsAt: endsAt.toISOString() });
  await getQueue(QUEUE_NAMES.AUCTION_EXPIRY).add(JOB_NAMES.CLOSE_AUCTION, data, {
    jobId: `expiry-${auctionId}-${endsAt.getTime()}`,
    delay: Math.max(0, endsAt.getTime() - Date.now()),
  });
}

export async function enqueueSettlement(input: SettlementJob): Promise<void> {
  const data = SettlementJobSchema.parse(input);
  await getQueue(QUEUE_NAMES.SETTLEMENT).add(JOB_NAMES.PROCESS_SETTLEMENT, data, { jobId: `settle-${data.auctionId}` });
}

export async function enqueueForfeit(input: ForfeitJob): Promise<void> {
  const data = ForfeitJobSchema.parse(input);
  await getQueue(QUEUE_NAMES.SETTLEMENT).add(JOB_NAMES.PROCESS_FORFEIT, data, { jobId: `forfeit-${data.auctionId}` });
}

export async function enqueueNotification(input: NotificationJob): Promise<void> {
  const data = NotificationJobSchema.parse(input);
  await getQueue(QUEUE_NAMES.NOTIFICATIONS).add(`${JOB_NAMES.NOTIFY}-${data.type}`, data, {
    jobId: (data.idempotencyKey ?? `notification-${data.type}-${data.recipientId}-${data.auctionId}`).replaceAll(":", "-"),
  });
}

export async function enqueueAuctionClosed(
  input: AuctionClosedJob,
  idempotencyKey: string,
): Promise<void> {
  const data = AuctionClosedJobSchema.parse(input);
  await getQueue(QUEUE_NAMES.AUCTION_EVENTS).add(JOB_NAMES.PROCESS_AUCTION_CLOSED, data, {
    jobId: idempotencyKey.replaceAll(":", "-"),
    removeOnComplete: false,
    removeOnFail: false,
  });
}
