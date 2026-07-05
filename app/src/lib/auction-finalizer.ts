import type { Prisma, PrismaClient } from "@prisma/client";

import {
  finalizeExpiredAuctions,
  getAuctionWithFreshStatus,
  refreshAuctionStatus,
} from "@/src/lib/auction-lifecycle";

export { finalizeExpiredAuctions, getAuctionWithFreshStatus, refreshAuctionStatus };

type AuctionDbClient = PrismaClient | Prisma.TransactionClient;

export async function finalizeAuctionIfExpired(auctionId: string, client: AuctionDbClient, now: Date) {
  const result = await refreshAuctionStatus(auctionId, client, now);
  if ("success" in result && result.success === false) {
    return { finalized: false, completed: false };
  }

  if ("changed" in result) {
    return { finalized: result.changed, completed: result.completed };
  }

  return { finalized: false, completed: false };
}

export async function finalizeExpiredAuctionsCron() {
  const { finalizeExpiredAuctions } = await import("@/src/lib/auction-lifecycle");
  return finalizeExpiredAuctions();
}
