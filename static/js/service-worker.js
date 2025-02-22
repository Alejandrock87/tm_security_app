
self.addEventListener('push', function(event) {
  const options = {
    body: event.data.text(),
    icon: '/static/icons/notification-icon.png',
    badge: '/static/icons/badge-icon.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification('TransMilenio Security', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
