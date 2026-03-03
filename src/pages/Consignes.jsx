import { useState, useEffect } from 'react'
import { ref, push, onValue, remove, update } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function Consignes() {
  const { userData } = useAuth()
  const [consignes, setConsignes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newConsigne, setNewConsigne] = useState({ titre: '', contenu: '', priorite: 'Normale' })
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({ titre: '', contenu: '', priorite: 'Normale' })

  const canPublish = userData?.role === 'directrice' || userData?.role === 'superviseure'

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
              <textarea value={newConsigne.contenu} onChange={(e) => setNewConsigne({ ...newConsigne, contenu: e.target.value })} placeholder="Détails de la consigne..." rows={4} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" required />
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
                    <textarea value={editData.contenu} onChange={(e) => setEditData({ ...editData, contenu: e.target.value })} rows={4} className="w-full px-4 py-2.5 border border-blue-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => saveEdit(consigne.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">✓ Sauvegarder</button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm transition">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${getPrioriteStyle(consigne.priorite)}`}>
                      {consigne.priorite}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{consigne.titre}</h3>
                      <p className="text-gray-600 text-sm mt-2">{consigne.contenu}</p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                        <span>Par {consigne.auteur}</span>
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}