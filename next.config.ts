import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Lets a production build run beside `next dev` without both writing to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The service worker must never be served stale, or a fix to it could take days to reach phones.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  experimental: {
    // Handover photos are resized in the browser to ~1280px, but a set of 3 still needs headroom.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default withNextIntl(nextConfig);
