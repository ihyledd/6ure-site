import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.6ureleaks.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.discordapp.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
