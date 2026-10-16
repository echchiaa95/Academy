/* Safe service worker: network-first for documents, cache-first for static assets.
   Versioned cache so GitHub Pages updates never get stuck. */
const VERSION = 'ap-v19';
const STATIC = VERSION + '-static';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((res) => { const c = res.clone(); caches.open(STATIC).then((cache) => cache.put('./index.html', c)); return res; }).catch(() => caches.match('./index.html')));
    return;
  }
  if (/\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => { const c = res.clone(); caches.open(STATIC).then((cache) => cache.put(e.request, c)); return res; })));
  }
});
