import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection proxy (Next.js 16 `proxy.ts` convention, formerly
 * `middleware.ts`) - deliberately NOT the Auth.js wrapper.
 *
 * Why not `NextAuth(authConfig)` here: the Auth.js middleware tries to
 * validate the session cookie in the edge runtime, where the database
 * adapter (and therefore database sessions) is unavailable. It then treats
 * the opaque database session token as invalid and silently DELETES the
 * `authjs.session-token` cookie on every matched request - logging the
 * user out the moment they touch a protected route.
 *
 * This proxy does two jobs:
 *
 *  1. PAGE GUARD - signed-out visitors hitting `/` (or any protected
 *     route) are sent to /login, which makes the login screen the default
 *     landing page. Real session validation still happens in API routes /
 *     server components via `auth()` (database-backed). A stale cookie
 *     (session deleted server side) simply renders the signed out view -
 *     the login page then shows a working sign-in form, so there is no
 *     redirect loop.
 *
 *  2. CROSS-ORIGIN MUTATION GUARD - every state-changing API request
 *     (POST / PUT / PATCH / DELETE) that carries a browser `Origin`
 *     header must come from THIS app's origin. The session cookie alone
 *     (sameSite=lax) already stops most cross-site abuse; this is
 *     defense-in-depth so that no cookie-authenticated mutation can be
 *     forged from another page, a sandboxed iframe, or anything else a
 *     browser can be tricked into sending. Non-browser clients (curl,
 *     server-to-server, Vercel Cron) send no Origin and pass untouched.
 *     Auth.js's own endpoints (/api/auth/*) keep their built-in CSRF
 *     protection; the dev-only demo sign-in is still guarded here.
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

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Machine-to-machine endpoints: bearer-token authenticated, no Origin. */
const MUTATION_ALLOWLIST = ["/api/cron"];

function isMutatingApiRequest(path: string): boolean {
  if (!path.startsWith("/api/")) return false;
  /* Auth.js handles its own CSRF; the demo route is ours and IS guarded. */
  if (path.startsWith("/api/auth/") && !path.startsWith("/api/auth/demo")) {
    return false;
  }
  return !MUTATION_ALLOWLIST.some((p) => path === p || path.startsWith(p + "/"));
}

/** 403 with a JSON body (never an HTML error page on /api paths). */
function forbiddenOrigin() {
  return NextResponse.json(
    { error: "Cross-origin request rejected" },
    { status: 403 },
  );
}

/**
 * Origin check for cookie-authenticated mutations. Absent Origin
 * (non-browser client) passes; present Origin must match the request's
 * own host (direct, forwarded, or configured). Mirrors how Auth.js
 * validates origin on its own endpoints.
 */
function sameOriginGuard(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return NextResponse.next();

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return forbiddenOrigin();
  }
  if (!originHost) return forbiddenOrigin();

  /* Every host this deployment legitimately answers as: the Host header,
     the proxy-forwarded host(s), the resolved request host, and the
     configured AUTH_URL origin (covers gateway/preview deployments where
     the public origin differs from the internal one). */
  const allowed = new Set<string>();
  const addHosts = (header: string | null) => {
    if (!header) return;
    for (const part of header.split(",")) {
      const host = part.trim().toLowerCase();
      if (host) allowed.add(host);
    }
  };
  addHosts(req.headers.get("host"));
  addHosts(req.headers.get("x-forwarded-host"));
  allowed.add(req.nextUrl.host.toLowerCase());
  addHosts(process.env.AUTH_URL ?? null);

  if (allowed.has(originHost)) return NextResponse.next();
  return forbiddenOrigin();
}

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  /* API mutation guard runs for every /api route hit. */
  if (path.startsWith("/api/")) {
    if (MUTATING_METHODS.has(req.method) && isMutatingApiRequest(path)) {
      return sameOriginGuard(req);
    }
    return NextResponse.next();
  }

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
    "/api/:path*",
  ],
};
