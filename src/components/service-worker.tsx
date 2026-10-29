"use client";

import { useEffect } from "react";

/** Registers /sw.js in production. `signedOut` tells it to drop the saved passport straight away. */
export function ServiceWorker({ signedOut = false }: { signedOut?: boolean }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // Don't wait for the worker: drop the saved passport from here too (same cache name as public/sw.js).
    if (signedOut && "caches" in window) void caches.open("baanto-pages-v2").then((c) => c.delete("/passport"));
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (signedOut) (reg.active ?? navigator.serviceWorker.controller)?.postMessage("signed-out");
      })
      .catch(() => {
        // Without a service worker the site works exactly the same, just not offline.
      });
  }, [signedOut]);
  return null;
}
