import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"
import { getMessaging, getToken, onMessage } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyDJOmekZaWSwb6OxYiiFL9gpz-hp6D6gEw",
  authDomain: "callconnect-b328a.firebaseapp.com",
  databaseURL: "https://callconnect-b328a-default-rtdb.firebaseio.com",
  projectId: "callconnect-b328a",
  storageBucket: "callconnect-b328a.firebasestorage.app",
  messagingSenderId: "729004909757",
  appId: "1:729004909757:web:cbd14626b2e1d7aca683d4"
}

const app = initializeApp(firebaseConfig)

export const auth    = getAuth(app)
export const db      = getDatabase(app)
export const storage = getStorage(app)

export const VAPID_KEY = "BL77A0tFxpIA3UfKgQENbEOItoV0vfQn-qrzARMZlQ_yTKBDhGuznRVEydXgN-TYZTcGaQL7QGlmPhNQVfJ4EXI"

// ✅ Initialiser messaging seulement si supporté
let messaging = null
try {
  messaging = getMessaging(app)
} catch (e) {
  console.warn("FCM non supporté:", e)
}

export { messaging }

// ✅ Obtenir token FCM — attend que le SW soit prêt
export const getFCMToken = async () => {
  try {
    if (!messaging) return null
    if (!('serviceWorker' in navigator)) return null

    // ✅ Attendre que le SW soit actif avant de demander le token
    const swReg = await navigator.serviceWorker.ready
    console.log("SW prêt:", swReg)

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg // ✅ Passer explicitement le SW
    })

    if (token) {
      console.log("✅ Token FCM obtenu:", token.substring(0, 20) + "...")
      return token
    } else {
      console.warn("⚠️ Aucun token FCM — permission refusée ?")
      return null
    }
  } catch (e) {
    console.warn("❌ Erreur getFCMToken:", e)
    return null
  }
}

// ✅ Écouter les messages FCM quand l'app est au premier plan
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}