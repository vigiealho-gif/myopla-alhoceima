import { useState, useEffect } from 'react'
import { ref, push, onValue, serverTimestamp, remove } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { isSupOrEquivalent, getRoleLabel } from '../utils/roles'

export default function Actualites() {
  const { userData } = useAuth()
  const [actualites, setActualites] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newActu, setNewActu] = useState({ titre: '', contenu: '', categorie: 'Info' })

  const canPublish = userData?.role === 'directrice' || isSupOrEquivalent(userData?.role)

  useEffect(() => {
    const actuRef = ref(db, 'actualites')
    const unsubscribe = onValue(actuRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, a]) => ({ id, ...a }))
        list.sort((a, b) => b.timestamp - a.timestamp)
        setActualites(list)
      } else {
        setActualites([])
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newActu.titre.trim() || !newActu.contenu.trim()) return
    await push(ref(db, 'actualites'), {
      titre: newActu.titre.trim(),
      contenu: newActu.contenu.trim(),
      categorie: newActu.categorie,
      auteur: userData?.nom,
      auteurRole: userData?.role,
      timestamp: serverTimestamp()
    })
    setNewActu({ titre: '', contenu: '', categorie: 'Info' })
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    await remove(ref(db, `actualites/${id}`))
  }

  const getCategorieStyle = (cat) => {
    switch (cat) {
      case 'Urgent': return 'bg-red-100 text-red-600'
      case 'Info': return 'bg-blue-100 text-blue-600'
      case 'RH': return 'bg-green-100 text-green-600'
      case 'Formation': return 'bg-purple-100 text-purple-600'
      case 'Consigne': return 'bg-orange-100 text-orange-600'
      case 'Bonne Pratique': return 'bg-yellow-100 text-yellow-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📰 Actualités</h1>
          <p className="text-gray-400 text-sm mt-1">Annonces et informations de l'équipe</p>
        </div>
        {canPublish && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition"
          >
            + Publier une actualité
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Nouvelle actualité</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Catégorie</label>
              <select
                value={newActu.categorie}
                onChange={(e) => setNewActu({ ...newActu, categorie: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              >
                <option>Info</option>
                <option>Urgent</option>
                <option>RH</option>
                <option>Formation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Titre</label>
              <input
                type="text"
                value={newActu.titre}
                onChange={(e) => setNewActu({ ...newActu, titre: e.target.value })}
                placeholder="Titre de l'actualité"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Contenu</label>
              <textarea
                value={newActu.contenu}
                onChange={(e) => setNewActu({ ...newActu, contenu: e.target.value })}
                placeholder="Contenu de l'actualité... (Entrée pour aller à la ligne)"
                rows={6}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-y"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition"
              >
                Publier
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm transition"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des actualités */}
      {actualites.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
          <div className="text-5xl mb-3">📰</div>
          <p>Aucune actualité pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-4">
          {actualites.map(actu => (
            <div key={actu.id} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${getCategorieStyle(actu.categorie)}`}>
                    {actu.categorie}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{actu.titre}</h3>
                    {/* ✅ whitespace-pre-wrap respecte les sauts de ligne */}
                    <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{actu.contenu}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                      <span>Par {actu.auteur}</span>
                      {actu.auteurRole && (
                        <span className="italic">({getRoleLabel(actu.auteurRole)})</span>
                      )}
                      <span>•</span>
                      <span>{formatDate(actu.timestamp)}</span>
                    </div>
                  </div>
                </div>
                {canPublish && (
                  <button
                    onClick={() => handleDelete(actu.id)}
                    className="text-gray-300 hover:text-red-500 transition ml-4 text-lg"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}