import { z } from "zod";
import type { AppErrorCode as StandardAppErrorCode, ActionResult as StandardActionResult } from "@/src/lib/error-codes";

// Re-export the standardized AppErrorCode for backward compatibility
export type AppErrorCode = StandardAppErrorCode;

// Re-export the standardized ActionResult for backward compatibility
export type ActionResult<T> = StandardActionResult<T>;

// --- AUTH SCHEMAS ---

export const RegisterSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải từ 8 ký tự trở lên"),
  fullName: z.string().min(2, "Họ tên phải từ 2 ký tự trở lên"),
  phone: z.string().optional(),
}).superRefine((value, context) => {
  if (value.email.length > 255) context.addIssue({ code: "too_big", maximum: 255, origin: "string", path: ["email"], message: "Email is too long" });
  if (value.password.length < 10 || value.password.length > 128 || !/[a-z]/.test(value.password) || !/[A-Z]/.test(value.password) || !/[0-9]/.test(value.password)) {
    context.addIssue({ code: "custom", path: ["password"], message: "Password must be 10-128 characters and include upper-case, lower-case, and a number" });
  }
  if (value.fullName.trim().length > 100) context.addIssue({ code: "custom", path: ["fullName"], message: "Full name is too long" });
  if (value.phone && !/^\+?[0-9]{8,15}$/.test(value.phone.trim())) context.addIssue({ code: "custom", path: ["phone"], message: "Phone number is invalid" });
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
}).superRefine((value, context) => {
  if (value.email.length > 255) context.addIssue({ code: "too_big", maximum: 255, origin: "string", path: ["email"], message: "Email is too long" });
  if (value.password.length > 128) context.addIssue({ code: "too_big", maximum: 128, origin: "string", path: ["password"], message: "Password is too long" });
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const VerifyEmailSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  code: z.string().length(6, "Mã xác thực phải gồm 6 ký tự"),
});

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

// --- AUCTION SCHEMAS ---

export const CreateAuctionSchema = z
  .object({
    title: z.string().trim().min(5, "Tiêu đề phải từ 5 ký tự trở lên").max(100, "Tiêu đề không được vượt quá 100 ký tự"),
    category: z.string().trim().min(1, "Vui lòng chọn danh mục").max(100, "Danh mục không hợp lệ"),
    condition: z.string().trim().min(1, "Vui lòng chọn tình trạng").max(100, "Tình trạng không hợp lệ"),
    description: z.string().trim().min(20, "Mô tả chi tiết phải từ 20 ký tự trở lên").max(2000, "Mô tả không được vượt quá 2000 ký tự"),
    images: z.array(z.string().trim().url("URL hình ảnh không hợp lệ")).max(5, "Tối đa 5 hình ảnh").default([]),
    startPrice: z.number().int("Giá khởi điểm phải là số nguyên").positive("Giá khởi điểm phải lớn hơn 0").min(1000, "Giá khởi điểm tối thiểu là 1,000 VND"),
    bidStep: z.number().int("Bước giá phải là số nguyên").positive("Bước giá phải lớn hơn 0").min(10000, "Bước giá tối thiểu là 10,000 VND"),
    duration: z.number().int("Thời gian đấu giá phải là số nguyên").min(5, "Thời gian đấu giá tối thiểu là 5 phút").max(10080, "Thời gian đấu giá tối đa là 7 ngày"),
    autoExtensionEnabled: z.boolean().default(true),
    maxExtensions: z.number().int().min(0).max(5).default(3),
    // Optional scheduling fields
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
  })
  .refine((data) => data.bidStep <= data.startPrice, {
    message: "Bước giá không nên lớn hơn giá khởi điểm",
    path: ["bidStep"],
  })
  .refine(
    (data) => {
      // If startsAt is provided, endsAt must also be provided
      if (data.startsAt && !data.endsAt) {
        return false;
      }
      return true;
    },
    {
      message: "Nếu có giờ bắt đầu thì phải có giờ kết thúc",
      path: ["endsAt"],
    }
  )
  .refine(
    (data) => {
      // Validate startsAt and endsAt relationship if both provided
      if (data.startsAt && data.endsAt) {
        const starts = new Date(data.startsAt).getTime();
        const ends = new Date(data.endsAt).getTime();
        const durationMinutes = (ends - starts) / (1000 * 60);

        // endsAt must be after startsAt
        if (ends <= starts) {
          return false;
        }

        // Duration must be within valid range (5 minutes to 7 days = 10080 minutes)
        if (durationMinutes < 5 || durationMinutes > 10080) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Thời gian đấu giá phải từ 5 phút đến 7 ngày",
      path: ["endsAt"],
    }
  );

export type CreateAuctionInput = z.infer<typeof CreateAuctionSchema>;

// --- BID SCHEMAS ---

export const PlaceBidSchema = z.object({
  auctionId: z.string().uuid("ID phiên đấu giá không hợp lệ"),
  bidPrice: z.number().int("Giá đặt phải là số nguyên").positive("Giá đặt phải lớn hơn 0").min(1000, "Giá bid tối thiểu là 1,000 VND"),
  expectedCurrentPrice: z.string().regex(/^\d+$/, "Giá hiện tại không hợp lệ").optional(),
  isAutoBid: z.boolean().default(false),
  autoBidMaxPrice: z.number().int("Giá tự động tối đa phải là số nguyên").positive("Giá tự động tối đa phải lớn hơn 0").optional(),
  idempotencyKey: z.string().min(1, "Mã idempotency không hợp lệ").max(64).optional(),
});

export type PlaceBidInput = z.infer<typeof PlaceBidSchema>;
