import { AuctionStatus, Prisma, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { createAdminAuditLog } from "@/src/lib/audit";
import { getCurrentUser, type SafeUser } from "@/src/lib/auth";
import { error, type ErrorResult } from "@/src/lib/error-codes";
import { prisma } from "@/src/lib/prisma";
import { assertSameOrigin } from "@/src/lib/security-request";
import {
  ROLE_RANK,
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "@/src/lib/rbac";

export {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_RANK,
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "@/src/lib/rbac";

/**
 * Check if user can access the /admin area.
 * Requires `admin.area.access` permission — only assigned to ADMIN and SUPER_ADMIN.
 * This is a shell-level guard; individual pages/actions still use their own
 * specific permission checks (e.g. users.read.all, payments.read.all).
 */
export async function requireAdminAreaAccess(): Promise<SafeUser | ErrorResult> {
  return requirePermission("admin.area.access");
}

export function canAccessAdminArea(user: SafeUser): boolean {
  return hasPermission(user, "admin.area.access");
}

function isError(r: SafeUser | ErrorResult): r is ErrorResult {
  return "ok" in r && r.ok === false;
}

function forbidden(message = "Bạn không có quyền thực hiện thao tác này.") {
  return error("FORBIDDEN", message);
}

export async function requireAuth(): Promise<SafeUser | ErrorResult> {
  const user = await getCurrentUser();

  if (!user) {
    return error("UNAUTHENTICATED", "Bạn cần đăng nhập để tiếp tục.");
  }

  return user;
}

export async function requirePermission(permission: Permission): Promise<SafeUser | ErrorResult> {
  const user = await requireAuth();
  if (isError(user)) return user;

  if (user.mustChangePassword) {
    return error("FORBIDDEN", "You must change your temporary password before continuing.");
  }

  if (!hasPermission(user, permission)) {
    return forbidden();
  }

  return user;
}

export async function requireAnyPermission(permissions: readonly Permission[]): Promise<SafeUser | ErrorResult> {
  const user = await requireAuth();
  if (isError(user)) return user;

  if (!hasAnyPermission(user, permissions)) {
    return forbidden();
  }

  return user;
}

export async function requirePagePermission(permission: Permission): Promise<SafeUser> {
  const user = await requirePermission(permission);
  if (isError(user)) {
    redirect(user.code === "UNAUTHENTICATED" ? "/auth/login" : "/");
  }
  return user;
}

export async function requireActionPermission(permission: Permission): Promise<SafeUser | ErrorResult> {
  try {
    await assertSameOrigin();
  } catch {
    return error("FORBIDDEN", "Invalid request origin.");
  }
  return requirePermission(permission);
}

export async function assertOwnerOrPermission(params: {
  ownerId: string;
  actor: SafeUser;
  permission: Permission;
  message?: string;
}): Promise<true | ErrorResult> {
  if (params.ownerId === params.actor.id || hasPermission(params.actor, params.permission)) {
    return true;
  }

  return forbidden(params.message ?? "Bạn chỉ được thao tác với tài nguyên của mình.");
}

export function assertCanManageUserRole(params: {
  actor: SafeUser;
  target: Pick<SafeUser, "id" | "role" | "email">;
  nextRole: UserRole;
}): true | ErrorResult {
  const { actor, target, nextRole } = params;

  if (!hasPermission(actor, "users.update.role")) {
    return forbidden();
  }

  if (actor.id === target.id) {
    return error("FORBIDDEN", "Không thể tự thay đổi vai trò của chính mình trong UI quản trị.");
  }

  if (target.role === nextRole) {
    return true;
  }

  if (target.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
    return error("FORBIDDEN", "ADMIN không thể thay đổi hoặc hạ quyền SUPER_ADMIN.");
  }

  if (nextRole === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
    return error("FORBIDDEN", "Chỉ SUPER_ADMIN mới có thể cấp quyền SUPER_ADMIN.");
  }

  if (ROLE_RANK[nextRole] >= ROLE_RANK[actor.role] && actor.role !== UserRole.SUPER_ADMIN) {
    return error("FORBIDDEN", "Bạn không thể cấp vai trò ngang hoặc cao hơn vai trò của mình.");
  }

  if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role] && actor.role !== UserRole.SUPER_ADMIN) {
    return error("FORBIDDEN", "Bạn không thể thay đổi tài khoản có vai trò ngang hoặc cao hơn mình.");
  }

  return true;
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
      status: true,
    },
  });

  if (!auction) {
    return error("AUCTION_NOT_FOUND", "Phiên đấu giá không tồn tại hoặc đã bị xóa.");
  }

  if (auction.sellerId !== userId) {
    return forbidden("Bạn chỉ được thao tác với phiên đấu giá của mình.");
  }

  return true;
}

export function assertNotSellerBidder(auction: { sellerId: string }, bidderId: string): true | ErrorResult {
  if (auction.sellerId === bidderId) {
    return error("SELLER_CANNOT_BID", "Bạn không thể đặt giá cho sản phẩm của chính mình.");
  }

  return true;
}

export function canSellerBid(user: SafeUser, auction: { sellerId: string; status: AuctionStatus }): boolean {
  return hasPermission(user, "bids.create") && auction.sellerId !== user.id;
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
  const user = await requireAnyPermission(["auctions.cancel.any", "users.suspend", "payments.mark_paid"]);
  if (isError(user)) return user;

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
  if (hasPermission(user, "auctions.update.any")) return true;
  return hasPermission(user, "auctions.update.own") && auction.sellerId === user.id && auction.status === AuctionStatus.PENDING;
}

export { isError as isAuthorizationError };
