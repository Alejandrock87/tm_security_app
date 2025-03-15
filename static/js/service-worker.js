
// Service Worker para la PWA
const CACHE_NAME = 'transmilenio-security-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/static/css/custom.css',
  '/static/js/notifications.js',
  '/static/js/predictions.js',
  '/static/js/statistics.js',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  '/static/manifest.json'
];

// Instalación del SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activación y limpieza de caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia de cache: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/static/icons/icon-192x192.png',
    badge: '/static/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TransMilenio Security', options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
