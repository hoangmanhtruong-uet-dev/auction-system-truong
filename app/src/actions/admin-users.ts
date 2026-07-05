"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AuditAction, UserRole } from "@prisma/client";

import { requireRole } from "@/src/lib/authorization";
import { prisma } from "@/src/lib/prisma";
import { createAdminAuditLog } from "@/src/lib/audit";

const AdminUserListSchema = z.object({
  take: z.number().int().positive().optional().default(50),
  cursor: z.string().optional(),
});

export async function getAdminUsers(input?: { take?: number; cursor?: string }) {
  const admin = await requireRole([UserRole.ADMIN]);
  if (!("id" in admin)) {
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
    throw new Error("Không thể tải danh sách người dùng");
  }
}

export async function toggleUserBlock(userId: string, block: boolean, reason?: string) {
  const user = await requireRole([UserRole.ADMIN]);
  if (!("id" in user)) {
    throw new Error(user.message);
  }

  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid user ID");
  }

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    throw new Error("Vui lòng nhập lý do hợp lệ cho thao tác quản trị (ít nhất 5 ký tự)");
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new Error("Người dùng không tồn tại");
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

    // Create admin audit log with reason
    await createAdminAuditLog({
      profileId: user.id,
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
    throw new Error("Không thể thực hiện thao tác");
  }
}
