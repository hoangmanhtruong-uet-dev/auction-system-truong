/**
 * Worker: Forfeit Processing – Cron-based scanner
 *
 * Scans COMPLETED auctions where:
 * - payByDeadline < now
 * - paidAt IS NULL
 * - winnerId IS NOT NULL
 *
 * For each: calls processForfeitAuction() to forfeit frozen balance, notify parties.
 *
 * Run standalone: `npx tsx app/src/workers/forfeit-worker.ts`
 */

import { prisma } from "@/src/lib/prisma";
import { processForfeitAuction } from "@/src/lib/auction-lifecycle";

const SCAN_INTERVAL_MS = 60_000; // every 1 minute
const BATCH_SIZE = 100;

async function scanAndForfeit(): Promise<void> {
  const now = new Date();

  const overdue = await prisma.auction.findMany({
    where: {
      deletedAt: null,
      status: "COMPLETED" as any,
      winnerId: { not: null },
      paidAt: null,
      payByDeadline: { lte: now },
    },
    select: { id: true },
    take: BATCH_SIZE,
  });

  console.log(`[ForfeitWorker] Found ${overdue.length} overdue auctions`);

  for (const auction of overdue) {
    try {
      const result = await processForfeitAuction(auction.id);
      if (!result || (result as any).code) {
        console.error(`[ForfeitWorker] Failed to forfeit auction ${auction.id}:`, (result as any).message);
      } else {
        console.log(`[ForfeitWorker] Forfeited auction ${auction.id}`);
      }
    } catch (e) {
      console.error(`[ForfeitWorker] Error processing auction ${auction.id}:`, e);
    }
  }
}

async function start(): Promise<void> {
  console.log("[ForfeitWorker] Started. Scanning every 60s...");
  // run immediately then interval
  await scanAndForfeit();
  setInterval(scanAndForfeit, SCAN_INTERVAL_MS);
}

start().catch((e) => {
  console.error("[ForfeitWorker] Fatal error:", e);
  process.exit(1);
});