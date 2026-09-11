/* global self, caches */
// Life Line service worker — caches ONLY immutable static assets.
// It deliberately never caches HTML pages or API responses so that authenticated
// / patient data is never stored on the device.
const CACHE = "lifeline-static-v1";

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const cacheable = event.request.method === "GET"
    && url.origin === self.location.origin
    && (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg");
  if (!cacheable) return; // Let the network handle everything else (pages, APIs, tiles).
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) { const copy = response.clone(); void caches.open(CACHE).then((cache) => cache.put(event.request, copy)); }
      return response;
    }))
  );
});
