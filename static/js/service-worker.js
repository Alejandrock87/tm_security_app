// Service Worker para la PWA y manejo de notificaciones
self.addEventListener('install', (event) => {
    console.log('Service Worker instalado');
    event.waitUntil(
        caches.open('transmilenio-security-v1')
            .then((cache) => cache.addAll([
                '/',
                '/static/css/notifications.css',
                '/static/js/notifications.js',
                '/static/icons/icon-192x192.png',
                '/static/icons/icon-512x512.png',
                '/static/manifest.json'
            ]))
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activado');
});

// Cachear recursos estáticos


// Estrategia de cache: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Notificación de TransMilenio Security',
        icon: '/static/icons/notification-icon.png',
        badge: '/static/icons/badge-icon.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification('TransMilenio Security', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});