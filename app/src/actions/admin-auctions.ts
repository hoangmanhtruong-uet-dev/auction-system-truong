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
  seller: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  status: AuctionStatus;
  currentPrice: string;
  endsAt: string | null;
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
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { endsAt: "asc" }, { createdAt: "desc" }],
    });

    const data: AdminAuction[] = auctions.map((a) => ({
      id: a.id,
      title: a.title,
      seller: a.seller,
      status: a.status,
      currentPrice: a.currentPrice.toString(),
      endsAt: a.endsAt?.toISOString() ?? null,
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
