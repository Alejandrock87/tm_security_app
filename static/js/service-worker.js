
// Service Worker para manejo de notificaciones
self.addEventListener('install', (event) => {
    console.log('Service Worker instalado');
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activado');
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
