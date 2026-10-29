// Service worker: permite abrir la app sin conexión.
// Al publicar cambios en index.html, sube el número de VERSION.
const VERSION = 'cuaderno-v1';
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // el servidor de datos nunca se cachea
  // Respuesta inmediata desde caché y actualización en segundo plano
  e.respondWith(caches.open(VERSION).then(async cache => {
    const clave = req.mode === 'navigate' ? './index.html' : req;
    const enCache = await cache.match(clave, { ignoreSearch: req.mode === 'navigate' });
    const red = fetch(req).then(r => {
      if (r && r.ok) cache.put(clave, r.clone());
      return r;
    }).catch(() => null);
    if (enCache) { e.waitUntil(red); return enCache; }
    const r = await red;
    return r || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
