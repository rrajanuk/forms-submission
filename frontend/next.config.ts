import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    turbopack: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
