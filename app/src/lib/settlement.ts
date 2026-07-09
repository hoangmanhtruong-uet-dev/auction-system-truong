/**
 * Settlement Engine – Kết toán & Phân chia Dòng tiền (Split Payment Engine)
 *
 * Flow:
 * 1. settleFreeze: chuyển freeze → SETTLED, debit tiền thắng
 * 2. collectPlatformFee: cắt 5% → Platform Wallet (admin)
 * 3. releaseToSeller: 95% còn lại → Seller Wallet
 * 4. Mark auction as PAID
 *
 * Platform fee rate configurable via env PLATFORM_FEE_PERCENT (default 5).
 */

import { AuctionStatus, TransactionType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { settleFreeze, transferBalance } from "@/src/lib/wallet";
import { error, success, type ErrorResult, type SuccessResult } from "@/src/lib/error-codes";

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT) || 5;

export interface SettlementResult {
  auctionId: string;
  winnerId: string;
  sellerId: string;
  finalPrice: bigint;
  platformFee: bigint;
  sellerPayout: bigint;
  /** Admin profile id – hardcoded or looked up */
  adminProfileId: string;
}

/**
 * Execute full settlement pipeline for a won auction.
 *
 * Must be called within a Prisma transaction.
 */
export async function settleAuction(
  auctionId: string,
  winnerProfileId: string,
  sellerProfileId: string,
  finalPrice: bigint,
  client: PrismaClient,
): Promise<SuccessResult<SettlementResult> | ErrorResult> {
  // 1. Check duplicate settlement
  const auction = await client.auction.findUnique({
    where: { id: auctionId },
    select: { paidAt: true, status: true },
  });
  if (!auction) return error("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.");
  if (auction.paidAt) return error("DUPLICATE_SETTLEMENT", "Phiên đấu giá đã được thanh toán.");

  // 2. Find the active freeze for this auction/winner
  const winnerWallet = await client.wallet.findUnique({
    where: { profileId: winnerProfileId },
    select: { id: true },
  });
  if (!winnerWallet) return error("WALLET_NOT_FOUND", "Ví người thắng không tồn tại.");

  const freeze = await client.balanceFreeze.findFirst({
    where: {
      walletId: winnerWallet.id,
      auctionId,
      status: "ACTIVE",
    },
    select: { id: true, amount: true },
    orderBy: { createdAt: "desc" },
  });
  if (!freeze) return error("FREEZE_NOT_FOUND", "Không tìm thấy lệnh khóa tiền cho phiên này.");

  // 3. Settle freeze → real debit
  const settleResult = await settleFreeze(freeze.id, winnerProfileId, client);
  if (!settleResult.ok) return settleResult;

  // 4. Calculate split
  const platformFee = (finalPrice * BigInt(PLATFORM_FEE_PERCENT)) / 100n;
  const sellerPayout = finalPrice - platformFee;

  // 5. Admin profile from env
  const adminProfileId = process.env.ADMIN_PROFILE_ID ?? "";
  if (!adminProfileId) {
    return error("SETTLEMENT_CONFIG_ERROR", "Thiếu ADMIN_PROFILE_ID trong biến môi trường.");
  }
  // Verify admin profile exists
  const admin = await client.profile.findUnique({
    where: { id: adminProfileId },
    select: { id: true },
  });
  if (!admin) {
    return error("SETTLEMENT_CONFIG_ERROR", `ADMIN_PROFILE_ID=${adminProfileId} không tồn tại.`);
  }

  // 6. Collect platform fee (winner → admin)
  if (platformFee > 0n) {
    const feeResult = await transferBalance(
      winnerProfileId,
      adminProfileId,
      platformFee,
      TransactionType.PLATFORM_FEE,
      `Phí sàn ${PLATFORM_FEE_PERCENT}% cho phiên #${auctionId}`,
      client,
    );
    if (!feeResult.ok) return error("PLATFORM_FEE_FAILED", "Không thể thu phí sàn.");
  }

  // 7. Release to seller (winner → seller)
  if (sellerPayout > 0n) {
    const payoutResult = await transferBalance(
      winnerProfileId,
      sellerProfileId,
      sellerPayout,
      TransactionType.SELLER_PAYOUT,
      `Thanh toán tiền thắng đấu giá phiên #${auctionId}`,
      client,
    );
    if (!payoutResult.ok) return error("SELLER_PAYOUT_FAILED", "Không thể chuyển tiền cho người bán.");
  }

  // 8. Mark auction as PAID
  await client.auction.update({
    where: { id: auctionId },
    data: {
      paidAt: new Date(),
      paidById: winnerProfileId,
      status: AuctionStatus.COMPLETED,
    },
  });

  return success({
    auctionId,
    winnerId: winnerProfileId,
    sellerId: sellerProfileId,
    finalPrice,
    platformFee,
    sellerPayout,
    adminProfileId,
  });
}