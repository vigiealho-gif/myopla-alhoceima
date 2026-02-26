import { useState, useEffect, useRef } from 'react'
import { ref, push, onValue, serverTimestamp } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function ChatGroupe() {
  const { userData } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const messagesRef = ref(db, 'chat_groupe')
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const messagesList = Object.entries(data).map(([id, msg]) => ({
          id,
          ...msg
        }))
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

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">💬 Chat Groupe</h1>
        <p className="text-sm text-gray-400">Discussion générale de l'équipe</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                <span className={`text-xs font-medium ${getRoleColor(msg.role)}`}>
                  {msg.role}
                </span>
              </div>
              <div className={`px-4 py-2 rounded-2xl text-sm ${
                isMyMessage(msg)
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'
              }`}>
                {msg.texte}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrire un message..."
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
      </div>

    </div>
  )
}