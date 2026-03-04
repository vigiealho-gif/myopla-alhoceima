import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { ref, get, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database'
import { auth, db } from '../firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          const userRef = ref(db, 'users/' + firebaseUser.uid)
          const snapshot = await get(userRef)
          if (snapshot.exists()) {
            setUserData(snapshot.val())
          } else {
            setUserData(null)
          }
        } catch (error) {
          console.error('Erreur:', error)
        }

        // ✅ Marquer l'utilisateur comme EN LIGNE
        const presenceRef = ref(db, `presence/${firebaseUser.uid}`)
        await set(presenceRef, {
          online: true,
          lastSeen: serverTimestamp()
        })

        // ✅ Quand l'utilisateur se déconnecte (ferme l'onglet, perd internet...)
        // Firebase met automatiquement online: false
        onDisconnect(presenceRef).set({
          online: false,
          lastSeen: serverTimestamp()
        })

      } else {
        setUser(null)
        setUserData(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}