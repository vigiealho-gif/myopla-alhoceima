import { useState, useEffect } from 'react'
import { ref, onValue, set, remove, push, get } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function Administration() {
  const { userData } = useAuth()
  const [membres, setMembres] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newMembre, setNewMembre] = useState({ uid: '', nom: '', email: '', role: 'agent' })
  const [error, setError] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const usersRef = ref(db, 'users')
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, u]) => ({ id, ...u }))
        setMembres(list)
      } else {
        setMembres([])
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!newMembre.uid.trim() || !newMembre.nom.trim() || !newMembre.email.trim()) {
      setError('Tous les champs sont obligatoires')
      return
    }

    await set(ref(db, `users/${newMembre.uid.trim()}`), {
      nom: newMembre.nom.trim(),
      email: newMembre.email.trim(),
      role: newMembre.role
    })

    setNewMembre({ uid: '', nom: '', email: '', role: 'agent' })
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce membre ?')) return
    await remove(ref(db, `users/${id}`))
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg('')

    try {
      // Récupérer les actualités existantes pour éviter les doublons
      const actuSnap = await get(ref(db, 'actualites'))
      const actuData = actuSnap.val() || {}
      const titresExistants = Object.values(actuData).map(a => a.titre)

      let count = 0

      // Synchroniser les consignes
      const consignesSnap = await get(ref(db, 'consignes'))
      const consignesData = consignesSnap.val()
      if (consignesData) {
        for (const c of Object.values(consignesData)) {
          if (!titresExistants.includes(c.titre)) {
            await push(ref(db, 'actualites'), {
              titre: c.titre,
              contenu: c.contenu,
              categorie: 'Consigne',
              auteur: c.auteur,
              auteurRole: c.auteurRole,
              timestamp: c.timestamp || Date.now()
            })
            count++
          }
        }
      }

      // Synchroniser les bonnes pratiques
      const pratiquesSnap = await get(ref(db, 'bonnes_pratiques'))
      const pratiquesData = pratiquesSnap.val()
      if (pratiquesData) {
        for (const p of Object.values(pratiquesData)) {
          if (!titresExistants.includes(p.titre)) {
            await push(ref(db, 'actualites'), {
              titre: p.titre,
              contenu: p.contenu,
              categorie: 'Bonne Pratique',
              auteur: p.auteur,
              auteurRole: p.auteurRole,
              timestamp: p.timestamp || Date.now()
            })
            count++
          }
        }
      }

      setSyncMsg(count > 0 ? `✅ ${count} élément(s) synchronisé(s) avec succès !` : '✅ Tout est déjà synchronisé !')
    } catch (err) {
      setSyncMsg('❌ Erreur lors de la synchronisation')
    }

    setSyncing(false)
  }

  const getRoleColor = (role) => {
    if (role === 'directrice') return 'bg-amber-100 text-amber-600'
    if (role === 'superviseure') return 'bg-purple-100 text-purple-600'
    return 'bg-blue-100 text-blue-600'
  }

  const getRoleLabel = (role) => {
    if (role === 'directrice') return 'Directrice'
    if (role === 'superviseure') return 'Superviseure'
    return 'Agent'
  }

  const getAvatarColor = (role) => {
    if (role === 'directrice') return 'bg-amber-500'
    if (role === 'superviseure') return 'bg-purple-600'
    return 'bg-blue-600'
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase()
  }

  if (userData?.role !== 'directrice') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-3">🔒</div>
          <p className="font-medium">Accès réservé à la Directrice</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">⚙️ Administration</h1>
          <p className="text-gray-400 text-sm mt-1">Gestion des membres de l'équipe</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition"
        >
          + Ajouter un membre
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-2">Nouveau membre</h2>
          <p className="text-xs text-gray-400 mb-4">
            ⚠️ Créez d'abord le compte dans <strong>Firebase Authentication</strong> puis copiez l'UID ici
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">UID Firebase</label>
              <input
                type="text"
                value={newMembre.uid}
                onChange={(e) => setNewMembre({ ...newMembre, uid: e.target.value })}
                placeholder="Copiez l'UID depuis Firebase Authentication"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={newMembre.nom}
                  onChange={(e) => setNewMembre({ ...newMembre, nom: e.target.value })}
                  placeholder="Ex: Sara BENALI"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={newMembre.email}
                  onChange={(e) => setNewMembre({ ...newMembre, email: e.target.value })}
                  placeholder="sara@myopla.ma"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Rôle</label>
              <select
                value={newMembre.role}
                onChange={(e) => setNewMembre({ ...newMembre, role: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="agent">Agent</option>
                <option value="superviseure">Superviseure</option>
                <option value="directrice">Directrice</option>
              </select>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">
                Ajouter
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm transition">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-amber-500">{membres.filter(m => m.role === 'directrice').length}</div>
          <div className="text-xs text-gray-400 mt-1">Directrice(s)</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-purple-600">{membres.filter(m => m.role === 'superviseure').length}</div>
          <div className="text-xs text-gray-400 mt-1">Superviseure(s)</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-blue-600">{membres.filter(m => m.role === 'agent').length}</div>
          <div className="text-xs text-gray-400 mt-1">Agent(s)</div>
        </div>
      </div>

      {/* Liste membres */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Membre</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rôle</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {membres.map(membre => (
              <tr key={membre.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(membre.role)}`}>
                      {getInitials(membre.nom)}
                    </div>
                    <span className="font-medium text-gray-800">{membre.nom}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">{membre.email}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getRoleColor(membre.role)}`}>
                    {getRoleLabel(membre.role)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => handleDelete(membre.id)} className="text-gray-300 hover:text-red-500 transition">
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Synchronisation Actualités */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-2">🔄 Synchronisation Actualités</h2>
        <p className="text-gray-400 text-sm mb-4">
          Copier toutes les consignes et bonnes pratiques existantes dans la page Actualités
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition disabled:opacity-50"
        >
          {syncing ? '⏳ Synchronisation...' : '🔄 Synchroniser maintenant'}
        </button>
        {syncMsg && (
          <p className="text-sm mt-3 font-medium text-green-600">{syncMsg}</p>
        )}
      </div>

    </div>
  )
}