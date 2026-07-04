"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { ActionResult } from "@/src/types";

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";

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
});

export type UpdateProfileInput = z.input<typeof UpdateProfileSchema>;

export async function updateProfile(
  data: UpdateProfileInput
): Promise<ActionResult<{ fullName: string; phone: string | null }>> {
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
      },
      select: {
        fullName: true,
        phone: true,
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
