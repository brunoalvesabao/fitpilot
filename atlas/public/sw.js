// Atlas service worker: network-first, cache fallback (works offline after first load).
const CACHE_NAME = 'atlas-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(['/', '/index.html', '/atlas.svg']).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache API or Supabase calls
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co')) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (url.origin === self.location.origin || url.hostname.includes('githubusercontent'))) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('/index.html') : undefined)).then((r) => r || new Response('Offline', { status: 503 })))
  );
});
