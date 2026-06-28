const VERSION = "6.0.58";
const CACHE = `boonwave-${VERSION}`;
const CORE = [
  "./",
  "./index.html",
  "./styles.v6.0.58.css",
  "./app.v6.0.58.js",
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
    await Promise.all(keys.filter(key => key.startsWith("boonwave-") && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" || /(?:index\.html|app\.v|styles\.v|sw\.js)$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response.ok) { const cache = await caches.open(CACHE); cache.put(request, response.clone()); }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request, { cache: "no-store" });
      if (response.ok) { const cache = await caches.open(CACHE); cache.put(request, response.clone()); }
      return response;
    } catch {
      return new Response("Offline", { status: 503 });
    }
  })());
});
