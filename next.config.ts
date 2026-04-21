import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ── Security ─────────────────────────────────────────────────────────── */
  // Remove the X-Powered-By: Next.js header (information disclosure)
  poweredByHeader: false,

  /* ── Images ───────────────────────────────────────────────────────────── */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.6ureleaks.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.discordapp.com", pathname: "/**" },
    ],
  },

  /* ── Strict React mode for development ────────────────────────────────── */
  reactStrictMode: true,
};

export default nextConfig;
