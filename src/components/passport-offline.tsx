"use client";

import { useEffect } from "react";

// Must match public/sw.js.
const PAGES = "saajha-pages-v2";
const STATIC = "saajha-static-v2";

/**
 * Keeps a copy of this Trust Passport, and the files it needs to render, for when there's no signal at the lab desk.
 * Next.js links don't do full page loads, so the service worker alone wouldn't see this page; save it from here.
 */
export function PassportOffline() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("caches" in window)) return;
    (async () => {
      try {
        const res = await fetch("/passport", { credentials: "same-origin", cache: "no-store" });
        if (!res.ok || res.redirected) return;
        await (await caches.open(PAGES)).put("/passport", res);
        const assets = performance
          .getEntriesByType("resource")
          .map((e) => new URL(e.name))
          .filter((u) => u.origin === location.origin && u.pathname.startsWith("/_next/static/"))
          .map((u) => u.pathname);
        await (await caches.open(STATIC)).addAll([...new Set(assets)]);
      } catch {
        // Saving for offline is a bonus; the page itself already worked.
      }
    })();
  }, []);
  return null;
}
