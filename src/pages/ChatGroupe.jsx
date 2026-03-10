import { useState, useEffect, useRef } from 'react'
import { ref, push, onValue, serverTimestamp, update, remove } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../hooks/useNotification'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '✅']
const isSupOrEquivalent = (role) => ['superviseure', 'vigie', 'formateur'].includes(role)

function Avatar({ nom, role, photoURL, size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-10 h-10 text-sm', xl: 'w-24 h-24 text-2xl' }
  const colors = { directrice: 'bg-amber-500', vigie: 'bg-indigo-500', formateur: 'bg-teal-500', superviseure: 'bg-purple-600' }
  const color = colors[role] || 'bg-blue-600'
  const sizeClass = sizes[size] || sizes.md
  const initials = nom ? nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
  if (photoURL) return <img src={photoURL} alt={nom} className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`} />
  return <div className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${color} ${className}`}>{initials}</div>
}

function MessageText({ texte }) {
  if (!texte) return null
  const parts = texte.split(/(@\w[\w\s]*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <span key={i} className="bg-blue-200 text-blue-800 rounded px-1 font-semibold">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

export default function ChatGroupe() {
  const { user, userData } = useAuth()
  const { sendNotification, requestPermission } = useNotification()

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [membres, setMembres] = useState([])
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [menuId, setMenuId] = useState(null)
  const [emojiPickerId, setEmojiPickerId] = useState(null)
  const [notification, setNotification] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [reactionPopup, setReactionPopup] = useState(null)
  const [vuPopupId, setVuPopupId] = useState(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState([])
  const [cursorPos, setCursorPos] = useState(0)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)
  const isInitialLoad = useRef(true)
  const lastMessageCount = useRef(0)
  const notifTimeout = useRef(null)
  const markedAsRead = useRef(new Set())

  useEffect(() => { if (user?.uid) requestPermission(user.uid) }, [user?.uid])

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val()
      if (data) setMembres(Object.entries(data).map(([id, u]) => ({ id, ...u })))
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!userData?.nom || !user?.uid) return
    isInitialLoad.current = true
    lastMessageCount.current = 0
    markedAsRead.current = new Set()

    const unsubscribe = onValue(ref(db, 'chat_groupe'), (snapshot) => {
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
              const o = ctx.createOscillator(); const g = ctx.createGain()
              o.connect(g); g.connect(ctx.destination)
              o.frequency.value = 880
              g.gain.setValueAtTime(0.1, ctx.currentTime)
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
              o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3)
            } catch (e) {}
            sendNotification({ title: `💬 ${newMsg.nom}`, body: newMsg.imageUrl ? '📷 Photo' : newMsg.texte, icon: '/favicon.ico', tag: `chat-groupe-${newMsg.nom}` })
            if (newMsg.texte?.includes(`@${userData?.nom}`)) {
              sendNotification({ title: `🔔 ${newMsg.nom} vous a mentionné`, body: newMsg.texte, icon: '/favicon.ico', tag: `mention-${newMsg.nom}` })
            }
          }
        }

        messagesList.forEach(msg => {
          if (msg.nom !== userData?.nom && !msg.vus?.[user.uid] && !markedAsRead.current.has(msg.id)) {
            markedAsRead.current.add(msg.id)
            update(ref(db, `chat_groupe/${msg.id}/vus`), { [user.uid]: { nom: userData?.nom, role: userData?.role, vu_le: Date.now() } })
          }
        })

        if (isInitialLoad.current) isInitialLoad.current = false
        lastMessageCount.current = messagesList.length
        setMessages(messagesList)
      } else {
        setMessages([])
        isInitialLoad.current = false
      }
    })
    return () => { unsubscribe(); if (notifTimeout.current) clearTimeout(notifTimeout.current) }
  }, [userData?.nom, user?.uid])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const handleClick = () => { setMenuId(null); setEmojiPickerId(null); setShowMentions(false); setReactionPopup(null); setVuPopupId(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) { const file = item.getAsFile(); if (file) setSelectedImage(file) }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const handleScroll = (e) => {
    const el = e.target
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 50) setUnreadCount(0)
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    const pos = e.target.selectionStart
    setNewMessage(val); setCursorPos(pos)
    const textBeforeCursor = val.slice(0, pos)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    if (atIndex !== -1) {
      const query = textBeforeCursor.slice(atIndex + 1)
      if (!query.includes(' ') || query.length === 0) {
        const filtered = membres.filter(m => m.id !== user.uid && m.nom.toLowerCase().includes(query.toLowerCase()))
        setMentionSuggestions(filtered); setShowMentions(filtered.length > 0); return
      }
    }
    setShowMentions(false)
  }

  const insertMention = (membre) => {
    const textBeforeCursor = newMessage.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')
    const before = newMessage.slice(0, atIndex)
    const after = newMessage.slice(cursorPos)
    setNewMessage(`${before}@${membre.nom} ${after}`)
    setShowMentions(false)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const newPos = before.length + membre.nom.length + 2
        inputRef.current.setSelectionRange(newPos, newPos)
      }
    }, 0)
  }

  const toggleReaction = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId)
    const alreadyReacted = msg?.reactions?.[emoji]?.[userData?.nom]
    await update(ref(db, `chat_groupe/${msgId}/reactions/${emoji}`), { [userData?.nom]: alreadyReacted ? null : true })
    setEmojiPickerId(null)
  }

  const getReactionSummary = (reactions) => {
    if (!reactions) return []
    return Object.entries(reactions)
      .map(([emoji, users]) => ({ emoji, count: Object.values(users).filter(Boolean).length, hasReacted: !!users[userData?.nom], names: Object.entries(users).filter(([, v]) => v).map(([name]) => name) }))
      .filter(r => r.count > 0)
  }

  const getVuList = (msg) => {
    if (!msg.vus) return []
    return Object.values(msg.vus).filter(v => v.nom !== msg.nom).sort((a, b) => a.vu_le - b.vu_le)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    await push(ref(db, 'chat_groupe'), {
      texte: newMessage.trim(), nom: userData?.nom, role: userData?.role,
      titre: userData?.titre || null,
      timestamp: serverTimestamp(),
      vus: { [user.uid]: { nom: userData?.nom, role: userData?.role, vu_le: Date.now() } }
    })
    setNewMessage(''); setUnreadCount(0)
  }

  const sendImage = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fileRef = storageRef(storage, `chat_groupe/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      await push(ref(db, 'chat_groupe'), {
        texte: '', imageUrl: url, nom: userData?.nom, role: userData?.role,
        titre: userData?.titre || null,
        timestamp: serverTimestamp(),
        vus: { [user.uid]: { nom: userData?.nom, role: userData?.role, vu_le: Date.now() } }
      })
    } catch (err) { console.error('Erreur upload:', err) }
    setUploading(false); setSelectedImage(null); fileInputRef.current.value = ''
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
    await remove(ref(db, `chat_groupe/${msgId}`)); setMenuId(null)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp); const now = new Date()
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    if (date.toDateString() === now.toDateString()) return time
    if (date.toDateString() === yesterday.toDateString()) return `Hier ${time}`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ` ${time}`
  }

  const formatVuTime = (ts) => ts ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''

  const shouldShowDateSeparator = (msg, index) => {
    if (index === 0) return true
    const prev = messages[index - 1]
    if (!prev.timestamp || !msg.timestamp) return false
    return new Date(prev.timestamp).toDateString() !== new Date(msg.timestamp).toDateString()
  }

  const getDateLabel = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp); const now = new Date()
    if (date.toDateString() === now.toDateString()) return "Aujourd'hui"
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return 'Hier'
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const getRoleColor = (role) => ({ directrice: 'text-amber-600', superviseure: 'text-purple-600', vigie: 'text-indigo-600', formateur: 'text-teal-600' }[role] || 'text-blue-600')
  const getRoleLabel = (role, titre) => {
    if (titre) return titre
    return { directrice: 'Directrice', superviseure: 'Superviseure', vigie: 'Vigie', formateur: 'Formateur' }[role] || 'Agent'
  }
  const isMyMessage = (msg) => msg.nom === userData?.nom
  const mentionsMe = (msg) => msg.texte?.includes(`@${userData?.nom}`)

  return (
    <div className="flex flex-col h-screen relative">
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes emojiPop { from { opacity: 0; transform: scale(0.7) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes mentionPop { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reactionPop { from { opacity: 0; transform: scale(0.9) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes vuPop { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">💬 Chat Groupe</h1>
          <p className="text-sm text-gray-400">Discussion générale — tapez @ pour mentionner quelqu'un</p>
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
          <Avatar nom={notification.nom} role={notification.role} photoURL={membres.find(m => m.nom === notification.nom)?.photoURL} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-800 truncate">{notification.nom}</span>
              <span className={`text-xs font-medium ${getRoleColor(notification.role)}`}>{getRoleLabel(notification.role, notification.titre)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5 truncate">{notification.imageUrl ? '📷 Photo' : notification.texte}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setNotification(null) }} className="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0">×</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50" onScroll={handleScroll}>
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20"><div className="text-4xl mb-2">💬</div><p>Aucun message pour l'instant</p></div>
        )}

        {messages.map((msg, index) => {
          const vuList = getVuList(msg)
          const vuCount = vuList.length
          const msgPhotoURL = membres.find(m => m.nom === msg.nom)?.photoURL

          return (
            <div key={msg.id}>
              {shouldShowDateSeparator(msg, index) && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1 rounded-full">{getDateLabel(msg.timestamp)}</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
              )}

              <div className={`flex items-start gap-3 ${isMyMessage(msg) ? 'flex-row-reverse' : ''}`}>
                <Avatar nom={msg.nom} role={msg.role} photoURL={msgPhotoURL} size="md" />
                <div className={`max-w-xs lg:max-w-md ${isMyMessage(msg) ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMyMessage(msg) ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm font-semibold text-gray-700">{msg.nom}</span>
                    <span className={`text-xs font-medium ${getRoleColor(msg.role)}`}>{getRoleLabel(msg.role, msg.titre)}</span>
                  </div>

                  <div className={`relative group flex items-end gap-1 ${isMyMessage(msg) ? 'flex-row-reverse' : ''}`}>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === msg.id ? null : msg.id); setMenuId(null); setReactionPopup(null) }}
                        className="opacity-0 group-hover:opacity-100 transition text-lg mb-1 hover:scale-110">😊</button>
                      {emojiPickerId === msg.id && (
                        <div className={`absolute bottom-8 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex gap-1 ${isMyMessage(msg) ? 'right-0' : 'left-0'}`}
                          style={{ animation: 'emojiPop 0.15s ease' }} onClick={(e) => e.stopPropagation()}>
                          {EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                              className={`text-xl hover:scale-125 transition rounded-xl p-1 ${msg.reactions?.[emoji]?.[userData?.nom] ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col">
                      {editingId === msg.id ? (
                        <div className="flex gap-2 items-center">
                          <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(msg.id)}
                            className="px-3 py-2 border border-blue-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" autoFocus />
                          <button onClick={() => saveEdit(msg.id)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-medium">✓</button>
                          <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs font-medium">✕</button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            {msg.imageUrl ? (
                              <div className={`rounded-2xl overflow-hidden shadow-sm ${isMyMessage(msg) ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                                <img src={msg.imageUrl} alt="image" className="max-w-xs max-h-64 object-cover cursor-pointer hover:opacity-90 transition" onClick={() => window.open(msg.imageUrl, '_blank')} />
                              </div>
                            ) : (
                              <div className={`px-4 py-2 rounded-2xl text-sm ${
                                mentionsMe(msg) ? 'bg-yellow-50 border border-yellow-300 text-gray-800 rounded-tl-sm'
                                : isMyMessage(msg) ? 'bg-blue-600 text-white rounded-tr-sm'
                                : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'
                              }`}>
                                <MessageText texte={msg.texte} />
                                {msg.modifié && <span className="text-xs opacity-60 ml-1">(modifié)</span>}
                              </div>
                            )}
                            {isMyMessage(msg) && !msg.imageUrl && (
                              <div className="absolute -left-8 top-1">
                                <button onClick={(e) => { e.stopPropagation(); setMenuId(menuId === msg.id ? null : msg.id); setEmojiPickerId(null) }}
                                  className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-600 text-sm">⋮</button>
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
                              {getReactionSummary(msg.reactions).map(({ emoji, count, hasReacted, names }) => (
                                <div key={emoji} className="relative">
                                  <button onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji) }}
                                    onMouseEnter={(e) => { e.stopPropagation(); setReactionPopup({ msgId: msg.id, emoji, names }) }}
                                    onMouseLeave={() => setReactionPopup(null)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition ${hasReacted ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <span>{emoji}</span><span className="font-medium">{count}</span>
                                  </button>
                                  {reactionPopup?.msgId === msg.id && reactionPopup?.emoji === emoji && (
                                    <div className={`absolute bottom-full mb-2 z-50 bg-gray-900 text-white rounded-xl shadow-xl px-3 py-2 min-w-max ${isMyMessage(msg) ? 'right-0' : 'left-0'}`}
                                      style={{ animation: 'reactionPop 0.15s ease' }}>
                                      <div className="text-base mb-1 text-center">{emoji}</div>
                                      <div className="space-y-0.5">
                                        {names.map((name, i) => <div key={i} className="text-xs text-gray-200 whitespace-nowrap">{name === userData?.nom ? '✦ Vous' : name}</div>)}
                                      </div>
                                      <div className={`absolute top-full ${isMyMessage(msg) ? 'right-3' : 'left-3'} w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900`}></div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 mt-1 ${isMyMessage(msg) ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                    {vuCount > 0 && (
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setVuPopupId(vuPopupId === msg.id ? null : msg.id) }}
                          className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-blue-500 transition">
                          <span>👁</span><span className="font-medium">{vuCount}</span>
                        </button>
                        {vuPopupId === msg.id && (
                          <div className={`absolute bottom-full mb-2 z-50 bg-gray-900 text-white rounded-xl shadow-xl px-3 py-3 min-w-48 ${isMyMessage(msg) ? 'right-0' : 'left-0'}`}
                            style={{ animation: 'vuPop 0.15s ease' }} onClick={(e) => e.stopPropagation()}>
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vu par</div>
                            <div className="space-y-1.5">
                              {vuList.map((v, i) => (
                                <div key={i} className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Avatar nom={v.nom} role={v.role} photoURL={membres.find(m => m.nom === v.nom)?.photoURL} size="xs" />
                                    <span className="text-xs text-white whitespace-nowrap">{v.nom === userData?.nom ? 'Vous' : v.nom}</span>
                                  </div>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatVuTime(v.vu_le)}</span>
                                </div>
                              ))}
                            </div>
                            <div className={`absolute top-full ${isMyMessage(msg) ? 'right-3' : 'left-3'} w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900`}></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
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

      <div className="bg-white border-t border-gray-200 px-6 py-4 relative">
        {showMentions && (
          <div className="absolute bottom-full left-6 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-48"
            style={{ animation: 'mentionPop 0.15s ease' }} onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mentionner</span>
            </div>
            {mentionSuggestions.map(membre => (
              <button key={membre.id} onClick={() => insertMention(membre)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition text-left">
                <Avatar nom={membre.nom} role={membre.role} photoURL={membre.photoURL} size="sm" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">{membre.nom}</div>
                  <div className={`text-xs ${getRoleColor(membre.role)}`}>{getRoleLabel(membre.role, membre.titre)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <form onSubmit={sendMessage} className="flex gap-3">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current.click()} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-3 rounded-xl transition text-lg">📷</button>
          <input ref={inputRef} type="text" value={newMessage} onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowMentions(false)
              if (e.key === 'Enter' && showMentions && mentionSuggestions.length > 0) { e.preventDefault(); insertMention(mentionSuggestions[0]) }
            }}
            placeholder="Écrire un message... (@ pour mentionner, Ctrl+V pour image)"
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm" />
          <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition disabled:opacity-50">Envoyer</button>
        </form>
      </div>
    </div>
  )
}