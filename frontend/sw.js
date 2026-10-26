/* Service worker: permite usar la app sin conexión una vez instalada (requiere http/https). */
const CACHE = 'alitas-pos-v21';
const ARCHIVOS = ['./', 'index.html', 'pos.html', 'assets/logo.avif', 'css/landing.css', 'css/styles.css', 'js/terminal.js', 'js/auth.js', 'js/landing.js', 'js/login.js', 'js/utils.js', 'js/store.js', 'js/ui.js', 'js/vistas.js', 'js/modales.js', 'js/app.js', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});
