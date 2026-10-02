import type { NextConfig } from "next";

/**
 * Security headers for every response.
 *
 * The CSP is deliberately pragmatic: Next.js (Turbopack HMR, dev overlay)
 * needs 'unsafe-eval' and inline scripts in development; production drops
 * 'unsafe-eval'. Styles need 'unsafe-inline' (Tailwind + inline style
 * attributes from animation libraries). Pusher realtime chat connects over
 * wss:, and avatars/hackathon images load from https:, so both are allowed
 * narrowly. The app is intentionally 3D-free — no WebGL runtimes beyond
 * the login page's own GrainGradient shader canvas.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  `default-src 'self'`,
  // Dev keeps 'unsafe-eval' for Turbopack; production ships without it
  // (the app no longer embeds any WebAssembly-based 3D runtime).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' https: wss:`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join("; ");

const nextConfig: NextConfig = {
  // Vercel-ready. Type errors fail the build (the codebase type-checks clean).
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
