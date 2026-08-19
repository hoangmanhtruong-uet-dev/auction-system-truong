import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/src/lib/auth";
import { verifyToken } from "@/src/lib/jwt";

/**
 * Middleware — UX layer only, NOT a security boundary.
 *
 * - Redirects unauthenticated users to login for protected paths.
 * - Does NOT check admin role via JWT (JWT role can be stale).
 *
 * Server-side security is enforced by admin layout and server actions
 * which read user role from DB via getCurrentUser().
 */
function redirectToLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const protectedPaths = ["/profile", "/admin"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (!isProtected) {
    return NextResponse.next({ request });
  }

  if (!token) {
    return redirectToLogin(request, pathname);
  }

  const payload = verifyToken(token);
  if (!payload?.userId || !payload.role || !payload.sessionId) {
    return redirectToLogin(request, pathname);
  }

  return NextResponse.next({ request });
}
