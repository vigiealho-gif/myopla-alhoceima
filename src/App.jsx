import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ref, onValue, set } from 'firebase/database'
import { db, getFCMToken, onForegroundMessage } from './firebase'
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
import Pointage from './pages/Pointage'
import Sidebar from './components/Sidebar'

function AppContent() {
  const { user, userData } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [notification, setNotification] = useState(null)
  const notifTimeout = useRef(null)
  const initializedRef = useRef(false)

  // ✅ Enregistrer SW + demander permission + sauvegarder token FCM
  useEffect(() => {
    if (!user) return

    const initFCM = async () => {
      // 1. Demander permission navigateur
      if (!('Notification' in window)) return
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await Notification.requestPermission()
      }
      if (permission !== 'granted') return

      // 2. Enregistrer le Service Worker
      if (!('serviceWorker' in navigator)) return
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch (e) {
        console.warn('SW non enregistré:', e)
      }

      // 3. Obtenir et sauvegarder le token FCM dans Firebase
      try {
        const token = await getFCMToken()
        if (token) {
          await set(ref(db, `fcm_tokens/${user.uid}`), {
            token,
            nom: userData?.nom || '',
            role: userData?.role || '',
            updatedAt: Date.now()
          })
        }
      } catch (e) {
        console.warn('Token FCM impossible:', e)
      }
    }

    initFCM()
  }, [user, userData?.nom])

  // ✅ Écouter les messages FCM quand l'app est au premier plan
  useEffect(() => {
    if (!user) return
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Myopla'
      const body  = payload.notification?.body  || payload.data?.body  || ''
      const icon  = payload.data?.icon || '💬'
      const color = payload.data?.color || 'bg-blue-100 text-blue-600'

      showNotification({ titre: title, auteur: body, icon, color, type: '' })
    })
    return () => unsubscribe && unsubscribe()
  }, [user])

  // Écouter nouvelles consignes/pratiques (pour pop-up in-app)
  useEffect(() => {
    if (!user) return

    const initTimer = setTimeout(() => { initializedRef.current = true }, 3000)

    const unsubC = onValue(ref(db, 'consignes'), (snap) => {
      if (!initializedRef.current) return
      const data = snap.val()
      if (data) {
        const list = Object.values(data).sort((a, b) => b.timestamp - a.timestamp)
        const latest = list[0]
        if (latest && Date.now() - latest.timestamp < 5000) {
          showNotification({ type: 'Consigne', titre: latest.titre, auteur: latest.auteur, icon: '📋', color: 'bg-blue-100 text-blue-600' })
        }
      }
    })

    const unsubP = onValue(ref(db, 'bonnes_pratiques'), (snap) => {
      if (!initializedRef.current) return
      const data = snap.val()
      if (data) {
        const list = Object.values(data).sort((a, b) => b.timestamp - a.timestamp)
        const latest = list[0]
        if (latest && Date.now() - latest.timestamp < 5000) {
          showNotification({ type: 'Bonne Pratique', titre: latest.titre, auteur: latest.auteur, icon: '⭐', color: 'bg-yellow-100 text-yellow-600' })
        }
      }
    })

    return () => { clearTimeout(initTimer); unsubC(); unsubP() }
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
        {activePage === 'dashboard'        && <Dashboard onNavigate={setActivePage} />}
        {activePage === 'groupe'           && <ChatGroupe />}
        {activePage === 'messagerie'       && <MessageriePrive />}
        {activePage === 'actualites'       && <Actualites />}
        {activePage === 'consignes'        && <Consignes />}
        {activePage === 'bonnes-pratiques' && <BonnesPratiques />}
        {activePage === 'resultats'        && <Resultats />}
        {activePage === 'presentation'     && <NotreEntreprise />}
        {activePage === 'administration'   && <Administration />}
        {activePage === 'pointage'         && <Pointage onNavigate={setActivePage} />}
      </main>

      {notification && (
        <div className="fixed bottom-6 right-6 z-50" style={{ animation: 'slideIn 0.3s ease-out' }}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3 max-w-sm">
            <div className="text-2xl">{notification.icon}</div>
            <div className="flex-1 min-w-0">
              {notification.type && (
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${notification.color}`}>
                    {notification.type && `Nouvelle ${notification.type}`}
                  </span>
                </div>
              )}
              <div className="text-sm font-semibold text-gray-800 truncate">{notification.titre}</div>
              {notification.auteur && <div className="text-xs text-gray-400 mt-0.5">Par {notification.auteur}</div>}
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-300 hover:text-gray-500 transition text-xl leading-none flex-shrink-0">×</button>
          </div>
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ animation: 'progress 5s linear forwards' }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes progress { from { width: 100%; } to { width: 0%; } }
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