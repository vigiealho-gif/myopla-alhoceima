import { useState, useEffect } from 'react'
import { ref, push, onValue, remove, update, get } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { isSupOrEquivalent, getRoleLabel } from '../utils/roles'

export default function Consignes() {
  const { user, userData } = useAuth()
  const [consignes, setConsignes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newConsigne, setNewConsigne] = useState({ titre: '', contenu: '', priorite: 'Normale' })
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({ titre: '', contenu: '', priorite: 'Normale' })
  const [totalAgents, setTotalAgents] = useState(0)
  // Pour afficher le détail des lecteurs d'une consigne
  const [showReadersId, setShowReadersId] = useState(null)

  const canPublish = userData?.role === 'directrice' || isSupOrEquivalent(userData?.role)
  const isManager = userData?.role === 'directrice' || isSupOrEquivalent(userData?.role)

  // Compter le total des agents (hors managers) pour la progression
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
    const consignesRef = ref(db, 'consignes')
    const unsubscribe = onValue(consignesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, c]) => ({ id, ...c }))
        list.sort((a, b) => b.timestamp - a.timestamp)
        setConsignes(list)
      } else {
        setConsignes([])
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newConsigne.titre.trim() || !newConsigne.contenu.trim()) return
    const now = Date.now()
    await push(ref(db, 'consignes'), {
      titre: newConsigne.titre.trim(),
      contenu: newConsigne.contenu.trim(),
      priorite: newConsigne.priorite,
      auteur: userData?.nom,
      auteurRole: userData?.role,
      timestamp: now
    })
    await push(ref(db, 'actualites'), {
      titre: newConsigne.titre.trim(),
      contenu: newConsigne.contenu.trim(),
      categorie: 'Consigne',
      auteur: userData?.nom,
      auteurRole: userData?.role,
      timestamp: now
    })
    setNewConsigne({ titre: '', contenu: '', priorite: 'Normale' })
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette consigne ?')) return
    await remove(ref(db, `consignes/${id}`))
  }

  const startEdit = (consigne) => {
    setEditingId(consigne.id)
    setEditData({ titre: consigne.titre, contenu: consigne.contenu, priorite: consigne.priorite })
  }

  const saveEdit = async (id) => {
    if (!editData.titre.trim() || !editData.contenu.trim()) return
    await update(ref(db, `consignes/${id}`), {
      titre: editData.titre.trim(),
      contenu: editData.contenu.trim(),
      priorite: editData.priorite,
      modifié: true
    })
    setEditingId(null)
  }

  // ✅ Marquer comme lu
  const handleMarkAsRead = async (consigneId) => {
    const now = Date.now()
    await update(ref(db, `consignes/${consigneId}/lecteurs`), {
      [user.uid]: {
        nom: userData?.nom,
        role: userData?.role,
        lu_le: now
      }
    })
  }

  // Vérifie si l'utilisateur courant a déjà lu
  const hasRead = (consigne) => {
    return consigne.lecteurs?.[user?.uid] !== undefined
  }

  // Nombre de lecteurs
  const getReadCount = (consigne) => {
    if (!consigne.lecteurs) return 0
    return Object.keys(consigne.lecteurs).length
  }

  // Liste des lecteurs
  const getReaders = (consigne) => {
    if (!consigne.lecteurs) return []
    return Object.values(consigne.lecteurs).sort((a, b) => a.lu_le - b.lu_le)
  }

  const getPrioriteStyle = (priorite) => {
    switch (priorite) {
      case 'Haute': return 'bg-red-100 text-red-600'
      case 'Normale': return 'bg-blue-100 text-blue-600'
      case 'Basse': return 'bg-gray-100 text-gray-600'
      default: return 'bg-blue-100 text-blue-600'
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
          <h1 className="text-2xl font-bold text-gray-800">📋 Consignes</h1>
          <p className="text-gray-400 text-sm mt-1">Instructions et directives de travail</p>
        </div>
        {canPublish && (
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition">
            + Ajouter une consigne
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Nouvelle consigne</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Priorité</label>
              <select value={newConsigne.priorite} onChange={(e) => setNewConsigne({ ...newConsigne, priorite: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                <option>Haute</option>
                <option>Normale</option>
                <option>Basse</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Titre</label>
              <input type="text" value={newConsigne.titre} onChange={(e) => setNewConsigne({ ...newConsigne, titre: e.target.value })} placeholder="Titre de la consigne" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Contenu</label>
              <textarea value={newConsigne.contenu} onChange={(e) => setNewConsigne({ ...newConsigne, contenu: e.target.value })} placeholder="Détails de la consigne... (Entrée pour aller à la ligne)" rows={6} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-y" required />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">Publier</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm transition">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {consignes.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
          <div className="text-5xl mb-3">📋</div>
          <p>Aucune consigne pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-4">
          {consignes.map(consigne => (
            <div key={consigne.id} className="bg-white rounded-2xl p-6 shadow-sm">
              {editingId === consigne.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Priorité</label>
                    <select value={editData.priorite} onChange={(e) => setEditData({ ...editData, priorite: e.target.value })} className="w-full px-4 py-2.5 border border-blue-300 rounded-xl text-sm focus:outline-none focus:border-blue-500">
                      <option>Haute</option>
                      <option>Normale</option>
                      <option>Basse</option>
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
                    <button onClick={() => saveEdit(consigne.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">✓ Sauvegarder</button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm transition">Annuler</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${getPrioriteStyle(consigne.priorite)}`}>
                        {consigne.priorite}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{consigne.titre}</h3>
                        <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{consigne.contenu}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                          <span>Par {consigne.auteur}</span>
                          {consigne.auteurRole && (
                            <span className="italic">({getRoleLabel(consigne.auteurRole)})</span>
                          )}
                          <span>•</span>
                          <span>{formatDate(consigne.timestamp)}</span>
                          {consigne.modifié && <span className="italic">(modifié)</span>}
                        </div>
                      </div>
                    </div>
                    {canPublish && (
                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => startEdit(consigne)} className="text-gray-300 hover:text-blue-500 transition text-lg">✏️</button>
                        <button onClick={() => handleDelete(consigne.id)} className="text-gray-300 hover:text-red-500 transition text-lg">🗑️</button>
                      </div>
                    )}
                  </div>

                  {/* ── Barre accusé de lecture ── */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between gap-4">

                      {/* Bouton Lu et compris — pour les agents */}
                      {!isManager && (
                        <button
                          onClick={() => !hasRead(consigne) && handleMarkAsRead(consigne.id)}
                          disabled={hasRead(consigne)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition
                            ${hasRead(consigne)
                              ? 'bg-green-100 text-green-600 cursor-default'
                              : 'bg-gray-100 hover:bg-green-100 hover:text-green-600 text-gray-500 cursor-pointer'
                            }`}
                        >
                          {hasRead(consigne) ? (
                            <>✅ Lu et compris <span className="text-xs text-green-400">• {formatDateTime(consigne.lecteurs?.[user?.uid]?.lu_le)}</span></>
                          ) : (
                            <>☐ Marquer comme lu</>
                          )}
                        </button>
                      )}

                      {/* Compteur + barre de progression — pour les managers */}
                      {isManager && (
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-500">
                              Accusés de lecture
                            </span>
                            <button
                              onClick={() => setShowReadersId(showReadersId === consigne.id ? null : consigne.id)}
                              className="text-xs text-blue-500 hover:text-blue-700 font-medium transition"
                            >
                              {getReadCount(consigne)}/{totalAgents} agents
                              {showReadersId === consigne.id ? ' ▲' : ' ▼'}
                            </button>
                          </div>
                          {/* Barre de progression */}
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                getReadCount(consigne) === totalAgents && totalAgents > 0
                                  ? 'bg-green-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: totalAgents > 0 ? `${(getReadCount(consigne) / totalAgents) * 100}%` : '0%' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Liste des lecteurs (managers seulement) ── */}
                    {isManager && showReadersId === consigne.id && (
                      <div className="mt-3 bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          Agents ayant lu cette consigne
                        </p>
                        {getReaders(consigne).length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-2">Aucun agent n'a encore confirmé la lecture</p>
                        ) : (
                          <div className="space-y-2">
                            {getReaders(consigne).map((reader, i) => (
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}