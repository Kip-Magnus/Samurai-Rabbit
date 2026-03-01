const CACHE_NAME = 'samurai-usagi-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './engine/game.js',
  './engine/sprites.js',
  './engine/effects.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js',
];

// Install: precache core engine files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for data, cache-first for engine
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Book data (JSON): network-first so updates propagate
  if (url.pathname.includes('/data/books/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: cache-first
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
  );
});
