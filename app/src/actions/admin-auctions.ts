"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, AuctionStatus } from "@prisma/client";

import { requireAdmin } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { createAdminAuditLog } from "@/src/lib/audit";
import { finalizeExpiredAuctions } from "@/src/lib/auction-lifecycle";

export type AdminAuction = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  seller: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  winner: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  status: AuctionStatus;
  currentPrice: string;
  bidCount: number;
  startsAt: string | null;
  endsAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export async function listAdminAuctions() {
  await requireAdmin();

  try {
    await finalizeExpiredAuctions(prisma, 100);

    const auctions = await prisma.auction.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        winner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
        _count: {
          select: { bids: true },
        },
      },
      orderBy: [{ status: "asc" }, { endsAt: "asc" }, { createdAt: "desc" }],
    });

    const data: AdminAuction[] = auctions.map((a) => ({
      id: a.id,
      title: a.title,
      thumbnailUrl: a.images[0]?.url ?? null,
      seller: a.seller,
      winner: a.winner,
      status: a.status,
      currentPrice: a.currentPrice.toString(),
      bidCount: a._count.bids,
      startsAt: a.startsAt?.toISOString() ?? null,
      endsAt: a.endsAt?.toISOString() ?? null,
      paidAt: a.paidAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    }));

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("List admin auctions error:", error);
    throw new Error("Không thể tải danh sách đấu giá");
  }
}

export async function adminMarkAuctionPaid(auctionId: string) {
  if (!auctionId || typeof auctionId !== "string") {
    throw new Error("Invalid auction ID");
  }

  const user = await requireAdmin();

  try {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        status: true,
        winnerId: true,
        paidAt: true,
        currentPrice: true,
      },
    });

    if (!auction) {
      throw new Error("Phiên đấu giá không tồn tại");
    }

    if (auction.status !== AuctionStatus.COMPLETED) {
      throw new Error("Chỉ có thể xác nhận thanh toán cho phiên đã hoàn tất");
    }

    if (!auction.winnerId) {
      throw new Error("Phiên chưa có người thắng");
    }

    if (auction.paidAt) {
      throw new Error("Phiên này đã được xác nhận thanh toán");
    }

    const paidAt = new Date();
    const updatedAuction = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        paidAt,
        paidById: user.id,
      },
    });

    await createAdminAuditLog({
      profileId: user.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: "auction",
      resourceId: auctionId,
      oldValues: {
        paidAt: null,
      },
      newValues: {
        operation: "AUCTION_MARKED_PAID",
        paidAt: paidAt.toISOString(),
        amount: auction.currentPrice.toString(),
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/auctions");
    revalidatePath("/admin/payments");
    revalidatePath(`/auctions/${auctionId}`);

    return {
      success: true,
      data: updatedAuction,
    };
  } catch (error) {
    console.error("Admin mark auction paid error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Không thể xác nhận thanh toán");
  }
}

export async function adminCancelAuction(auctionId: string, reason?: string) {
  if (!auctionId || typeof auctionId !== "string") {
    throw new Error("Invalid auction ID");
  }

  const user = await requireAdmin();

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    throw new Error("Vui lòng nhập lý do huỷ phiên (ít nhất 5 ký tự)");
  }

  try {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        status: true,
        paidAt: true,
      },
    });

    if (!auction) {
      throw new Error("Phiên đấu giá không tồn tại");
    }

    // Prevent cancelling already cancelled or completed auctions
    if (auction.status === AuctionStatus.CANCELLED) {
      throw new Error("Phiên đấu giá đã bị huỷ");
    }

    if (auction.status === AuctionStatus.COMPLETED && auction.paidAt) {
      throw new Error("Phiên đấu giá đã thanh toán, không thể huỷ");
    }

    const previousStatus = auction.status;
    const now = new Date();

    const updatedAuction = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: AuctionStatus.CANCELLED,
        canceledAt: now,
        canceledById: user.id,
        cancelReason: reason.trim(),
      },
    });

    // Create audit log
    await createAdminAuditLog({
      profileId: user.id,
      action: AuditAction.AUCTION_CANCELLED,
      resourceType: "auction",
      resourceId: auctionId,
      oldValues: {
        status: previousStatus,
      },
      newValues: {
        status: updatedAuction.status,
        cancelReason: reason.trim(),
      },
    });

    // Revalidate paths
    revalidatePath("/admin/auctions");
    revalidatePath("/auctions");
    revalidatePath(`/auctions/${auctionId}`);

    return {
      success: true,
      data: updatedAuction,
    };
  } catch (error) {
    console.error("Admin cancel auction error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Không thể huỷ phiên đấu giá");
  }
}
