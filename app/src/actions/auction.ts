"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, AuctionStatus, BidStatus } from "@prisma/client";

import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/src/lib/auth";
import { finalizeExpiredAuctions, getAuctionWithFreshStatus, getBidStatusError, refreshAuctionStatus } from "@/src/lib/auction-lifecycle";
import { assertNotSellerBidder } from "@/src/lib/authorization";
import { error, type AppErrorCode } from "@/src/lib/error-codes";
import { logError, normalizeError } from "@/src/lib/error-handling";
import { prisma } from "@/src/lib/prisma";
import { checkRateLimit, getRateLimitErrorMessage } from "@/src/lib/rate-limit";
import { ActionResult, CreateAuctionInput, CreateAuctionSchema, PlaceBidInput, PlaceBidSchema } from "@/src/types";

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
const LOGIN_REQUIRED_MESSAGE = "Bạn cần đăng nhập để thực hiện thao tác này.";
const BID_RATE_LIMIT_WINDOW_MS = 2 * 1000;
const BID_RATE_LIMIT = 1;
const MAX_SAFE_BID_PRICE = 9_000_000_000_000_000;
const AUTO_EXTENSION_THRESHOLD_MS = 2 * 60 * 1000;
const AUTO_EXTENSION_DURATION_MS = 2 * 60 * 1000;

function getValidationMessage(error: { flatten: () => { fieldErrors: Record<string, string[]>; formErrors: string[] } }) {
  const flattened = error.flatten();
  return flattened.formErrors[0] ?? Object.values(flattened.fieldErrors).flat()[0] ?? "Dữ liệu không hợp lệ.";
}

function getValidationFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]>; formErrors: string[] } }) {
  const flattened = error.flatten();
  return Object.fromEntries(
    Object.entries(flattened.fieldErrors)
      .filter(([, messages]) => messages?.length)
      .map(([field, messages]) => [field, messages[0] ?? "Giá trị không hợp lệ"]),
  );
}

class BidFlowError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "BidFlowError";
  }
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
  auction: {
    id: string;
    title: string;
    description: string;
    startPrice: bigint;
    currentPrice: bigint;
    bidStep: bigint;
    status: AuctionStatus;
    sellerId: string;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
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
    return error("VALIDATION_ERROR", getValidationMessage(parsed.error), {
      fieldErrors: getValidationFieldErrors(parsed.error),
    });
  }

  const user = await getCurrentUser();
  if (!user) {
    return error("UNAUTHENTICATED", LOGIN_REQUIRED_MESSAGE);
  }

  try {
    const auction = await prisma.$transaction(async (tx) => {
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + parsed.data.duration * 60 * 1000);
      const startPrice = BigInt(parsed.data.startPrice);

      const createdAuction = await tx.auction.create({
        data: {
          title: parsed.data.title,
          category: parsed.data.category,
          condition: parsed.data.condition,
          description: parsed.data.description,
          startPrice,
          currentPrice: startPrice,
          bidStep: BigInt(parsed.data.bidStep),
          durationMinutes: parsed.data.duration,
          autoExtensionEnabled: parsed.data.autoExtensionEnabled,
          maxExtensions: parsed.data.maxExtensions,
          currentExtensionCount: 0,
          status: AuctionStatus.PENDING,
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
  } catch (err) {
    return normalizeError(err, "createAuction", "CREATE_AUCTION_FAILED", NETWORK_ERROR_MESSAGE);
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
    return error("VALIDATION_ERROR", getValidationMessage(parsed.error), {
      fieldErrors: getValidationFieldErrors(parsed.error),
    });
  }

  const user = await getCurrentUser();
  if (!user) {
    return error("UNAUTHENTICATED", LOGIN_REQUIRED_MESSAGE);
  }

  if (!Number.isSafeInteger(parsed.data.bidPrice) || parsed.data.bidPrice <= 0) {
    return error("VALIDATION_ERROR", "Giá đặt không hợp lệ.", {
      fieldErrors: { bidPrice: "Giá đặt phải là số nguyên dương." },
    });
  }

  if (parsed.data.bidPrice > MAX_SAFE_BID_PRICE) {
    return error("VALIDATION_ERROR", "Giá đặt vượt quá giới hạn an toàn.", {
      fieldErrors: { bidPrice: "Giá đặt quá lớn." },
    });
  }

  if (
    parsed.data.autoBidMaxPrice !== undefined &&
    (!Number.isSafeInteger(parsed.data.autoBidMaxPrice) || parsed.data.autoBidMaxPrice <= 0)
  ) {
    return error("VALIDATION_ERROR", "Giá tự động tối đa không hợp lệ.", {
      fieldErrors: { autoBidMaxPrice: "Giá tự động tối đa phải là số nguyên dương." },
    });
  }

  if (parsed.data.autoBidMaxPrice !== undefined && parsed.data.bidPrice > parsed.data.autoBidMaxPrice) {
    return error("AUTO_BID_PRICE_EXCEEDS_MAX", "Giá đặt không thể lớn hơn giá tự động tối đa.", {
      fieldErrors: { autoBidMaxPrice: "Giá tự động tối đa phải lớn hơn hoặc bằng giá đặt." },
    });
  }

  try {
    const rateLimit = checkRateLimit(`bid:${user.id}:${parsed.data.auctionId}`, {
      limit: BID_RATE_LIMIT,
      windowMs: BID_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return error("RATE_LIMITED", getRateLimitErrorMessage(rateLimit));
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
        throw new BidFlowError("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.", {
          userId: user.id,
          auctionId: parsed.data.auctionId,
        });
      }

      const now = new Date();
      await refreshAuctionStatus(parsed.data.auctionId, tx, now);

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
          startsAt: true,
          endsAt: true,
          winnerId: true,
          autoExtensionEnabled: true,
          maxExtensions: true,
          currentExtensionCount: true,
        },
      });

      if (!auction) {
        throw new BidFlowError("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.", {
          userId: user.id,
          auctionId: parsed.data.auctionId,
        });
      }

      const sellerCheck = assertNotSellerBidder(auction, user.id);
      if (sellerCheck !== true) {
        throw new BidFlowError(sellerCheck.code, sellerCheck.message, {
          userId: user.id,
          auctionId: auction.id,
        });
      }

      const statusError = await getBidStatusError(auction.id, auction.status, auction.startsAt, auction.endsAt, tx);
      if (statusError) {
        throw new BidFlowError(statusError.code, statusError.message, {
          userId: user.id,
          auctionId: auction.id,
          status: auction.status,
        });
      }

      if (parsed.data.expectedCurrentPrice && auction.currentPrice.toString() !== parsed.data.expectedCurrentPrice) {
        const minimumBid = auction.currentPrice + auction.bidStep;
        throw new BidFlowError(
          "PRICE_CHANGED",
          `Giá đã thay đổi. Giá tối thiểu hiện tại là ${formatCurrency(minimumBid)}.`,
          {
            userId: user.id,
            auctionId: auction.id,
            currentPrice: auction.currentPrice.toString(),
            minimumBid: minimumBid.toString(),
          },
        );
      }

      if (parsed.data.isAutoBid) {
        throw new BidFlowError("AUTO_BID_DISABLED", "Auto-bid sắp ra mắt.", {
          userId: user.id,
          auctionId: auction.id,
        });
      }

      const bidAmount = BigInt(parsed.data.bidPrice);
      const minimumBid = auction.currentPrice + auction.bidStep;

      if (bidAmount < minimumBid) {
        throw new BidFlowError("BID_TOO_LOW", `Giá đặt phải lớn hơn hoặc bằng ${formatCurrency(minimumBid)}.`, {
          userId: user.id,
          auctionId: auction.id,
          minimumBid: minimumBid.toString(),
        });
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
          isAutoBid: false,
          autoBidMaxPrice: null,
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
        auction.endsAt !== null &&
        auction.endsAt.getTime() - now.getTime() <= AUTO_EXTENSION_THRESHOLD_MS;

      const nextEndsAt = shouldAutoExtend && auction.endsAt
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
            endsAt: nextEndsAt?.toISOString() ?? null,
          },
        },
      });

      return { createdBid, autoBidsPlaced: 0 };
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
  } catch (err) {
    if (err instanceof BidFlowError) {
      logError("placeBid.rejected", err, {
        code: err.code,
        ...err.metadata,
      });
      return error(err.code, err.message, {
        details: process.env.NODE_ENV === "production" ? undefined : err.metadata,
      });
    }

    return normalizeError(err, "placeBid", "PLACE_BID_FAILED", NETWORK_ERROR_MESSAGE);
  }
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
    await getAuctionWithFreshStatus(auctionId);
  } catch {
    // Keep existing behavior: return auction serialization if possible
  }
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
    try {
      await finalizeExpiredAuctions(prisma, 100);
    } catch (refreshError) {
      console.error("List seller products lifecycle refresh failed:", refreshError);
    }

    const auctions = await prisma.auction.findMany({
      where: {
        sellerId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        startPrice: true,
        currentPrice: true,
        status: true,
        sellerId: true,
        winnerId: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        updatedAt: true,
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
    await finalizeExpiredAuctions(prisma, 100);
  } catch {
    // Keep list reads available even if a background lifecycle refresh fails.
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
