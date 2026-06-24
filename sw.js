const CACHE = "boonwave-v5-4-4";
const CORE = [
  "./",
  "index.html?v=5.4.4",
  "styles.css?v=5.4.4",
  "app.js?v=5.4.4",
  "manifest.webmanifest",
  "boonwave-approved.png","boonwave-approved-splash.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).catch(() => undefined));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE);
        cache.put("index.html?v=5.4.4", fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("index.html?v=5.4.4")) || (await caches.match("./"));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return caches.match(req);
    }
  })());
});
