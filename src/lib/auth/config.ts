import GitHub from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";
import Resend from "next-auth/providers/resend";

/**
 * Edge-safe provider config (no adapter / no node deps) — shared by
 * middleware and the full server config in src/lib/auth/index.ts.
 */
export const providers: Provider[] = [
  GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
    // Read access to profile + repos so we can import languages/contributions.
    authorization: {
      params: { scope: "read:user user:email public_repo" },
    },
  }),
  Resend({
    from: process.env.EMAIL_FROM ?? "HackMate <onboarding@resend.dev>",
  }),
];

export const providerMap = providers.map((p) => {
  const provider = typeof p === "function" ? p() : p;
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
  };
});

export const authConfig = {
  providers,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
  callbacks: {
    /**
     * Edge middleware can't query the database for session validation
     * (database sessions live in CockroachDB). We gate protected routes on
     * the presence of the session cookie; real session validation happens
     * in API routes / server components via `auth()`.
     */
    authorized({ request, auth }: { request: any; auth: any }) {
      const path = request.nextUrl?.pathname ?? "";
      const protectedPaths = [
        "/my-team",
        "/profile/edit",
        "/notifications",
        "/saved",
        "/emergency",
        "/teams/new",
        "/hackathons/new",
        "/admin",
      ];
      const isProtected = protectedPaths.some((pp) => path.startsWith(pp));
      if (!isProtected) return true;
      const hasSessionCookie =
        request.cookies?.has?.("authjs.session-token") ||
        request.cookies?.has?.("__Secure-authjs.session-token") ||
        !!auth?.user;
      return hasSessionCookie;
    },
  },
};
