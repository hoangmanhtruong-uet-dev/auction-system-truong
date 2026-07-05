"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, AuctionStatus, BidStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { checkRateLimit, getRateLimitErrorMessage } from "@/src/lib/rate-limit";
import { ActionResult, CreateAuctionInput, CreateAuctionSchema, PlaceBidInput, PlaceBidSchema } from "@/src/types";

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
const LOGIN_REQUIRED_MESSAGE = "Bạn cần đăng nhập để thực hiện thao tác này.";
const BID_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const BID_RATE_LIMIT = 30;
const AUTO_EXTENSION_THRESHOLD_MS = 2 * 60 * 1000;
const AUTO_EXTENSION_DURATION_MS = 2 * 60 * 1000;

function getValidationMessage(error: { flatten: () => { fieldErrors: Record<string, string[]>; formErrors: string[] } }) {
  const flattened = error.flatten();
  return flattened.formErrors[0] ?? Object.values(flattened.fieldErrors).flat()[0] ?? "Dữ liệu không hợp lệ.";
}

export type SerializedAuctionListItem = {
  id: string;
  title: string;
  description: string;
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
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    sortOrder: number;
  }>;
};

export type SerializedAuctionDetails = SerializedAuctionListItem & {
  durationMinutes: number;
  autoExtensionEnabled: boolean;
  maxExtensions: number;
  currentExtensionCount: number;
  winnerId: string | null;
  bids: Array<{
    id: string;
    amount: string;
    isAutoBid: boolean;
    status: BidStatus;
    createdAt: string;
    bidder: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
    };
  }>;
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

function serializeAuctionListItem(
  auction: Awaited<ReturnType<typeof prisma.auction.findMany>>[number] & {
    seller: { id: string; fullName: string; avatarUrl: string | null };
    images: Array<{ id: string; url: string; altText: string | null; sortOrder: number }>;
    _count: { bids: number };
  },
): SerializedAuctionListItem {
  return {
    id: auction.id,
    title: auction.title,
    description: auction.description,
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
    images: auction.images,
  };
}

export async function createAuction(data: CreateAuctionInput): Promise<ActionResult<{
  auctionId: string;
  title: string;
  startPrice: string;
  startPriceLabel: string;
  status: AuctionStatus;
}>> {
  const parsed = CreateAuctionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: getValidationMessage(parsed.error), code: "VALIDATION_ERROR" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: LOGIN_REQUIRED_MESSAGE, code: "AUTH_REQUIRED" };
  }

  try {
    const auction = await prisma.$transaction(async (tx) => {
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + parsed.data.duration * 60 * 1000);
      const startPrice = BigInt(parsed.data.startPrice);

      const createdAuction = await tx.auction.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          startPrice,
          currentPrice: startPrice,
          bidStep: BigInt(parsed.data.bidStep),
          durationMinutes: parsed.data.duration,
          autoExtensionEnabled: parsed.data.autoExtensionEnabled,
          maxExtensions: parsed.data.maxExtensions,
          currentExtensionCount: 0,
          status: AuctionStatus.ACTIVE,
          sellerId: user.id,
          startsAt,
          endsAt,
          images: {
            create: parsed.data.images.map((url, index) => ({
              url,
              altText: parsed.data.title,
              sortOrder: index,
            })),
          },
        },
        select: {
          id: true,
          title: true,
          startPrice: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          profileId: user.id,
          action: AuditAction.AUCTION_CREATED,
          resourceType: "auction",
          resourceId: createdAuction.id,
          newValues: {
            title: createdAuction.title,
            startPrice: createdAuction.startPrice.toString(),
            status: createdAuction.status,
            startsAt: createdAuction.startsAt?.toISOString(),
            endsAt: createdAuction.endsAt?.toISOString(),
          },
        },
      });

      return createdAuction;
    });

    revalidatePath("/");
    revalidatePath("/auctions");
    revalidatePath(`/auctions/${auction.id}`);

    return {
      success: true,
      data: {
        auctionId: auction.id,
        title: auction.title,
        startPrice: auction.startPrice.toString(),
        startPriceLabel: formatCurrency(auction.startPrice),
        status: auction.status,
      },
    };
  } catch (error) {
    console.error("Create auction error:", error);
    return { success: false, error: NETWORK_ERROR_MESSAGE, code: "CREATE_AUCTION_FAILED" };
  }
}

export async function placeBid(data: PlaceBidInput): Promise<ActionResult<{
  bidId: string;
  auctionId: string;
  bidPrice: string;
  bidPriceLabel: string;
  autoBidsPlaced: number;
}>> {
  const parsed = PlaceBidSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: getValidationMessage(parsed.error), code: "VALIDATION_ERROR" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: LOGIN_REQUIRED_MESSAGE, code: "AUTH_REQUIRED" };
  }

  if (!Number.isSafeInteger(parsed.data.bidPrice) || parsed.data.bidPrice <= 0) {
    return { success: false, error: "Giá đặt không hợp lệ" };
  }

  if (
    parsed.data.autoBidMaxPrice !== undefined &&
    (!Number.isSafeInteger(parsed.data.autoBidMaxPrice) || parsed.data.autoBidMaxPrice <= 0)
  ) {
    return { success: false, error: "Giá tự động tối đa không hợp lệ" };
  }

  if (parsed.data.autoBidMaxPrice !== undefined && parsed.data.bidPrice > parsed.data.autoBidMaxPrice) {
    return { success: false, error: "Giá đặt không thể lớn hơn giá tự động tối đa.", code: "AUTO_BID_PRICE_EXCEEDS_MAX" };
  }

  try {
    const rateLimit = checkRateLimit(`bid:${user.id}:${parsed.data.auctionId}`, {
      limit: BID_RATE_LIMIT,
      windowMs: BID_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return {
        success: false,
        error: getRateLimitErrorMessage(rateLimit),
        code: "RATE_LIMITED",
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const lockedAuctions = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM auctions
        WHERE id = ${parsed.data.auctionId}::uuid
          AND deleted_at IS NULL
        FOR UPDATE
      `;

      if (lockedAuctions.length === 0) {
        throw new Error("AUCTION_NOT_FOUND");
      }

      const auction = await tx.auction.findFirst({
        where: {
          id: parsed.data.auctionId,
          deletedAt: null,
        },
        select: {
          id: true,
          sellerId: true,
          status: true,
          currentPrice: true,
          startPrice: true,
          bidStep: true,
          endsAt: true,
          winnerId: true,
          autoExtensionEnabled: true,
          maxExtensions: true,
          currentExtensionCount: true,
        },
      });

      if (!auction) {
        throw new Error("AUCTION_NOT_FOUND");
      }

      if (auction.sellerId === user.id) {
        throw new Error("SELLER_CANNOT_BID");
      }

      const now = new Date();
      if (auction.status !== AuctionStatus.ACTIVE || !auction.endsAt || auction.endsAt <= now) {
        throw new Error("AUCTION_NOT_ACTIVE");
      }

      if (parsed.data.expectedCurrentPrice && auction.currentPrice.toString() !== parsed.data.expectedCurrentPrice) {
        throw new Error("CURRENT_PRICE_CHANGED");
      }

      const bidAmount = BigInt(parsed.data.bidPrice);
      const minimumBid = auction.currentPrice + auction.bidStep;

      if (bidAmount < minimumBid) {
        throw new Error(`BID_TOO_LOW:${minimumBid.toString()}`);
      }

      await tx.bid.updateMany({
        where: {
          auctionId: auction.id,
          deletedAt: null,
          status: BidStatus.ACTIVE,
        },
        data: {
          status: BidStatus.LOST,
        },
      });

      const createdBid = await tx.bid.create({
        data: {
          auctionId: auction.id,
          bidderId: user.id,
          amount: bidAmount,
          isAutoBid: parsed.data.isAutoBid,
          autoBidMaxPrice: parsed.data.autoBidMaxPrice ? BigInt(parsed.data.autoBidMaxPrice) : null,
          status: BidStatus.ACTIVE,
        },
        select: {
          id: true,
          auctionId: true,
          amount: true,
        },
      });

      const shouldAutoExtend =
        auction.autoExtensionEnabled &&
        auction.currentExtensionCount < auction.maxExtensions &&
        auction.endsAt.getTime() - now.getTime() <= AUTO_EXTENSION_THRESHOLD_MS;

      const nextEndsAt = shouldAutoExtend
        ? new Date(auction.endsAt.getTime() + AUTO_EXTENSION_DURATION_MS)
        : auction.endsAt;

      await tx.auction.update({
        where: { id: auction.id },
        data: {
          currentPrice: bidAmount,
          winnerId: user.id,
          updatedAt: now,
          ...(shouldAutoExtend
            ? {
                endsAt: nextEndsAt,
                currentExtensionCount: {
                  increment: 1,
                },
              }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          profileId: user.id,
          action: AuditAction.BID_PLACED,
          resourceType: "bid",
          resourceId: createdBid.id,
          oldValues: {
            auctionId: auction.id,
            currentPrice: auction.currentPrice.toString(),
            winnerId: auction.winnerId,
          },
          newValues: {
            auctionId: auction.id,
            amount: createdBid.amount.toString(),
            bidderId: user.id,
            auctionCurrentPrice: bidAmount.toString(),
            auctionWinnerId: user.id,
            autoExtended: shouldAutoExtend,
            endsAt: nextEndsAt.toISOString(),
          },
        },
      });

      // Process autobids after manual bid placement
      const autoBidsPlaced = await processAutoBidsInTx(tx, auction.id, now);

      return { createdBid, autoBidsPlaced };
    });

    revalidatePath("/");
    revalidatePath("/auctions");
    revalidatePath(`/auctions/${result.createdBid.auctionId}`);

    return {
      success: true,
      data: {
        bidId: result.createdBid.id,
        auctionId: result.createdBid.auctionId,
        bidPrice: result.createdBid.amount.toString(),
        bidPriceLabel: formatCurrency(result.createdBid.amount),
        autoBidsPlaced: result.autoBidsPlaced,
      },
    };
  } catch (error) {
    console.error("Place bid error:", error);

    const message =
      error instanceof Error && error.message === "AUCTION_NOT_FOUND"
        ? "Phiên đấu giá không tồn tại."
        : error instanceof Error && error.message === "SELLER_CANNOT_BID"
          ? "Người bán không thể đặt giá cho phiên của mình."
          : error instanceof Error && error.message === "AUCTION_NOT_ACTIVE"
            ? "Phiên đấu giá chưa hoạt động hoặc đã kết thúc."
            : error instanceof Error && error.message === "CURRENT_PRICE_CHANGED"
              ? "Giá hiện tại đã thay đổi. Vui lòng tải lại và thử lại."
              : error instanceof Error && error.message.startsWith("BID_TOO_LOW:")
                ? `Giá đặt phải lớn hơn hoặc bằng ${formatCurrency(error.message.split(":")[1])}.`
                : NETWORK_ERROR_MESSAGE;

    const code =
      error instanceof Error && error.message === "CURRENT_PRICE_CHANGED"
        ? "CURRENT_PRICE_CHANGED"
        : error instanceof Error && error.message.startsWith("BID_TOO_LOW:")
          ? "BID_TOO_LOW"
          : error instanceof Error
            ? error.message
            : "PLACE_BID_FAILED";

    return { success: false, error: message, code };
  }
}

/**
 * Process autobids for an auction after a bid is placed.
 * Finds all users who have active autobids (isAutoBid=true) with autoBidMaxPrice > currentPrice,
 * and places bids for them automatically. Runs inside the parent transaction.
 */
async function processAutoBidsInTx(
  tx: Prisma.TransactionClient & { $queryRaw: typeof prisma.$queryRaw },
  auctionId: string,
  now: Date,
): Promise<number> {
  const MAX_AUTOBID_ITERATIONS = 10;
  let autoBidsPlaced = 0;

  for (let i = 0; i < MAX_AUTOBID_ITERATIONS; i++) {
    // Fetch current auction state (locked via parent FOR UPDATE)
    const auction = await tx.auction.findFirst({
      where: { id: auctionId, deletedAt: null },
      select: {
        id: true,
        currentPrice: true,
        winnerId: true,
        bidStep: true,
        status: true,
        endsAt: true,
        autoExtensionEnabled: true,
        maxExtensions: true,
        currentExtensionCount: true,
      },
    });

    if (!auction || auction.status !== AuctionStatus.ACTIVE || !auction.endsAt || auction.endsAt <= now) {
      break;
    }

    // Find distinct autobidders who:
    // - Have the most recent autobid on this auction
    // - Have autoBidMaxPrice > currentPrice
    // - Are not the current winner
    // Sort by max price descending
    const autobidders = await tx.$queryRaw<Array<{ bidder_id: string; auto_bid_max_price: bigint }>>`
      WITH latest_autobids AS (
        SELECT DISTINCT ON (b.bidder_id) b.bidder_id, b.auto_bid_max_price
        FROM bids b
        WHERE b.auction_id = ${auctionId}::uuid
          AND b.is_auto_bid = true
          AND b.auto_bid_max_price IS NOT NULL
          AND b.deleted_at IS NULL
        ORDER BY b.bidder_id, b.created_at DESC
      )
      SELECT * FROM latest_autobids
      WHERE auto_bid_max_price > ${auction.currentPrice}::bigint
        AND (${auction.winnerId}::uuid IS NULL OR bidder_id != ${auction.winnerId}::uuid)
      ORDER BY auto_bid_max_price DESC
    `;

    if (autobidders.length === 0) {
      break;
    }

    const topBidder = autobidders[0];
    const nextMinBid = auction.currentPrice + auction.bidStep;
    const autoBidAmount = nextMinBid < topBidder.auto_bid_max_price
      ? nextMinBid
      : topBidder.auto_bid_max_price;

    if (autoBidAmount <= auction.currentPrice) {
      break;
    }

    // Mark existing active bids as LOST
    await tx.bid.updateMany({
      where: {
        auctionId: auction.id,
        deletedAt: null,
        status: BidStatus.ACTIVE,
      },
      data: {
        status: BidStatus.LOST,
      },
    });

    // Create the auto-bid
    const autoBid = await tx.bid.create({
      data: {
        auctionId: auction.id,
        bidderId: topBidder.bidder_id,
        amount: autoBidAmount,
        isAutoBid: true,
        autoBidMaxPrice: topBidder.auto_bid_max_price,
        status: BidStatus.ACTIVE,
      },
      select: {
        id: true,
        amount: true,
      },
    });

    // Handle auto-extension if needed
    const shouldAutoExtend =
      auction.autoExtensionEnabled &&
      auction.currentExtensionCount < auction.maxExtensions &&
      auction.endsAt.getTime() - now.getTime() <= AUTO_EXTENSION_THRESHOLD_MS;

    const nextEndsAt = shouldAutoExtend
      ? new Date(auction.endsAt.getTime() + AUTO_EXTENSION_DURATION_MS)
      : auction.endsAt;

    // Update auction
    await tx.auction.update({
      where: { id: auction.id },
      data: {
        currentPrice: autoBidAmount,
        winnerId: topBidder.bidder_id,
        updatedAt: now,
        ...(shouldAutoExtend
          ? {
              endsAt: nextEndsAt,
              currentExtensionCount: {
                increment: 1,
              },
            }
          : {}),
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        profileId: topBidder.bidder_id,
        action: AuditAction.BID_PLACED,
        resourceType: "bid",
        resourceId: autoBid.id,
        oldValues: {
          auctionId: auction.id,
          currentPrice: auction.currentPrice.toString(),
          winnerId: auction.winnerId,
        },
        newValues: {
          auctionId: auction.id,
          amount: autoBid.amount.toString(),
          bidderId: topBidder.bidder_id,
          isAutoBid: true,
          autoBidMaxPrice: topBidder.auto_bid_max_price.toString(),
          auctionCurrentPrice: autoBidAmount.toString(),
          auctionWinnerId: topBidder.bidder_id,
          autoExtended: shouldAutoExtend,
          endsAt: nextEndsAt.toISOString(),
        },
      },
    });

    autoBidsPlaced++;
  }

  return autoBidsPlaced;
}

export async function cancelAutoBid(auctionId: string): Promise<ActionResult<{ auctionId: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: LOGIN_REQUIRED_MESSAGE, code: "AUTH_REQUIRED" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Cancel all active autobids for this user on this auction
      // by marking their autobid records as cancelled
      await tx.bid.updateMany({
        where: {
          auctionId,
          bidderId: user.id,
          isAutoBid: true,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          status: BidStatus.CANCELLED,
        },
      });

      await tx.auditLog.create({
        data: {
          profileId: user.id,
          action: AuditAction.BID_CANCELLED,
          resourceType: "autobid",
          resourceId: auctionId,
          oldValues: { action: "cancelled" },
          newValues: { auctionId, cancelledAt: new Date().toISOString() },
        },
      });
    });

    revalidatePath(`/auctions/${auctionId}`);

    return { success: true, data: { auctionId } };
  } catch (error) {
    console.error("Cancel autobid error:", error);
    return { success: false, error: NETWORK_ERROR_MESSAGE, code: "CANCEL_AUTOBID_FAILED" };
  }
}

export async function getAuctionById(auctionId: string) {
  try {
    const auction = await prisma.auction.findFirst({
      where: {
        id: auctionId,
        deletedAt: null,
      },
      include: {
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
            id: true,
            url: true,
            altText: true,
            sortOrder: true,
          },
        },
        bids: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          select: {
            id: true,
            amount: true,
            isAutoBid: true,
            status: true,
            createdAt: true,
            bidder: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
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
    });

    if (!auction) {
      return { success: false, error: "Phiên đấu giá không tồn tại", data: null };
    }

    return {
      success: true,
      data: {
        ...serializeAuctionListItem(auction),
        durationMinutes: auction.durationMinutes,
        autoExtensionEnabled: auction.autoExtensionEnabled,
        maxExtensions: auction.maxExtensions,
        currentExtensionCount: auction.currentExtensionCount,
        winnerId: auction.winnerId,
        bids: auction.bids.map((bid) => ({
          id: bid.id,
          amount: bid.amount.toString(),
          isAutoBid: bid.isAutoBid,
          status: bid.status,
          createdAt: bid.createdAt.toISOString(),
          bidder: bid.bidder,
        })),
      } satisfies SerializedAuctionDetails,
    };
  } catch (error) {
    console.error("Get auction error:", error);
    return { success: false, error: "Không thể tải phiên đấu giá", data: null };
  }
}

export type SellerProductItem = {
  id: string;
  title: string;
  description: string;
  startPrice: string;
  currentPrice: string;
  status: AuctionStatus;
  sellerId: string;
  winnerId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  bidCount: number;
  watchlistCount: number;
  thumbnailUrl: string | null;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    sortOrder: number;
  }>;
};

export async function listSellerProducts(): Promise<ActionResult<SellerProductItem[]>> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: LOGIN_REQUIRED_MESSAGE, code: "AUTH_REQUIRED" };
  }

  try {
    const auctions = await prisma.auction.findMany({
      where: {
        sellerId: user.id,
        deletedAt: null,
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            id: true,
            url: true,
            altText: true,
            sortOrder: true,
          },
        },
        _count: {
          select: {
            bids: {
              where: {
                deletedAt: null,
              },
            },
            watchlistItems: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return {
      success: true,
      data: auctions.map((auction) => ({
        id: auction.id,
        title: auction.title,
        description: auction.description,
        startPrice: auction.startPrice.toString(),
        currentPrice: auction.currentPrice.toString(),
        status: auction.status,
        sellerId: auction.sellerId,
        winnerId: auction.winnerId,
        startsAt: auction.startsAt?.toISOString() ?? null,
        endsAt: auction.endsAt?.toISOString() ?? null,
        createdAt: auction.createdAt.toISOString(),
        updatedAt: auction.updatedAt.toISOString(),
        bidCount: auction._count.bids,
        watchlistCount: auction._count.watchlistItems,
        thumbnailUrl: auction.images[0]?.url ?? null,
        images: auction.images,
      })),
    };
  } catch (error) {
    console.error("List seller products error:", error);
    return { success: false, error: "Không thể tải danh sách sản phẩm của bạn." };
  }
}

export async function deleteSellerProduct(auctionId: string): Promise<ActionResult<{ auctionId: string }>> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: LOGIN_REQUIRED_MESSAGE, code: "AUTH_REQUIRED" };
  }

  try {
    const auction = await prisma.auction.findFirst({
      where: {
        id: auctionId,
        sellerId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        title: true,
        sellerId: true,
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
    });

    if (!auction) {
      return { success: false, error: "Sản phẩm không tồn tại hoặc bạn không có quyền thao tác.", code: "NOT_FOUND" };
    }

    if (auction.status === AuctionStatus.ACTIVE && auction._count.bids > 0) {
      return {
        success: false,
        error: "Không thể xóa phiên đang có lượt bid. Bạn có thể kết thúc hoặc ẩn sau khi phiên hoàn tất.",
        code: "AUCTION_HAS_BIDS",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.auction.update({
        where: {
          id: auction.id,
        },
        data: {
          deletedAt: new Date(),
          status: auction.status === AuctionStatus.ACTIVE ? AuctionStatus.CANCELLED : auction.status,
        },
      });

      await tx.auditLog.create({
        data: {
          profileId: user.id,
          action: AuditAction.AUCTION_CANCELLED,
          resourceType: "auction",
          resourceId: auction.id,
          oldValues: {
            title: auction.title,
            status: auction.status,
            deletedAt: null,
          },
          newValues: {
            deletedAt: new Date().toISOString(),
            hiddenBySeller: true,
          },
        },
      });
    });

    revalidatePath("/products");
    revalidatePath("/auctions");
    revalidatePath(`/auctions/${auction.id}`);

    return { success: true, data: { auctionId: auction.id } };
  } catch (error) {
    console.error("Delete seller product error:", error);
    return { success: false, error: NETWORK_ERROR_MESSAGE, code: "DELETE_SELLER_PRODUCT_FAILED" };
  }
}

export async function listAuctions(filter?: { status?: string; sellerId?: string; take?: number }) {
  try {
    const status = normalizeStatus(filter?.status);
    const auctions = await prisma.auction.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(filter?.sellerId ? { sellerId: filter.sellerId } : {}),
      },
      include: {
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
            id: true,
            url: true,
            altText: true,
            sortOrder: true,
          },
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
      data: auctions.map(serializeAuctionListItem),
    };
  } catch (error) {
    console.error("List auctions error:", error);
    return { success: false, error: "Không thể tải danh sách đấu giá", data: [] };
  }
}