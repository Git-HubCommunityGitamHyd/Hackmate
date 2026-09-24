import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection proxy (Next.js 16 `proxy.ts` convention, formerly
 * `middleware.ts`) — deliberately NOT the Auth.js wrapper.
 *
 * Why not `NextAuth(authConfig)` here: the Auth.js middleware tries to
 * validate the session cookie in the edge runtime, where the database
 * adapter (and therefore database sessions) is unavailable. It then treats
 * the opaque database session token as invalid and silently DELETES the
 * `authjs.session-token` cookie on every matched request — logging the
 * user out the moment they touch a protected route.
 *
 * This proxy only checks for the presence of the session cookie:
 *  - signed-out visitors hitting `/` (or any protected route) are sent to
 *    /login, which makes the login screen the default landing page
 *  - real session validation still happens in API routes / server
 *    components via `auth()` (database-backed)
 *
 * A stale cookie (session deleted server side) simply renders the signed
 * out view — the login page then shows a working sign-in form, so there
 * is no redirect loop.
 */
const PROTECTED_PREFIXES = [
  "/my-team",
  "/profile/edit",
  "/notifications",
  "/saved",
  "/emergency",
  "/teams/new",
  "/hackathons/new",
  "/admin",
];

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected =
    path === "/" || PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const hasSessionCookie =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (hasSessionCookie) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/",
    "/my-team/:path*",
    "/profile/edit/:path*",
    "/notifications/:path*",
    "/saved/:path*",
    "/emergency/:path*",
    "/teams/new/:path*",
    "/hackathons/new/:path*",
    "/admin/:path*",
  ],
};
