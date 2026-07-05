import { NextRequest, NextResponse } from "next/server";

import { verifyEmail } from "@/src/actions/profile-email-verification";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/profile?error=invalid_token", request.url));
  }

  try {
    const result = await verifyEmail(token);

    if (result.success) {
      const url = new URL("/profile?email_verified=true", request.url);
      return NextResponse.redirect(url);
    } else {
      const url = new URL(
        `/profile?error=${encodeURIComponent(result.error || "verify_failed")}`,
        request.url
      );
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("[VerifyEmailRoute] Error:", error);
    const url = new URL("/profile?error=server_error", request.url);
    return NextResponse.redirect(url);
  }
}