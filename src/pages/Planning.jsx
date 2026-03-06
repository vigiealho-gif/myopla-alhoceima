import { useState, useEffect, useRef } from 'react'
import { ref, onValue, push, remove } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'

// ✅ Seuls vigie, superviseure, directrice peuvent publier et supprimer
const canManage = (role) => ['directrice', 'superviseure', 'vigie'].includes(role)

export default function Planning() {
  const { user, userData } = useAuth()
  const [plannings, setPlannings] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [titre, setTitre] = useState('')
  const [semaine, setSemaine] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return onValue(ref(db, 'plannings'), (snap) => {
      const data = snap.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, p]) => ({ id, ...p }))
          .sort((a, b) => b.timestamp - a.timestamp)
        setPlannings(list)
        if (!activeId && list.length > 0) setActiveId(list[0].id)
      } else {
        setPlannings([])
      }
    })
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !titre.trim()) return
    setUploading(true)
    try {
      const ext = selectedFile.name.split('.').pop()
      const sRef = storageRef(storage, `plannings/${Date.now()}_${selectedFile.name}`)
      await uploadBytes(sRef, selectedFile)
      const url = await getDownloadURL(sRef)

      const isImage = selectedFile.type.startsWith('image/')
      const isExcel = ['xlsx', 'xls'].includes(ext.toLowerCase())

      const newEntry = await push(ref(db, 'plannings'), {
        titre: titre.trim(),
        semaine: semaine.trim(),
        url,
        type: isImage ? 'image' : isExcel ? 'excel' : 'file',
        ext: ext.toLowerCase(),
        nom: selectedFile.name,
        auteur: userData?.nom,
        role: userData?.role,
        timestamp: Date.now()
      })

      setActiveId(newEntry.key)
      setShowUpload(false)
      setTitre('')
      setSemaine('')
      setSelectedFile(null)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      console.error('Erreur upload planning:', e)
    }
    setUploading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce planning ?')) return
    await remove(ref(db, `plannings/${id}`))
    if (activeId === id) setActiveId(plannings.find(p => p.id !== id)?.id || null)
  }

  const activePlanning = plannings.find(p => p.id === activeId)

  const getTypeIcon = (type) => {
    if (type === 'image') return '🖼️'
    if (type === 'excel') return '📊'
    return '📎'
  }
  const getTypeBadge = (type) => {
    if (type === 'image') return 'bg-blue-100 text-blue-600'
    if (type === 'excel') return 'bg-green-100 text-green-600'
    return 'bg-gray-100 text-gray-600'
  }
  const getTypeLabel = (type) => {
    if (type === 'image') return 'Image'
    if (type === 'excel') return 'Excel'
    return 'Fichier'
  }
  const formatDate = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📅 Planning</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {plannings.length} planning{plannings.length > 1 ? 's' : ''} disponible{plannings.length > 1 ? 's' : ''}
          </p>
        </div>
        {/* ✅ Bouton publier uniquement pour vigie/superviseure/directrice */}
        {canManage(userData?.role) && (
          <button onClick={() => setShowUpload(!showUpload)}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2">
            <span>+</span> Publier un planning
          </button>
        )}
      </div>

      {/* Formulaire upload — visible uniquement pour les managers */}
      {showUpload && canManage(userData?.role) && (
        <div className="mx-8 mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4">📤 Nouveau planning</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Titre *</label>
              <input type="text" value={titre} onChange={e => setTitre(e.target.value)}
                placeholder="Ex: Planning Semaine 11"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Période</label>
              <input type="text" value={semaine} onChange={e => setSemaine(e.target.value)}
                placeholder="Ex: 09 – 15 Mars 2025"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-green-50'}`}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange}
              accept="image/*,.xlsx,.xls,.pdf" className="hidden" />
            {selectedFile ? (
              <div>
                {preview ? (
                  <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-xl mb-3 object-contain" />
                ) : (
                  <div className="text-5xl mb-3">
                    {selectedFile.name.endsWith('xlsx') || selectedFile.name.endsWith('xls') ? '📊' : '📎'}
                  </div>
                )}
                <p className="font-medium text-gray-800 text-sm">{selectedFile.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                <button onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                  setPreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }} className="mt-2 text-xs text-red-400 hover:text-red-600">Changer le fichier</button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📂</div>
                <p className="text-sm font-medium text-gray-600">Cliquez pour choisir un fichier</p>
                <p className="text-xs text-gray-400 mt-1">Image (PNG, JPG) · Excel (XLSX) · PDF</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleUpload}
              disabled={!selectedFile || !titre.trim() || uploading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-medium text-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {uploading ? <><span className="animate-spin">⏳</span> Publication...</> : '📤 Publier le planning'}
            </button>
            <button onClick={() => { setShowUpload(false); setSelectedFile(null); setPreview(null); setTitre(''); setSemaine('') }}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition">
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6 px-8 py-6">

        {/* Sidebar liste */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plannings publiés</span>
            </div>
            {plannings.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm">Aucun planning</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {plannings.map(p => (
                  <button key={p.id} onClick={() => setActiveId(p.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${activeId === p.id ? 'bg-green-50 border-l-4 border-green-500' : ''}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">{getTypeIcon(p.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold truncate ${activeId === p.id ? 'text-green-700' : 'text-gray-800'}`}>{p.titre}</div>
                        {p.semaine && <div className="text-xs text-gray-500 truncate mt-0.5">📅 {p.semaine}</div>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeBadge(p.type)}`}>{getTypeLabel(p.type)}</span>
                          <span className="text-xs text-gray-400">{formatDate(p.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zone principale */}
        <div className="flex-1">
          {!activePlanning ? (
            <div className="bg-white rounded-2xl shadow-sm flex items-center justify-center h-96 text-gray-400">
              <div className="text-center">
                <div className="text-5xl mb-3">📅</div>
                <p className="font-medium">Sélectionnez un planning</p>
                <p className="text-sm mt-1">pour le consulter</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{getTypeIcon(activePlanning.type)}</span>
                    <h2 className="text-lg font-bold text-gray-800">{activePlanning.titre}</h2>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getTypeBadge(activePlanning.type)}`}>
                      {getTypeLabel(activePlanning.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
                    {activePlanning.semaine && <><span>📅 {activePlanning.semaine}</span><span>·</span></>}
                    <span>Publié par <strong className="text-gray-600">{activePlanning.auteur}</strong></span>
                    <span>·</span>
                    <span>{formatDate(activePlanning.timestamp)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* ✅ Télécharger : accessible à TOUS */}
                  <a href={activePlanning.url} target="_blank" rel="noopener noreferrer"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2">
                    ⬇️ Télécharger
                  </a>
                  {/* ✅ Supprimer : uniquement vigie/superviseure/directrice */}
                  {canManage(userData?.role) && (
                    <button onClick={() => handleDelete(activePlanning.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition">
                      🗑️ Supprimer
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {activePlanning.type === 'image' ? (
                  <div className="text-center">
                    <img src={activePlanning.url} alt={activePlanning.titre}
                      className="max-w-full mx-auto rounded-xl cursor-zoom-in shadow-sm hover:shadow-md transition"
                      onClick={() => setLightbox(activePlanning.url)} />
                    <p className="text-xs text-gray-400 mt-3">Cliquez sur l'image pour l'agrandir</p>
                  </div>
                ) : activePlanning.type === 'excel' ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{activePlanning.nom}</h3>
                    <p className="text-gray-400 text-sm mb-6">Fichier Excel — cliquez pour télécharger et ouvrir</p>
                    <a href={activePlanning.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-medium transition">
                      ⬇️ Ouvrir le fichier Excel
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📎</div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{activePlanning.nom}</h3>
                    <a href={activePlanning.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition">
                      ⬇️ Télécharger le fichier
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition">×</button>
          <img src={lightbox} alt="planning"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}