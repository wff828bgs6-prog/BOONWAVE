const VERSION = "6.0.35";
const CACHE = `boonwave-clean-${VERSION}`;
const CORE = [
  "./",
  "./index.html",
  "./styles.css?v=6.0.35",
  "./app.js?v=6.0.35",
  "./manifest.webmanifest",
  "./boonwave-approved-splash.png",
  "./boonwave-mark-full.png",
  "./boonwave-approved.png",
  "./boonwave-full.png",
  "./boonwave-mark.png",
  "./icon-192.png",
  "./icon-512.png"
];
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "no-store" });
        const cache = await caches.open(CACHE); cache.put("./index.html", response.clone());
        return response;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const freshPromise = fetch(request, { cache: "no-store" }).then(async response => {
      if (response.ok) { const cache = await caches.open(CACHE); cache.put(request, response.clone()); }
      return response;
    }).catch(() => null);
    return cached || (await freshPromise) || new Response("Offline", { status: 503 });
  })());
});
