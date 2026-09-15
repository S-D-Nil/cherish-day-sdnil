// Service Worker for Cherish Day Push Notifications
// Enables notifications to appear directly in the phone / OS navigation tray & lock screen

const CACHE_NAME = 'cherish-day-v1';

self.addEventListener('install', (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from client to show persistent navigation tray notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: '/logo_centered.png',
        badge: '/logo_centered.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        ...options,
      })
    );
  }
});

// Push event for remote push notifications (Web Push protocol)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Birthday Alert', body: event.data.text() };
    }
  }

  const title = data.title || 'Birthday Alert';
  const options = {
    body: data.body || 'Upcoming birthday reminder',
    icon: '/logo_centered.png',
    badge: '/logo_centered.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag: data.tag || 'cherish-birthday-reminder',
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event handler: opens the app and focuses the gift prompt
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const extraData = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and broadcast event
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: extraData,
          });
          return client.focus();
        }
      }
      // Otherwise open the window with query parameters so the app opens the gift screen
      if (self.clients.openWindow) {
        const url = extraData.birthdayId
          ? `/?openGift=true&birthdayId=${encodeURIComponent(extraData.birthdayId)}&name=${encodeURIComponent(extraData.personName || '')}&date=${encodeURIComponent(extraData.birthDate || '')}`
          : '/';
        return self.clients.openWindow(url);
      }
    })
  );
});
