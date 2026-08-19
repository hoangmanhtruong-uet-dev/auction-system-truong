import crypto from "node:crypto";

import { OutboxStatus, Prisma, type PrismaClient } from "@prisma/client";

import {
  enqueueAuctionClosed,
  enqueueNotification,
  enqueueSettlement,
  type NotificationJob,
  type SettlementJob,
} from "@/src/lib/queue";

export const OUTBOX_EVENT_TYPES = {
  AUCTION_CLOSED: "AUCTION_CLOSED",
  SETTLEMENT_REQUESTED: "SETTLEMENT_REQUESTED",
  NOTIFICATION_REQUESTED: "NOTIFICATION_REQUESTED",
} as const;

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[keyof typeof OUTBOX_EVENT_TYPES];
type OutboxClient = PrismaClient | Prisma.TransactionClient;

export type NewOutboxEvent = {
  eventType: OutboxEventType;
  aggregateType: "auction";
  aggregateId: string;
  idempotencyKey: string;
  payload: Prisma.InputJsonValue;
};

export async function createOutboxEvents(
  client: OutboxClient,
  events: NewOutboxEvent[],
): Promise<void> {
  if (events.length === 0) return;
  await client.outboxEvent.createMany({ data: events, skipDuplicates: true });
}

export type OutboxDispatcherOptions = {
  batchSize: number;
  intervalMs: number;
  lockTimeoutMs: number;
  maxAttempts: number;
  baseBackoffMs: number;
  publishTimeoutMs: number;
  instanceId?: string;
};

const defaultOptions: OutboxDispatcherOptions = {
  batchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? "20"),
  intervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? "1000"),
  lockTimeoutMs: Number(process.env.OUTBOX_LOCK_TIMEOUT_MS ?? "30000"),
  maxAttempts: Number(process.env.OUTBOX_MAX_ATTEMPTS ?? "8"),
  baseBackoffMs: Number(process.env.OUTBOX_BASE_BACKOFF_MS ?? "1000"),
  publishTimeoutMs: Number(process.env.OUTBOX_PUBLISH_TIMEOUT_MS ?? "5000"),
};

function parsePayload<T>(value: Prisma.JsonValue): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Outbox payload must be a JSON object");
  }
  return value as T;
}

async function publish(event: {
  eventType: string;
  idempotencyKey: string;
  payload: Prisma.JsonValue;
}): Promise<void> {
  if (event.eventType === OUTBOX_EVENT_TYPES.AUCTION_CLOSED) {
    const payload = parsePayload<{ auctionId: string; winnerId: string | null; finalPrice: string }>(event.payload);
    await enqueueAuctionClosed(payload, event.idempotencyKey);
    return;
  }
  if (event.eventType === OUTBOX_EVENT_TYPES.SETTLEMENT_REQUESTED) {
    await enqueueSettlement(parsePayload<SettlementJob>(event.payload));
    return;
  }
  if (event.eventType === OUTBOX_EVENT_TYPES.NOTIFICATION_REQUESTED) {
    await enqueueNotification(parsePayload<NotificationJob>(event.payload));
    return;
  }
  throw new Error(`Unsupported outbox event type: ${event.eventType}`);
}

async function publishWithTimeout(
  event: Parameters<typeof publish>[0],
  timeoutMs: number,
): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      publish(event),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Outbox publish exceeded ${timeoutMs}ms`)), timeoutMs);
        timeout.unref();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createOutboxDispatcher(
  prisma: PrismaClient,
  overrides: Partial<OutboxDispatcherOptions> = {},
) {
  const options = { ...defaultOptions, ...overrides };
  const instanceId = options.instanceId ?? `outbox-${crypto.randomUUID()}`;
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<number> | undefined;
  let stopped = false;

  async function processBatch(): Promise<number> {
    const staleBefore = new Date(Date.now() - options.lockTimeoutMs);
    await prisma.outboxEvent.updateMany({
      where: { status: OutboxStatus.PROCESSING, lockedAt: { lt: staleBefore } },
      data: { status: OutboxStatus.PENDING, lockedAt: null, lockedBy: null },
    });

    const candidates = await prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.PENDING, availableAt: { lte: new Date() } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: options.batchSize,
    });
    if (candidates.length === 0) return 0;

    const ids = candidates.map(({ id }) => id);
    await prisma.outboxEvent.updateMany({
      where: { id: { in: ids }, status: OutboxStatus.PENDING },
      data: { status: OutboxStatus.PROCESSING, lockedAt: new Date(), lockedBy: instanceId },
    });
    const claimed = await prisma.outboxEvent.findMany({
      where: { id: { in: ids }, status: OutboxStatus.PROCESSING, lockedBy: instanceId },
      orderBy: { createdAt: "asc" },
    });

    for (const event of claimed) {
      try {
        await publishWithTimeout(event, options.publishTimeoutMs);
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.PROCESSED,
            processedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            lastError: null,
          },
        });
        console.info(JSON.stringify({ event: "outbox_processed", outboxId: event.id, eventType: event.eventType }));
      } catch (error) {
        const attemptCount = event.attemptCount + 1;
        const dead = attemptCount >= options.maxAttempts;
        const delay = options.baseBackoffMs * 2 ** Math.max(0, attemptCount - 1);
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: dead ? OutboxStatus.DEAD_LETTER : OutboxStatus.PENDING,
            attemptCount,
            availableAt: dead ? event.availableAt : new Date(Date.now() + delay),
            lockedAt: null,
            lockedBy: null,
            lastError: error instanceof Error ? error.message.slice(0, 4000) : String(error).slice(0, 4000),
          },
        });
        console.error(JSON.stringify({ event: dead ? "outbox_dead_letter" : "outbox_retrying", outboxId: event.id, eventType: event.eventType, attemptCount }));
      }
    }
    return claimed.length;
  }

  function runOnce(): Promise<number> {
    if (running) return running;
    running = processBatch().finally(() => { running = undefined; });
    return running;
  }

  return {
    instanceId,
    runOnce,
    start() {
      if (timer || stopped) return;
      timer = setInterval(() => { void runOnce().catch((error) => console.error(JSON.stringify({ event: "outbox_dispatcher_failed", message: error instanceof Error ? error.message : String(error) }))); }, options.intervalMs);
      timer.unref();
      void runOnce().catch((error) => console.error(JSON.stringify({ event: "outbox_dispatcher_failed", message: error instanceof Error ? error.message : String(error) })));
    },
    async stop(): Promise<void> {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = undefined;
      await running;
    },
  };
}
