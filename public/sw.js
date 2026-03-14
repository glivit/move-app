/**
 * Service Worker for MŌVE coaching app
 * Handles push notifications and background synchronization
 */

const APP_NAME = 'MŌVE';
const APP_ICON = '/icon-192x192.png';
const APP_COLOR = '#C8A96E'; // Gold accent color

/**
 * Handle incoming push notifications
 */
self.addEventListener('push', (event) => {
  try {
    // Parse notification data from push event
    const data = event.data?.json() || {};

    const {
      title = APP_NAME,
      body = 'Je hebt een nieuwe melding',
      icon = APP_ICON,
      badge = APP_ICON,
      url = '/',
      tag = 'move-notification',
      actions = [],
      vibrate = [200, 100, 200],
    } = data;

    const notificationOptions = {
      body,
      icon,
      badge,
      tag,
      vibrate,
      data: { url, ...data },
      actions,
      requireInteraction: false,
      badge: badge,
      image: data.image,
      dir: 'ltr',
      lang: 'nl',
      timestamp: Date.now(),
      ...data.notificationOptions,
    };

    event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
    );
  } catch (error) {
    console.error('Fout bij verwerken van push melding:', error);
  }
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { url = '/' } = event.notification.data;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if the app is already open
      for (let client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

/**
 * Handle notification close
 */
self.addEventListener('notificationclose', (event) => {
  // Could be used for analytics tracking
  console.log('Melding gesloten:', event.notification.tag);
});

/**
 * Handle notification action clicks (if actions are used)
 */
self.addEventListener('notificationclick', (event) => {
  if (event.action) {
    // Handle specific action click if needed
    console.log('Melding actie aangeklikt:', event.action);
  }
});

/**
 * Install event - cache assets
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker installeren');
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker activeren');
  event.waitUntil(clients.claim());
});

/**
 * Handle messages from the app
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
