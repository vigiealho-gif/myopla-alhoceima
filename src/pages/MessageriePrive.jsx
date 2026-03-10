import { useState, useEffect, useRef } from 'react'
import { ref, push, onValue, serverTimestamp, update, remove } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../hooks/useNotification'
import { usePresence } from '../hooks/usePresence'

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

export default function MessageriePrive({ initialMembre = null }) {
  const { user, userData } = useAuth()
  const { requestPermission, sendNotification } = useNotification()
  const { isOnline } = usePresence()

  const [membres, setMembres] = useState([])
  const [selectedMembre, setSelectedMembre] = useState(initialMembre)
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
  const [notification, setNotification] = useState(null)
  const [vuTooltipId, setVuTooltipId] = useState(null)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const notifTimeout = useRef(null)
  const lastMsgTimestamps = useRef({})

  const getConvId = (uid1, uid2) => [uid1, uid2].sort().join('_')

  useEffect(() => { if (user?.uid) requestPermission(user.uid) }, [user?.uid])
  useEffect(() => { if (initialMembre) setSelectedMembre(initialMembre) }, [initialMembre?.id])

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, u]) => ({ id, ...u })).filter(u => u.id !== user.uid)
        setMembres(list)
      }
    })
    return () => unsubscribe()
  }, [user.uid])

  useEffect(() => {
    if (membres.length === 0 || !user.uid) return
    const unsubscribes = membres.map(membre => {
      const convId = getConvId(user.uid, membre.id)
      let isFirst = true
      return onValue(ref(db, `messages_prives/${convId}`), (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const list = Object.entries(data).map(([id, msg]) => ({ id, ...msg }))
          list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
          const lastMsg = list[list.length - 1]
          if (!isFirst && lastMsg && lastMsg.senderId !== user.uid && lastMsg.timestamp) {
            const prevTimestamp = lastMsgTimestamps.current[membre.id] || 0
            if (lastMsg.timestamp > prevTimestamp) {
              setNotification({ ...lastMsg, senderNom: lastMsg.senderNom || membre.nom, senderRole: lastMsg.senderRole || membre.role, senderTitre: lastMsg.senderTitre || membre.titre, senderPhoto: membre.photoURL || null })
              if (notifTimeout.current) clearTimeout(notifTimeout.current)
              notifTimeout.current = setTimeout(() => setNotification(null), 5000)
              try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)()
                const o = ctx.createOscillator(); const g = ctx.createGain()
                o.connect(g); g.connect(ctx.destination)
                o.frequency.value = 660
                g.gain.setValueAtTime(0.1, ctx.currentTime)
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
                o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3)
              } catch (e) {}
              sendNotification({ title: `✉️ Message de ${lastMsg.senderNom || membre.nom}`, body: lastMsg.imageUrl ? (lastMsg.texte ? `📷 ${lastMsg.texte}` : '📷 Photo') : lastMsg.texte, icon: '/favicon.ico', tag: `msg-prive-${lastMsg.senderId}` })
            }
          }
          if (lastMsg?.timestamp) lastMsgTimestamps.current[membre.id] = lastMsg.timestamp
          isFirst = false
          setLastMessages(prev => ({ ...prev, [membre.id]: lastMsg }))
          const unread = list.filter(msg => msg.senderId !== user.uid && !msg.readBy?.[user.uid]).length
          setUnreadCounts(prev => ({ ...prev, [membre.id]: unread }))
        } else {
          isFirst = false
          lastMsgTimestamps.current[membre.id] = 0
          setLastMessages(prev => ({ ...prev, [membre.id]: null }))
          setUnreadCounts(prev => ({ ...prev, [membre.id]: 0 }))
        }
      })
    })
    return () => { unsubscribes.forEach(u => u()); if (notifTimeout.current) clearTimeout(notifTimeout.current) }
  }, [membres, user.uid])

  useEffect(() => {
    if (!selectedMembre) return
    const convId = getConvId(user.uid, selectedMembre.id)
    const unsubscribe = onValue(ref(db, `messages_prives/${convId}`), (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, msg]) => ({ id, ...msg }))
        list.sort((a, b) => a.timestamp - b.timestamp)
        setMessages(list)
        list.forEach(msg => {
          if (msg.senderId !== user.uid && !msg.readBy?.[user.uid]) {
            update(ref(db, `messages_prives/${convId}/${msg.id}/readBy`), {
              [user.uid]: { lu: true, lu_le: Date.now(), nom: userData?.nom }
            })
          }
        })
      } else { setMessages([]) }
    })
    return () => unsubscribe()
  }, [selectedMembre, user.uid])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const handleClick = () => { setMenuId(null); setEmojiPickerId(null); setVuTooltipId(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    const handlePaste = (e) => {
      if (!selectedMembre) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) { const file = item.getAsFile(); if (file) setSelectedImage(file) }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [selectedMembre])

  const isReadByOther = (msg) => {
    if (msg.senderId !== user.uid || !msg.readBy) return false
    return Object.entries(msg.readBy).some(([uid, val]) => uid !== user.uid && (val?.lu === true || val === true))
  }

  const getReadTime = (msg) => {
    if (!msg.readBy) return null
    const entry = Object.entries(msg.readBy).find(([uid, val]) => uid !== user.uid && (val?.lu === true || val === true))
    if (!entry) return null
    const val = entry[1]
    if (val?.lu_le) return new Date(val.lu_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return null
  }

  const toggleReaction = async (msgId, emoji) => {
    if (!selectedMembre) return
    const convId = getConvId(user.uid, selectedMembre.id)
    const msg = messages.find(m => m.id === msgId)
    const alreadyReacted = msg?.reactions?.[emoji]?.[userData?.nom]
    await update(ref(db, `messages_prives/${convId}/${msgId}/reactions/${emoji}`), { [userData?.nom]: alreadyReacted ? null : true })
    setEmojiPickerId(null)
  }

  const getReactionSummary = (reactions) => {
    if (!reactions) return []
    return Object.entries(reactions)
      .map(([emoji, users]) => ({ emoji, count: Object.values(users).filter(Boolean).length, hasReacted: !!users[userData?.nom] }))
      .filter(r => r.count > 0)
  }

  const canSendMessage = (targetRole) => {
    if (userData?.role === 'directrice') return true
    if (isSupOrEquivalent(userData?.role)) return true
    if (userData?.role === 'agent' && isSupOrEquivalent(targetRole)) return true
    return false
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    // Si une image est sélectionnée, envoyer image + texte ensemble
    if (selectedImage) {
      await sendImage(selectedImage)
      return
    }
    if (!newMessage.trim() || !selectedMembre) return
    const convId = getConvId(user.uid, selectedMembre.id)
    await push(ref(db, `messages_prives/${convId}`), {
      texte: newMessage.trim(),
      senderId: user.uid, senderNom: userData?.nom, senderRole: userData?.role,
      senderTitre: userData?.titre || null,
      timestamp: serverTimestamp(),
      readBy: { [user.uid]: { lu: true, lu_le: Date.now(), nom: userData?.nom } }
    })
    setNewMessage('')
  }

  const sendImage = async (file) => {
    if (!file || !selectedMembre) return
    setUploading(true)
    try {
      const fileRef = storageRef(storage, `messages_prives/${Date.now()}_${file.name || 'image'}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      const convId = getConvId(user.uid, selectedMembre.id)
      await push(ref(db, `messages_prives/${convId}`), {
        texte: newMessage.trim(), // ✅ texte envoyé avec la photo
        imageUrl: url,
        senderId: user.uid, senderNom: userData?.nom, senderRole: userData?.role,
        senderTitre: userData?.titre || null,
        timestamp: serverTimestamp(),
        readBy: { [user.uid]: { lu: true, lu_le: Date.now(), nom: userData?.nom } }
      })
      setNewMessage('') // ✅ vide le champ texte
    } catch (err) { console.error('Erreur upload:', err) }
    setUploading(false)
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) setSelectedImage(file) }
  const startEdit = (msg) => { setEditingId(msg.id); setEditText(msg.texte || ''); setMenuId(null) }

  const saveEdit = async (msgId) => {
    if (!selectedMembre) return
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

  const getRoleColor = (role) => ({ directrice: 'text-amber-600', vigie: 'text-indigo-600', formateur: 'text-teal-600', superviseure: 'text-purple-600' }[role] || 'text-blue-600')
  const getRoleLabel = (role, titre) => {
    if (titre) return titre
    return { directrice: 'Directrice', superviseure: 'Superviseure', vigie: 'Vigie', formateur: 'Formateur' }[role] || 'Agent'
  }
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp); const now = new Date()
    if (now - date < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const membresFiltrés = membres
    .filter(m => {
      if (userData?.role === 'directrice') return true
      if (isSupOrEquivalent(userData?.role)) return true
      if (userData?.role === 'agent') return isSupOrEquivalent(m.role)
      return false
    })
    .sort((a, b) => {
      const aTime = lastMessages[a.id]?.timestamp || 0
      const bTime = lastMessages[b.id]?.timestamp || 0
      if (bTime !== aTime) return bTime - aTime
      return (isOnline(b.id) ? 1 : 0) - (isOnline(a.id) ? 1 : 0)
    })

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  const onlineCount = membresFiltrés.filter(m => isOnline(m.id)).length
  const getPhotoById = (id) => membres.find(m => m.id === id)?.photoURL || null

  return (
    <div className="flex h-screen relative">
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes emojiPop { from { opacity: 0; transform: scale(0.7) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes vuPop { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Notification toast */}
      {notification && (
        <div className="absolute top-4 right-4 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-start gap-3 cursor-pointer hover:shadow-2xl transition"
          style={{ maxWidth: '300px', animation: 'slideIn 0.3s ease' }}
          onClick={() => { const membre = membres.find(m => m.id === notification.senderId); if (membre) setSelectedMembre(membre); setNotification(null) }}>
          <Avatar nom={notification.senderNom} role={notification.senderRole} photoURL={notification.senderPhoto} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-800 truncate">{notification.senderNom}</span>
              <span className={`text-xs font-medium ${getRoleColor(notification.senderRole)}`}>{getRoleLabel(notification.senderRole, notification.senderTitre)}</span>
            </div>
            <p className="text-xs text-gray-400 mb-0.5">Message privé ✉️</p>
            <p className="text-sm text-gray-600 truncate">{notification.imageUrl ? (notification.texte ? `📷 ${notification.texte}` : '📷 Photo') : notification.texte}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setNotification(null) }} className="text-gray-300 hover:text-gray-500 text-lg leading-none flex-shrink-0">×</button>
        </div>
      )}

      {/* Liste membres */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">✉️ Messagerie Privée</h2>
              <p className="text-xs text-gray-400 mt-1">
                Conversations privées
                {onlineCount > 0 && <span className="ml-2 text-green-500 font-medium">• {onlineCount} en ligne</span>}
              </p>
            </div>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{totalUnread}</span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {membresFiltrés.length === 0 && (
            <div className="text-center text-gray-400 p-6 text-sm">Aucun membre disponible</div>
          )}
          {membresFiltrés.map(membre => (
            <button key={membre.id} onClick={() => setSelectedMembre(membre)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-100 ${selectedMembre?.id === membre.id ? 'bg-blue-50' : ''}`}>
              <div className="relative flex-shrink-0">
                <Avatar nom={membre.nom} role={membre.role} photoURL={membre.photoURL} size="lg" />
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline(membre.id) ? 'bg-green-400' : 'bg-gray-300'}`} />
                {unreadCounts[membre.id] > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCounts[membre.id]}
                  </span>
                )}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-semibold truncate ${unreadCounts[membre.id] > 0 ? 'text-gray-900' : 'text-gray-800'}`}>{membre.nom}</div>
                  {lastMessages[membre.id] && (
                    <div className="text-xs text-gray-400 flex-shrink-0 ml-1">{formatTime(lastMessages[membre.id]?.timestamp)}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium flex-shrink-0 ${isOnline(membre.id) ? 'text-green-500' : 'text-gray-400'}`}>
                    {isOnline(membre.id) ? 'En ligne' : 'Hors ligne'}
                  </span>
                  {lastMessages[membre.id] && (
                    <>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className={`text-xs truncate ${unreadCounts[membre.id] > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                        {lastMessages[membre.id].imageUrl
                          ? (lastMessages[membre.id].senderId === user.uid ? 'Vous: ' : '') + (lastMessages[membre.id].texte ? `📷 ${lastMessages[membre.id].texte}` : '📷 Photo')
                          : (lastMessages[membre.id].senderId === user.uid ? 'Vous: ' : '') + lastMessages[membre.id].texte}
                      </span>
                    </>
                  )}
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
              <div className="relative">
                <Avatar nom={selectedMembre.nom} role={selectedMembre.role} photoURL={selectedMembre.photoURL} size="lg" />
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline(selectedMembre.id) ? 'bg-green-400' : 'bg-gray-300'}`} />
              </div>
              <div>
                <div className="font-bold text-gray-800">{selectedMembre.nom}</div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${getRoleColor(selectedMembre.role)}`}>{getRoleLabel(selectedMembre.role, selectedMembre.titre)}</span>
                  <span className="text-gray-300">·</span>
                  <span className={`text-xs font-medium ${isOnline(selectedMembre.id) ? 'text-green-500' : 'text-gray-400'}`}>
                    {isOnline(selectedMembre.id) ? '🟢 En ligne' : '⚫ Hors ligne'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-20">
                  <p>Aucun message</p><p className="text-sm">Démarrez la conversation !</p>
                </div>
              )}
              {messages.map(msg => {
                const read = isReadByOther(msg)
                const readTime = getReadTime(msg)
                const isMe = msg.senderId === user.uid
                const senderPhoto = isMe ? userData?.photoURL : getPhotoById(msg.senderId)
                return (
                  <div key={msg.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <Avatar nom={msg.senderNom} role={msg.senderRole} photoURL={senderPhoto} size="md" />
                    <div className={`max-w-xs lg:max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`relative group flex items-end gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setEmojiPickerId(emojiPickerId === msg.id ? null : msg.id); setMenuId(null) }}
                            className="opacity-0 group-hover:opacity-100 transition text-lg mb-1 hover:scale-110">😊</button>
                          {emojiPickerId === msg.id && (
                            <div className={`absolute bottom-8 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex gap-1 ${isMe ? 'right-0' : 'left-0'}`}
                              style={{ animation: 'emojiPop 0.15s ease' }} onClick={(e) => e.stopPropagation()}>
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
                              <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(msg.id)}
                                className="px-3 py-2 border border-blue-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" autoFocus />
                              <button onClick={() => saveEdit(msg.id)} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-medium">✓</button>
                              <button onClick={() => setEditingId(null)} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-xl text-xs font-medium">✕</button>
                            </div>
                          ) : (
                            <>
                              {/* ✅ Affichage photo + texte ensemble dans la même bulle */}
                              <div className="relative">
                                <div className={`rounded-2xl overflow-hidden shadow-sm ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${isMe ? 'bg-blue-600' : 'bg-white'}`}>
                                  {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="image"
                                      className="max-w-xs max-h-64 object-cover cursor-pointer hover:opacity-90 transition w-full"
                                      onClick={() => window.open(msg.imageUrl, '_blank')} />
                                  )}
                                  {msg.texte ? (
                                    <div className={`px-4 py-2 text-sm ${isMe ? 'text-white' : 'text-gray-800'} ${msg.imageUrl ? 'border-t ' + (isMe ? 'border-blue-500' : 'border-gray-100') : ''}`}>
                                      {msg.texte}
                                      {msg.modifié && <span className="text-xs opacity-60 ml-1">(modifié)</span>}
                                    </div>
                                  ) : msg.modifié && !msg.imageUrl ? (
                                    <div className={`px-4 py-2 text-sm ${isMe ? 'text-white' : 'text-gray-800'}`}>
                                      <span className="text-xs opacity-60">(modifié)</span>
                                    </div>
                                  ) : null}
                                </div>
                                {isMe && (
                                  <div className="absolute -left-8 top-1">
                                    <button onClick={(e) => { e.stopPropagation(); setMenuId(menuId === msg.id ? null : msg.id); setEmojiPickerId(null) }}
                                      className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-600 text-sm">⋮</button>
                                    {menuId === msg.id && (
                                      <div className="absolute right-0 bottom-6 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-28">
                                        {!msg.imageUrl && <button onClick={() => startEdit(msg)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">✏️ Modifier</button>}
                                        {(userData?.role === 'directrice' || isSupOrEquivalent(userData?.role)) && (
                                          <button onClick={() => deleteMessage(msg.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">🗑️ Supprimer</button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {msg.reactions && getReactionSummary(msg.reactions).length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  {getReactionSummary(msg.reactions).map(({ emoji, count, hasReacted }) => (
                                    <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition ${hasReacted ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                      <span>{emoji}</span><span className="font-medium">{count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                        {isMe && (
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setVuTooltipId(vuTooltipId === msg.id ? null : msg.id) }}
                              className={`text-xs font-bold transition select-none ${read ? 'text-blue-500' : 'text-gray-300'}`}>
                              {read ? '✓✓' : '✓'}
                            </button>
                            {vuTooltipId === msg.id && (
                              <div className="absolute bottom-full right-0 mb-1 z-50 bg-gray-900 text-white rounded-xl px-3 py-2 text-xs whitespace-nowrap"
                                style={{ animation: 'vuPop 0.15s ease' }}>
                                {read ? (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-blue-400">✓✓</span>
                                      <span>Vu par <strong>{selectedMembre?.nom}</strong></span>
                                    </div>
                                    {readTime && <div className="text-gray-400 mt-0.5">à {readTime}</div>}
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-gray-400">✓</span>
                                    <span>Envoyé, pas encore lu</span>
                                  </div>
                                )}
                                <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* ✅ Preview image avec champ texte intégré */}
            {selectedImage && (
              <div className="bg-blue-50 border-t border-blue-200 px-6 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <img src={URL.createObjectURL(selectedImage)} alt="preview" className="h-16 w-16 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{selectedImage.name || 'Image'}</div>
                    <div className="text-xs text-gray-400">{selectedImage.size ? (selectedImage.size / 1024).toFixed(1) + ' KB' : ''}</div>
                  </div>
                  <button onClick={() => { setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="text-gray-400 hover:text-red-500 transition text-xl flex-shrink-0">×</button>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ajouter un commentaire... (optionnel)"
                    onKeyDown={(e) => e.key === 'Enter' && sendImage(selectedImage)}
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                  <button onClick={() => sendImage(selectedImage)} disabled={uploading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 flex-shrink-0">
                    {uploading ? '⏳' : '📤 Envoyer'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white border-t border-gray-200 px-6 py-4">
              {canSendMessage(selectedMembre.role) ? (
                <form onSubmit={sendMessage} className="flex gap-3">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current.click()} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-3 rounded-xl transition text-lg">📷</button>
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Écrire à ${selectedMembre.nom}...`}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm" />
                  <button type="submit" disabled={!newMessage.trim() && !selectedImage}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition disabled:opacity-50">Envoyer</button>
                </form>
              ) : (
                <div className="text-center text-gray-400 text-sm py-2">🚫 Vous n'avez pas accès à cette conversation</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}