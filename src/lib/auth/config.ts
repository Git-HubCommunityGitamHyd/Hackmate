import GitHub from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";
import Resend from "next-auth/providers/resend";

function githubProvider() {
  return GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
    // Read access to profile + repos so we can import languages/contributions.
    authorization: {
      params: { scope: "read:user user:email public_repo" },
    },
  });
}

function resendProvider() {
  return Resend({
    from: process.env.EMAIL_FROM ?? "HackMate <onboarding@resend.dev>",
  });
}

/** Full provider set (server config with the Drizzle adapter). */
export const providers: Provider[] = [githubProvider(), resendProvider()];

/**
 * Edge-safe provider config (no adapter / no node deps) — shared by the
 * full server config in src/lib/auth/index.ts.
 *
 * Only OAuth providers here: email (Resend) login requires a database
 * adapter for its verification tokens — registering it in an edge context
 * trips Auth.js' "MissingAdapter" assertion on every request. The full
 * server config in src/lib/auth/index.ts overrides `providers` with the
 * complete set (GitHub + Resend).
 */
export const edgeProviders: Provider[] = [githubProvider()];

export const providerMap = providers.map((p) => {
  const provider = typeof p === "function" ? p() : p;
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
  };
});

export const authConfig = {
  providers: edgeProviders,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
};
