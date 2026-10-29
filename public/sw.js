// Saajha service worker. Small on purpose, no build step.
//  - Built assets (/_next/static) are content-hashed, so they are cached forever once seen.
//  - Pages always come from the network. The one exception: the last Trust Passport you opened is kept,
//    so its QR still shows at a lab desk with no signal. It is cleared the moment you're signed out.
//  - Any other page with no network shows /offline.
const VERSION = "v2";
const STATIC = `saajha-static-${VERSION}`;
const PAGES = `saajha-pages-${VERSION}`;
const OFFLINE = "/offline";
const PASSPORT = "/passport";

// The offline page is a Next.js page too: keep its HTML and every script and stylesheet it loads,
// or it would fail to start exactly when it's needed.
async function saveOfflinePage() {
  const res = await fetch(new Request(OFFLINE, { cache: "reload" }));
  const html = await res.clone().text();
  await (await caches.open(PAGES)).put(OFFLINE, res);
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
  await (await caches.open(STATIC)).addAll(assets);
}

self.addEventListener("install", (event) => {
  event.waitUntil(saveOfflinePage());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function forgetPassport() {
  const c = await caches.open(PAGES);
  await c.delete(PASSPORT);
}

self.addEventListener("message", (event) => {
  if (event.data === "signed-out") event.waitUntil(forgetPassport());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        // Landing on the sign-in page means nobody is signed in here any more.
        if (url.pathname === "/login" || res.redirected && new URL(res.url).pathname === "/login") await forgetPassport();
        else if (url.pathname === PASSPORT && res.ok && !res.redirected) (await caches.open(PAGES)).put(PASSPORT, res.clone());
        return res;
      } catch {
        const c = await caches.open(PAGES);
        if (url.pathname === PASSPORT) {
          const saved = await c.match(PASSPORT);
          if (saved) return saved;
        }
        return (await c.match(OFFLINE)) || new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })(),
  );
});
