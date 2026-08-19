"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import { AuditAction, Prisma, UserRole } from "@prisma/client";

import {
  ROLE_RANK,
  assertCanManageUserRole,
  isAuthorizationError,
  requireActionPermission,
} from "@/src/lib/authorization";
import { prisma } from "@/src/lib/prisma";
import { emitSecurityEvent } from "@/src/lib/security-events";

const AdminUserListSchema = z.object({
  take: z.number().int().positive().optional().default(50),
  cursor: z.string().optional(),
});

const StaffRoleSchema = z.enum(["SUPPORT", "MODERATOR", "FINANCE", "ADMIN", "SUPER_ADMIN"]);
const CreateStaffSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(2).max(100),
  role: StaffRoleSchema,
});

function temporaryPassword() {
  return `${randomBytes(15).toString("base64url")}Aa1`;
}

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
        lastLoginAt: true,
        mustChangePassword: true,
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

export async function createStaffAccount(input: z.input<typeof CreateStaffSchema>, reason: string) {
  const actor = await requireActionPermission("users.update.role");
  if (isAuthorizationError(actor)) throw new Error(actor.message);
  const parsed = CreateStaffSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid staff account data");
  if (reason.trim().length < 5) throw new Error("A reason of at least 5 characters is required");
  const role = parsed.data.role as UserRole;
  if (ROLE_RANK[role] >= ROLE_RANK[actor.role] && actor.role !== UserRole.SUPER_ADMIN) {
    throw new Error("Cannot grant a role equal to or above your own role.");
  }

  const password = temporaryPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const profile = await prisma.$transaction(async (tx) => {
    const created = await tx.profile.create({
      data: { email: parsed.data.email.toLowerCase(), fullName: parsed.data.fullName, passwordHash, role, emailVerified: true, mustChangePassword: true },
      select: {
        id: true, email: true, fullName: true, role: true, createdAt: true, updatedAt: true,
        deletedAt: true, lastLoginAt: true, mustChangePassword: true,
        _count: { select: { auctionsAsSeller: true, bids: true } },
      },
    });
    await tx.auditLog.create({
      data: { profileId: actor.id, action: AuditAction.ADMIN_ACTION, resourceType: "profile", resourceId: created.id, newValues: { operation: "STAFF_ACCOUNT_CREATED", role, adminReason: reason.trim() } },
    });
    return created;
  });
  revalidatePath("/admin/users");
  return { success: true, user: profile, temporaryPassword: password };
}

export async function resetStaffPassword(userId: string, reason: string) {
  const actor = await requireActionPermission("users.update.role");
  if (isAuthorizationError(actor)) throw new Error(actor.message);
  if (!z.string().uuid().safeParse(userId).success || reason.trim().length < 5) throw new Error("Invalid reset request");
  const target = await prisma.profile.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) throw new Error("User not found");
  if (target.id === actor.id || (ROLE_RANK[target.role] >= ROLE_RANK[actor.role] && actor.role !== UserRole.SUPER_ADMIN)) {
    throw new Error("Cannot reset this account.");
  }

  const password = temporaryPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.profile.update({
      where: { id: target.id },
      data: { passwordHash, mustChangePassword: true, sessionVersion: { increment: 1 } },
    }),
    prisma.authSession.updateMany({ where: { profileId: target.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.auditLog.create({
      data: { profileId: actor.id, action: AuditAction.ADMIN_ACTION, resourceType: "profile", resourceId: target.id, newValues: { operation: "STAFF_PASSWORD_RESET_AND_SESSIONS_REVOKED", adminReason: reason.trim() } },
    }),
  ]);
  return { success: true, temporaryPassword: password };
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
    const updatedProfile = await prisma.$transaction(async (tx) => {
      if (block && profile.role === UserRole.SUPER_ADMIN) {
        const count = await tx.profile.count({
          where: { role: UserRole.SUPER_ADMIN, deletedAt: null },
        });
        if (count <= 1) throw new Error("Khong the khoa SUPER_ADMIN cuoi cung.");
      }
      const updated = await tx.profile.update({
        where: { id: userId },
        data: { deletedAt: block ? new Date() : null, ...(block ? { sessionVersion: { increment: 1 } } : {}) },
        select: { id: true, email: true, fullName: true, role: true, createdAt: true, updatedAt: true, deletedAt: true },
      });
      await tx.auditLog.create({
        data: {
          profileId: actor.id, action: AuditAction.ADMIN_ACTION, resourceType: "profile", resourceId: profile.id,
          oldValues: { deletedAt: profile.deletedAt?.toISOString() ?? null, previousStatus },
          newValues: { operation: block ? "USER_BLOCKED" : "USER_UNBLOCKED", deletedAt: updated.deletedAt?.toISOString() ?? null, adminReason: reason.trim() },
        },
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    if (profile.role === UserRole.SUPER_ADMIN) {
      emitSecurityEvent("super_admin_changed", { actorId: actor.id, resourceId: profile.id, operation: block ? "blocked" : "unblocked" });
    }

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

    const updatedProfile = await prisma.$transaction(async (tx) => {
      if (target.role === UserRole.SUPER_ADMIN && nextRole !== UserRole.SUPER_ADMIN) {
        const count = await tx.profile.count({
          where: { role: UserRole.SUPER_ADMIN, deletedAt: null },
        });
        if (count <= 1) throw new Error("Khong the ha quyen SUPER_ADMIN cuoi cung.");
      }
      const updated = await tx.profile.update({
        where: { id: userId },
        data: { role: nextRole, sessionVersion: { increment: 1 } },
        select: { id: true, email: true, fullName: true, role: true, createdAt: true, updatedAt: true, deletedAt: true },
      });
      await tx.auditLog.create({
        data: {
          profileId: actor.id, action: AuditAction.ADMIN_ACTION, resourceType: "profile", resourceId: target.id,
          oldValues: { role: target.role },
          newValues: { operation: "USER_ROLE_UPDATED", role: updated.role, adminReason: reason.trim() },
        },
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    emitSecurityEvent(
      target.role === UserRole.SUPER_ADMIN || nextRole === UserRole.SUPER_ADMIN ? "super_admin_changed" : "admin_role_changed",
      { actorId: actor.id, resourceId: target.id, previousRole: target.role, nextRole },
    );

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
