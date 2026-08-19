import assert from "node:assert/strict";
import crypto from "node:crypto";

import { AuctionStatus, BidStatus, OutboxStatus, UserRole } from "@prisma/client";

import { finishAuction } from "../src/lib/auction-lifecycle";
import { closeAllQueues, getQueue, QUEUE_NAMES } from "../src/lib/queue";
import { prisma } from "../src/lib/prisma";
import { closeRedisConnections } from "../src/lib/redis";

async function pollUntil(predicate: () => Promise<boolean>, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Compose smoke condition was not met within ${timeoutMs}ms`);
}

async function main(): Promise<void> {
  assert.match(new URL(process.env.DATABASE_URL ?? "").pathname, /_test$/);
  assert.equal(process.env.REAL_MONEY_PAYMENTS_ENABLED, "false");
  const suffix = crypto.randomUUID().slice(0, 8);
  const seller = await prisma.profile.create({
    data: { email: `compose-seller-${suffix}@test.invalid`, passwordHash: "test", fullName: "Compose Seller", role: UserRole.SELLER },
  });
  const winner = await prisma.profile.create({
    data: { email: `compose-winner-${suffix}@test.invalid`, passwordHash: "test", fullName: "Compose Winner" },
  });
  const auction = await prisma.auction.create({
    data: {
      title: "Compose smoke auction",
      description: "verification fixture",
      startPrice: 100n,
      currentPrice: 150n,
      sellerId: seller.id,
      status: AuctionStatus.ACTIVE,
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() - 1_000),
    },
  });
  await prisma.bid.create({
    data: { auctionId: auction.id, bidderId: winner.id, amount: 150n, status: BidStatus.ACTIVE, idempotencyKey: `compose-bid-${suffix}` },
  });

  await finishAuction(auction.id);
  await pollUntil(async () => await prisma.outboxEvent.count({ where: { aggregateId: auction.id, status: OutboxStatus.PROCESSED } }) === 4);
  await pollUntil(async () => await prisma.notification.count({ where: { auctionId: auction.id } }) === 2);
  const settlementJob = await getQueue(QUEUE_NAMES.SETTLEMENT).getJob(`settle-${auction.id}`);
  assert.ok(settlementJob);

  console.info(JSON.stringify({
    event: "compose_smoke_passed",
    auctionId: auction.id,
    outboxProcessed: 4,
    notifications: 2,
    settlementJobId: settlementJob.id,
    realMoneyPaymentsEnabled: process.env.REAL_MONEY_PAYMENTS_ENABLED,
  }));
}

void main()
  .catch((error) => {
    console.error(JSON.stringify({ event: "compose_smoke_failed", message: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([closeAllQueues(), closeRedisConnections(), prisma.$disconnect()]);
  });
