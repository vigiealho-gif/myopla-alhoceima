// src/hooks/useNotification.js
import { useEffect, useRef } from 'react'
import { ref, set } from 'firebase/database'
import { db, getFCMToken, onForegroundMessage } from '../firebase'

export function useNotification() {

  // ✅ Demander permission + sauvegarder token FCM dans Firebase
  // IMPORTANT : passer le userId de l'utilisateur connecté
  const requestPermission = async (userId) => {
    if (!('Notification' in window)) return 'denied'
    if (Notification.permission === 'denied') return 'denied'

    let permission = Notification.permission
    if (permission !== 'granted') {
      permission = await Notification.requestPermission()
    }

    if (permission === 'granted' && userId) {
      try {
        const token = await getFCMToken()
        if (token) {
          // ✅ Sauvegarder le token FCM dans Firebase sous fcm_tokens/{userId}
          await set(ref(db, `fcm_tokens/${userId}`), {
            token,
            updatedAt: Date.now()
          })
          console.log('✅ Token FCM sauvegardé pour', userId)
        }
      } catch (e) {
        console.warn('Impossible de sauvegarder le token FCM:', e)
      }
    }

    return permission
  }

  // ✅ Afficher une notification (quand app est ouverte dans un onglet actif)
  // Pour les notifications cross-device (autre appareil/onglet fermé),
  // c'est Firebase Functions qui envoie via FCM — voir firebase.js
  const sendNotification = async ({ title, body, icon, tag }) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, {
        body: body || '',
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: tag || 'notif-callconnect',
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
      })
    } catch (e) {
      // Fallback si SW pas disponible
      try {
        new Notification(title, {
          body: body || '',
          icon: icon || '/favicon.ico',
          tag: tag || 'notif-callconnect',
        })
      } catch (e2) {
        console.warn('Notification impossible:', e2)
      }
    }
  }

  const onForeground = (callback) => {
    return onForegroundMessage(callback)
  }

  return { requestPermission, sendNotification, onForeground }
}