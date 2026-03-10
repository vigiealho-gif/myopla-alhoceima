import { useAuth } from '../context/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import { useEffect, useState, useRef } from 'react'
import logo from '../assets/logo.png'

export default function Sidebar({ activePage, onNavigate }) {
  const { user, userData } = useAuth()
  const [newConsignes, setNewConsignes] = useState(0)
  const [newPratiques, setNewPratiques] = useState(0)
  const [newPlannings, setNewPlannings] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [allData, setAllData] = useState({ consignes: [], pratiques: [], actualites: [], membres: [], plannings: [] })
  const searchRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const lastSeen = localStorage.getItem(`lastSeen_${user.uid}`) || 0
    const unsubC = onValue(ref(db, 'consignes'), (snap) => {
      const data = snap.val()
      if (data) {
        setNewConsignes(Object.values(data).filter(c => c.timestamp > parseInt(lastSeen)).length)
        setAllData(prev => ({ ...prev, consignes: Object.entries(data).map(([id, c]) => ({ id, ...c })) }))
      }
    })
    const unsubP = onValue(ref(db, 'bonnes_pratiques'), (snap) => {
      const data = snap.val()
      if (data) {
        setNewPratiques(Object.values(data).filter(p => p.timestamp > parseInt(lastSeen)).length)
        setAllData(prev => ({ ...prev, pratiques: Object.entries(data).map(([id, p]) => ({ id, ...p })) }))
      }
    })
    const unsubA = onValue(ref(db, 'actualites'), (snap) => {
      const data = snap.val()
      if (data) setAllData(prev => ({ ...prev, actualites: Object.entries(data).map(([id, a]) => ({ id, ...a })) }))
    })
    const unsubU = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val()
      if (data) setAllData(prev => ({ ...prev, membres: Object.entries(data).map(([id, u]) => ({ id, ...u })) }))
    })
    const unsubPl = onValue(ref(db, 'plannings'), (snap) => {
      const data = snap.val()
      if (data) {
        setNewPlannings(Object.values(data).filter(p => p.timestamp > parseInt(lastSeen)).length)
        setAllData(prev => ({ ...prev, plannings: Object.entries(data).map(([id, p]) => ({ id, ...p })) }))
      }
    })
    return () => { unsubC(); unsubP(); unsubA(); unsubU(); unsubPl() }
  }, [user])

  useEffect(() => {
    if (!user) return
    const unsubM = onValue(ref(db, 'messages_prives'), (snap) => {
      const data = snap.val()
      if (!data) { setUnreadMessages(0); return }
      let total = 0
      Object.entries(data).forEach(([convId, messages]) => {
        if (!convId.includes(user.uid) || !messages) return
        Object.values(messages).forEach(msg => {
          if (msg.senderId !== user.uid && !msg.readBy?.[user.uid]) total++
        })
      })
      setUnreadMessages(total)
    })
    return () => unsubM()
  }, [user])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowResults(false); return }
    const q = searchQuery.toLowerCase()
    const results = []
    allData.consignes.forEach(c => {
      if (c.titre?.toLowerCase().includes(q) || c.contenu?.toLowerCase().includes(q))
        results.push({ id: c.id, icon: '📋', titre: c.titre, extrait: c.contenu?.slice(0, 70), page: 'consignes', couleur: 'text-blue-600', bg: 'bg-blue-50' })
    })
    allData.pratiques.forEach(p => {
      if (p.titre?.toLowerCase().includes(q) || p.contenu?.toLowerCase().includes(q))
        results.push({ id: p.id, icon: '⭐', titre: p.titre, extrait: p.contenu?.slice(0, 70), page: 'bonnes-pratiques', couleur: 'text-yellow-600', bg: 'bg-yellow-50' })
    })
    allData.actualites.forEach(a => {
      if (a.titre?.toLowerCase().includes(q) || a.contenu?.toLowerCase().includes(q))
        results.push({ id: a.id, icon: '📰', titre: a.titre, extrait: a.contenu?.slice(0, 70), page: 'actualites', couleur: 'text-green-600', bg: 'bg-green-50' })
    })
    allData.membres.forEach(m => {
      if (m.nom?.toLowerCase().includes(q))
        results.push({ id: m.id, icon: '👤', titre: m.nom, extrait: getRoleLabel(m.role, m.titre), page: 'messagerie', couleur: 'text-purple-600', bg: 'bg-purple-50', membreData: m })
    })
    allData.plannings.forEach(p => {
      if (p.titre?.toLowerCase().includes(q) || p.semaine?.toLowerCase().includes(q))
        results.push({ id: p.id, icon: '📅', titre: p.titre, extrait: p.semaine || '', page: 'planning', couleur: 'text-green-700', bg: 'bg-green-50' })
    })
    setSearchResults(results.slice(0, 8))
    setShowResults(true)
  }, [searchQuery, allData])

  useEffect(() => {
    const handleClick = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const highlight = (text) => {
    if (!searchQuery.trim() || !text) return text
    const parts = text.split(new RegExp(`(${searchQuery.trim()})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
        : part
    )
  }

  const handleResultClick = (result) => {
    setSearchQuery(''); setShowResults(false)
    if (result.page === 'messagerie' && result.membreData) markAsSeen('messagerie', result.membreData)
    else markAsSeen(result.page)
  }

  const markAsSeen = (page, membreToOpen = null) => {
    if (['consignes', 'bonnes-pratiques', 'planning'].includes(page) && user) {
      localStorage.setItem(`lastSeen_${user.uid}`, Date.now())
      if (page === 'consignes') setNewConsignes(0)
      if (page === 'bonnes-pratiques') setNewPratiques(0)
      if (page === 'planning') setNewPlannings(0)
    }
    if (page === 'messagerie') setUnreadMessages(0)
    onNavigate(page, membreToOpen)
  }

  const handleLogout = async () => { await signOut(auth) }
  const getRoleColor = (role) => ({ directrice: 'text-amber-600', superviseure: 'text-purple-600', vigie: 'text-indigo-600', formateur: 'text-teal-600' }[role] || 'text-blue-600')
  const getRoleLabel = (role, titre) => {
    if (titre) return titre
    return { directrice: 'Directrice', superviseure: 'Superviseure', vigie: 'Vigie', formateur: 'Formateur' }[role] || 'Agent'
  }
  const getInitials = (name) => { if (!name) return '?'; return name.split(' ').map(w => w[0]).join('').toUpperCase() }
  const getAvatarColor = (role) => ({ directrice: 'bg-amber-500', superviseure: 'bg-purple-600', vigie: 'bg-indigo-500', formateur: 'bg-teal-500' }[role] || 'bg-blue-600')

  const menuItemsMain = [
    { id: 'dashboard',    icon: '🏠', label: 'Tableau de bord' },
    { id: 'presentation', icon: '🏢', label: 'Notre Entreprise'  },
  ]
  const menuItemsComm = [
    { id: 'groupe',       icon: '💬', label: 'Chat Groupe',       badge: 0              },
    { id: 'messagerie',   icon: '✉️', label: 'Messagerie Privée', badge: unreadMessages },
    { id: 'carte-agents', icon: '👥', label: 'Carte des Agents',  badge: 0              }, // ✅ NOUVEAU
  ]
  const menuItemsContenu = [
    { id: 'actualites',       icon: '📰', label: 'Actualités',      badge: 0            },
    { id: 'bonnes-pratiques', icon: '⭐', label: 'Bonnes Pratiques', badge: newPratiques },
    { id: 'consignes',        icon: '📋', label: 'Consignes',        badge: newConsignes },
    { id: 'planning',         icon: '📅', label: 'Planning',         badge: newPlannings },
    { id: 'resultats',        icon: '📊', label: 'Résultats',        badge: 0            },
  ]

  const renderMenuItem = (item) => (
    <button key={item.id} onClick={() => markAsSeen(item.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all
        ${activePage === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
      <span className="text-base">{item.icon}</span>
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge > 0 && (
        <span className="flex items-center gap-1">
          {item.id !== 'messagerie' && <span className="text-xs">🔔</span>}
          <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{item.badge}</span>
        </span>
      )}
    </button>
  )

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

      <div className="px-3 py-3 border-b border-gray-100 relative" ref={searchRef}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowResults(true)}
            placeholder="Rechercher..."
            className="w-full pl-8 pr-7 py-2 bg-gray-100 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 transition" />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setShowResults(false) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>
        {showResults && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                <div className="text-2xl mb-1">🔍</div>
                <p>Aucun résultat pour</p>
                <p className="font-semibold text-gray-600">"{searchQuery}"</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}</span>
                </div>
                {searchResults.map((result, i) => (
                  <button key={i} onClick={() => handleResultClick(result)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base ${result.bg}`}>{result.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${result.couleur}`}>{highlight(result.titre)}</div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">{highlight(result.extrait)}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Principal</div>
        {menuItemsMain.map(renderMenuItem)}

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 mt-4">Communication</div>
        {menuItemsComm.map(renderMenuItem)}

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 mt-4">Contenu</div>
        {menuItemsContenu.map(renderMenuItem)}

        {['directrice', 'superviseure'].includes(userData?.role) && (
          <>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 mt-4">Administration</div>
            <button onClick={() => markAsSeen('administration')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all
                ${activePage === 'administration' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
              <span className="text-base">⚙️</span> Administration
            </button>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <button onClick={() => onNavigate('profil')}
          className={`w-full flex items-center gap-3 mb-3 p-2 rounded-xl transition hover:bg-gray-50 ${activePage === 'profil' ? 'bg-blue-50' : ''}`}>
          {userData?.photoURL ? (
            <img src={userData.photoURL} alt="profil" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(userData?.role)} flex-shrink-0`}>
              {getInitials(userData?.nom)}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold text-gray-800 truncate">{userData?.nom || 'Utilisateur'}</div>
            <div className={`text-xs font-medium ${getRoleColor(userData?.role)}`}>{getRoleLabel(userData?.role, userData?.titre)}</div>
          </div>
          <span className="text-gray-300 text-sm">›</span>
        </button>
        <button onClick={handleLogout} className="w-full text-xs text-gray-400 hover:text-red-500 transition text-left">🚪 Se déconnecter</button>
      </div>
    </aside>
  )
}