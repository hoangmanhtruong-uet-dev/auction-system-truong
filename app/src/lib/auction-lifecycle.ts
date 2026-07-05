import { AuditAction, AuctionStatus, BidStatus, NotificationType, type PrismaClient } from "@prisma/client";

import { createAuditLog } from "@/src/lib/audit";
import { error, type ErrorResult } from "@/src/lib/error-codes";
import { prisma } from "@/src/lib/prisma";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Valid state transitions for the current auction lifecycle.
 *
 * PENDING -> ACTIVE -> COMPLETED
 * PENDING -> CANCELLED
 * ACTIVE -> CANCELLED
 */
const VALID_TRANSITIONS: Record<AuctionStatus, AuctionStatus[]> = {
  [AuctionStatus.PENDING]: [AuctionStatus.ACTIVE, AuctionStatus.CANCELLED],
  [AuctionStatus.ACTIVE]: [AuctionStatus.COMPLETED, AuctionStatus.CANCELLED],
  [AuctionStatus.COMPLETED]: [AuctionStatus.CANCELLED],
  [AuctionStatus.CANCELLED]: [],
};

/**
 * Check if a status transition is valid.
 */
export function canTransitionAuctionStatus(from: AuctionStatus, to: AuctionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Assert that a status transition is valid, returns error if not.
 */
export function assertValidAuctionTransition(
  from: AuctionStatus,
  to: AuctionStatus,
): true | ErrorResult {
  if (!canTransitionAuctionStatus(from, to)) {
    return error(
      "INVALID_TRANSITION",
      "Không thể chuyển đổi trạng thái phiên đấu giá từ " + from + " sang " + to,
    );
  }

  return true;
}

/**
 * Get error if bid cannot be placed based on auction status.
 * Also handles automatic status transitions (PENDING -> ACTIVE, ACTIVE -> COMPLETED).
 */
export async function getBidStatusError(
  auctionId: string,
  status: AuctionStatus,
  startsAt: Date | null,
  endsAt: Date | null,
  client: typeof prisma | Tx = prisma,
): Promise<ErrorResult | null> {
  const now = new Date();
  let adjustedStatus = status;

  if (status === AuctionStatus.PENDING && startsAt && startsAt <= now) {
    await client.auction.update({
      where: { id: auctionId },
      data: { status: AuctionStatus.ACTIVE, finishedAt: null },
    });
    adjustedStatus = AuctionStatus.ACTIVE;
  }

  if (adjustedStatus === AuctionStatus.ACTIVE && endsAt && endsAt <= now) {
    await client.auction.update({
      where: { id: auctionId },
      data: { status: AuctionStatus.COMPLETED, finishedAt: now },
    });
    adjustedStatus = AuctionStatus.COMPLETED;
  }

  if (adjustedStatus === AuctionStatus.PENDING) {
    return error("AUCTION_NOT_RUNNING", "Phiên đấu giá chưa bắt đầu.");
  }

  if (adjustedStatus === AuctionStatus.COMPLETED) {
    return error("AUCTION_ALREADY_FINISHED", "Phiên đấu giá đã kết thúc.");
  }

  if (adjustedStatus === AuctionStatus.CANCELLED) {
    return error("AUCTION_CANCELED", "Phiên đấu giá đã bị hủy.");
  }

  if (adjustedStatus !== AuctionStatus.ACTIVE) {
    return error("INVALID_AUCTION_STATUS", "Trạng thái phiên đấu giá không hợp lệ.");
  }

  return null;
}

/**
 * Refresh auction status based on current time.
 * Automatically transitions PENDING -> ACTIVE and ACTIVE -> COMPLETED if needed.
 */
export async function refreshAuctionStatus(
  auctionId: string,
  client: typeof prisma | Tx = prisma,
): Promise<{ status: AuctionStatus; changed: boolean } | ErrorResult> {
  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
    },
  });

  if (!auction) {
    return error("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.");
  }

  const now = new Date();
  let changed = false;
  let newStatus = auction.status;

  if (auction.status === AuctionStatus.PENDING && auction.startsAt && auction.startsAt <= now) {
    await client.auction.update({
      where: { id: auction.id },
      data: { status: AuctionStatus.ACTIVE },
    });
    newStatus = AuctionStatus.ACTIVE;
    changed = true;
  }

  if (auction.status === AuctionStatus.ACTIVE && auction.endsAt && auction.endsAt <= now) {
    const winningBid = await client.bid.findFirst({
      where: {
        auctionId: auction.id,
        deletedAt: null,
        status: BidStatus.ACTIVE,
      },
      orderBy: { amount: "desc" },
    });

    await client.auction.update({
      where: { id: auction.id },
      data: {
        status: AuctionStatus.COMPLETED,
        winnerId: winningBid?.bidderId ?? null,
        finishedAt: now,
      },
    });

    if (winningBid) {
      await client.bid.update({
        where: { id: winningBid.id },
        data: { status: BidStatus.WON },
      });
    }

    newStatus = AuctionStatus.COMPLETED;
    changed = true;
  }

  return { status: newStatus, changed };
}

/**
 * Mark auction as finished.
 * This is typically called when the auction ends (automatically or manually).
 * Sets winnerId to the highest active bid if one exists.
 */
export async function finishAuction(
  auctionId: string,
  actorId?: string,
  client: typeof prisma | Tx = prisma,
) {
  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    include: {
      bids: {
        where: { deletedAt: null, status: BidStatus.ACTIVE },
        orderBy: { amount: "desc" },
        take: 1,
      },
    },
  });

  if (!auction) return error("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.");

  const transition = assertValidAuctionTransition(auction.status, AuctionStatus.COMPLETED);
  if (transition !== true) return transition;

  const winningBid = auction.bids[0];
  const now = new Date();

  const updated = await client.auction.update({
    where: { id: auctionId },
    data: {
      status: AuctionStatus.COMPLETED,
      winnerId: winningBid?.bidderId ?? null,
      finishedAt: now,
    },
  });

  // Update winning bid status
  if (winningBid) {
    await client.bid.update({
      where: { id: winningBid.id },
      data: { status: BidStatus.WON },
    });
  }

  if (actorId) {
    await createAuditLog({
      profileId: actorId,
      action: AuditAction.AUCTION_COMPLETED,
      resourceType: "auction",
      resourceId: auctionId,
      oldValues: { status: auction.status },
      newValues: {
        status: updated.status,
        winnerId: updated.winnerId,
        finishedAt: now.toISOString(),
      },
    });
  }

  return updated;
}

/**
 * Mark auction as paid after winner has completed payment.
 * Only valid when auction is FINISHED and has a winner.
 */
export async function markAuctionPaid(
  auctionId: string,
  actorId: string,
  client: typeof prisma | Tx = prisma,
) {
  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    select: {
      id: true,
      status: true,
      winnerId: true,
      title: true,
    },
  });

  if (!auction) return error("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.");
  if (auction.status === AuctionStatus.CANCELLED)
    return error("PAYMENT_NOT_ALLOWED", "Phiên đấu giá đã bị hủy, không thể đánh dấu đã thanh toán.");
  if (auction.status !== AuctionStatus.COMPLETED)
    return error("PAYMENT_NOT_ALLOWED", "Chỉ phiên đấu giá đã kết thúc mới được đánh dấu đã thanh toán.");
  if (!auction.winnerId)
    return error("PAYMENT_NOT_ALLOWED", "Không thể đánh dấu thanh toán khi chưa có người thắng.");

  const now = new Date();
  const updated = await client.auction.update({
    where: { id: auctionId },
    data: {
      paidAt: now,
      paidById: actorId,
    } as any,
  });

  // Create notification for winner and seller
  await client.notification.create({
    data: {
      profileId: auction.winnerId!,
      type: NotificationType.SYSTEM,
      title: "Giao dịch đã thanh toán",
      message: `Chúc mừng! Bạn đã thanh toán thành công phiên đấu giá "${auction.title}".`,
      metadata: { auctionId: auctionId },
    },
  });

  await client.notification.create({
    data: {
      profileId: auction.winnerId!,
      type: NotificationType.SYSTEM,
      title: "Giao dịch đã thanh toán",
      message: `Người bán đã xác nhận thanh toán cho phiên đấu giá "${auction.title}".`,
      metadata: { auctionId: auctionId },
    },
  });

  await createAuditLog({
    profileId: actorId,
    action: AuditAction.ADMIN_ACTION,
    resourceType: "auction",
    resourceId: auctionId,
    oldValues: { status: auction.status },
    newValues: {
      status: updated.status,
      paidAt: now.toISOString(),
      paidById: actorId,
    },
  });

  return updated;
}

/**
 * Cancel an auction.
 * 
 * Rules:
 * - Seller can only cancel OPEN auctions with no bids
 * - Admin can cancel any auction (OPEN/RUNNING/FINISHED) but must provide a reason
 * - Cannot cancel PAID auctions (unless dispute system is implemented)
 * - Cannot cancel already cancelled auctions
 * - All cancel operations must create audit logs
 */
export async function cancelAuction(
  auctionId: string,
  actorId: string,
  reason: string,
  options: { requireNoBids?: boolean } = {},
  client: typeof prisma | Tx = prisma,
) {
  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    include: {
      _count: {
        select: { bids: { where: { deletedAt: null } } },
      },
      seller: {
        select: { id: true },
      },
    },
  });

  if (!auction) return error("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.");
  if (auction.status === AuctionStatus.CANCELLED)
    return error("AUCTION_CANCELED", "Phiên đấu giá đã bị hủy.");

  // Check seller cancel rules: only PENDING with no bids
  if (auction.sellerId === actorId) {
    if (auction.status !== AuctionStatus.PENDING) {
      return error("CANCEL_NOT_ALLOWED", "Chỉ có thể hủy khi phiên đang ở trạng thái Sắp diễn ra.");
    }
    if (auction._count.bids > 0) {
      return error("CANCEL_NOT_ALLOWED", "Không thể hủy phiên đấu giá đã có người đặt giá.");
    }
  }

  // Check admin cancel: must have a reason
  // (This is handled by validation in the action layer)

  // Check transition validity
  const transition = assertValidAuctionTransition(auction.status, AuctionStatus.CANCELLED);
  if (transition !== true) return transition;

  const now = new Date();
  const updated = await client.auction.update({
    where: { id: auctionId },
    data: {
      status: AuctionStatus.CANCELLED,
      canceledAt: now,
      canceledById: actorId,
      cancelReason: reason,
    },
  });

  // Create audit log
  await createAuditLog({
    profileId: actorId,
    action: AuditAction.AUCTION_CANCELLED,
    resourceType: "auction",
    resourceId: auctionId,
    oldValues: { status: auction.status },
    newValues: {
      status: updated.status,
      canceledAt: now.toISOString(),
      canceledById: actorId,
      cancelReason: reason,
    },
  });

  // Update any active bids to cancelled
  await client.bid.updateMany({
    where: {
      auctionId: auctionId,
      deletedAt: null,
      status: BidStatus.ACTIVE,
    },
    data: { status: BidStatus.CANCELLED, deletedAt: now },
  });

  return updated;
}

/**
 * Update an auction (seller can only update when OPEN and no bids).
 */
export async function updateAuction(
  auctionId: string,
  actorId: string,
  data: {
    title?: string;
    description?: string;
    startPrice?: bigint;
    bidStep?: bigint;
    category?: string;
    condition?: string;
  },
  client: typeof prisma | Tx = prisma,
) {
  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    include: {
      _count: {
        select: { bids: { where: { deletedAt: null } } },
      },
    },
  });

  if (!auction) return error("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.");

  // Only seller can update, and only when PENDING with no bids
  if (auction.sellerId !== actorId) {
    return error("FORBIDDEN", "Bạn không có quyền cập nhật phiên đấu giá này.");
  }
  if (auction.status !== AuctionStatus.PENDING) {
    return error("INVALID_TRANSITION", "Chỉ có thể cập nhật khi phiên đang ở trạng thái Sắp diễn ra.");
  }
  if (auction._count.bids > 0) {
    return error("INVALID_TRANSITION", "Không thể cập nhật khi đã có người đặt giá.");
  }

  const updated = await client.auction.update({
    where: { id: auctionId },
    data,
  });

  return updated;
}

/**
 * Delete/hide an auction (soft delete).
 * Seller can delete when OPEN with no bids, or when CANCELED.
 */
export async function deleteAuction(
  auctionId: string,
  actorId: string,
  client: typeof prisma | Tx = prisma,
) {
  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    include: {
      _count: {
        select: { bids: { where: { deletedAt: null } } },
      },
    },
  });

  if (!auction) return error("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.");

  // Only seller can delete
  if (auction.sellerId !== actorId) {
    return error("FORBIDDEN", "Bạn không có quyền xóa phiên đấu giá này.");
  }

  // Can only delete if PENDING with no bids, or already CANCELLED
  const canDelete =
    (auction.status === AuctionStatus.PENDING && auction._count.bids === 0) ||
    auction.status === AuctionStatus.CANCELLED;

  if (!canDelete) {
    return error("INVALID_TRANSITION", "Chỉ có thể xóa khi chưa có bid hoặc đã bị hủy.");
  }

  const now = new Date();
  const updated = await client.auction.update({
    where: { id: auctionId },
    data: {
      deletedAt: now,
      status: AuctionStatus.CANCELLED,
    },
  });

  return updated;
}