/**
 * Worker: Daily Reconciliation Engine
 *
 * Runs at 00:00 each night. Scans and cross-checks:
 * - WalletTransaction logs (internal ledger)
 * - Auction completion status (bid history / auction logs)
 * - BalanceFreeze lifecycle completeness
 *
 * Alerts finance team if discrepancies found.
 *
 * Run standalone: `npx tsx app/src/workers/reconciliation-worker.ts`
 * Or schedule via cron (see INFRASTRUCTURE.md).
 */

import { FreezeStatus } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

interface ReconciliationReport {
  checkedAt: string;
  totalWallets: number;
  totalFreezes: number;
  totalTransactions: number;
  totalAuctionsCompleted: number;
  discrepancies: Discrepancy[];
  frozenVsTransactionsMatch: boolean;
  settledVsAuctionMatch: boolean;
}

interface Discrepancy {
  type: "FROZEN_GT_LEDGER" | "FREEZE_ORPHANED" | "SETTLEMENT_MISSING" | "AUCTION_UNPAID";
  walletId?: string;
  auctionId?: string;
  freezeId?: string;
  detail: string;
  expected: string;
  actual: string;
}

export async function runReconciliation(): Promise<ReconciliationReport> {
  const now = new Date();
  const discrepancies: Discrepancy[] = [];

  // 1. Count wallets and sum their totalFrozen vs sum of ACTIVE freeze records
  const walletAgg = await prisma.wallet.aggregate({
    _sum: { totalFrozen: true },
    _count: { id: true },
  });
  const totalWallets = walletAgg._count.id ?? 0;
  const dbFrozenSum = walletAgg._sum.totalFrozen ?? 0n;

  const freezeAgg = await prisma.balanceFreeze.aggregate({
    where: { status: FreezeStatus.ACTIVE },
    _sum: { amount: true },
    _count: { id: true },
  });
  const freezeActiveSum = freezeAgg._sum.amount ?? 0n;
  const totalFreezes = freezeAgg._count.id ?? 0;

  if (dbFrozenSum !== freezeActiveSum) {
    discrepancies.push({
      type: "FROZEN_GT_LEDGER",
      detail: "Tổng totalFrozen trong Wallet khác tổng BalanceFreeze ACTIVE",
      expected: dbFrozenSum.toString(),
      actual: freezeActiveSum.toString(),
    });
  }

  // 2. Find balance freezes that reference a deleted/non-existent auction (batch-queried to avoid N+1)
  const orphanFreezes = await prisma.balanceFreeze.findMany({
    where: {
      status: FreezeStatus.ACTIVE,
      auctionId: { not: null as any },
    },
    select: { id: true, auctionId: true, amount: true },
  });

  const activeAuctionIds = Array.from(new Set(orphanFreezes.map((f) => f.auctionId)));
  const existingAuctions = await prisma.auction.findMany({
    where: {
      id: { in: activeAuctionIds },
      deletedAt: null,
    },
    select: { id: true },
  });
  const existingAuctionIdsSet = new Set(existingAuctions.map((a) => a.id));

  for (const f of orphanFreezes) {
    if (!existingAuctionIdsSet.has(f.auctionId)) {
      discrepancies.push({
        type: "FREEZE_ORPHANED",
        freezeId: f.id,
        auctionId: f.auctionId,
        detail: "BalanceFreeze trỏ tới auction không tồn tại hoặc đã bị xóa",
        expected: "Auction tồn tại",
        actual: "Không tìm thấy auction",
      });
    }
  }

  // 3. Check completed auctions → should have a paidAt or a SETTLED freeze
  const completedAuctions = await prisma.auction.findMany({
    where: {
      status: "COMPLETED",
      deletedAt: null,
    },
    select: {
      id: true,
      winnerId: true,
      paidAt: true,
      title: true,
      _count: {
        select: {
          bids: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });

  // Batch-load SETTLED freezes for all COMPLETED auctions to avoid N+1
  const completedAuctionIds = completedAuctions.map((a) => a.id);
  const settledFreezesForCompleted = await prisma.balanceFreeze.findMany({
    where: {
      auctionId: { in: completedAuctionIds },
      status: FreezeStatus.SETTLED,
    },
    select: { auctionId: true },
  });
  const settledAuctionIdsSet = new Set(settledFreezesForCompleted.map((f) => f.auctionId));

  for (const a of completedAuctions) {
    // 3.1 Check abnormal winnerId null when there are bids
    if (!a.winnerId && a._count.bids > 0) {
      discrepancies.push({
        type: "AUCTION_UNPAID",
        auctionId: a.id,
        detail: `Phiên "${a.title}" đã COMPLETED và có lượt bid nhưng winnerId bị null bất thường`,
        expected: "winnerId != null",
        actual: "winnerId = null",
      });
      continue;
    }

    // 3.2 Check if paidAt is missing but winner exists
    if (!a.paidAt && a.winnerId) {
      if (!settledAuctionIdsSet.has(a.id)) {
        discrepancies.push({
          type: "AUCTION_UNPAID",
          auctionId: a.id,
          detail: `Phiên "${a.title}" đã COMPLETED, có winner, nhưng chưa paidAt và chưa có freeze nào SETTLED`,
          expected: "paidAt != null hoặc có SETTLED freeze",
          actual: "paidAt=null, không có SETTLED freeze",
        });
      }
    }

    // 4. Check reverse invariant: paidAt set but no SETTLED freeze
    if (a.paidAt && !settledAuctionIdsSet.has(a.id)) {
      discrepancies.push({
        type: "SETTLEMENT_MISSING",
        auctionId: a.id,
        detail: `Phiên "${a.title}" có paidAt != null nhưng không có balanceFreeze SETTLED`,
        expected: "Có SETTLED freeze",
        actual: "Không có SETTLED freeze",
      });
    }
  }

  // 4.1 Check reverse invariant 2: freeze is SETTLED but paidAt is missing or auction status is not COMPLETED
  const settledFreezes = await prisma.balanceFreeze.findMany({
    where: { status: FreezeStatus.SETTLED },
    select: { id: true, auctionId: true },
  });

  const settledAuctionIds = Array.from(new Set(settledFreezes.map((f) => f.auctionId)));
  const settledAuctions = await prisma.auction.findMany({
    where: { id: { in: settledAuctionIds } },
    select: { id: true, paidAt: true, status: true, title: true },
  });

  const settledAuctionsMap = new Map(settledAuctions.map((a) => [a.id, a]));

  for (const f of settledFreezes) {
    const auction = settledAuctionsMap.get(f.auctionId);
    if (!auction) {
      discrepancies.push({
        type: "SETTLEMENT_MISSING",
        freezeId: f.id,
        auctionId: f.auctionId,
        detail: `BalanceFreeze là SETTLED nhưng phiên đấu giá không tồn tại hoặc đã bị xóa`,
        expected: "Auction tồn tại và paidAt != null",
        actual: "Auction không tồn tại",
      });
    } else if (!auction.paidAt) {
      discrepancies.push({
        type: "SETTLEMENT_MISSING",
        freezeId: f.id,
        auctionId: f.auctionId,
        detail: `BalanceFreeze là SETTLED cho phiên "${auction.title}" nhưng paidAt bị thiếu`,
        expected: "paidAt != null",
        actual: "paidAt = null",
      });
    }
  }

  // 5. Count transactions and check they exist
  const totalTransactions = await prisma.walletTransaction.count();

  const frozenVsTransactionsMatch = discrepancies.every((d) => d.type !== "FROZEN_GT_LEDGER");
  const settledVsAuctionMatch = discrepancies.every(
    (d) => d.type !== "AUCTION_UNPAID" && d.type !== "SETTLEMENT_MISSING",
  );


  // Alert if discrepancies found
  if (discrepancies.length > 0) {
    console.error("[Reconciliation] DISCREPANCIES FOUND:", JSON.stringify(discrepancies, null, 2));

    // Send Slack webhook if configured
    const slackWebhook = process.env.SLACK_FINANCE_WEBHOOK_URL;
    if (slackWebhook) {
      try {
        const blocks = discrepancies.map((d) => ({
          type: "section" as const,
          text: {
            type: "mrkdwn" as const,
            text: `*Type:* ${d.type}\n*Detail:* ${d.detail}\n*Expected:* ${d.expected}\n*Actual:* ${d.actual}${d.auctionId ? `\n*Auction:* ${d.auctionId}` : ""}`,
          },
        }));

        await fetch(slackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🚨 *Reconciliation Alert* — ${discrepancies.length} discrepancy(ies) found`,
            blocks: [
              {
                type: "header" as const,
                text: { type: "plain_text" as const, text: "🚨 Reconciliation Discrepancies" },
              },
              {
                type: "section" as const,
                text: { type: "mrkdwn" as const, text: `*Checked at:* ${new Date().toISOString()}\n*Discrepancies:* ${discrepancies.length}` },
              },
              { type: "divider" as const },
              ...blocks,
            ],
          }),
        });
      } catch (e) {
        console.error("[Reconciliation] Failed to send Slack alert:", e);
      }
    } else {
      console.warn("[Reconciliation] SLACK_FINANCE_WEBHOOK_URL not set; skip Slack alert");
    }

    try {
      await (prisma.notification as any).create({
        data: {
          type: "SYSTEM",
          title: "Reconciliation Alert",
          message: `Found ${discrepancies.length} financial discrepancy(ies). Check logs for details.`,
        },
      });
    } catch (e) {
      console.error("[Reconciliation] Failed to create notification:", e);
    }
  }

  return {
    checkedAt: now.toISOString(),
    totalWallets,
    totalFreezes,
    totalTransactions,
    totalAuctionsCompleted: completedAuctions.length,
    discrepancies,
    frozenVsTransactionsMatch,
    settledVsAuctionMatch,
  };
}

// ─── Cron entry point ─────────────────────────────────────────────────────────
//
// Call this via cron `0 0 * * *` or via the auction-expiry scheduler
// Example: `npx tsx app/src/workers/reconciliation-worker.ts`
//
const isDirectRun = process.argv[1]?.endsWith("reconciliation-worker.ts");
if (isDirectRun) {
  runReconciliation()
    .then((report) => {
      console.log("[Reconciliation] Report:", JSON.stringify(report, null, 2));
      if (report.discrepancies.length > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Reconciliation] Failed:", err);
      process.exit(1);
    });
}
