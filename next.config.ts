import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run beside `next dev` without both writing to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Handover photos are resized in the browser to ~1280px, but a set of 3 still needs headroom.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
