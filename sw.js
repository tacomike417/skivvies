// Skivvies service worker: cache the shell, network first for the page so updates show up.
const CACHE = 'skivvies-v0.15';
const SHELL = ['/', '/index.html', '/manifest.json', '/img/thong.png', '/img/boxers.png', '/img/bra-panties.png', '/img/boxers-pair.png', '/img/profile.png', '/img/qr.png', '/img/rm-icon.png', '/img/counter/plate.webp', '/img/counter/tile_blank.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
});
