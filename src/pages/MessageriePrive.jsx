import { useState, useEffect, useRef } from 'react'
import { ref, push, onValue, serverTimestamp, set, update, remove } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '✅']

export default function MessageriePrive() {
  const { user, userData } = useAuth()
  const [membres, setMembres] = useState([])
  const [selectedMembre, setSelectedMembre] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [lastMessages, setLastMessages] = useState({})
  const [unreadCounts, setUnreadCounts] = useState({})
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [menuId, setMenuId] = useState(null)
  const [emojiPickerId, setEmojiPickerId] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const getConvId = (uid1, uid2) => [uid1, uid2].sort().join('_')

  useEffect(() => {
    const usersRef = ref(db, 'users')
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, u]) => ({ id, ...u })).filter(u => u.id !== user.uid)
        setMembres(list)
      }
    })
    return () => unsubscribe()
  }, [user.uid])

  useEffect(() => {
    if (membres.length === 0) return
    const unsubscribes = membres.map(membre => {
      const convId = getConvId(user.uid, membre.id)
      const convRef = ref(db, `messages_prives/${convId}`)
      return onValue(convRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const list = Object.entries(data).map(([id, msg]) => ({ id, ...msg }))
          list.sort((a, b) => a.timestamp - b.timestamp)
          setLastMessages(prev => ({ ...prev, [membre.id]: list[list.length - 1] }))
          const unread = list.filter(msg => msg.senderId !== user.uid && !msg.readBy?.[user.uid]).length
          setUnreadCounts(prev => ({ ...prev, [membre.id]: unread }))
        } else {
          setLastMessages(prev => ({ ...prev, [membre.id]: null }))
          setUnreadCounts(prev => ({ ...prev, [membre.id]: 0 }))
        }
      })
    })
    return () => unsubscribes.forEach(u => u())
  }, [membres, user.uid])

  useEffect(() => {
    if (!selectedMembre) return
    const convId = getConvId(user.uid, selectedMembre.id)
    const messagesRef = ref(db, `messages_prives/${convId}`)
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, msg]) => ({ id, ...msg }))
        list.sort((a, b) => a.timestamp - b.timestamp)
        setMessages(list)
        list.forEach(msg => {
          if (msg.senderId !== user.uid && !msg.readBy?.[user.uid]) {
            set(ref(db, `messages_prives/${convId}/${msg.id}/readBy/${user.uid}`), true)
          }
        })
      } else { setMessages([]) }
    })
    return () => unsubscribe()
  }, [selectedMembre, user.uid])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleClick = () => { setMenuId(null); setEmojiPickerId(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    const handlePaste = (e) => {
      if (!selectedMembre) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) setSelectedImage(file)
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [selectedMembre])

  // ── Réaction emoji ──
  const toggleReaction = async (msgId, emoji) => {
    if (!selectedMembre) return
    const convId = getConvId(user.uid, selectedMembre.id)
    const msg = messages.find(m => m.id === msgId)
    const alreadyReacted = msg?.reactions?.[emoji]?.[userData?.nom]
    await update(ref(db, `messages_prives/${convId}/${msgId}/reactions/${emoji}`), {
      [userData?.nom]: alreadyReacted ? null : true
    })
    setEmojiPickerId(null)
  }

  const getReactionSummary = (reactions) => {
    if (!reactions) return []
    return Object.entries(reactions)
      .map(([emoji, users]) => ({
        emoji,
        count: Object.values(users).filter(Boolean).length,
        hasReacted: !!users[userData?.nom]
      }))
      .filter(r => r.count > 0)
  }

  const canSendMessage = (targetRole) => {
    if (userData?.role === 'directrice') return true
    if (userData?.role === 'superviseure') return true
    if (userData?.role === 'agent' && targetRole !== 'agent') return true
    return false
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedMembre) return
    const convId = getConvId(user.uid, selectedMembre.id)
    await push(ref(db, `messages_prives/${convId}`), {
      texte: newMessage.trim(),
      senderId: user.uid, senderNom: userData?.nom, senderRole: userData?.role,
      timestamp: serverTimestamp(), readBy: { [user.uid]: true }
    })
    setNewMessage('')
  }

  const sendImage = async (file) => {
    if (!file || !selectedMembre) return
    setUploading(true)
    try {
      const fileRef = storageRef(storage, `messages_prives/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      const convId = getConvId(user.uid, selectedMembre.id)
      await push(ref(db, `messages_prives/${convId}`), {
        texte: '', imageUrl: url,
        senderId: user.uid, senderNom: userData?.nom, senderRole: userData?.role,
        timestamp: serverTimestamp(), readBy: { [user.uid]: true }
      })
    } catch (err) { console.error('Erreur upload:', err) }
    setUploading(false)
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) setSelectedImage(file) }
  const startEdit = (msg) => { setEditingId(msg.id); setEditText(msg.texte); setMenuId(null) }

  const saveEdit = async (msgId) => {
    if (!editText.trim() || !selectedMembre) return
    const convId = getConvId(user.uid, selectedMembre.id)
    await update(ref(db, `messages_prives/${convId}/${msgId}`), { texte: editText.trim(), modifié: true })
    setEditingId(null); setEditText('')
  }

  const deleteMessage = async (msgId) => {
    if (!window.confirm('Supprimer ce message ?')) return
    const convId = getConvId(user.uid, selectedMembre.id)
    await remove(ref(db, `messages_prives/${convId}/${msgId}`))
    setMenuId(null)
  }

  const getAvatarColor = (role) => {
    if (role === 'directrice') return 'bg-amber-500'
    if (role === 'superviseure') return 'bg-purple-600'
    return 'bg-blue-600'
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
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    if (now - date < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const membresFiltrés = membres
    .filter(m => {
      if (userData?.role === 'directrice') return true
      if (userData?.role === 'superviseure') return true
      if (userData?.role === 'agent') return m.role !== 'agent'
      return false
    })
    .sort((a, b) => (lastMessages[b.id]?.timestamp || 0) - (lastMessages[a.id]?.timestamp || 0))

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex h-screen">

      {/* Liste membres */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">✉️ Messagerie Privée</h2>
              <p className="text-xs text-gray-400 mt-1">Conversations privées</p>
            </div>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{totalUnread}</span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {membresFiltrés.length === 0 && <div className="text-center text-gray-400 p-6 text-sm">Aucun membre disponible</div>}
          {membresFiltrés.map(membre => (
            <button key={membre.id} onClick={() => setSelectedMembre(membre)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-100 ${selectedMembre?.id === membre.id ? 'bg-blue-50' : ''}`}>
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(membre.role)}`}>
                  {getInitials(membre.nom)}
                </div>
                {unreadCounts[membre.id] > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCounts[membre.id]}
                  </span>
                )}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-semibold ${unreadCounts[membre.id] > 0 ? 'text-gray-900' : 'text-gray-800'}`}>{membre.nom}</div>
                  {lastMessages[membre.id] && <div className="text-xs text-gray-400 flex-shrink-0">{formatTime(lastMessages[membre.id]?.timestamp)}</div>}
                </div>
                <div className={`text-xs truncate ${unreadCounts[membre.id] > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                  {lastMessages[membre.id]
                    ? lastMessages[membre.id].imageUrl
                      ? (lastMessages[membre.id].senderId === user.uid ? 'Vous: ' : '') + '📷 Photo'
                      : (lastMessages[membre.id].senderId === user.uid ? 'Vous: ' : '') + lastMessages[membre.id].texte
                    : getRoleLabel(membre.role)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Zone conversation */}
      <div className="flex-1 flex flex-col">
        {!selectedMembre ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">✉️</div>
              <p className="font-medium">Sélectionnez un membre</p>
              <p className="text-sm mt-1">pour démarrer une conversation</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(selectedMembre.role)}`}>
                {getInitials(selectedMembre.nom)}
              </div>
              <div>
                <div className="font-bold text-gray-800">{selectedMembre.nom}</div>
                <div className={`text-xs font-medium ${getRoleColor(selectedMembre.role)}`}>{getRoleLabel(selectedMembre.role)}</div>
              </div>
            </div>

            <style>{`
              @keyframes emojiPop { from { opacity: 0; transform: scale(0.7) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            `}</style>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-20">
                  <p>Aucun message</p><p className="text-sm">Démarrez la conversation !</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === user.uid ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(msg.senderRole)}`}>
                    {getInitials(msg.senderNom)}
                  </div>
                  <div className={`max-w-xs lg:max-w-md flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>

                    {/* Message + bouton emoji */}
                    <div className={`relative group flex items-end gap-1 ${msg.senderId === user.uid ? 'flex-row-reverse' : ''}`}>

                      {/* Bouton 😊 */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === msg.id ? null : msg.id); setMenuId(null) }}
                          className="opacity-0 group-hover:opacity-100 transition text-lg mb-1 hover:scale-110"
                          title="Réagir"
                        >😊</button>

                        {emojiPickerId === msg.id && (
                          <div
                            className={`absolute bottom-8 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex gap-1 ${msg.senderId === user.uid ? 'right-0' : 'left-0'}`}
                            style={{ animation: 'emojiPop 0.15s ease' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {EMOJIS.map(emoji => {
                              const hasReacted = msg.reactions?.[emoji]?.[userData?.nom]
                              return (
                                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                  className={`text-xl hover:scale-125 transition rounded-xl p-1 ${hasReacted ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                                  {emoji}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col">
                        {editingId === msg.id ? (
                          <div className="flex gap-2 items-center">
                            <input type="text" value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(msg.id)}
                              className="px-3 py-2 border border-blue-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                              autoFocus />
                            <button onClick={() => saveEdit(msg.id)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-medium">✓</button>
                            <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs font-medium">✕</button>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              {msg.imageUrl ? (
                                <div className={`rounded-2xl overflow-hidden shadow-sm ${msg.senderId === user.uid ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                                  <img src={msg.imageUrl} alt="image"
                                    className="max-w-xs max-h-64 object-cover cursor-pointer hover:opacity-90 transition"
                                    onClick={() => window.open(msg.imageUrl, '_blank')} />
                                </div>
                              ) : (
                                <div className={`px-4 py-2 rounded-2xl text-sm ${msg.senderId === user.uid ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'}`}>
                                  {msg.texte}
                                  {msg.modifié && <span className="text-xs opacity-60 ml-1">(modifié)</span>}
                                </div>
                              )}

                              {msg.senderId === user.uid && !msg.imageUrl && (
                                <div className="absolute -left-8 top-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setMenuId(menuId === msg.id ? null : msg.id); setEmojiPickerId(null) }}
                                    className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-600 text-sm"
                                  >⋮</button>
                                  {menuId === msg.id && (
                                    <div className="absolute right-0 bottom-6 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-28">
                                      <button onClick={() => startEdit(msg)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">✏️ Modifier</button>
                                      {(userData?.role === 'directrice' || userData?.role === 'superviseure') && (
                                        <button onClick={() => deleteMessage(msg.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">🗑️ Supprimer</button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* ── Réactions affichées ── */}
                            {msg.reactions && getReactionSummary(msg.reactions).length > 0 && (
                              <div className={`flex flex-wrap gap-1 mt-1 ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                                {getReactionSummary(msg.reactions).map(({ emoji, count, hasReacted }) => (
                                  <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition ${hasReacted ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <span>{emoji}</span>
                                    <span className="font-medium">{count}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 mt-1">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {selectedImage && (
              <div className="bg-blue-50 border-t border-blue-200 px-6 py-3 flex items-center gap-3">
                <img src={URL.createObjectURL(selectedImage)} alt="preview" className="h-16 w-16 object-cover rounded-lg" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{selectedImage.name || 'Image collée'}</div>
                  <div className="text-xs text-gray-400">{selectedImage.size ? (selectedImage.size / 1024).toFixed(1) + ' KB' : ''}</div>
                </div>
                <button onClick={() => { setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="text-gray-400 hover:text-red-500 transition text-xl">×</button>
                <button onClick={() => sendImage(selectedImage)} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50">
                  {uploading ? '⏳ Envoi...' : '📤 Envoyer'}
                </button>
              </div>
            )}

            <div className="bg-white border-t border-gray-200 px-6 py-4">
              {canSendMessage(selectedMembre.role) ? (
                <form onSubmit={sendMessage} className="flex gap-3">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current.click()} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-3 rounded-xl transition text-lg" title="Envoyer une image">📷</button>
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Écrire à ${selectedMembre.nom}... (Ctrl+V pour coller une image)`}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm" />
                  <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition disabled:opacity-50">Envoyer</button>
                </form>
              ) : (
                <div className="text-center text-gray-400 text-sm py-2">🚫 Vous ne pouvez pas envoyer de messages privés à cet agent</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}