import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Handover photos are resized in the browser to ~1280px, but a set of 3 still needs headroom.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
