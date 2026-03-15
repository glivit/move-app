/**
 * Unified Service Worker for MŌVE coaching app
 * Handles: caching, offline support, push notifications
 */

const CACHE_NAME = 'move-v2';
const OFFLINE_URL = '/offline';

// Essential files to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
];

// ── Install: pre-cache essential assets ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for pages, cache-first for assets ──────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, API calls, and Supabase requests
  if (
    request.method !== 'GET' ||
    url.origin !== location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  ) {
    return;
  }

  // Static assets: cache-first
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        }).catch(() => {
          if (request.destination === 'image') {
            return caches.match('/icon-192x192.png');
          }
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // Pages: network-first, fallback to cache, then offline page
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.destination === 'document' || request.destination === '') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('', { status: 408 });
        })
      )
  );
});

// ── Push notifications ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  try {
    const data = event.data?.json() || {};
    const {
      title = 'MŌVE',
      body = 'Je hebt een nieuwe melding',
      icon = '/icon-192x192.png',
      badge = '/icon-96x96.png',
      url = '/',
      tag = 'move-notification',
      vibrate = [200, 100, 200],
    } = data;

    const badgeNum = data.badgeCount || 1;

    event.waitUntil(
      Promise.all([
        // Show the notification
        self.registration.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          vibrate,
          data: { url, badgeCount: badgeNum, ...data },
          requireInteraction: false,
          dir: 'ltr',
          lang: 'nl',
          timestamp: Date.now(),
          image: data.image,
        }),
        // Set the app badge count on icon (iOS 16.4+ PWA, Android)
        // Try both self.navigator and navigator (different browser implementations)
        (async () => {
          try {
            if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
              await navigator.setAppBadge(badgeNum);
            } else if (typeof self !== 'undefined' && 'setAppBadge' in self.navigator) {
              await self.navigator.setAppBadge(badgeNum);
            }
          } catch (_) { /* badge API not supported */ }
        })(),
      ])
    );
  } catch (error) {
    console.error('[SW] Push error:', error);
  }
});

// ── Notification click: open/focus app + navigate + clear badge ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    Promise.all([
      // Clear app badge
      (async () => {
        try {
          if ('clearAppBadge' in navigator) await navigator.clearAppBadge();
        } catch (_) {}
      })(),
      // Focus existing window and navigate, or open new one
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // If app is already open, navigate it to the URL
          for (const client of windowClients) {
            if ('focus' in client) {
              client.focus();
              // Navigate to the target URL
              client.navigate(url);
              return;
            }
          }
          // No open window — open new one
          return clients.openWindow(url);
        }),
    ])
  );
});

// ── Messages from app ────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_BADGE') {
    if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});
