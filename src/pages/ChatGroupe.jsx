import { useState, useEffect, useRef } from 'react'
import { ref, push, onValue, serverTimestamp, update, remove } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '✅']

const isSupOrEquivalent = (role) => ['superviseure', 'vigie', 'formateur'].includes(role)

export default function ChatGroupe() {
  const { userData } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [menuId, setMenuId] = useState(null)
  const [emojiPickerId, setEmojiPickerId] = useState(null)
  const [notification, setNotification] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const isInitialLoad = useRef(true)
  const lastMessageCount = useRef(0)
  const notifTimeout = useRef(null)

  useEffect(() => {
    if (!userData?.nom) return

    isInitialLoad.current = true
    lastMessageCount.current = 0

    const messagesRef = ref(db, 'chat_groupe')
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const messagesList = Object.entries(data).map(([id, msg]) => ({ id, ...msg }))
        messagesList.sort((a, b) => a.timestamp - b.timestamp)

        if (!isInitialLoad.current && messagesList.length > lastMessageCount.current) {
          const newMsg = messagesList[messagesList.length - 1]
          if (newMsg.nom !== userData?.nom) {
            setNotification(newMsg)
            setUnreadCount(prev => prev + 1)
            if (notifTimeout.current) clearTimeout(notifTimeout.current)
            notifTimeout.current = setTimeout(() => setNotification(null), 5000)
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)()
              const o = ctx.createOscillator()
              const g = ctx.createGain()
              o.connect(g); g.connect(ctx.destination)
              o.frequency.value = 880
              g.gain.setValueAtTime(0.1, ctx.currentTime)
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
              o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3)
            } catch (e) {}
            if (Notification.permission === 'granted') {
              new Notification(`💬 ${newMsg.nom}`, {
                body: newMsg.imageUrl ? '📷 Photo' : newMsg.texte,
                icon: '/favicon.ico'
              })
            }
          }
        }

        if (isInitialLoad.current) isInitialLoad.current = false
        lastMessageCount.current = messagesList.length
        setMessages(messagesList)
      } else {
        setMessages([])
        isInitialLoad.current = false
      }
    })

    return () => {
      unsubscribe()
      if (notifTimeout.current) clearTimeout(notifTimeout.current)
    }
  }, [userData?.nom])

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])

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
  }, [])

  const handleScroll = (e) => {
    const el = e.target
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 50) setUnreadCount(0)
  }

  const toggleReaction = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId)
    const alreadyReacted = msg?.reactions?.[emoji]?.[userData?.nom]
    if (alreadyReacted) {
      await update(ref(db, `chat_groupe/${msgId}/reactions/${emoji}`), { [userData?.nom]: null })
    } else {
      await update(ref(db, `chat_groupe/${msgId}/reactions/${emoji}`), { [userData?.nom]: true })
    }
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
    setUnreadCount(0)
  }

  const sendImage = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fileRef = storageRef(storage, `chat_groupe/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      await push(ref(db, 'chat_groupe'), {
        texte: '', imageUrl: url,
        nom: userData?.nom, role: userData?.role,
        timestamp: serverTimestamp()
      })
    } catch (err) { console.error('Erreur upload:', err) }
    setUploading(false)
    setSelectedImage(null)
    fileInputRef.current.value = ''
  }

  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) setSelectedImage(file) }

  const startEdit = (msg) => { setEditingId(msg.id); setEditText(msg.texte); setMenuId(null) }

  const saveEdit = async (msgId) => {
    if (!editText.trim()) return
    await update(ref(db, `chat_groupe/${msgId}`), { texte: editText.trim(), modifié: true })
    setEditingId(null); setEditText('')
  }

  const deleteMessage = async (msgId) => {
    if (!window.confirm('Supprimer ce message ?')) return
    await remove(ref(db, `chat_groupe/${msgId}`))
    setMenuId(null)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    if (date.toDateString() === now.toDateString()) return time
    if (date.toDateString() === yesterday.toDateString()) return `Hier ${time}`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ` ${time}`
  }

  const shouldShowDateSeparator = (msg, index) => {
    if (index === 0) return true
    const prev = messages[index - 1]
    if (!prev.timestamp || !msg.timestamp) return false
    return new Date(prev.timestamp).toDateString() !== new Date(msg.timestamp).toDateString()
  }

  const getDateLabel = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) return "Aujourd'hui"
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return 'Hier'
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const getRoleColor = (role) => {
    if (role === 'directrice') return 'text-amber-600'
    if (isSupOrEquivalent(role)) return 'text-purple-600'
    return 'text-blue-600'
  }

  const getAvatarColor = (role) => {
    if (role === 'directrice') return 'bg-amber-500'
    if (role === 'vigie') return 'bg-indigo-500'
    if (role === 'formateur') return 'bg-teal-500'
    if (isSupOrEquivalent(role)) return 'bg-purple-600'
    return 'bg-blue-600'
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase()
  }

  const isMyMessage = (msg) => msg.nom === userData?.nom

  return (
    <div className="flex flex-col h-screen relative">

      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">💬 Chat Groupe</h1>
          <p className="text-sm text-gray-400">Discussion générale de l'équipe</p>
        </div>
        {unreadCount > 0 && (
          <div onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnreadCount(0) }}
            className="cursor-pointer bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 hover:bg-blue-700 transition">
            <span>⬇️</span>
            <span>{unreadCount} nouveau{unreadCount > 1 ? 'x' : ''} message{unreadCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {notification && (
        <div className="absolute top-20 right-4 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-start gap-3 cursor-pointer hover:shadow-2xl transition"
          style={{ maxWidth: '300px', animation: 'slideIn 0.3s ease' }}
          onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setNotification(null); setUnreadCount(0) }}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(notification.role)}`}>
            {getInitials(notification.nom)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-800 truncate">{notification.nom}</span>
              <span className={`text-xs font-medium ${getRoleColor(notification.role)}`}>{notification.role}</span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5 truncate">{notification.imageUrl ? '📷 Photo' : notification.texte}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setNotification(null) }} className="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0">×</button>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes emojiPop { from { opacity: 0; transform: scale(0.7) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50" onScroll={handleScroll}>
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <div className="text-4xl mb-2">💬</div>
            <p>Aucun message pour l'instant</p>
            <p className="text-sm">Soyez le premier à écrire !</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id}>
            {shouldShowDateSeparator(msg, index) && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1 rounded-full">{getDateLabel(msg.timestamp)}</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            )}

            <div className={`flex items-start gap-3 ${isMyMessage(msg) ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(msg.role)}`}>
                {getInitials(msg.nom)}
              </div>
              <div className={`max-w-xs lg:max-w-md ${isMyMessage(msg) ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`flex items-center gap-2 mb-1 ${isMyMessage(msg) ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-semibold text-gray-700">{msg.nom}</span>
                  <span className={`text-xs font-medium ${getRoleColor(msg.role)}`}>{msg.role}</span>
                </div>

                <div className={`relative group flex items-end gap-1 ${isMyMessage(msg) ? 'flex-row-reverse' : ''}`}>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === msg.id ? null : msg.id); setMenuId(null) }}
                      className="opacity-0 group-hover:opacity-100 transition text-lg mb-1 hover:scale-110"
                      title="Réagir"
                    >😊</button>

                    {emojiPickerId === msg.id && (
                      <div
                        className={`absolute bottom-8 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex gap-1 ${isMyMessage(msg) ? 'right-0' : 'left-0'}`}
                        style={{ animation: 'emojiPop 0.15s ease' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {EMOJIS.map(emoji => {
                          const hasReacted = msg.reactions?.[emoji]?.[userData?.nom]
                          return (
                            <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                              className={`text-xl hover:scale-125 transition rounded-xl p-1 ${hasReacted ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                              title={emoji}
                            >{emoji}</button>
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
                            <div className={`rounded-2xl overflow-hidden shadow-sm ${isMyMessage(msg) ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                              <img src={msg.imageUrl} alt="image"
                                className="max-w-xs max-h-64 object-cover cursor-pointer hover:opacity-90 transition"
                                onClick={() => window.open(msg.imageUrl, '_blank')} />
                            </div>
                          ) : (
                            <div className={`px-4 py-2 rounded-2xl text-sm ${isMyMessage(msg) ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'}`}>
                              {msg.texte}
                              {msg.modifié && <span className="text-xs opacity-60 ml-1">(modifié)</span>}
                            </div>
                          )}

                          {isMyMessage(msg) && !msg.imageUrl && (
                            <div className="absolute -left-8 top-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setMenuId(menuId === msg.id ? null : msg.id); setEmojiPickerId(null) }}
                                className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-600 text-sm"
                              >⋮</button>
                              {menuId === msg.id && (
                                <div className="absolute right-0 bottom-6 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-28">
                                  <button onClick={() => startEdit(msg)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">✏️ Modifier</button>
                                  {(userData?.role === 'directrice' || isSupOrEquivalent(userData?.role)) && (
                                    <button onClick={() => deleteMessage(msg.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">🗑️ Supprimer</button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {msg.reactions && getReactionSummary(msg.reactions).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}>
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

                <div className={`text-xs text-gray-400 mt-1 ${isMyMessage(msg) ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.timestamp)}
                </div>
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
            <div className="text-sm font-medium text-gray-800">{selectedImage.name || 'Image collée'}</div>
            <div className="text-xs text-gray-400">{selectedImage.size ? (selectedImage.size / 1024).toFixed(1) + ' KB' : ''}</div>
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
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrire un message... (Ctrl+V pour coller une image)"
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm" />
          <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition disabled:opacity-50">
            Envoyer
          </button>
        </form>
      </div>
    </div>
  )
}