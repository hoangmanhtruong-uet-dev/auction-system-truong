"use server";

import crypto from "crypto";
import { createTransport, type Transporter } from "nodemailer";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth as requireBaseAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { getCanonicalAppOrigin } from "@/src/lib/env";
import { ActionResult } from "@/src/types";
import { assertSameOrigin } from "@/src/lib/security-request";
import { checkRateLimit, getRateLimitErrorMessage } from "@/src/lib/rate-limit";

// Nodemailer transport instance
let transporter: Transporter | null = null;

async function requireAuth() {
  await assertSameOrigin();
  return requireBaseAuth();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";

// Generate a secure random token
function generateEmailVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Hash the token using SHA-256
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Send verification email
async function sendVerificationEmail(email: string, token: string, fullName: string): Promise<void> {
  const origin = getCanonicalAppOrigin() ?? "";
  const verificationUrl = `${origin}/verify-email?token=${token}`;

  await getTransporter().sendMail({
    from: `"Auction System" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Xác minh email của bạn",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #007bff;">Xin chào ${fullName},</h1>
        <p>Cảm ơn bạn đã đăng ký với Auction System.</p>
        <p>Vui lòng xác minh địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:</p>
        <a href="${verificationUrl}" 
           style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Xác minh email
        </a>
        <p style="color: #666; margin-top: 20px;">Hoặc sao chép đường dẫn sau vào trình duyệt:</p>
        <p style="color: #999; font-size: 14px;">${verificationUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          Đường dẫn này sẽ hết hạn sau 24 giờ.<br>
          Nếu bạn không yêu cầu xác minh email, vui lòng bỏ qua email này.
        </p>
      </div>
    `,
  });
  
  console.log("[Email] verification message accepted by transport");
}

export async function sendEmailVerification(): Promise<ActionResult<{ message: string }>> {
  const user = await requireAuth();

  try {
    const rateLimit = await checkRateLimit(`email-verification:${user.id}`, { limit: 3, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) return { success: false, error: getRateLimitErrorMessage(rateLimit), code: "RATE_LIMITED" };
    // Check if already verified
    if (user.emailVerified) {
      return {
        success: false,
        error: "Email đã được xác minh trước đó",
        code: "EMAIL_ALREADY_VERIFIED",
      };
    }

    // Generate new token
    const token = generateEmailVerificationToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Delete any existing unexpired tokens
    await prisma.emailVerificationToken.deleteMany({
      where: {
        profileId: user.id,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    // Create new token
    await prisma.emailVerificationToken.create({
      data: {
        profileId: user.id,
        email: user.email,
        tokenHash,
        expiresAt,
      },
    });

    // Send verification email
    await sendVerificationEmail(user.email, token, escapeHtml(user.fullName));

    revalidatePath("/profile");

    return {
      success: true,
      data: { message: "Đã gửi email xác minh. Vui lòng kiểm tra hộp thư của bạn." },
    };
  } catch (error) {
    console.error("[EmailVerification] sendEmailVerification error:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "SEND_EMAIL_VERIFICATION_FAILED",
    };
  }
}

export async function verifyEmail(token: string): Promise<ActionResult<{ message: string }>> {
  try {
    await assertSameOrigin();
  } catch {
    return { success: false, error: "Invalid request origin", code: "FORBIDDEN" };
  }
  if (!token) {
    return {
      success: false,
      error: "Token không hợp lệ",
      code: "INVALID_TOKEN",
    };
  }

  try {
    const tokenHash = hashToken(token);

    // Find the token
    const emailToken = await prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { profile: true },
    });

    if (!emailToken) {
      return {
        success: false,
        error: "Token không tồn tại hoặc đã hết hạn",
        code: "TOKEN_EXPIRED_OR_INVALID",
      };
    }

    await prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: emailToken.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error("TOKEN_ALREADY_USED");
      await tx.profile.update({
        where: { id: emailToken.profileId },
        data: { emailVerified: true },
      });
    });

    revalidatePath("/profile");

    return {
      success: true,
      data: { message: "Xác minh email thành công!" },
    };
  } catch (error) {
    console.error("[EmailVerification] verifyEmail error:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "VERIFY_EMAIL_FAILED",
    };
  }
}

export async function updateEmail(data: { newEmail: string }): Promise<ActionResult<void>> {
  const user = await requireAuth();

  const parsed = z.object({ newEmail: z.string().email("Email không hợp lệ") }).safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const newEmail = parsed.data.newEmail.toLowerCase();

    // Check if email is already taken
    const existingUser = await prisma.profile.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== user.id) {
      return {
        success: false,
        error: "Email đã được sử dụng bởi người dùng khác",
        code: "EMAIL_ALREADY_IN_USE",
      };
    }

    // Update email and mark as unverified
    await prisma.profile.update({
      where: { id: user.id },
      data: {
        email: newEmail,
        emailVerified: false,
        sessionVersion: { increment: 1 },
      },
    });

    // Generate verification token for new email
    const token = generateEmailVerificationToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create new verification token for new email
    await prisma.emailVerificationToken.create({
      data: {
        profileId: user.id,
        email: newEmail,
        tokenHash,
        expiresAt,
      },
    });

    // Send verification email to new address
    await sendVerificationEmail(newEmail, token, escapeHtml(user.fullName));

    revalidatePath("/profile");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("[EmailVerification] updateEmail error:", error);
    return {
      success: false,
      error: NETWORK_ERROR_MESSAGE,
      code: "UPDATE_EMAIL_FAILED",
    };
  }
}
