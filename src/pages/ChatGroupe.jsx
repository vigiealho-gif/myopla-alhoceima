import { useState, useEffect, useRef } from 'react'
import { ref, push, onValue, serverTimestamp, update, remove } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function ChatGroupe() {
  const { userData } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [menuId, setMenuId] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const messagesRef = ref(db, 'chat_groupe')
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const messagesList = Object.entries(data).map(([id, msg]) => ({ id, ...msg }))
        messagesList.sort((a, b) => a.timestamp - b.timestamp)
        setMessages(messagesList)
      } else {
        setMessages([])
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleClick = () => setMenuId(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    await push(ref(db, 'chat_groupe'), {
      texte: newMessage.trim(),
      nom: userData?.nom,
      role: userData?.role,
      timestamp: serverTimestamp()
    })
    setNewMessage('')
  }

  const sendImage = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fileRef = storageRef(storage, `chat_groupe/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      await push(ref(db, 'chat_groupe'), {
        texte: '',
        imageUrl: url,
        nom: userData?.nom,
        role: userData?.role,
        timestamp: serverTimestamp()
      })
    } catch (err) {
      console.error('Erreur upload:', err)
    }
    setUploading(false)
    setSelectedImage(null)
    fileInputRef.current.value = ''
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) setSelectedImage(file)
  }

  const startEdit = (msg) => {
    setEditingId(msg.id)
    setEditText(msg.texte)
    setMenuId(null)
  }

  const saveEdit = async (msgId) => {
    if (!editText.trim()) return
    await update(ref(db, `chat_groupe/${msgId}`), {
      texte: editText.trim(),
      modifié: true
    })
    setEditingId(null)
    setEditText('')
  }

  const deleteMessage = async (msgId) => {
    if (!window.confirm('Supprimer ce message ?')) return
    await remove(ref(db, `chat_groupe/${msgId}`))
    setMenuId(null)
  }

  const getRoleColor = (role) => {
    if (role === 'directrice') return 'text-amber-600'
    if (role === 'superviseure') return 'text-purple-600'
    return 'text-blue-600'
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

  const isMyMessage = (msg) => msg.nom === userData?.nom

  return (
    <div className="flex flex-col h-screen">

      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">💬 Chat Groupe</h1>
        <p className="text-sm text-gray-400">Discussion générale de l'équipe</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <div className="text-4xl mb-2">💬</div>
            <p>Aucun message pour l'instant</p>
            <p className="text-sm">Soyez le premier à écrire !</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${isMyMessage(msg) ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(msg.role)}`}>
              {getInitials(msg.nom)}
            </div>
            <div className={`max-w-xs lg:max-w-md ${isMyMessage(msg) ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`flex items-center gap-2 mb-1 ${isMyMessage(msg) ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm font-semibold text-gray-700">{msg.nom}</span>
                <span className={`text-xs font-medium ${getRoleColor(msg.role)}`}>{msg.role}</span>
              </div>

              <div className="relative group">
                {editingId === msg.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(msg.id)}
                      className="px-3 py-2 border border-blue-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(msg.id)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-medium">✓</button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs font-medium">✕</button>
                  </div>
                ) : (
                  <>
                    {msg.imageUrl ? (
                      <div className={`rounded-2xl overflow-hidden shadow-sm ${isMyMessage(msg) ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                        <img
                          src={msg.imageUrl}
                          alt="image"
                          className="max-w-xs max-h-64 object-cover cursor-pointer hover:opacity-90 transition"
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                      </div>
                    ) : (
                      <div className={`px-4 py-2 rounded-2xl text-sm ${
                        isMyMessage(msg)
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'
                      }`}>
                        {msg.texte}
                        {msg.modifié && <span className="text-xs opacity-60 ml-1">(modifié)</span>}
                      </div>
                    )}

                    {isMyMessage(msg) && !msg.imageUrl && (
                      <div className="absolute -left-8 top-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuId(menuId === msg.id ? null : msg.id) }}
                          className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-600 text-sm"
                        >⋮</button>
                        {menuId === msg.id && (
                          <div className="absolute right-0 bottom-6 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-28">
                            <button
                              onClick={() => startEdit(msg)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >✏️ Modifier</button>
                            {(userData?.role === 'directrice' || userData?.role === 'superviseure') && (
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                              >🗑️ Supprimer</button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {selectedImage && (
        <div className="bg-blue-50 border-t border-blue-200 px-6 py-3 flex items-center gap-3">
          <img src={URL.createObjectURL(selectedImage)} alt="preview" className="h-16 w-16 object-cover rounded-lg" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-800">{selectedImage.name}</div>
            <div className="text-xs text-gray-400">{(selectedImage.size / 1024).toFixed(1)} KB</div>
          </div>
          <button onClick={() => { setSelectedImage(null); fileInputRef.current.value = '' }} className="text-gray-400 hover:text-red-500 transition text-xl">×</button>
          <button onClick={() => sendImage(selectedImage)} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50">
            {uploading ? '⏳ Envoi...' : '📤 Envoyer'}
          </button>
        </div>
      )}

      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={sendMessage} className="flex gap-3">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current.click()} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-3 rounded-xl transition text-lg" title="Envoyer une image">📷</button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrire un message..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
          />
          <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition disabled:opacity-50">
            Envoyer
          </button>
        </form>
      </div>

    </div>
  )
}