import { useAuth } from '../context/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import { useEffect, useState } from 'react'
import logo from '../assets/logo.png'

export default function Sidebar({ activePage, onNavigate }) {
  const { user, userData } = useAuth()
  const [newConsignes, setNewConsignes] = useState(0)
  const [newPratiques, setNewPratiques] = useState(0)

  useEffect(() => {
    if (!user) return
    const lastSeen = localStorage.getItem(`lastSeen_${user.uid}`) || 0

    const consignesRef = ref(db, 'consignes')
    const unsubC = onValue(consignesRef, (snap) => {
      const data = snap.val()
      if (data) {
        const count = Object.values(data).filter(c => c.timestamp > parseInt(lastSeen)).length
        setNewConsignes(count)
      }
    })

    const pratiquesRef = ref(db, 'bonnes_pratiques')
    const unsubP = onValue(pratiquesRef, (snap) => {
      const data = snap.val()
      if (data) {
        const count = Object.values(data).filter(p => p.timestamp > parseInt(lastSeen)).length
        setNewPratiques(count)
      }
    })

    return () => { unsubC(); unsubP() }
  }, [user])

  const markAsSeen = (page) => {
    if ((page === 'consignes' || page === 'bonnes-pratiques') && user) {
      localStorage.setItem(`lastSeen_${user.uid}`, Date.now())
      if (page === 'consignes') setNewConsignes(0)
      if (page === 'bonnes-pratiques') setNewPratiques(0)
    }
    onNavigate(page)
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  const getRoleColor = (role) => {
    if (role === 'directrice') return 'text-amber-600'
    if (role === 'superviseure') return 'text-purple-600'
    return 'text-blue-600'
  }

  const getRoleLabel = (role) => {
    if (role === 'directrice') return 'Directrice'
    if (role === 'superviseure') return 'Superviseure'
    return 'Agent'
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase()
  }

  const getAvatarColor = (role) => {
    if (role === 'directrice') return 'bg-amber-500'
    if (role === 'superviseure') return 'bg-purple-600'
    return 'bg-blue-600'
  }

  const menuItemsMain = [
    { id: 'dashboard', icon: '🏠', label: 'Tableau de bord' },
    { id: 'presentation', icon: '🏢', label: 'Notre Entreprise' },
  ]

  const menuItemsComm = [
    { id: 'groupe', icon: '💬', label: 'Chat Groupe' },
    { id: 'messagerie', icon: '✉️', label: 'Messagerie Privée' },
  ]

  const menuItemsContenu = [
    { id: 'actualites', icon: '📰', label: 'Actualités', badge: 0 },
    { id: 'bonnes-pratiques', icon: '⭐', label: 'Bonnes Pratiques', badge: newPratiques },
    { id: 'consignes', icon: '📋', label: 'Consignes', badge: newConsignes },
    { id: 'resultats', icon: '📊', label: 'Résultats', badge: 0 },
  ]

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-200 flex flex-col z-50 shadow-sm">

      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Myopla" className="h-8 object-contain" />
          <div>
            <div className="font-bold text-gray-800 text-sm">Myopla Al Hoceima</div>
            <div className="text-xs text-gray-400">Plateforme Interne</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
          Principal
        </div>
        {menuItemsMain.map(item => (
          <button
            key={item.id}
            onClick={() => markAsSeen(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all
              ${activePage === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 mt-4">
          Communication
        </div>
        {menuItemsComm.map(item => (
          <button
            key={item.id}
            onClick={() => markAsSeen(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all
              ${activePage === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 mt-4">
          Contenu
        </div>
        {menuItemsContenu.map(item => (
          <button
            key={item.id}
            onClick={() => markAsSeen(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all
              ${activePage === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-xs">🔔</span>
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              </span>
            )}
          </button>
        ))}

        {userData?.role === 'directrice' && (
          <>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 mt-4">
              Administration
            </div>
            <button
              onClick={() => markAsSeen('administration')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all
                ${activePage === 'administration' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span className="text-base">⚙️</span>
              Administration
            </button>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(userData?.role)}`}>
            {getInitials(userData?.nom)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              {userData?.nom || 'Utilisateur'}
            </div>
            <div className={`text-xs font-medium ${getRoleColor(userData?.role)}`}>
              {getRoleLabel(userData?.role)}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-xs text-gray-400 hover:text-red-500 transition text-left"
        >
          🚪 Se déconnecter
        </button>
      </div>

    </aside>
  )
}