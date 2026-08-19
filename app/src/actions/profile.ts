"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuditAction, UserRole } from "@prisma/client";

import { createAdminAuditLog } from "@/src/lib/audit";
import { requireAuth as requireBaseAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { ActionResult } from "@/src/types";
import { assertSameOrigin } from "@/src/lib/security-request";

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";

async function requireAuth() {
  await assertSameOrigin();
  return requireBaseAuth();
}

const UpdateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(255, "Họ và tên không được vượt quá 255 ký tự"),
  phone: z
    .string()
    .trim()
    .max(20, "Số điện thoại không được vượt quá 20 ký tự")
    .regex(/^[0-9+\-\s().]*$/, "Số điện thoại không hợp lệ")
    .optional()
    .transform((value) => (value ? value : null)),
  address: z.string().trim().max(500, "Địa chỉ không hợp lệ").optional().transform((value) => (value ? value : null)),
  city: z.string().trim().max(100, "Tên thành phố không hợp lệ").optional().transform((value) => (value ? value : null)),
  bio: z.string().trim().max(1000, "Giới thiệu không hợp lệ").optional().transform((value) => (value ? value : null)),
});

export type UpdateProfileInput = z.input<typeof UpdateProfileSchema>;

export async function updateProfile(
  data: UpdateProfileInput
): Promise<ActionResult<{ fullName: string; phone: string | null; address: string | null; city: string | null; bio: string | null }>> {
  const user = await requireAuth();

  const parsed = UpdateProfileSchema.safeParse(data);
  if (!parsed.success) {
    const formErrors = parsed.error.flatten().formErrors;
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = formErrors[0] ?? Object.values(fieldErrors).flat()[0];
    return {
      success: false,
      error: firstError ?? "Dữ liệu không hợp lệ",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const profile = await prisma.profile.update({
      where: { id: user.id },
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        address: parsed.data.address,
        city: parsed.data.city,
        bio: parsed.data.bio,
      },
      select: {
        fullName: true,
        phone: true,
        address: true,
        city: true,
        bio: true,
      },
    });

    revalidatePath("/profile");

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "UPDATE_PROFILE_FAILED",
    };
  }
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
}).superRefine((value, context) => {
  if (value.newPassword.length < 10 || value.newPassword.length > 128 || !/[a-z]/.test(value.newPassword) || !/[A-Z]/.test(value.newPassword) || !/[0-9]/.test(value.newPassword)) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: "Password must be 10-128 characters and include upper-case, lower-case, and a number" });
  }
});

export type ChangePasswordInput = z.input<typeof ChangePasswordSchema>;

export async function changePassword(data: ChangePasswordInput): Promise<ActionResult<void>> {
  const user = await requireAuth();

  const parsed = ChangePasswordSchema.safeParse(data);
  if (!parsed.success) {
    const formErrors = parsed.error.flatten().formErrors;
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = formErrors[0] ?? Object.values(fieldErrors).flat()[0];
    return {
      success: false,
      error: firstError ?? "Dữ liệu không hợp lệ",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!profile) {
      return {
        success: false,
        error: "Không tìm thấy hồ sơ người dùng",
        code: "PROFILE_NOT_FOUND",
      };
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      parsed.data.currentPassword,
      profile.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return {
        success: false,
        error: "Mật khẩu hiện tại không đúng",
        code: "INVALID_CURRENT_PASSWORD",
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

    await prisma.profile.update({
      where: { id: user.id },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
        mustChangePassword: false,
      },
    });
    await createAdminAuditLog({
      profileId: user.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: "auth",
      resourceId: user.id,
      newValues: { operation: "PASSWORD_CHANGED_AND_SESSIONS_REVOKED" },
    });

    revalidatePath("/profile");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Failed to change password:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "CHANGE_PASSWORD_FAILED",
    };
  }
}

const UpdateNotificationsSchema = z.object({
  receiveEmailMarketing: z.boolean().optional(),
  receiveEmailAuction: z.boolean().optional(),
  receiveEmailNotification: z.boolean().optional(),
});

export type UpdateNotificationsInput = z.input<typeof UpdateNotificationsSchema>;

export async function updateNotifications(data: UpdateNotificationsInput): Promise<ActionResult<void>> {
  const user = await requireAuth();

  const parsed = UpdateNotificationsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dữ liệu cài đặt thông báo không hợp lệ",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    await prisma.userPreference.upsert({
      where: { profileId: user.id },
      update: {
        receiveEmailMarketing: parsed.data.receiveEmailMarketing ?? true,
        receiveEmailAuction: parsed.data.receiveEmailAuction ?? true,
        receiveEmailNotification: parsed.data.receiveEmailNotification ?? true,
      },
      create: {
        profileId: user.id,
        receiveEmailMarketing: parsed.data.receiveEmailMarketing ?? true,
        receiveEmailAuction: parsed.data.receiveEmailAuction ?? true,
        receiveEmailNotification: parsed.data.receiveEmailNotification ?? true,
      },
    });

    revalidatePath("/profile");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Failed to update notifications:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "UPDATE_NOTIFICATIONS_FAILED",
    };
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult<void>> {
  const user = await requireAuth();

  try {
    await prisma.notification.updateMany({
      where: { profileId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    revalidatePath("/profile");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "MARK_NOTIFICATIONS_FAILED",
    };
  }
}

export async function deleteAccount(): Promise<ActionResult<void>> {
  const user = await requireAuth();

  try {
    if (user.role === UserRole.SUPER_ADMIN) {
      const activeSuperAdmins = await prisma.profile.count({
        where: { role: UserRole.SUPER_ADMIN, deletedAt: null },
      });
      if (activeSuperAdmins <= 1) {
        return {
          success: false,
          error: "Cannot delete the final SUPER_ADMIN.",
          code: "FORBIDDEN",
        };
      }
    }
    await prisma.profile.update({
      where: { id: user.id },
      data: { deletedAt: new Date(), sessionVersion: { increment: 1 } },
    });

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "DELETE_ACCOUNT_FAILED",
    };
  }
}

export async function logoutAllDevices(): Promise<ActionResult<void>> {
  const user = await requireAuth();

  try {
    const revokedAt = new Date();
    await prisma.profile.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    });
    await prisma.authSession.updateMany({
      where: { profileId: user.id, revokedAt: null },
      data: { revokedAt },
    });
    await createAdminAuditLog({
      profileId: user.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: "auth",
      resourceId: user.id,
      newValues: { operation: "ALL_SESSIONS_REVOKED" },
    });

    revalidatePath("/profile");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Failed to logout all devices:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "LOGOUT_ALL_DEVICES_FAILED",
    };
  }
}

export async function updateAvatar(avatarUrl: string | null): Promise<ActionResult<void>> {
  const user = await requireAuth();

  try {
    await prisma.profile.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    revalidatePath("/profile");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Failed to update avatar:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "UPDATE_AVATAR_FAILED",
    };
  }
}
