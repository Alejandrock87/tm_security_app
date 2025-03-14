// Versión del cache
const CACHE_VERSION = 'v1';
const CACHE_NAME = `tm-security-${CACHE_VERSION}`;

// Recursos para cachear
const CACHE_ASSETS = [
  '/',
  '/static/css/custom.css',
  '/static/css/notifications.css',
  '/static/js/notifications.js',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  '/static/icons/notification-icon.png',
  '/static/icons/badge-icon.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cacheando recursos estáticos');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('tm-security-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
    .then(() => {
      console.log('Service Worker activado y cache actualizado');
      return self.clients.claim();
    })
  );
});

// Estrategia de cache: Network First, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clonar la respuesta para el cache
        const responseToCache = response.clone();

        // Actualizar el cache con la nueva respuesta
        caches.open(CACHE_NAME)
          .then(cache => {
            if (event.request.method === 'GET') {
              cache.put(event.request, responseToCache);
            }
          });

        return response;
      })
      .catch(() => {
        // Si falla la red, intentar desde el cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no está en cache, devolver una respuesta offline básica
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('', {
              status: 408,
              statusText: 'Request timeout'
            });
          });
      })
  );
});

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  let notification = {
    title: 'TransMilenio Security',
    body: 'Notificación de seguridad',
    icon: '/static/icons/notification-icon.png',
    badge: '/static/icons/badge-icon.png',
    vibrate: [200, 100, 200],
    tag: 'tm-security-notification',
    renotify: true,
    data: {}
  };

  try {
    if (event.data) {
      const data = event.data.json();
      notification = {
        ...notification,
        ...data
      };
    }
  } catch (error) {
    console.error('Error al procesar datos de notificación:', error);
  }

  event.waitUntil(
    self.registration.showNotification(notification.title, notification)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Abrir la aplicación en la página correspondiente
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(clientList => {
        // Si ya hay una ventana abierta, enfócala
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});

// Sincronización en segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-incidents') {
    event.waitUntil(
      // Implementar sincronización de incidentes pendientes
      syncPendingIncidents()
    );
  }
});

// Función para sincronizar incidentes pendientes
async function syncPendingIncidents() {
  try {
    const response = await fetch('/api/sync-incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error en sincronización');
    }

    console.log('Sincronización completada');
  } catch (error) {
    console.error('Error en sincronización:', error);
    throw error;
  }
}
