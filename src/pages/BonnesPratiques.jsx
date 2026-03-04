import { useState, useEffect } from 'react'
import { ref, push, onValue, remove, update } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { isSupOrEquivalent, getRoleLabel } from '../utils/roles'

export default function BonnesPratiques() {
  const { user, userData } = useAuth()
  const [pratiques, setPratiques] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newPratique, setNewPratique] = useState({ titre: '', contenu: '', categorie: 'Relation Client' })
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({ titre: '', contenu: '', categorie: 'Relation Client' })
  const [totalAgents, setTotalAgents] = useState(0)
  const [showReadersId, setShowReadersId] = useState(null)

  const canPublish = userData?.role === 'directrice' || isSupOrEquivalent(userData?.role)
  const isManager = userData?.role === 'directrice' || isSupOrEquivalent(userData?.role)

  // Compter le total des agents
  useEffect(() => {
    const usersRef = ref(db, 'users')
    onValue(usersRef, (snap) => {
      const data = snap.val()
      if (data) {
        const agents = Object.values(data).filter(u => u.role === 'agent')
        setTotalAgents(agents.length)
      }
    })
  }, [])

  useEffect(() => {
    const pratiquesRef = ref(db, 'bonnes_pratiques')
    const unsubscribe = onValue(pratiquesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, p]) => ({ id, ...p }))
        list.sort((a, b) => b.timestamp - a.timestamp)
        setPratiques(list)
      } else {
        setPratiques([])
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newPratique.titre.trim() || !newPratique.contenu.trim()) return
    const now = Date.now()
    await push(ref(db, 'bonnes_pratiques'), {
      titre: newPratique.titre.trim(),
      contenu: newPratique.contenu.trim(),
      categorie: newPratique.categorie,
      auteur: userData?.nom,
      auteurRole: userData?.role,
      timestamp: now
    })
    await push(ref(db, 'actualites'), {
      titre: newPratique.titre.trim(),
      contenu: newPratique.contenu.trim(),
      categorie: 'Bonne Pratique',
      auteur: userData?.nom,
      auteurRole: userData?.role,
      timestamp: now
    })
    setNewPratique({ titre: '', contenu: '', categorie: 'Relation Client' })
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette bonne pratique ?')) return
    await remove(ref(db, `bonnes_pratiques/${id}`))
  }

  const startEdit = (pratique) => {
    setEditingId(pratique.id)
    setEditData({ titre: pratique.titre, contenu: pratique.contenu, categorie: pratique.categorie })
  }

  const saveEdit = async (id) => {
    if (!editData.titre.trim() || !editData.contenu.trim()) return
    await update(ref(db, `bonnes_pratiques/${id}`), {
      titre: editData.titre.trim(),
      contenu: editData.contenu.trim(),
      categorie: editData.categorie,
      modifié: true
    })
    setEditingId(null)
  }

  // ✅ Marquer comme lu
  const handleMarkAsRead = async (pratiqueId) => {
    const now = Date.now()
    await update(ref(db, `bonnes_pratiques/${pratiqueId}/lecteurs`), {
      [user.uid]: {
        nom: userData?.nom,
        role: userData?.role,
        lu_le: now
      }
    })
  }

  const hasRead = (pratique) => pratique.lecteurs?.[user?.uid] !== undefined

  const getReadCount = (pratique) => {
    if (!pratique.lecteurs) return 0
    return Object.keys(pratique.lecteurs).length
  }

  const getReaders = (pratique) => {
    if (!pratique.lecteurs) return []
    return Object.values(pratique.lecteurs).sort((a, b) => a.lu_le - b.lu_le)
  }

  const getCategorieStyle = (cat) => {
    switch (cat) {
      case 'Relation Client': return 'bg-blue-100 text-blue-600'
      case 'Vente': return 'bg-green-100 text-green-600'
      case 'Communication': return 'bg-purple-100 text-purple-600'
      case 'Organisation': return 'bg-orange-100 text-orange-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">⭐ Bonnes Pratiques</h1>
          <p className="text-gray-400 text-sm mt-1">Astuces et conseils pour mieux travailler</p>
        </div>
        {canPublish && (
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition">
            + Ajouter une bonne pratique
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Nouvelle bonne pratique</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Catégorie</label>
              <select value={newPratique.categorie} onChange={(e) => setNewPratique({ ...newPratique, categorie: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                <option>Relation Client</option>
                <option>Vente</option>
                <option>Communication</option>
                <option>Organisation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Titre</label>
              <input type="text" value={newPratique.titre} onChange={(e) => setNewPratique({ ...newPratique, titre: e.target.value })} placeholder="Titre de la bonne pratique" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Contenu</label>
              <textarea value={newPratique.contenu} onChange={(e) => setNewPratique({ ...newPratique, contenu: e.target.value })} placeholder="Décrivez la bonne pratique... (Entrée pour aller à la ligne)" rows={6} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-y" required />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">Publier</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm transition">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {pratiques.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
          <div className="text-5xl mb-3">⭐</div>
          <p>Aucune bonne pratique pour l'instant</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pratiques.map(pratique => (
            <div key={pratique.id} className="bg-white rounded-2xl p-6 shadow-sm flex flex-col">
              {editingId === pratique.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Catégorie</label>
                    <select value={editData.categorie} onChange={(e) => setEditData({ ...editData, categorie: e.target.value })} className="w-full px-4 py-2.5 border border-blue-300 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                      <option>Relation Client</option>
                      <option>Vente</option>
                      <option>Communication</option>
                      <option>Organisation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Titre</label>
                    <input type="text" value={editData.titre} onChange={(e) => setEditData({ ...editData, titre: e.target.value })} className="w-full px-4 py-2.5 border border-blue-300 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Contenu</label>
                    <textarea value={editData.contenu} onChange={(e) => setEditData({ ...editData, contenu: e.target.value })} rows={6} className="w-full px-4 py-2.5 border border-blue-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-y" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => saveEdit(pratique.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">✓ Sauvegarder</button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm transition">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getCategorieStyle(pratique.categorie)}`}>
                      {pratique.categorie}
                    </span>
                    {canPublish && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(pratique)} className="text-gray-300 hover:text-blue-500 transition text-lg">✏️</button>
                        <button onClick={() => handleDelete(pratique.id)} className="text-gray-300 hover:text-red-500 transition text-lg">🗑️</button>
                      </div>
                    )}
                  </div>

                  {/* Contenu */}
                  <h3 className="font-bold text-gray-800 mb-2">⭐ {pratique.titre}</h3>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap flex-1">{pratique.contenu}</p>
                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                    <span>Par {pratique.auteur}</span>
                    {pratique.auteurRole && (
                      <span className="italic">({getRoleLabel(pratique.auteurRole)})</span>
                    )}
                    <span>•</span>
                    <span>{formatDate(pratique.timestamp)}</span>
                    {pratique.modifié && <span className="italic">(modifié)</span>}
                  </div>

                  {/* ── Accusé de lecture ── */}
                  <div className="mt-4 pt-4 border-t border-gray-100">

                    {/* Bouton pour les agents */}
                    {!isManager && (
                      <button
                        onClick={() => !hasRead(pratique) && handleMarkAsRead(pratique.id)}
                        disabled={hasRead(pratique)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition w-full justify-center
                          ${hasRead(pratique)
                            ? 'bg-green-100 text-green-600 cursor-default'
                            : 'bg-gray-100 hover:bg-green-100 hover:text-green-600 text-gray-500 cursor-pointer'
                          }`}
                      >
                        {hasRead(pratique) ? (
                          <>✅ Lu et compris <span className="text-xs text-green-400">• {formatDateTime(pratique.lecteurs?.[user?.uid]?.lu_le)}</span></>
                        ) : (
                          <>☐ Marquer comme lu</>
                        )}
                      </button>
                    )}

                    {/* Barre de progression pour les managers */}
                    {isManager && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-500">Accusés de lecture</span>
                          <button
                            onClick={() => setShowReadersId(showReadersId === pratique.id ? null : pratique.id)}
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium transition"
                          >
                            {getReadCount(pratique)}/{totalAgents} agents
                            {showReadersId === pratique.id ? ' ▲' : ' ▼'}
                          </button>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              getReadCount(pratique) === totalAgents && totalAgents > 0
                                ? 'bg-green-500'
                                : 'bg-yellow-400'
                            }`}
                            style={{ width: totalAgents > 0 ? `${(getReadCount(pratique) / totalAgents) * 100}%` : '0%' }}
                          />
                        </div>

                        {/* Liste des lecteurs */}
                        {showReadersId === pratique.id && (
                          <div className="mt-3 bg-gray-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Agents ayant lu
                            </p>
                            {getReaders(pratique).length === 0 ? (
                              <p className="text-sm text-gray-400 text-center py-2">Aucun agent n'a encore confirmé</p>
                            ) : (
                              <div className="space-y-1.5">
                                {getReaders(pratique).map((reader, i) => (
                                  <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-500">✅</span>
                                      <span className="text-sm font-medium text-gray-800">{reader.nom}</span>
                                      <span className="text-xs text-gray-400 italic">({getRoleLabel(reader.role)})</span>
                                    </div>
                                    <span className="text-xs text-gray-400">{formatDateTime(reader.lu_le)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}