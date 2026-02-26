import { useAuth } from '../context/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import logo from '../assets/logo.png'

const menuItems = [
  { id: 'dashboard', icon: '🏠', label: 'Tableau de bord' },
  { id: 'presentation', icon: '🏢', label: 'Notre Entreprise' },
  { id: 'groupe', icon: '💬', label: 'Chat Groupe' },
  { id: 'messagerie', icon: '✉️', label: 'Messagerie Privée' },
  { id: 'actualites', icon: '📰', label: 'Actualités' },
  { id: 'bonnes-pratiques', icon: '⭐', label: 'Bonnes Pratiques' },
  { id: 'consignes', icon: '📋', label: 'Consignes' },
  { id: 'resultats', icon: '📊', label: 'Résultats' },
]

export default function Sidebar({ activePage, onNavigate }) {
  const { userData } = useAuth()

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
        {menuItems.slice(0, 2).map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
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
        {menuItems.slice(2, 4).map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
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
        {menuItems.slice(4).map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all
              ${activePage === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}

        {userData?.role === 'directrice' && (
          <>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 mt-4">
              Administration
            </div>
            <button
              onClick={() => onNavigate('administration')}
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