"use server";

import { AuctionStatus } from "@prisma/client";

import { isAuthorizationError, requireActionPermission } from "@/src/lib/authorization";
import { prisma } from "@/src/lib/prisma";

export async function listAdminBids() {
  const actor = await requireActionPermission("bids.read.all");
  if (isAuthorizationError(actor)) {
    throw new Error(actor.message);
  }

  const bids = await prisma.bid.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      status: true,
      isAutoBid: true,
      createdAt: true,
      auction: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      bidder: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  return bids.map((bid) => ({
    id: bid.id,
    amount: bid.amount.toString(),
    status: bid.status,
    isAutoBid: bid.isAutoBid,
    createdAt: bid.createdAt.toISOString(),
    auction: bid.auction,
    bidder: bid.bidder,
  }));
}

export async function listAdminPayments(filter: "all" | "paid" | "unpaid" = "all") {
  const actor = await requireActionPermission("payments.read.all");
  if (isAuthorizationError(actor)) {
    throw new Error(actor.message);
  }

  const paidAtWhere =
    filter === "paid" ? { not: null } : filter === "unpaid" ? null : undefined;

  const auctions = await prisma.auction.findMany({
    where: {
      deletedAt: null,
      status: AuctionStatus.COMPLETED,
      winnerId: { not: null },
      ...(paidAtWhere !== undefined ? { paidAt: paidAtWhere } : {}),
    },
    orderBy: [{ paidAt: "asc" }, { finishedAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      currentPrice: true,
      finishedAt: true,
      paidAt: true,
      seller: { select: { fullName: true, email: true } },
      winner: { select: { fullName: true, email: true } },
      _count: { select: { bids: true } },
    },
  });

  return auctions.map((auction) => ({
    id: auction.id,
    title: auction.title,
    currentPrice: auction.currentPrice.toString(),
    finishedAt: auction.finishedAt?.toISOString() ?? null,
    paidAt: auction.paidAt?.toISOString() ?? null,
    seller: auction.seller,
    winner: auction.winner,
    bidCount: auction._count.bids,
  }));
}

export async function listAdminAuditLogs() {
  const actor = await requireActionPermission("audit_logs.read");
  if (isAuthorizationError(actor)) {
    throw new Error(actor.message);
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      resourceType: true,
      resourceId: true,
      newValues: true,
      createdAt: true,
      profile: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  return logs.map((log) => {
    const values =
      log.newValues && typeof log.newValues === "object" && !Array.isArray(log.newValues)
        ? (log.newValues as Record<string, unknown>)
        : {};

    return {
      id: log.id,
      actorName: log.profile?.fullName ?? "Hệ thống",
      actorEmail: log.profile?.email ?? null,
      action: log.action,
      targetType: log.resourceType,
      targetId: log.resourceId,
      reason: typeof values.adminReason === "string" ? values.adminReason : null,
      createdAt: log.createdAt.toISOString(),
    };
  });
}

export async function listAdminNotifications() {
  const actor = await requireActionPermission("notifications.read.all");
  if (isAuthorizationError(actor)) {
    throw new Error(actor.message);
  }

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      readAt: true,
      createdAt: true,
      profile: { select: { fullName: true, email: true } },
      auction: { select: { id: true, title: true } },
    },
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    profile: notification.profile,
    auction: notification.auction,
  }));
}
