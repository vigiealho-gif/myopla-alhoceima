// src/hooks/useNotification.js
// Hook centralisé pour envoyer des notifications navigateur natives

import { useEffect, useRef } from 'react'

export function useNotification() {
  const swRegistration = useRef(null)

  // Enregistrer le Service Worker au montage
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        swRegistration.current = registration
      })
      .catch((err) => {
        console.warn('Service Worker non enregistré:', err)
      })
  }, [])

  // Demander la permission si pas encore accordée
  const requestPermission = async () => {
    if (!('Notification' in window)) return 'denied'
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
    const result = await Notification.requestPermission()
    return result
  }

  // Envoyer une notification native (fonctionne même onglet en arrière-plan)
  const sendNotification = async ({ title, body, icon, tag }) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    // Méthode 1 : via Service Worker (meilleure — fonctionne onglet fermé/minimisé)
    if (swRegistration.current) {
      try {
        await swRegistration.current.showNotification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: tag || 'notif',
          renotify: true,
          requireInteraction: false,
          vibrate: [200, 100, 200],
        })
        return
      } catch (e) {
        // fallback ci-dessous
      }
    }

    // Méthode 2 : fallback notification directe
    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag: tag || 'notif',
      })
    } catch (e) {
      console.warn('Notification impossible:', e)
    }
  }

  return { requestPermission, sendNotification }
}