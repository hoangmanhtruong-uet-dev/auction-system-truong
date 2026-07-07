"use server";

import { AuctionStatus } from "@prisma/client";

import { requireAdmin } from "@/src/lib/auth";
import { finalizeExpiredAuctions } from "@/src/lib/auction-lifecycle";
import { prisma } from "@/src/lib/prisma";

export type AdminDashboardData = {
  stats: {
    totalAuctions: number;
    activeAuctions: number;
    pendingAuctions: number;
    completedAuctions: number;
    totalUsers: number;
    totalBids: number;
    totalCurrentValue: string;
  };
  recentAuctions: Array<{
    id: string;
    title: string;
    status: AuctionStatus;
    sellerName: string;
    currentPrice: string;
    bidCount: number;
    endsAt: string | null;
    paidAt: string | null;
  }>;
  recentBids: Array<{
    id: string;
    auctionId: string;
    auctionTitle: string;
    bidderName: string;
    amount: string;
    status: string;
    isAutoBid: boolean;
    createdAt: string;
  }>;
  alerts: {
    endingSoon: Array<{ id: string; title: string; endsAt: string | null; currentPrice: string }>;
    unpaidCompleted: Array<{ id: string; title: string; winnerName: string | null; currentPrice: string }>;
    recentlyCancelled: Array<{ id: string; title: string; canceledAt: string | null; cancelReason: string | null }>;
  };
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requireAdmin();
  await finalizeExpiredAuctions(prisma, 100);

  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [
    totalAuctions,
    activeAuctions,
    pendingAuctions,
    completedAuctions,
    totalUsers,
    totalBids,
    valueAggregate,
    recentAuctions,
    recentBids,
    endingSoon,
    unpaidCompleted,
    recentlyCancelled,
  ] = await Promise.all([
    prisma.auction.count({ where: { deletedAt: null } }),
    prisma.auction.count({ where: { deletedAt: null, status: AuctionStatus.ACTIVE } }),
    prisma.auction.count({ where: { deletedAt: null, status: AuctionStatus.PENDING } }),
    prisma.auction.count({ where: { deletedAt: null, status: AuctionStatus.COMPLETED } }),
    prisma.profile.count({ where: { deletedAt: null } }),
    prisma.bid.count({ where: { deletedAt: null } }),
    prisma.auction.aggregate({
      where: { deletedAt: null },
      _sum: { currentPrice: true },
    }),
    prisma.auction.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        currentPrice: true,
        endsAt: true,
        paidAt: true,
        seller: { select: { fullName: true } },
        _count: { select: { bids: true } },
      },
    }),
    prisma.bid.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        amount: true,
        status: true,
        isAutoBid: true,
        createdAt: true,
        auction: { select: { id: true, title: true } },
        bidder: { select: { fullName: true } },
      },
    }),
    prisma.auction.findMany({
      where: {
        deletedAt: null,
        status: AuctionStatus.ACTIVE,
        endsAt: { gte: now, lte: next24h },
      },
      orderBy: { endsAt: "asc" },
      take: 5,
      select: { id: true, title: true, endsAt: true, currentPrice: true },
    }),
    prisma.auction.findMany({
      where: {
        deletedAt: null,
        status: AuctionStatus.COMPLETED,
        winnerId: { not: null },
        paidAt: null,
      },
      orderBy: { finishedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        currentPrice: true,
        winner: { select: { fullName: true } },
      },
    }),
    prisma.auction.findMany({
      where: {
        deletedAt: null,
        status: AuctionStatus.CANCELLED,
        canceledAt: { not: null },
      },
      orderBy: { canceledAt: "desc" },
      take: 5,
      select: { id: true, title: true, canceledAt: true, cancelReason: true },
    }),
  ]);

  return {
    stats: {
      totalAuctions,
      activeAuctions,
      pendingAuctions,
      completedAuctions,
      totalUsers,
      totalBids,
      totalCurrentValue: (valueAggregate._sum.currentPrice ?? BigInt(0)).toString(),
    },
    recentAuctions: recentAuctions.map((auction) => ({
      id: auction.id,
      title: auction.title,
      status: auction.status,
      sellerName: auction.seller.fullName,
      currentPrice: auction.currentPrice.toString(),
      bidCount: auction._count.bids,
      endsAt: auction.endsAt?.toISOString() ?? null,
      paidAt: auction.paidAt?.toISOString() ?? null,
    })),
    recentBids: recentBids.map((bid) => ({
      id: bid.id,
      auctionId: bid.auction.id,
      auctionTitle: bid.auction.title,
      bidderName: bid.bidder.fullName,
      amount: bid.amount.toString(),
      status: bid.status,
      isAutoBid: bid.isAutoBid,
      createdAt: bid.createdAt.toISOString(),
    })),
    alerts: {
      endingSoon: endingSoon.map((auction) => ({
        id: auction.id,
        title: auction.title,
        endsAt: auction.endsAt?.toISOString() ?? null,
        currentPrice: auction.currentPrice.toString(),
      })),
      unpaidCompleted: unpaidCompleted.map((auction) => ({
        id: auction.id,
        title: auction.title,
        winnerName: auction.winner?.fullName ?? null,
        currentPrice: auction.currentPrice.toString(),
      })),
      recentlyCancelled: recentlyCancelled.map((auction) => ({
        id: auction.id,
        title: auction.title,
        canceledAt: auction.canceledAt?.toISOString() ?? null,
        cancelReason: auction.cancelReason,
      })),
    },
  };
}
