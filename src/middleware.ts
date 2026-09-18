import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Edge middleware — uses the edge-safe config (no DB adapter) purely for
 * route protection via the `authorized` callback. Unauthenticated users
 * are redirected to /login by Auth.js.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/my-team/:path*",
    "/profile/edit/:path*",
    "/notifications/:path*",
    "/saved/:path*",
    "/emergency/:path*",
    "/teams/new/:path*",
    "/hackathons/new/:path*",
  ],
};
