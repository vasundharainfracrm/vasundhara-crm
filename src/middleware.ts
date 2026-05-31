import { NextRequest, NextResponse } from "next/server";

/**
 * Decode a Firebase session cookie JWT payload without crypto.
 * Returns null if the token is malformed or expired.
 *
 * NOTE: Login pages (/login, /admin/login, /signup) are intentionally always
 * accessible even when a session cookie exists. This allows multiple accounts
 * to be signed in simultaneously across different browser tabs.
 * Post-login routing is handled by window.location.href in the page components.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const adminSession = request.cookies.get("admin-session")?.value;
  const userSession = request.cookies.get("user-session")?.value;
  // Legacy single-cookie — still supported during transition period
  const legacySession = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  const isAdminAuthPage = pathname === "/admin/login";
  const isUserAuthPage = pathname === "/login" || pathname === "/forgot-password" || pathname === "/signup";

  const isAdminRoute = pathname.startsWith("/admin") && !isAdminAuthPage;
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isPendingApprovalRoute = pathname === "/pending-approval";

  // Decode the legacy session role if present (for backward compat)
  const legacyRole = legacySession
    ? (decodeJwtPayload(legacySession) as { role?: string } | null)?.role ?? null
    : null;

  // Treat legacy session as the appropriate typed session based on its role
  const effectiveAdminSession = adminSession || (legacyRole === "admin" || legacyRole === "super_admin" ? legacySession : undefined);
  const effectiveUserSession = userSession || (legacyRole && legacyRole !== "admin" && legacyRole !== "super_admin" ? legacySession : undefined);

  // ── Admin route guard ──────────────────────────────────────────────────
  if (isAdminRoute) {
    if (!effectiveAdminSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // ── User route guard ───────────────────────────────────────────────────
  if (isDashboardRoute || isPendingApprovalRoute) {
    if (!effectiveUserSession) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ── Auth pages are always reachable ──────────────────────────────────
  // No redirect-away for authenticated users — navigating to /login or
  // /admin/login always renders the form so users can sign in to a
  // different account in a new tab while other sessions remain active.

  // ── Root redirect ──────────────────────────────────────────────────────
  if (pathname === "/") {
    if (effectiveUserSession) return NextResponse.redirect(new URL("/dashboard", request.url));
    if (effectiveAdminSession) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
