import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [] },
  serverExternalPackages: ["axios"],
};

export default nextConfig;
