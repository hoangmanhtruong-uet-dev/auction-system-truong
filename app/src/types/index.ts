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
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
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
  })
  .refine((data) => data.bidStep <= data.startPrice, {
    message: "Bước giá không nên lớn hơn giá khởi điểm",
    path: ["bidStep"],
  });

export type CreateAuctionInput = z.infer<typeof CreateAuctionSchema>;

// --- BID SCHEMAS ---

export const PlaceBidSchema = z.object({
  auctionId: z.string().uuid("ID phiên đấu giá không hợp lệ"),
  bidPrice: z.number().int("Giá đặt phải là số nguyên").positive("Giá đặt phải lớn hơn 0").min(1000, "Giá bid tối thiểu là 1,000 VND"),
  expectedCurrentPrice: z.string().regex(/^\d+$/, "Giá hiện tại không hợp lệ").optional(),
  isAutoBid: z.boolean().default(false),
  autoBidMaxPrice: z.number().int("Giá tự động tối đa phải là số nguyên").positive("Giá tự động tối đa phải lớn hơn 0").optional(),
});

export type PlaceBidInput = z.infer<typeof PlaceBidSchema>;