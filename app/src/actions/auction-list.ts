"use server";

import { AuctionStatus } from "@prisma/client";

import { error, type ActionResult } from "@/src/lib/error-codes";
import { finalizeExpiredAuctions } from "@/src/lib/auction-lifecycle";
import { prisma } from "@/src/lib/prisma";

export type AuctionListingItem = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  startPrice: string;
  currentPrice: string;
  bidStep: string;
  status: AuctionStatus;
  sellerId: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  bidCount: number;
  thumbnailUrl: string | null;
  seller: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
};

function normalizeStatus(status?: string): AuctionStatus | undefined {
  if (!status) {
    return undefined;
  }

  const upperStatus = status.toUpperCase();
  if (upperStatus in AuctionStatus) {
    return upperStatus as AuctionStatus;
  }

  return undefined;
}

export async function listAuctionCards(filter?: {
  status?: string;
  sellerId?: string;
  take?: number;
}): Promise<ActionResult<AuctionListingItem[]>> {
  try {
    await finalizeExpiredAuctions(prisma, 100);
  } catch {
    // Listing should remain available even if a best-effort lifecycle refresh fails.
  }

  try {
    const status = normalizeStatus(filter?.status);
    const auctions = await prisma.auction.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(filter?.sellerId ? { sellerId: filter.sellerId } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        startPrice: true,
        currentPrice: true,
        bidStep: true,
        status: true,
        sellerId: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        images: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            url: true,
          },
          take: 1,
        },
        _count: {
          select: {
            bids: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { endsAt: "asc" }, { createdAt: "desc" }],
      take: filter?.take,
    });

    return {
      success: true,
      data: auctions.map((auction) => ({
        id: auction.id,
        title: auction.title,
        description: auction.description,
        category: auction.category,
        startPrice: auction.startPrice.toString(),
        currentPrice: auction.currentPrice.toString(),
        bidStep: auction.bidStep.toString(),
        status: auction.status,
        sellerId: auction.sellerId,
        startsAt: auction.startsAt?.toISOString() ?? null,
        endsAt: auction.endsAt?.toISOString() ?? null,
        createdAt: auction.createdAt.toISOString(),
        updatedAt: auction.updatedAt.toISOString(),
        bidCount: auction._count.bids,
        thumbnailUrl: auction.images[0]?.url ?? null,
        seller: auction.seller,
      })),
    };
  } catch (err) {
    console.error("List auction cards error:", err);
    return error("DATABASE_ERROR", "Không thể tải danh sách đấu giá.");
  }
}
