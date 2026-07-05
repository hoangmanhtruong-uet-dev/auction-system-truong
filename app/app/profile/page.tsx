import { notFound } from "next/navigation";

import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";

import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const [
    auctionsCreated,
    activeSelling,
    bidsPlaced,
    auctionsWinning,
    auctionsWon,
    watchlistCount,
    unreadNotifications,
    recentBids,
    myAuctions,
    watchlistItems,
    notifications,
    auditLogs,
    userPreference,
  ] = await prisma.$transaction([
    prisma.auction.count({
      where: {
        sellerId: user.id,
        deletedAt: null,
      },
    }),
    prisma.auction.count({
      where: {
        sellerId: user.id,
        status: "ACTIVE",
        deletedAt: null,
      },
    }),
    prisma.bid.count({
      where: {
        bidderId: user.id,
        deletedAt: null,
      },
    }),
    prisma.auction.count({
      where: {
        winnerId: user.id,
        status: "ACTIVE",
        deletedAt: null,
      },
    }),
    prisma.auction.count({
      where: {
        winnerId: user.id,
        status: "COMPLETED",
        deletedAt: null,
      },
    }),
    prisma.watchlist.count({
      where: {
        profileId: user.id,
      },
    }),
    prisma.notification.count({
      where: {
        profileId: user.id,
        readAt: null,
      },
    }),
    prisma.bid.findMany({
      where: {
        bidderId: user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      include: {
        auction: {
          select: {
            id: true,
            title: true,
            currentPrice: true,
            status: true,
            endsAt: true,
            images: {
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
              select: {
                url: true,
                altText: true,
              },
            },
          },
        },
      },
    }),
    prisma.auction.findMany({
      where: {
        sellerId: user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
          select: {
            url: true,
            altText: true,
          },
        },
        _count: {
          select: {
            bids: true,
            watchlistItems: true,
          },
        },
      },
    }),
    prisma.watchlist.findMany({
      where: {
        profileId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      include: {
        auction: {
          include: {
            images: {
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
              select: {
                url: true,
                altText: true,
              },
            },
            _count: {
              select: {
                bids: true,
              },
            },
          },
        },
      },
    }),
    prisma.notification.findMany({
      where: {
        profileId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
      include: {
        auction: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        profileId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        action: true,
        resourceType: true,
        createdAt: true,
      },
    }),
    prisma.userPreference.upsert({
      where: { profileId: user.id },
      update: {},
      create: { profileId: user.id },
      select: {
        receiveEmailMarketing: true,
        receiveEmailAuction: true,
        receiveEmailNotification: true,
      },
    }),
  ]);

  const totalBidValue = recentBids.reduce(
    (sum, bid) => sum + Number(bid.amount),
    0
  );

  const trustScore = Math.min(
    100,
    35 +
      (user.emailVerified ? 25 : 0) +
      (user.phone ? 15 : 0) +
      Math.min(15, auctionsCreated * 3) +
      Math.min(10, bidsPlaced)
  );

  return (
    <ProfileClient
      user={user}
      stats={{
        auctionsCreated,
        activeSelling,
        bidsPlaced,
        auctionsWinning,
        auctionsWon,
        watchlistCount,
        unreadNotifications,
        trustScore,
        totalBidValue,
      }}
      recentBids={recentBids.map((bid) => ({
        id: bid.id,
        auctionId: bid.auctionId,
        auctionTitle: bid.auction.title,
        auctionStatus: bid.auction.status,
        auctionCurrentPrice: bid.auction.currentPrice.toString(),
        auctionEndsAt: bid.auction.endsAt?.toISOString() ?? null,
        auctionImageUrl: bid.auction.images[0]?.url ?? null,
        amount: bid.amount.toString(),
        status: bid.status,
        isAutoBid: bid.isAutoBid,
        createdAt: bid.createdAt.toISOString(),
      }))}
      myAuctions={myAuctions.map((auction) => ({
        id: auction.id,
        title: auction.title,
        status: auction.status,
        currentPrice: auction.currentPrice.toString(),
        startPrice: auction.startPrice.toString(),
        endsAt: auction.endsAt?.toISOString() ?? null,
        createdAt: auction.createdAt.toISOString(),
        imageUrl: auction.images[0]?.url ?? null,
        bidCount: auction._count.bids,
        watchCount: auction._count.watchlistItems,
      }))}
      watchlistItems={watchlistItems.map((item) => ({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
        auction: {
          id: item.auction.id,
          title: item.auction.title,
          status: item.auction.status,
          currentPrice: item.auction.currentPrice.toString(),
          endsAt: item.auction.endsAt?.toISOString() ?? null,
          imageUrl: item.auction.images[0]?.url ?? null,
          bidCount: item.auction._count.bids,
        },
      }))}
      notifications={notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        readAt: notification.readAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
        auctionId: notification.auctionId,
        auctionTitle: notification.auction?.title ?? null,
      }))}
      auditLogs={auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        createdAt: log.createdAt.toISOString(),
      }))}
      userPreference={userPreference}
    />
  );
}