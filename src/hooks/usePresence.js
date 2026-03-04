// src/hooks/usePresence.js
// Hook pour écouter le statut en ligne/hors ligne de tous les membres

import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'

export function usePresence() {
  const [presence, setPresence] = useState({})

  useEffect(() => {
    const presenceRef = ref(db, 'presence')
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val()
      setPresence(data || {})
    })
    return () => unsubscribe()
  }, [])

  // Retourne true si l'uid est en ligne
  const isOnline = (uid) => presence[uid]?.online === true

  return { presence, isOnline }
}