import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import amazighImg from '../assets/amazigh.png'

export default function Dashboard() {
  const { userData } = useAuth()
  const [stats, setStats] = useState({ membres: 0, consignes: 0, messages: 0, actualites: 0 })
  const [actualites, setActualites] = useState([])
  const [consignes, setConsignes] = useState([])
  const [meteo, setMeteo] = useState(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const usersRef = ref(db, 'users')
    onValue(usersRef, (snap) => {
      const data = snap.val()
      setStats(prev => ({ ...prev, membres: data ? Object.keys(data).length : 0 }))
    })

    const consignesRef = ref(db, 'consignes')
    onValue(consignesRef, (snap) => {
      const data = snap.val()
      const list = data ? Object.entries(data).map(([id, c]) => ({ id, ...c })) : []
      list.sort((a, b) => b.timestamp - a.timestamp)
      setConsignes(list.slice(0, 3))
      setStats(prev => ({ ...prev, consignes: list.length }))
    })

    const actuRef = ref(db, 'actualites')
    onValue(actuRef, (snap) => {
      const data = snap.val()
      const list = data ? Object.entries(data).map(([id, a]) => ({ id, ...a })) : []
      list.sort((a, b) => b.timestamp - a.timestamp)
      setActualites(list.slice(0, 3))
      setStats(prev => ({ ...prev, actualites: list.length }))
    })

    const chatRef = ref(db, 'chat_groupe')
    onValue(chatRef, (snap) => {
      const data = snap.val()
      setStats(prev => ({ ...prev, messages: data ? Object.keys(data).length : 0 }))
    })
  }, [])

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=35.2517&longitude=-3.9372&current_weather=true&timezone=Africa/Casablanca')
      .then(res => res.json())
      .then(data => setMeteo(data.current_weather))
      .catch(() => setMeteo(null))
  }, [])

  const getMeteoIcon = (code) => {
    if (code === 0) return '☀️'
    if (code <= 3) return '⛅'
    if (code <= 67) return '🌧️'
    if (code <= 77) return '❄️'
    return '🌩️'
  }

  const getCategorieStyle = (cat) => {
    switch (cat) {
      case 'Urgent': return 'bg-red-100 text-red-600 border border-red-200'
      case 'Info': return 'bg-blue-100 text-blue-600 border border-blue-200'
      case 'RH': return 'bg-green-100 text-green-600 border border-green-200'
      case 'Formation': return 'bg-purple-100 text-purple-600 border border-purple-200'
      case 'Consigne': return 'bg-orange-100 text-orange-600 border border-orange-200'
      case 'Bonne Pratique': return 'bg-yellow-100 text-yellow-600 border border-yellow-200'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getPrioriteStyle = (priorite) => {
    switch (priorite) {
      case 'Haute': return 'bg-red-100 text-red-600'
      case 'Normale': return 'bg-blue-100 text-blue-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const getRoleLabel = (role) => {
    if (role === 'directrice') return 'Directrice'
    if (role === 'superviseure') return 'Superviseure'
    return 'Agent'
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-20 w-64 h-64 bg-white opacity-5 rounded-full translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-blue-300 opacity-10 rounded-full"></div>

        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm border border-white border-opacity-20">
                  ⵣ
                </div>
                <div className="h-px w-12 bg-white bg-opacity-30"></div>
                <span className="text-white text-opacity-60 text-sm font-light tracking-widest uppercase">Al Hoceima • Rif</span>
              </div>

              <h1 className="text-3xl font-bold text-white mb-1">
                Bonjour, {userData?.nom?.split(' ')[0]} 👋
              </h1>
              <p className="text-blue-200 text-sm">{getRoleLabel(userData?.role)} — Myopla Al Hoceima</p>

              <div className="mt-4 flex items-center gap-4">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white border-opacity-10">
                  <div className="text-white text-xl font-bold tracking-wider">
                    {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-blue-200 text-xs">
                    {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Illustration Amazigh */}
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl border border-white border-opacity-20 overflow-hidden">
                <img
                  src={amazighImg}
                  alt="Amazigh"
                  className="h-32 w-24 object-cover"
                />
              </div>

              {/* Météo */}
              {meteo && (
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-5 text-center border border-white border-opacity-10">
                  <div className="text-5xl mb-2">{getMeteoIcon(meteo.weathercode)}</div>
                  <div className="text-white text-2xl font-bold">{Math.round(meteo.temperature)}°C</div>
                  <div className="text-blue-200 text-xs mt-1">Al Hoceima</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6 -mt-6 relative z-10">
          {[
            { label: 'Membres', value: stats.membres, icon: '👥', color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-200' },
            { label: 'Actualités', value: stats.actualites, icon: '📰', color: 'from-green-500 to-green-600', shadow: 'shadow-green-200' },
            { label: 'Consignes', value: stats.consignes, icon: '📋', color: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-200' },
            { label: 'Messages', value: stats.messages, icon: '💬', color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-200' },
          ].map((stat, i) => (
            <div key={i} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white shadow-lg ${stat.shadow}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg"></div>
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-white text-opacity-80 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Actualités */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">📰 Dernières Actualités</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{stats.actualites} total</span>
            </div>
            <div className="p-4">
              {actualites.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-3xl mb-2">📰</div>
                  <p className="text-sm">Aucune actualité</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {actualites.map(actu => (
                    <div key={actu.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition cursor-pointer group">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${getCategorieStyle(actu.categorie)}`}>
                        {actu.categorie}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition">{actu.titre}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Par {actu.auteur} • {formatDate(actu.timestamp)}</div>
                      </div>
                      <span className="text-gray-300 group-hover:text-blue-400 transition text-lg">›</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Consignes */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm">📋 Consignes Récentes</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{stats.consignes}</span>
            </div>
            <div className="p-4">
              {consignes.length === 0 ? (
                <div className="text-center text-gray-400 py-6">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-xs">Aucune consigne</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consignes.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPrioriteStyle(c.priorite)}`}>
                          {c.priorite}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-700 truncate">{c.titre}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDate(c.timestamp)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Amazigh decoration */}
            <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl text-blue-400">ⵣ</span>
                <div>
                  <div className="text-xs font-semibold text-blue-700">ⴰⵣⵓⵍ ⴼⵍⵍⴰⵡⵏ</div>
                  <div className="text-xs text-blue-400">Bonjour à tous — Rif</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}