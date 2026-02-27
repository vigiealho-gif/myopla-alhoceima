import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ref, onValue } from 'firebase/database'
import { db } from './firebase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ChatGroupe from './pages/ChatGroupe'
import MessageriePrive from './pages/MessageriePrive'
import Actualites from './pages/Actualites'
import Consignes from './pages/Consignes'
import BonnesPratiques from './pages/BonnesPratiques'
import Resultats from './pages/Resultats'
import NotreEntreprise from './pages/NotreEntreprise'
import Administration from './pages/Administration'
import Sidebar from './components/Sidebar'

function AppContent() {
  const { user } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [notification, setNotification] = useState(null)
  const notifTimeout = useRef(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!user) return

    // Attendre 3 secondes avant d'écouter pour éviter les fausses notifications au chargement
    const initTimer = setTimeout(() => {
      initializedRef.current = true
    }, 3000)

    // Écouter les nouvelles consignes
    const consignesRef = ref(db, 'consignes')
    const unsubC = onValue(consignesRef, (snap) => {
      if (!initializedRef.current) return
      const data = snap.val()
      if (data) {
        const list = Object.values(data).sort((a, b) => b.timestamp - a.timestamp)
        const latest = list[0]
        if (latest && Date.now() - latest.timestamp < 5000) {
          showNotification({
            type: 'Consigne',
            titre: latest.titre,
            auteur: latest.auteur,
            icon: '📋',
            color: 'bg-blue-100 text-blue-600'
          })
        }
      }
    })

    // Écouter les nouvelles bonnes pratiques
    const pratiquesRef = ref(db, 'bonnes_pratiques')
    const unsubP = onValue(pratiquesRef, (snap) => {
      if (!initializedRef.current) return
      const data = snap.val()
      if (data) {
        const list = Object.values(data).sort((a, b) => b.timestamp - a.timestamp)
        const latest = list[0]
        if (latest && Date.now() - latest.timestamp < 5000) {
          showNotification({
            type: 'Bonne Pratique',
            titre: latest.titre,
            auteur: latest.auteur,
            icon: '⭐',
            color: 'bg-yellow-100 text-yellow-600'
          })
        }
      }
    })

    return () => {
      clearTimeout(initTimer)
      unsubC()
      unsubP()
    }
  }, [user])

  const showNotification = (notif) => {
    if (notifTimeout.current) clearTimeout(notifTimeout.current)
    setNotification(notif)
    notifTimeout.current = setTimeout(() => setNotification(null), 5000)
  }

  if (!user) return <Login />

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="ml-60 flex-1">
        {activePage === 'dashboard' && <Dashboard />}
        {activePage === 'groupe' && <ChatGroupe />}
        {activePage === 'messagerie' && <MessageriePrive />}
        {activePage === 'actualites' && <Actualites />}
        {activePage === 'consignes' && <Consignes />}
        {activePage === 'bonnes-pratiques' && <BonnesPratiques />}
        {activePage === 'resultats' && <Resultats />}
        {activePage === 'presentation' && <NotreEntreprise />}
        {activePage === 'administration' && <Administration />}
      </main>

      {/* Pop-up notification */}
      {notification && (
        <div
          className="fixed bottom-6 right-6 z-50"
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3 max-w-sm">
            <div className="text-2xl">{notification.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${notification.color}`}>
                  Nouvelle {notification.type}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-800 truncate">{notification.titre}</div>
              <div className="text-xs text-gray-400 mt-0.5">Par {notification.auteur}</div>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-300 hover:text-gray-500 transition text-xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>

          {/* Barre de progression */}
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ animation: 'progress 5s linear forwards' }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}