import { useState, useEffect } from 'react'
import { ref, onValue, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function NotreEntreprise() {
  const { userData } = useAuth()
  const [presentation, setPresentation] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    nom: '', description: '', mission: '', vision: '', valeurs: ''
  })

  const canEdit = userData?.role === 'directrice'

  useEffect(() => {
    const presRef = ref(db, 'entreprise')
    const unsubscribe = onValue(presRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setPresentation(data)
        setForm(data)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    await set(ref(db, 'entreprise'), form)
    setEditing(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏢 Notre Entreprise</h1>
          <p className="text-gray-400 text-sm mt-1">Présentation de CallConnect</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing(!editing)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition"
          >
            {editing ? 'Annuler' : '✏️ Modifier'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nom de l'entreprise</label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex: CallConnect"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description de l'entreprise..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Notre Mission</label>
              <textarea
                value={form.mission}
                onChange={(e) => setForm({ ...form, mission: e.target.value })}
                placeholder="La mission de l'entreprise..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Notre Vision</label>
              <textarea
                value={form.vision}
                onChange={(e) => setForm({ ...form, vision: e.target.value })}
                placeholder="La vision de l'entreprise..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nos Valeurs</label>
              <textarea
                value={form.valeurs}
                onChange={(e) => setForm({ ...form, valeurs: e.target.value })}
                placeholder="Les valeurs de l'entreprise..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">
                Enregistrer
              </button>
              <button type="button" onClick={() => setEditing(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm transition">
                Annuler
              </button>
            </div>
          </form>
        </div>
      ) : presentation ? (
        <div className="space-y-6">
          {/* Header entreprise */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center text-3xl">
                📞
              </div>
              <div>
                <h2 className="text-2xl font-bold">{presentation.nom || 'CallConnect'}</h2>
                <p className="text-blue-100 text-sm mt-1">Centre d'appels professionnel</p>
              </div>
            </div>
            {presentation.description && (
              <p className="text-blue-100 leading-relaxed">{presentation.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {presentation.mission && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-bold text-gray-800 mb-2">Notre Mission</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{presentation.mission}</p>
              </div>
            )}
            {presentation.vision && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-3xl mb-3">🔭</div>
                <h3 className="font-bold text-gray-800 mb-2">Notre Vision</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{presentation.vision}</p>
              </div>
            )}
            {presentation.valeurs && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-3xl mb-3">💎</div>
                <h3 className="font-bold text-gray-800 mb-2">Nos Valeurs</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{presentation.valeurs}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 mt-20">
          <div className="text-5xl mb-3">🏢</div>
          <p>Aucune présentation pour l'instant</p>
          {canEdit && <p className="text-sm mt-1">Cliquez sur "Modifier" pour ajouter une présentation</p>}
        </div>
      )}
    </div>
  )
}