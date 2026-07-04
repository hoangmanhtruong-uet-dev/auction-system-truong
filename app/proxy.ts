import { updateSession } from "@/src/lib/auth-middleware";
import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Route aliases/redirects
  if (path === "/login") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  if (path === "/register") {
    return NextResponse.redirect(new URL("/auth/register", request.url));
  }
  if (path === "/auctions/create") {
    return NextResponse.redirect(new URL("/auctions/new", request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};