// public/sw.js
// Service Worker — gère les notifications hors application

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Écoute les messages envoyés depuis l'application
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data.payload

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: tag || 'message-prive',
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
      })
    )
  }
})

// Clic sur la notification → ouvre/focus l'onglet de l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si un onglet de l'app est déjà ouvert, on le focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Sinon on ouvre un nouvel onglet
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})