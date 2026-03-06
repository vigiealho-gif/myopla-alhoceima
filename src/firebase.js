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

// ✅ FCM Messaging
export const messaging = getMessaging(app)

export const VAPID_KEY = "BL77A0tFxpIA3UfKgQENbEOItoV0vfQn-qrzARMZlQ_yTKBDhGuznRVEydXgN-TYZTcGaQL7QGlmPhNQVfJ4EXI"

// Obtenir le token FCM de l'appareil courant
export const getFCMToken = async () => {
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    return token || null
  } catch (e) {
    console.warn("Impossible d'obtenir le token FCM:", e)
    return null
  }
}

// Écouter les messages FCM quand l'app est au premier plan
export const onForegroundMessage = (callback) => {
  return onMessage(messaging, callback)
}