// ✅ CE FICHIER DOIT S'APPELER EXACTEMENT : firebase-messaging-sw.js
// ✅ ET DOIT ÊTRE DANS LE DOSSIER : public/
// Firebase cherche CE nom précis pour les notifications en arrière-plan

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

// ✅ Notifications en arrière-plan (onglet inactif / autre fenêtre)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Message en background reçu:', payload)

  const title = payload.notification?.title || payload.data?.title || 'CallConnect'
  const body  = payload.notification?.body  || payload.data?.body  || ''
  const icon  = payload.notification?.icon  || payload.data?.icon  || '/favicon.ico'
  const tag   = payload.data?.tag || 'notif-callconnect'

  self.registration.showNotification(title, {
    body,
    icon,
    badge: '/favicon.ico',
    tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: self.location.origin }
  })
})

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