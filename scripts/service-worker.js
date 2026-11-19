/* eslint-env serviceworker */
/* global __CACHE_NAME__, __ASSETS__ */
/* Build placeholders are replaced by generate-service-worker.js. */
const CACHE_NAME = __CACHE_NAME__;
const ASSETS = __ASSETS__;
const STATIC_PATHS = new Set(ASSETS);

self.addEventListener('install', (event) => {
  // Atomic install: a partial download must never replace a working offline build.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  // Wait for existing tabs to close before activating a new build.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name.startsWith('safedose-static-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never intercept API, auth, payments, uploads, or external requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname.startsWith('/api/') || url.pathname.startsWith('/__/')) return;

  if (request.mode === 'navigate') {
    const pathname = url.pathname.replace(/\/$/, '') || '/index';
    const asset = pathname.endsWith('.html') ? pathname :
      STATIC_PATHS.has(`${pathname}.html`) ? `${pathname}.html` : `${pathname}/index.html`;
    if (!STATIC_PATHS.has(asset)) return;
    // Serve one consistent build until the next worker activates. Query strings
    // (including auth tokens) are never used as cache keys or stored.
    event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match(asset))
      .then((cached) => cached || fetch(request)));
    return;
  }

  if (!url.search && STATIC_PATHS.has(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match(url.pathname))
      .then((cached) => cached || fetch(request)));
  }
});
