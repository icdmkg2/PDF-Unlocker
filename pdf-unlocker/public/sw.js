// Offline support for PDF Studio. Caches the app itself, never user files:
// every PDF is processed in the page and never passes through fetch().

const VERSION = "v1";
const CACHE = `pdf-studio-${VERSION}`;

// Large files that only change when replaced on deploy. Bump VERSION when they do.
const ENGINES = new Set(["/pdfcpu.wasm", "/pdf.worker.min.mjs"]);

// Shell cached on install. The engines below are cached on first use instead:
// pdfcpu.wasm is ~30 MB and only some tools need it.
const CORE = [
  "/",
  "/pdf.worker.min.mjs",
  "/logo.svg",
  "/icon.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("pdf-studio-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page sends the list of tool routes once it has loaded, so this file
// doesn't need its own copy of the tool list.
self.addEventListener("message", (event) => {
  if (event.data?.type === "precache" && Array.isArray(event.data.urls)) {
    event.waitUntil(precachePages(event.data.urls));
  }
});

async function precachePages(urls) {
  const cache = await caches.open(CACHE);
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) continue;
      const html = await res.clone().text();
      await cache.put(url, res);
      // Cache the page's hashed JS and CSS so it works offline before it is ever visited.
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
      await Promise.all(
        assets.map(async (a) => {
          if (await cache.match(a)) return;
          try {
            const r = await fetch(a);
            if (r.ok) await cache.put(a, r);
          } catch {}
        })
      );
    } catch {
      // offline or failed; try again on the next visit
    }
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Client-side navigation data is tied to one build; when offline the router
  // falls back to a full page load, which the navigate branch below serves.
  if (url.searchParams.has("_rsc") || req.headers.get("RSC")) return;

  // Pages: network first so updates show up, cache when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match("/")) || Response.error())
    );
    return;
  }

  // Hashed build output and engines: cache first.
  if (url.pathname.startsWith("/_next/static/") || ENGINES.has(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Everything else from this origin (icons, fonts): serve cached, refresh in background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || network;
    })
  );
});
