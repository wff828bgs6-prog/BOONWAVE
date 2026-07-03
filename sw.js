const CACHE = 'boonwave-core-21';
const CORE = [
  './',
  './index.html',
  './app.js',
  './styles/boonwave-tokens.css',
  './styles/production-shell.css',
  './styles/production-shell-v2.css',
  './styles/card-detail-overrides.css',
  './styles/card-views.css',
  './styles/one-hand-rail-v3.css',
  './styles/contacts-screen.css',
  './styles/contact-editor.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('boonwave-') && key !== CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(
        (cached) => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined),
      )),
  );
});
