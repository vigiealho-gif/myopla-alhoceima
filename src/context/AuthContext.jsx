import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database'
import { auth, db } from '../firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubUserData = null

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Arrêter l'écoute précédente si elle existe
      if (unsubUserData) { unsubUserData(); unsubUserData = null }

      if (firebaseUser) {
        setUser(firebaseUser)

        // ✅ onValue = écoute en temps réel → photo, nom, titre se mettent à jour instantanément
        const userRef = ref(db, 'users/' + firebaseUser.uid)
        unsubUserData = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.val())
          } else {
            setUserData(null)
          }
          setLoading(false)
        })

        // Présence en ligne
        const presenceRef = ref(db, `presence/${firebaseUser.uid}`)
        await set(presenceRef, { online: true, lastSeen: serverTimestamp() })
        onDisconnect(presenceRef).set({ online: false, lastSeen: serverTimestamp() })

      } else {
        setUser(null)
        setUserData(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (unsubUserData) unsubUserData()
    }
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