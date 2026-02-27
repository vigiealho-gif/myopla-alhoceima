import { useState, useEffect, useRef } from 'react'
import { ref, push, onValue, serverTimestamp, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function MessageriePrive() {
  const { user, userData } = useAuth()
  const [membres, setMembres] = useState([])
  const [selectedMembre, setSelectedMembre] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [lastMessages, setLastMessages] = useState({})
  const [unreadCounts, setUnreadCounts] = useState({})
  const messagesEndRef = useRef(null)

  const getConvId = (uid1, uid2) => [uid1, uid2].sort().join('_')

  // Charger tous les membres
  useEffect(() => {
    const usersRef = ref(db, 'users')
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data)
          .map(([id, u]) => ({ id, ...u }))
          .filter(u => u.id !== user.uid)
        setMembres(list)
      }
    })
    return () => unsubscribe()
  }, [user.uid])

  // Charger le dernier message et les non lus pour chaque membre
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
          const last = list[list.length - 1]

          setLastMessages(prev => ({ ...prev, [membre.id]: last }))

          // Compter les messages non lus (reçus, pas envoyés par moi)
          const unread = list.filter(msg =>
            msg.senderId !== user.uid && !msg.readBy?.[user.uid]
          ).length
          setUnreadCounts(prev => ({ ...prev, [membre.id]: unread }))
        } else {
          setLastMessages(prev => ({ ...prev, [membre.id]: null }))
          setUnreadCounts(prev => ({ ...prev, [membre.id]: 0 }))
        }
      })
    })

    return () => unsubscribes.forEach(u => u())
  }, [membres, user.uid])

  // Charger les messages de la conversation sélectionnée
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

        // Marquer les messages comme lus
        list.forEach(msg => {
          if (msg.senderId !== user.uid && !msg.readBy?.[user.uid]) {
            set(ref(db, `messages_prives/${convId}/${msg.id}/readBy/${user.uid}`), true)
          }
        })
      } else {
        setMessages([])
      }
    })
    return () => unsubscribe()
  }, [selectedMembre, user.uid])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      senderId: user.uid,
      senderNom: userData?.nom,
      senderRole: userData?.role,
      timestamp: serverTimestamp(),
      readBy: { [user.uid]: true }
    })
    setNewMessage('')
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
    const diff = now - date
    if (diff < 86400000) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const membresFiltrés = membres
    .filter(m => {
      if (userData?.role === 'directrice') return true
      if (userData?.role === 'superviseure') return true
      if (userData?.role === 'agent') return m.role !== 'agent'
      return false
    })
    .sort((a, b) => {
      const lastA = lastMessages[a.id]?.timestamp || 0
      const lastB = lastMessages[b.id]?.timestamp || 0
      return lastB - lastA
    })

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex h-screen">

      {/* Liste des membres */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">✉️ Messagerie Privée</h2>
              <p className="text-xs text-gray-400 mt-1">Conversations privées</p>
            </div>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {membresFiltrés.length === 0 && (
            <div className="text-center text-gray-400 p-6 text-sm">
              Aucun membre disponible
            </div>
          )}
          {membresFiltrés.map(membre => (
            <button
              key={membre.id}
              onClick={() => setSelectedMembre(membre)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-100
                ${selectedMembre?.id === membre.id ? 'bg-blue-50' : ''}`}
            >
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
                  <div className={`text-sm font-semibold ${unreadCounts[membre.id] > 0 ? 'text-gray-900' : 'text-gray-800'}`}>
                    {membre.nom}
                  </div>
                  {lastMessages[membre.id] && (
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {formatTime(lastMessages[membre.id]?.timestamp)}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className={`text-xs truncate ${unreadCounts[membre.id] > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                    {lastMessages[membre.id]
                      ? (lastMessages[membre.id].senderId === user.uid ? 'Vous: ' : '') + lastMessages[membre.id].texte
                      : getRoleLabel(membre.role)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Zone de conversation */}
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
                <div className={`text-xs font-medium ${getRoleColor(selectedMembre.role)}`}>
                  {getRoleLabel(selectedMembre.role)}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-20">
                  <p>Aucun message</p>
                  <p className="text-sm">Démarrez la conversation !</p>
                </div>
              )}
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${msg.senderId === user.uid ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(msg.senderRole)}`}>
                    {getInitials(msg.senderNom)}
                  </div>
                  <div className={`max-w-xs lg:max-w-md flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2 rounded-2xl text-sm ${
                      msg.senderId === user.uid
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'
                    }`}>
                      {msg.texte}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 px-6 py-4">
              {canSendMessage(selectedMembre.role) ? (
                <form onSubmit={sendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Écrire à ${selectedMembre.nom}...`}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition disabled:opacity-50"
                  >
                    Envoyer
                  </button>
                </form>
              ) : (
                <div className="text-center text-gray-400 text-sm py-2">
                  🚫 Vous ne pouvez pas envoyer de messages privés à cet agent
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}