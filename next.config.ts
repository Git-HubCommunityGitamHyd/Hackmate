import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel-ready. Type errors fail the build (the codebase type-checks clean).
  reactStrictMode: true,
};

export default nextConfig;
