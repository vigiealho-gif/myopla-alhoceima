import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"

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

export const auth = getAuth(app)
export const db = getDatabase(app)
export const storage = getStorage(app)