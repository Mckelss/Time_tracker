const CACHE_NAME = 'rc-tracker-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET' && event.request.url.startsWith('http')) {
             cache.put(event.request, networkResponse.clone());
          }
        });
        return networkResponse;
      }).catch(() => cachedResponse); // fallback to cache

      return cachedResponse || fetchPromise;
    })
  );
});
