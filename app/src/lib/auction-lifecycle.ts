import { AuditAction, AuctionStatus, BidStatus, NotificationType, type Prisma, type PrismaClient } from "@prisma/client";

import { error, type ErrorResult } from "@/src/lib/error-codes";
import { prisma } from "@/src/lib/prisma";

type AuctionDbClient = PrismaClient | Prisma.TransactionClient;

const MAX_FINALIZE_BATCH = 200;

export type RefreshAuctionStatusResult = {
  auctionId: string;
  status: AuctionStatus;
  changed: boolean;
  completed: boolean;
};

export type FinalizeExpiredAuctionsResult = {
  processed: number;
  completed: number;
};

const VALID_TRANSITIONS: Record<AuctionStatus, AuctionStatus[]> = {
  [AuctionStatus.PENDING]: [AuctionStatus.ACTIVE, AuctionStatus.CANCELLED],
  [AuctionStatus.ACTIVE]: [AuctionStatus.COMPLETED, AuctionStatus.CANCELLED],
  [AuctionStatus.COMPLETED]: [],
  [AuctionStatus.CANCELLED]: [],
};

export function canTransitionAuctionStatus(from: AuctionStatus, to: AuctionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidAuctionTransition(from: AuctionStatus, to: AuctionStatus): true | ErrorResult {
  if (!canTransitionAuctionStatus(from, to)) {
    return error("INVALID_TRANSITION", `Cannot transition auction status from ${from} to ${to}.`);
  }

  return true;
}

function isErrorResult<T>(result: T | ErrorResult): result is ErrorResult {
  return typeof result === "object" && result !== null && "success" in result && result.success === false;
}

export async function getBidStatusError(
  auctionId: string,
  status: AuctionStatus,
  startsAt: Date | null,
  endsAt: Date | null,
  client: AuctionDbClient = prisma,
): Promise<ErrorResult | null> {
  const now = new Date();
  let adjustedStatus = status;

  if (
    (status === AuctionStatus.PENDING && startsAt && startsAt <= now) ||
    (status === AuctionStatus.ACTIVE && endsAt && endsAt <= now)
  ) {
    const refreshed = await refreshAuctionStatus(auctionId, client, now);
    if (isErrorResult(refreshed)) {
      return refreshed;
    }
    adjustedStatus = refreshed.status;
  }

  if (adjustedStatus === AuctionStatus.PENDING) {
    return error("AUCTION_NOT_RUNNING", "Phien dau gia chua bat dau.");
  }

  if (adjustedStatus === AuctionStatus.COMPLETED) {
    return error("AUCTION_ALREADY_FINISHED", "Phien dau gia da ket thuc.");
  }

  if (adjustedStatus === AuctionStatus.CANCELLED) {
    return error("AUCTION_CANCELED", "Phien dau gia da bi huy.");
  }

  if (adjustedStatus !== AuctionStatus.ACTIVE) {
    return error("INVALID_AUCTION_STATUS", "Trang thai phien dau gia khong hop le.");
  }

  return null;
}

export async function refreshAuctionStatus(
  auctionId: string,
  client: AuctionDbClient = prisma,
  now: Date = new Date(),
): Promise<RefreshAuctionStatusResult | ErrorResult> {
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
    return error("AUCTION_NOT_FOUND", "Phien dau gia khong ton tai.");
  }

  let status = auction.status;
  let changed = false;
  let completed = false;

  if (status === AuctionStatus.PENDING && auction.startsAt && auction.startsAt <= now) {
    await client.auction.update({
      where: { id: auction.id },
      data: { status: AuctionStatus.ACTIVE, finishedAt: null },
    });

    await client.auditLog.create({
      data: {
        profileId: null,
        action: AuditAction.AUCTION_ACTIVATED,
        resourceType: "auction",
        resourceId: auction.id,
        oldValues: { status: auction.status },
        newValues: { status: AuctionStatus.ACTIVE, activatedAt: now.toISOString() },
      },
    });

    status = AuctionStatus.ACTIVE;
    changed = true;
  }

  if (status === AuctionStatus.ACTIVE && auction.endsAt && auction.endsAt <= now) {
    const finished = await finishAuction(auction.id, undefined, client, now);
    if (isErrorResult(finished)) {
      return finished;
    }

    status = AuctionStatus.COMPLETED;
    changed = true;
    completed = true;
  }

  return { auctionId: auction.id, status, changed, completed };
}

export async function finishAuction(
  auctionId: string,
  actorId?: string,
  client: AuctionDbClient = prisma,
  now: Date = new Date(),
) {
  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    include: {
      bids: {
        where: {
          deletedAt: null,
          status: { not: BidStatus.CANCELLED },
        },
        orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  });

  if (!auction) {
    return error("AUCTION_NOT_FOUND", "Phien dau gia khong ton tai.");
  }

  if (auction.status === AuctionStatus.CANCELLED) {
    return error("AUCTION_CANCELED", "Phien dau gia da bi huy.");
  }

  if (auction.status !== AuctionStatus.COMPLETED) {
    const transition = assertValidAuctionTransition(auction.status, AuctionStatus.COMPLETED);
    if (transition !== true) {
      return transition;
    }
  }

  const winningBid = auction.bids[0] ?? null;
  const winnerId = winningBid?.bidderId ?? null;
  const finishedAt = auction.finishedAt ?? now;
  const shouldNotifyAndAudit = auction.status !== AuctionStatus.COMPLETED || !auction.finishedAt;

  const updated = await client.auction.update({
    where: { id: auctionId },
    data: {
      status: AuctionStatus.COMPLETED,
      winnerId,
      finishedAt,
    },
  });

  await client.bid.updateMany({
    where: {
      auctionId,
      deletedAt: null,
      status: { not: BidStatus.CANCELLED },
    },
    data: { status: BidStatus.LOST },
  });

  if (winningBid) {
    await client.bid.update({
      where: { id: winningBid.id },
      data: { status: BidStatus.WON },
    });
  }

  if (shouldNotifyAndAudit) {
    await client.notification.create({
      data: {
        profileId: auction.sellerId,
        auctionId,
        type: NotificationType.AUCTION_ENDED,
        title: "Phien dau gia da ket thuc",
        message: winnerId
          ? `Phien dau gia "${auction.title}" da ket thuc va co nguoi thang.`
          : `Phien dau gia "${auction.title}" da ket thuc nhung chua co luot dat gia.`,
        metadata: { auctionId, winnerId },
      },
    });

    if (winnerId) {
      await client.notification.create({
        data: {
          profileId: winnerId,
          auctionId,
          type: NotificationType.BID_WON,
          title: "Ban da thang phien dau gia",
          message: `Chuc mung! Ban da thang phien dau gia "${auction.title}".`,
          metadata: { auctionId, bidId: winningBid?.id },
        },
      });
    }

    await client.auditLog.create({
      data: {
        profileId: actorId ?? winnerId ?? auction.sellerId,
        action: AuditAction.AUCTION_COMPLETED,
        resourceType: "auction",
        resourceId: auctionId,
        oldValues: {
          status: auction.status,
          winnerId: auction.winnerId,
          finishedAt: auction.finishedAt?.toISOString() ?? null,
        },
        newValues: {
          status: updated.status,
          winnerId: updated.winnerId,
          winningBidId: winningBid?.id ?? null,
          finishedAt: updated.finishedAt?.toISOString() ?? finishedAt.toISOString(),
        },
      },
    });
  }

  return updated;
}

export async function finalizeExpiredAuctions(
  client: AuctionDbClient = prisma,
  limit: number = MAX_FINALIZE_BATCH,
): Promise<FinalizeExpiredAuctionsResult> {
  const now = new Date();
  const auctions = await client.auction.findMany({
    where: {
      deletedAt: null,
      status: { in: [AuctionStatus.PENDING, AuctionStatus.ACTIVE] },
      OR: [
        { status: AuctionStatus.PENDING, startsAt: { lte: now } },
        { status: AuctionStatus.ACTIVE, endsAt: { lte: now } },
      ],
    },
    select: { id: true },
    orderBy: [{ endsAt: "asc" }, { startsAt: "asc" }],
    take: limit,
  });

  let processed = 0;
  let completed = 0;

  for (const auction of auctions) {
    const refreshLockedAuction = async (db: AuctionDbClient) => {
      const locked = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM auctions
        WHERE id = ${auction.id}::uuid
          AND deleted_at IS NULL
        FOR UPDATE
      `;

      if (locked.length === 0) {
        return null;
      }

      return refreshAuctionStatus(auction.id, db, now);
    };

    const result = client === prisma
      ? await prisma.$transaction(async (tx) => refreshLockedAuction(tx))
      : await refreshLockedAuction(client);

    if (!result || isErrorResult(result)) {
      continue;
    }

    processed++;
    if (result.completed) {
      completed++;
    }
  }

  return { processed, completed };
}

export async function getAuctionWithFreshStatus(auctionId: string) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM auctions
      WHERE id = ${auctionId}::uuid
        AND deleted_at IS NULL
      FOR UPDATE
    `;

    if (locked.length === 0) {
      return null;
    }

    const refreshed = await refreshAuctionStatus(auctionId, tx);
    if (isErrorResult(refreshed)) {
      return null;
    }

    return tx.auction.findFirst({
      where: { id: auctionId, deletedAt: null },
      select: {
        id: true,
        status: true,
        winnerId: true,
        finishedAt: true,
        updatedAt: true,
      },
    });
  });
}

export async function markAuctionPaid(
  auctionId: string,
  actorId: string,
  client: AuctionDbClient = prisma,
) {
  const refreshed = await refreshAuctionStatus(auctionId, client);
  if (isErrorResult(refreshed)) {
    return refreshed;
  }

  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    select: {
      id: true,
      status: true,
      winnerId: true,
      title: true,
    },
  });

  if (!auction) return error("AUCTION_NOT_FOUND", "Phien dau gia khong ton tai.");
  if (auction.status === AuctionStatus.CANCELLED) {
    return error("PAYMENT_NOT_ALLOWED", "Phien dau gia da bi huy, khong the danh dau da thanh toan.");
  }
  if (auction.status !== AuctionStatus.COMPLETED) {
    return error("PAYMENT_NOT_ALLOWED", "Chi phien dau gia da ket thuc moi duoc danh dau da thanh toan.");
  }
  if (!auction.winnerId) {
    return error("PAYMENT_NOT_ALLOWED", "Khong the danh dau thanh toan khi chua co nguoi thang.");
  }

  const now = new Date();
  const updated = await client.auction.update({
    where: { id: auctionId },
    data: {
      paidAt: now,
      paidById: actorId,
    },
  });

  await client.notification.create({
    data: {
      profileId: auction.winnerId,
      auctionId,
      type: NotificationType.AUCTION_PAID,
      title: "Giao dich da thanh toan",
      message: `Phien dau gia "${auction.title}" da duoc danh dau da thanh toan.`,
      metadata: { auctionId },
    },
  });

  await client.notification.create({
    data: {
      profileId: actorId,
      auctionId,
      type: NotificationType.AUCTION_PAID,
      title: "Giao dich da thanh toan",
      message: `Ban da xac nhan thanh toan cho phien dau gia "${auction.title}".`,
      metadata: { auctionId },
    },
  });

  await client.auditLog.create({
    data: {
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
    },
  });

  return updated;
}

export async function cancelAuction(
  auctionId: string,
  actorId: string,
  reason: string,
  options: { requireNoBids?: boolean } = {},
  client: AuctionDbClient = prisma,
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

  if (!auction) return error("AUCTION_NOT_FOUND", "Phien dau gia khong ton tai.");
  if (auction.status === AuctionStatus.CANCELLED) {
    return error("AUCTION_CANCELED", "Phien dau gia da bi huy.");
  }

  if (auction.sellerId === actorId || options.requireNoBids) {
    if (auction.status !== AuctionStatus.PENDING) {
      return error("CANCEL_NOT_ALLOWED", "Chi co the huy khi phien dang o trang thai sap dien ra.");
    }
    if (auction._count.bids > 0) {
      return error("CANCEL_NOT_ALLOWED", "Khong the huy phien dau gia da co nguoi dat gia.");
    }
  }

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

  await client.auditLog.create({
    data: {
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
    },
  });

  await client.bid.updateMany({
    where: {
      auctionId,
      deletedAt: null,
      status: BidStatus.ACTIVE,
    },
    data: { status: BidStatus.CANCELLED, deletedAt: now },
  });

  return updated;
}

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
  client: AuctionDbClient = prisma,
) {
  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    include: {
      _count: {
        select: { bids: { where: { deletedAt: null } } },
      },
    },
  });

  if (!auction) return error("AUCTION_NOT_FOUND", "Phien dau gia khong ton tai.");

  if (auction.sellerId !== actorId) {
    return error("FORBIDDEN", "Ban khong co quyen cap nhat phien dau gia nay.");
  }
  if (auction.status !== AuctionStatus.PENDING) {
    return error("INVALID_TRANSITION", "Chi co the cap nhat khi phien dang o trang thai sap dien ra.");
  }
  if (auction._count.bids > 0) {
    return error("INVALID_TRANSITION", "Khong the cap nhat khi da co nguoi dat gia.");
  }

  return client.auction.update({
    where: { id: auctionId },
    data,
  });
}

export async function deleteAuction(
  auctionId: string,
  actorId: string,
  client: AuctionDbClient = prisma,
) {
  const auction = await client.auction.findFirst({
    where: { id: auctionId, deletedAt: null },
    include: {
      _count: {
        select: { bids: { where: { deletedAt: null } } },
      },
    },
  });

  if (!auction) return error("AUCTION_NOT_FOUND", "Phien dau gia khong ton tai.");

  if (auction.sellerId !== actorId) {
    return error("FORBIDDEN", "Ban khong co quyen xoa phien dau gia nay.");
  }

  const canDelete =
    (auction.status === AuctionStatus.PENDING && auction._count.bids === 0) ||
    auction.status === AuctionStatus.CANCELLED;

  if (!canDelete) {
    return error("INVALID_TRANSITION", "Chi co the xoa khi chua co bid hoac da bi huy.");
  }

  return client.auction.update({
    where: { id: auctionId },
    data: {
      deletedAt: new Date(),
      status: AuctionStatus.CANCELLED,
    },
  });
}
