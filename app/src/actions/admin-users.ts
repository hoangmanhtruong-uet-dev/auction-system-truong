"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AuditAction, UserRole } from "@prisma/client";

import {
  ROLE_RANK,
  assertCanManageUserRole,
  isAuthorizationError,
  requireActionPermission,
} from "@/src/lib/authorization";
import { createAdminAuditLog } from "@/src/lib/audit";
import { prisma } from "@/src/lib/prisma";

const AdminUserListSchema = z.object({
  take: z.number().int().positive().optional().default(50),
  cursor: z.string().optional(),
});

export async function getAdminUsers(input?: { take?: number; cursor?: string }) {
  const admin = await requireActionPermission("users.read.all");
  if (isAuthorizationError(admin)) {
    throw new Error(admin.message);
  }

  const parsed = AdminUserListSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  const { take, cursor } = parsed.data;

  try {
    const users = await prisma.profile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        _count: {
          select: {
            auctionsAsSeller: true,
            bids: true,
          },
        },
      },
    });

    const nextCursor = users.length > take ? users[users.length - 1].id : null;
    const data = nextCursor ? users.slice(0, -1) : users;

    return {
      users: data,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  } catch (error) {
    console.error("Failed to fetch admin users:", error);
    throw new Error("Khong the tai danh sach nguoi dung");
  }
}

export async function toggleUserBlock(userId: string, block: boolean, reason?: string) {
  const actor = await requireActionPermission("users.suspend");
  if (isAuthorizationError(actor)) {
    throw new Error(actor.message);
  }

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid user ID");
  }

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    throw new Error("Vui long nhap ly do hop le cho thao tac quan tri (it nhat 5 ky tu)");
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new Error("Nguoi dung khong ton tai");
    }

    if (profile.id === actor.id) {
      throw new Error("Khong the khoa chinh minh.");
    }

    if (ROLE_RANK[profile.role] >= ROLE_RANK[actor.role] && actor.role !== UserRole.SUPER_ADMIN) {
      throw new Error("Khong the khoa tai khoan co vai tro ngang hoac cao hon ban.");
    }

    const previousStatus = profile.deletedAt ? "BLOCKED" : "ACTIVE";
    const updatedProfile = await prisma.profile.update({
      where: { id: userId },
      data: {
        deletedAt: block ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    await createAdminAuditLog({
      profileId: actor.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: "profile",
      resourceId: profile.id,
      oldValues: {
        deletedAt: profile.deletedAt?.toISOString() ?? null,
        previousStatus,
      },
      newValues: {
        operation: block ? "USER_BLOCKED" : "USER_UNBLOCKED",
        deletedAt: updatedProfile.deletedAt?.toISOString() ?? null,
        adminReason: reason.trim(),
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    return {
      success: true,
      user: updatedProfile,
    };
  } catch (error) {
    console.error("Failed to toggle user block:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Khong the thuc hien thao tac");
  }
}

export async function updateUserRole(userId: string, nextRole: UserRole, reason?: string) {
  const actor = await requireActionPermission("users.update.role");
  if (isAuthorizationError(actor)) {
    throw new Error(actor.message);
  }

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid user ID");
  }

  if (!Object.values(UserRole).includes(nextRole)) {
    throw new Error("Vai tro khong hop le");
  }

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    throw new Error("Vui long nhap ly do hop le cho thao tac doi vai tro (it nhat 5 ky tu)");
  }

  try {
    const target = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        deletedAt: true,
      },
    });

    if (!target) {
      throw new Error("Nguoi dung khong ton tai");
    }

    const roleCheck = assertCanManageUserRole({
      actor,
      target,
      nextRole,
    });

    if (roleCheck !== true) {
      throw new Error(roleCheck.message);
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: userId },
      data: { role: nextRole },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    await createAdminAuditLog({
      profileId: actor.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: "profile",
      resourceId: target.id,
      oldValues: {
        role: target.role,
      },
      newValues: {
        operation: "USER_ROLE_UPDATED",
        role: updatedProfile.role,
        adminReason: reason.trim(),
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    return {
      success: true,
      user: updatedProfile,
    };
  } catch (error) {
    console.error("Failed to update user role:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Khong the doi vai tro nguoi dung");
  }
}
