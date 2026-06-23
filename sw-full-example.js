// sw.js — пример структуры.
// Сохраните существующие CACHE_NAME, ASSETS и fetch-логику проекта.

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      // Существующая логика кэширования:
      // caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Существующая очистка старых кэшей:
      // caches.keys().then(...)
    ])
  );
});

// Существующий обработчик fetch оставить без изменений.
