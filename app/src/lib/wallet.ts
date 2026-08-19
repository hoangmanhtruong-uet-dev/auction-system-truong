/**
 * Wallet Engine – Ký quỹ tự động (Automated Escrow) & Khóa số dư
 *
 * Mỗi user có 1 Wallet. Khi đặt bid: freeze tiền ngay.
 * Khi bị outbid: unfreeze tự động.
 * Khi thắng: chuyển freeze → SETTLED, debit thực tế.
 *
 * Financial State Machine:
 * [AVAILABLE] ──(placeBid)──> FREEZE
 * FREEZE ──(outbid)──> UNFREEZE ──> AVAILABLE
 * FREEZE ──(won)──> SETTLE_DEBIT ──> PLATFORM_FEE + SELLER_PAYOUT
 * FREEZE ──(cancel/forfeit)──> FORFEITED
 */

import { FreezeStatus, Prisma, TransactionType, type PrismaClient } from "@prisma/client";
import { error, success, type ErrorResult, type SuccessResult } from "@/src/lib/error-codes";

type DbClient = PrismaClient | Prisma.TransactionClient;

// ─── Ensure Wallet ───────────────────────────────────────────────────────────

export async function ensureWallet(
  profileId: string,
  client: DbClient,
): Promise<{ id: string; balance: bigint; totalFrozen: bigint; version: number }> {
  // Race-safe: insert on conflict ignored → then select
  try {
    await client.wallet.create({
      data: { profileId, balance: 0n, totalFrozen: 0n },
    });
  } catch (cause: unknown) {
    // P2002 = unique constraint violation (wallet already exists)
    if (!(cause instanceof Prisma.PrismaClientKnownRequestError) || cause.code !== "P2002") throw cause;
  }
  const w = await client.wallet.findUniqueOrThrow({
    where: { profileId },
    select: { id: true, balance: true, totalFrozen: true, version: true },
  });
  return w;
}

export async function getWallet(
  profileId: string,
  client: DbClient,
): Promise<{ id: string; balance: bigint; totalFrozen: bigint; version: number } | null> {
  return client.wallet.findUnique({
    where: { profileId },
    select: { id: true, balance: true, totalFrozen: true, version: true },
  });
}

// ─── Freeze ──────────────────────────────────────────────────────────────────

/**
 * Freeze amount in wallet. Called when user places a bid.
 *
 * Uses optimistic locking via version to prevent race conditions.
 *
 * Returns the freeze record id.
 */
export async function freezeBalance(
  profileId: string,
  auctionId: string,
  bidId: string,
  amount: bigint,
  reason: string | undefined,
  client: DbClient,
): Promise<SuccessResult<{ freezeId: string }> | ErrorResult> {
  const wallet = await ensureWallet(profileId, client);

  if (wallet.balance - wallet.totalFrozen < amount) {
    return error("INSUFFICIENT_BALANCE", "Số dư khả dụng không đủ để đặt cọc.");
  }

  const newTotalFrozen = wallet.totalFrozen + amount;

  // Optimistic lock
  const updated = await client.wallet.updateMany({
    where: { profileId, version: wallet.version },
    data: { totalFrozen: newTotalFrozen, version: { increment: 1 } },
  });

  if (updated.count === 0) {
    return error("CONCURRENT_BID_CONFLICT", "Có xung đột khi khóa tiền. Vui lòng thử lại.");
  }

  const freeze = await client.balanceFreeze.create({
    data: {
      walletId: wallet.id,
      auctionId,
      bidId,
      amount,
      status: FreezeStatus.ACTIVE,
      reason,
    },
  });

  // Record transaction
  await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: TransactionType.BID_FREEZE,
      amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance,
      referenceType: "auction",
      referenceId: auctionId,
      description: reason ?? `Khóa tiền cho phiên đấu giá #${auctionId}`,
    },
  });

  return success({ freezeId: freeze.id });
}

// ─── Unfreeze (release) ──────────────────────────────────────────────────────

/**
 * Release freeze when user is outbid. Frees the locked amount back to available.
 */
export async function unfreezeBalance(
  freezeId: string,
  profileId: string,
  reason: string | undefined,
  client: DbClient,
): Promise<SuccessResult<null> | ErrorResult> {
  const wallet = await ensureWallet(profileId, client);

  const freeze = await client.balanceFreeze.findUnique({
    where: { id: freezeId },
    select: { id: true, status: true, amount: true, walletId: true, auctionId: true },
  });
  if (!freeze) return error("FREEZE_NOT_FOUND", "Không tìm thấy lệnh khóa tiền.");
  if (freeze.status !== FreezeStatus.ACTIVE) {
    if (freeze.status === FreezeStatus.RELEASED) return error("FREEZE_ALREADY_RELEASED", "Lệnh khóa đã được giải phóng.");
    if (freeze.status === FreezeStatus.SETTLED) return error("FREEZE_ALREADY_SETTLED", "Lệnh khóa đã được thanh toán.");
  }
  // Verify freeze belongs to this wallet
  const w = await client.wallet.findUnique({ where: { profileId }, select: { id: true } });
  if (!w || freeze.walletId !== w.id) return error("FORBIDDEN", "Lệnh khóa không thuộc về bạn.");

  const newTotalFrozen = wallet.totalFrozen - freeze.amount;
  const updated = await client.wallet.updateMany({
    where: { profileId, version: wallet.version },
    data: { totalFrozen: newTotalFrozen >= 0n ? newTotalFrozen : 0n, version: { increment: 1 } },
  });
  if (updated.count === 0) {
    return error("CONCURRENT_BID_CONFLICT", "Có xung đột khi giải phóng tiền. Vui lòng thử lại.");
  }

  await client.balanceFreeze.update({
    where: { id: freezeId },
    data: { status: FreezeStatus.RELEASED, releasedAt: new Date() },
  });

  await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: TransactionType.BID_UNFREEZE,
      amount: freeze.amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance,
      referenceType: "auction",
      referenceId: freeze.auctionId ?? undefined,
      description: reason ?? "Giải phóng tiền khóa do bị outbid",
    },
  });

  return success(null);
}

/**
 * Unfreeze ALL active freezes for a given auction and user.
 * Used when seller cancels auction or user forfeits.
 */
export async function unfreezeAllForAuction(
  profileId: string,
  auctionId: string,
  client: DbClient,
): Promise<SuccessResult<number> | ErrorResult> {
  const wallet = await ensureWallet(profileId, client);

  const freezes = await client.balanceFreeze.findMany({
    where: { walletId: wallet.id, auctionId, status: FreezeStatus.ACTIVE },
    select: { id: true, amount: true },
  });

  if (freezes.length === 0) return success(0);

  const totalRelease = freezes.reduce((sum, f) => sum + f.amount, 0n);
  const newTotalFrozen = wallet.totalFrozen - totalRelease;

  const updated = await client.wallet.updateMany({
    where: { profileId, version: wallet.version },
    data: { totalFrozen: newTotalFrozen >= 0n ? newTotalFrozen : 0n, version: { increment: 1 } },
  });
  if (updated.count === 0) {
    return error("CONCURRENT_BID_CONFLICT", "Có xung đột khi giải phóng tiền.");
  }

  await client.balanceFreeze.updateMany({
    where: { id: { in: freezes.map((f) => f.id) } },
    data: { status: FreezeStatus.RELEASED, releasedAt: new Date() },
  });

  await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: TransactionType.BID_UNFREEZE,
      amount: totalRelease,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance,
      referenceType: "auction",
      referenceId: auctionId,
      description: `Giải phóng tất cả tiền khóa cho phiên #${auctionId}`,
    },
  });

  return success(freezes.length);
}

// ─── Forfeit (buyer default / short-pay) ─────────────────────────────────────

/**
 * Convert a freeze into forfeited status.
 * The frozen amount stays in the wallet (penalty), only totalFrozen is reduced.
 * Called when buyer fails to pay within deadline.
 */
export async function forfeitFreeze(
  freezeId: string,
  profileId: string,
  client: DbClient,
): Promise<SuccessResult<{ walletId: string }> | ErrorResult> {
  const wallet = await ensureWallet(profileId, client);

  const freeze = await client.balanceFreeze.findUnique({
    where: { id: freezeId },
    select: { id: true, status: true, amount: true, walletId: true },
  });
  if (!freeze) return error("FREEZE_NOT_FOUND", "Không tìm thấy lệnh khóa tiền.");
  if (freeze.status !== FreezeStatus.ACTIVE) {
    if (freeze.status === FreezeStatus.FORFEITED) return error("FREEZE_ALREADY_FORFEITED", "Lệnh khóa đã bị phạt.");
    if (freeze.status === FreezeStatus.SETTLED) return error("FREEZE_ALREADY_SETTLED", "Lệnh khóa đã được thanh toán.");
  }
  const w = await client.wallet.findUnique({ where: { profileId }, select: { id: true } });
  if (!w || freeze.walletId !== w.id) return error("FORBIDDEN", "Lệnh khóa không thuộc về bạn.");

  const newTotalFrozen = wallet.totalFrozen - freeze.amount;

  const updated = await client.wallet.updateMany({
    where: { profileId, version: wallet.version },
    data: {
      totalFrozen: newTotalFrozen >= 0n ? newTotalFrozen : 0n,
      version: { increment: 1 },
    },
  });
  if (updated.count === 0) {
    return error("CONCURRENT_BID_CONFLICT", "Có xung đột khi xử lý phạt.");
  }

  await client.balanceFreeze.update({
    where: { id: freezeId },
    data: { status: FreezeStatus.FORFEITED, releasedAt: new Date() },
  });

  await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: TransactionType.PENALTY,
      amount: freeze.amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance,
      referenceType: "freeze",
      referenceId: freezeId,
      description: "Phạt tiền do không thanh toán đúng hạn",
    },
  });

  return success({ walletId: wallet.id });
}

// ─── Settle (debit on win) ───────────────────────────────────────────────────

/**
 * Convert a freeze into a real debit.
 * Called during settlement flow after auction ends.
 */
export async function settleFreeze(
  freezeId: string,
  profileId: string,
  client: DbClient,
): Promise<SuccessResult<{ walletId: string }> | ErrorResult> {
  const wallet = await ensureWallet(profileId, client);

  const freeze = await client.balanceFreeze.findUnique({
    where: { id: freezeId },
    select: { id: true, status: true, amount: true, walletId: true },
  });
  if (!freeze) return error("FREEZE_NOT_FOUND", "Không tìm thấy lệnh khóa tiền.");
  if (freeze.status !== FreezeStatus.ACTIVE) {
    if (freeze.status === FreezeStatus.SETTLED) return error("FREEZE_ALREADY_SETTLED", "Lệnh khóa đã được thanh toán.");
    if (freeze.status === FreezeStatus.RELEASED) return error("FREEZE_ALREADY_RELEASED", "Lệnh khóa đã được giải phóng.");
  }
  const w = await client.wallet.findUnique({ where: { profileId }, select: { id: true } });
  if (!w || freeze.walletId !== w.id) return error("FORBIDDEN", "Lệnh khóa không thuộc về bạn.");

  const newTotalFrozen = wallet.totalFrozen - freeze.amount;

  const updated = await client.wallet.updateMany({
    where: { profileId, version: wallet.version },
    data: {
      totalFrozen: newTotalFrozen >= 0n ? newTotalFrozen : 0n,
      version: { increment: 1 },
    },
  });
  if (updated.count === 0) {
    return error("CONCURRENT_BID_CONFLICT", "Có xung đột khi thanh toán.");
  }

  await client.balanceFreeze.update({
    where: { id: freezeId },
    data: { status: FreezeStatus.SETTLED, releasedAt: new Date() },
  });

  await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: TransactionType.SETTLEMENT_DEBIT,
      amount: freeze.amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance,
      referenceType: "freeze",
      referenceId: freezeId,
      description: "Kết toán tiền thắng đấu giá",
    },
  });

  return success({ walletId: wallet.id });
}

// ─── Direct balance transfer (admin / platform fee / seller payout) ──────────

/**
 * Transfer amount from one wallet to another.
 * Used for platform fee collection and seller payout.
 */
export async function transferBalance(
  fromProfileId: string,
  toProfileId: string,
  amount: bigint,
  type: TransactionType,
  description: string,
  client: DbClient,
): Promise<SuccessResult<null> | ErrorResult> {
  // Source
  const srcWallet = await ensureWallet(fromProfileId, client);
  if (srcWallet.balance - srcWallet.totalFrozen < amount) {
    return error("INSUFFICIENT_BALANCE", "Số dư khả dụng không đủ.");
  }

  const updated = await client.wallet.updateMany({
    where: { profileId: fromProfileId, version: srcWallet.version },
    data: { balance: { decrement: amount }, version: { increment: 1 } },
  });
  if (updated.count === 0) {
    return error("CONCURRENT_BID_CONFLICT", "Có xung đột khi chuyển tiền.");
  }

  // Destination
  const dstWallet = await ensureWallet(toProfileId, client);
  const dstUpdated = await client.wallet.updateMany({
    where: { id: dstWallet.id, version: dstWallet.version },
    data: { balance: { increment: amount }, version: { increment: 1 } },
  });
  if (dstUpdated.count === 0) {
    return error("CONCURRENT_BID_CONFLICT", "Có xung đột khi nhận tiền.");
  }

  // Records
  await client.walletTransaction.create({
    data: {
      walletId: srcWallet.id,
      type,
      amount: -amount,
      balanceBefore: srcWallet.balance,
      balanceAfter: srcWallet.balance - amount,
      referenceType: "transfer",
      description: `${description} (from)`,
    },
  });
  await client.walletTransaction.create({
    data: {
      walletId: dstWallet.id,
      type,
      amount,
      balanceBefore: dstWallet.balance,
      balanceAfter: dstWallet.balance + amount,
      referenceType: "transfer",
      description: `${description} (to)`,
    },
  });

  return success(null);
}

// ─── Balance operations for deposit/withdraw ─────────────────────────────────

export async function depositBalance(
  profileId: string,
  amount: bigint,
  description: string,
  client: DbClient,
): Promise<SuccessResult<null> | ErrorResult> {
  const wallet = await ensureWallet(profileId, client);
  const updated = await client.wallet.updateMany({
    where: { id: wallet.id, version: wallet.version },
    data: { balance: { increment: amount }, version: { increment: 1 } },
  });
  if (updated.count === 0) {
    return error("CONCURRENT_BID_CONFLICT", "Có xung đột khi nạp tiền. Vui lòng thử lại.");
  }
  await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: TransactionType.DEPOSIT,
      amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance + amount,
      description,
    },
  });
  return success(null);
}

export async function withdrawBalance(
  profileId: string,
  amount: bigint,
  description: string,
  client: DbClient,
): Promise<SuccessResult<null> | ErrorResult> {
  const wallet = await ensureWallet(profileId, client);
  if (wallet.balance - wallet.totalFrozen < amount) {
    return error("INSUFFICIENT_BALANCE", "Số dư khả dụng không đủ để rút.");
  }
  const updated = await client.wallet.updateMany({
    where: { profileId, version: wallet.version },
    data: { balance: { decrement: amount }, version: { increment: 1 } },
  });
  if (updated.count === 0) {
    return error("CONCURRENT_BID_CONFLICT", "Có xung đột khi rút tiền.");
  }
  await client.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: TransactionType.WITHDRAWAL,
      amount: -amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance - amount,
      description,
    },
  });
  return success(null);
}
