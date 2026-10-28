/* ==========================================================================
   SMATREE SOLAR INVENTORY — Service Worker
   PWA offline support and caching
   ========================================================================== */

const CACHE_NAME = 'smatree-solar-v7';
const ASSETS = [
  '/smatree-inventory/pages/login.html',
  '/smatree-inventory/pages/dashboard.html',
  '/smatree-inventory/pages/inventory.html',
  '/smatree-inventory/pages/production.html',
  '/smatree-inventory/pages/finished-goods.html',
  '/smatree-inventory/pages/installations.html',
  '/smatree-inventory/pages/sales.html',
  '/smatree-inventory/pages/suppliers.html',
  '/smatree-inventory/pages/reports.html',
  '/smatree-inventory/css/variables.css',
  '/smatree-inventory/css/base.css',
  '/smatree-inventory/css/components.css',
  '/smatree-inventory/css/layout.css',
  '/smatree-inventory/css/auth.css',
  '/smatree-inventory/css/dashboard.css',
  '/smatree-inventory/css/inventory.css',
  '/smatree-inventory/css/production.css',
  '/smatree-inventory/css/installations.css',
  '/smatree-inventory/css/reports.css',
  '/smatree-inventory/js/icons.js',
  '/smatree-inventory/js/utils.js',
  '/smatree-inventory/js/store.js',
  '/smatree-inventory/js/seed.js',
  '/smatree-inventory/js/components.js',
  '/smatree-inventory/js/app.js',
  '/smatree-inventory/js/auth.js',
  '/smatree-inventory/js/dashboard.js',
  '/smatree-inventory/js/inventory.js',
  '/smatree-inventory/js/production.js',
  '/smatree-inventory/js/finished-goods.js',
  '/smatree-inventory/js/installations.js',
  '/smatree-inventory/js/sales.js',
  '/smatree-inventory/js/suppliers.js',
  '/smatree-inventory/js/reports.js',
];

// Self-destruct and purge legacy caches
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always network-only
  event.respondWith(fetch(event.request));
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
