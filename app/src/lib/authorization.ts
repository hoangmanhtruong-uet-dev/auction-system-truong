import { AuctionStatus, Prisma, UserRole } from "@prisma/client";

import { createAdminAuditLog } from "@/src/lib/audit";
import { getCurrentUser, type SafeUser } from "@/src/lib/auth";
import { error, type ErrorResult } from "@/src/lib/error-codes";
import { isErrorResult } from "@/src/lib/error-handling";
import { prisma } from "@/src/lib/prisma";

function isError(r: SafeUser | ErrorResult): r is ErrorResult {
  return "ok" in r && r.ok === false;
}

export async function requireAuth(): Promise<SafeUser | ErrorResult> {
  const user = await getCurrentUser();

  if (!user) {
    return error("UNAUTHENTICATED", "Bạn cần đăng nhập để tiếp tục.");
  }

  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SafeUser | ErrorResult> {
  const user = await requireAuth();

  if (isError(user)) {
    return user;
  }

  if (!allowedRoles.includes(user.role)) {
    return error("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  }

  return user;
}

export async function assertAuctionOwner(auctionId: string, userId: string): Promise<true | ErrorResult> {
  const auction = await prisma.auction.findFirst({
    where: {
      id: auctionId,
      deletedAt: null,
    },
    select: {
      id: true,
      sellerId: true,
    },
  });

  if (!auction) {
    return error("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại.");
  }

  if (auction.sellerId !== userId) {
    return error("FORBIDDEN", "Bạn chỉ được thao tác với phiên đấu giá của mình.");
  }

  return true;
}

export function assertNotSellerBidder(auction: { sellerId: string }, bidderId: string): true | ErrorResult {
  if (auction.sellerId === bidderId) {
    return error("SELLER_CANNOT_BID", "Bạn không thể đặt giá cho sản phẩm của chính mình.");
  }

  return true;
}

export function assertAdminActionReason(reason: unknown): true | ErrorResult {
  if (typeof reason !== "string" || reason.trim().length < 5) {
    return error("VALIDATION_ERROR", "Vui lòng nhập lý do hợp lệ cho thao tác quản trị.", {
      fieldErrors: {
        reason: "Lý do là bắt buộc và phải có ít nhất 5 ký tự.",
      },
    });
  }

  return true;
}

export async function requireAdminWithReason(reason: unknown): Promise<SafeUser | ErrorResult> {
  const user = await requireRole([UserRole.ADMIN]);

  if (isError(user)) {
    return user;
  }

  const reasonResult = assertAdminActionReason(reason);
  if (reasonResult !== true) {
    return reasonResult;
  }

  return user;
}

export async function auditAdminAction(params: {
  adminId: string;
  action: Parameters<typeof createAdminAuditLog>[0]["action"];
  resourceType: string;
  resourceId: string;
  reason: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}): Promise<void> {
  await createAdminAuditLog({
    profileId: params.adminId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    oldValues: params.oldValues as Prisma.InputJsonValue | undefined,
    newValues: {
      ...params.newValues,
      adminReason: params.reason.trim(),
    } as Prisma.InputJsonValue,
  });
}

export function canEditAuction(user: SafeUser, auction: { sellerId: string; status: AuctionStatus }): boolean {
  if (user.role === UserRole.ADMIN) return true;
  return user.role === UserRole.SELLER && auction.sellerId === user.id && auction.status === AuctionStatus.PENDING;
}