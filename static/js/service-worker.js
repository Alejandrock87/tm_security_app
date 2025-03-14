// Service Worker para la PWA y manejo de notificaciones
const CACHE_NAME = 'transmilenio-security-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/static/css/notifications.css',
    '/static/css/predictions.css',
    '/static/js/notifications.js',
    '/static/js/predictions.js',
    '/static/icons/icon-192x192.png',
    '/static/icons/icon-512x512.png',
    '/static/manifest.json',
    '/health'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker instalado');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activado');
    // Limpiar caches antiguos
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

// Manejar eventos push para notificaciones
self.addEventListener('push', (event) => {
    console.log('Push event recibido');
    const data = event.data ? event.data.json() : {};

    // Enviar mensaje al cliente para mostrar notificación in-app
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'showNotification',
                payload: data
            });
        });
    });
});

// Manejar click en notificaciones
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});