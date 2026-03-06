// src/hooks/useNotification.js
import { useEffect, useRef } from 'react'
import { ref, set, get } from 'firebase/database'
import { db, getFCMToken, onForegroundMessage } from '../firebase'

// ✅ Envoyer une notification push via FCM HTTP V1
// On stocke le token FCM dans Firebase Realtime DB puis on l'utilise
// pour envoyer depuis le client (via l'endpoint FCM public)
const sendFCMPush = async ({ fcmToken, title, body, icon, tag }) => {
  // On utilise la Firebase Realtime DB pour stocker les notifications
  // à envoyer — un Cloud Function (ou notre own endpoint) les traite
  // MAIS pour éviter un serveur, on stocke dans /pending_notifications
  // et le SW les récupère. En pratique : on utilise showNotification via SW.
  // Pour l'envoi cross-device, il faut Firebase Functions (voir INSTRUCTIONS).
}

export function useNotification() {
  const swReg = useRef(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Enregistrer le SW et le garder en référence
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => { swReg.current = reg })
      .catch((err) => console.warn('SW non enregistré:', err))

    // Récupérer le SW déjà actif si existe
    navigator.serviceWorker.ready.then((reg) => { swReg.current = reg })
  }, [])

  // ✅ Demander permission + obtenir token FCM + le sauvegarder dans Firebase
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
          // Sauvegarder le token FCM dans Firebase pour cet utilisateur
          await set(ref(db, `fcm_tokens/${userId}`), {
            token,
            updatedAt: Date.now()
          })
        }
      } catch (e) {
        console.warn('Impossible de sauvegarder le token FCM:', e)
      }
    }

    return permission
  }

  // ✅ Envoyer une notification (fonctionne quand app active ou minimisée)
  const sendNotification = async ({ title, body, icon, tag }) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
      // Toujours utiliser navigator.serviceWorker.ready — plus fiable
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, {
        body: body || '',
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: tag || 'notif-myopla',
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
          tag: tag || 'notif-myopla',
        })
      } catch (e2) {
        console.warn('Notification impossible:', e2)
      }
    }
  }

  // ✅ Écouter les messages FCM quand l'app est au premier plan
  const onForeground = (callback) => {
    return onForegroundMessage(callback)
  }

  return { requestPermission, sendNotification, onForeground }
}