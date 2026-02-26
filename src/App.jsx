import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
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