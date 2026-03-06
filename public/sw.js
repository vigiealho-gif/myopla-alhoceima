// public/sw.js
// Service Worker Myopla — Firebase Cloud Messaging

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyDJOmekZaWSwb6OxYiiFL9gpz-hp6D6gEw",
  authDomain: "callconnect-b328a.firebaseapp.com",
  databaseURL: "https://callconnect-b328a-default-rtdb.firebaseio.com",
  projectId: "callconnect-b328a",
  storageBucket: "callconnect-b328a.firebasestorage.app",
  messagingSenderId: "729004909757",
  appId: "1:729004909757:web:cbd14626b2e1d7aca683d4"
})

const messaging = firebase.messaging()

// ✅ Notifications en arrière-plan (app minimisée ou onglet inactif)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Myopla'
  const body  = payload.notification?.body  || payload.data?.body  || ''
  const icon  = payload.notification?.icon  || payload.data?.icon  || '/favicon.ico'
  const tag   = payload.data?.tag || 'notif-myopla'

  self.registration.showNotification(title, {
    body,
    icon,
    badge: '/favicon.ico',
    tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: '/' }
  })
})

// Lifecycle
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))

// ✅ Clic sur notification → focus ou ouvre l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow('/')
    })
  )
})

// ✅ Fallback postMessage (quand app active)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data.payload
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body || '',
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: tag || 'notif-myopla',
        renotify: true,
        vibrate: [200, 100, 200],
      })
    )
  }
})