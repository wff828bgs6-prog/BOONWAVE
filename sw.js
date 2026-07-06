const VERSION = "6.0.31-daily19";
const CACHE = `boonwave-clean-${VERSION}`;
const CORE = [
  "./",
  "./index.html",
  "./styles.css?v=6.0.31",
  "./styles.css?v=6.0.31-clean2",
  "./styles.base.css?v=6.0.31",
  "./cleanup.css?v=6.0.31-clean2",
  "./app.js?v=6.0.31",
  "./daily-patch.js?v=16",
  "./daily-fix-expenses.js?v=19",
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
  const url = new URL(request.url);
  if (url.pathname.endsWith("app.js")) {
    event.respondWith((async () => {
      const response = await fetch(request, { cache: "no-store" }).catch(() => caches.match(request));
      const text = response ? await response.text() : "";
      return new Response(text + "\nimport('./daily-patch.js?v=16');\nimport('./daily-fix-expenses.js?v=19');\n", { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" } });
    })());
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "no-store" });
        const cache = await caches.open(CACHE);
        cache.put("./index.html", response.clone());
        return response;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const fresh = fetch(request, { cache: "no-store" }).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);
    return cached || (await fresh) || new Response("Offline", { status: 503 });
  })());
});
