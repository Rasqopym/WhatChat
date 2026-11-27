// Service Worker for WhatChat Push Notifications & PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Required fetch handler for PWA installability on Android / Chrome
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
});

// Handle notification click: focus existing tab or open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            conversationId: event.notification.data?.conversationId,
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle server-sent Web Push payloads (if VAPID push is triggered)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'New WhatsApp Message', {
        body: data.body || 'You have a new customer message.',
        tag: data.conversationId || 'whatchat-msg',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { conversationId: data.conversationId, url: '/' },
      })
    );
  } catch (e) {
    console.error('Push event error:', e);
  }
});
