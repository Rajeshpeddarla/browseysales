import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [] },
  serverExternalPackages: ["axios", "playwright", "tesseract.js", "crawlee", "@crawlee/playwright", "@crawlee/browser-pool", "@crawlee/browser", "puppeteer"],
};

export default nextConfig;
