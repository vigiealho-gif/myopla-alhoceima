import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { ref, onValue, update, set } from 'firebase/database'
import { db } from '../firebase'
import amazighImg from '../assets/amazigh.png'

function getTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatTs(ts) {
  if (!ts) return '--:--'
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDur(ms) {
  if (!ms || ms < 0) return '0min'
  const m = Math.floor(ms / 60000)
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h${min > 0 ? min + 'min' : ''}` : `${min}min`
}

// ── Modal lecture complète ──
function ModalLecture({ item, type, onClose }) {
  if (!item) return null

  const getCatStyle = (cat) => {
    const map = {
      'Urgent': 'bg-red-100 text-red-600 border-red-200',
      'Info': 'bg-blue-100 text-blue-600 border-blue-200',
      'RH': 'bg-green-100 text-green-600 border-green-200',
      'Formation': 'bg-purple-100 text-purple-600 border-purple-200',
      'Consigne': 'bg-orange-100 text-orange-600 border-orange-200',
      'Bonne Pratique': 'bg-yellow-100 text-yellow-600 border-yellow-200',
      'Haute': 'bg-red-100 text-red-600 border-red-200',
      'Normale': 'bg-blue-100 text-blue-600 border-blue-200',
    }
    return map[cat] || 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const formatDateFull = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {(item.categorie || item.priorite) && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getCatStyle(item.categorie || item.priorite)}`}>
                  {item.categorie || item.priorite}
                </span>
              )}
              <span className="text-xs text-gray-400">{type === 'actualite' ? '📰 Actualité' : '📋 Consigne'}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800 leading-snug">{item.titre}</h2>
            <div className="text-xs text-gray-400 mt-1">
              Par <span className="font-medium text-gray-600">{item.auteur}</span>
              {item.timestamp && <span> · {formatDateFull(item.timestamp)}</span>}
            </div>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0 mt-1">×</button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {item.contenu || item.description || 'Aucun contenu disponible.'}
          </div>

          {/* Image si présente */}
          {item.imageUrl && (
            <div className="mt-4 rounded-xl overflow-hidden">
              <img src={item.imageUrl} alt="illustration" className="w-full object-cover" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const { user, userData } = useAuth()
  const [stats, setStats] = useState({ membres: 0, consignes: 0, messages: 0, actualites: 0 })
  const [actualites, setActualites] = useState([])
  const [consignes, setConsignes] = useState([])
  const [meteo, setMeteo] = useState(null)
  const [time, setTime] = useState(new Date())
  const [pointage, setPointage] = useState(null)
  const [shift, setShift] = useState(null)

  // ── Modal ──
  const [modalItem, setModalItem] = useState(null)
  const [modalType, setModalType] = useState(null)

  const todayKey = getTodayKey()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    onValue(ref(db, 'users'), (snap) => {
      const data = snap.val()
      setStats(prev => ({ ...prev, membres: data ? Object.keys(data).length : 0 }))
    })
    onValue(ref(db, 'consignes'), (snap) => {
      const data = snap.val()
      const list = data ? Object.entries(data).map(([id, c]) => ({ id, ...c })) : []
      list.sort((a, b) => b.timestamp - a.timestamp)
      setConsignes(list.slice(0, 3))
      setStats(prev => ({ ...prev, consignes: list.length }))
    })
    onValue(ref(db, 'actualites'), (snap) => {
      const data = snap.val()
      const list = data ? Object.entries(data).map(([id, a]) => ({ id, ...a })) : []
      list.sort((a, b) => b.timestamp - a.timestamp)
      setActualites(list.slice(0, 3))
      setStats(prev => ({ ...prev, actualites: list.length }))
    })
    onValue(ref(db, 'chat_groupe'), (snap) => {
      const data = snap.val()
      setStats(prev => ({ ...prev, messages: data ? Object.keys(data).length : 0 }))
    })
  }, [])

  useEffect(() => {
    if (!user?.uid) return
    return onValue(ref(db, `pointages/${user.uid}/${todayKey}`), (snap) => setPointage(snap.val() || null))
  }, [user?.uid, todayKey])

  useEffect(() => {
    if (!user?.uid) return
    return onValue(ref(db, `shifts/${user.uid}`), (snap) => setShift(snap.val() || null))
  }, [user?.uid])

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=35.2517&longitude=-3.9372&current_weather=true&timezone=Africa/Casablanca')
      .then(r => r.json()).then(d => setMeteo(d.current_weather)).catch(() => setMeteo(null))
  }, [])

  // ── Pointage rapide ──
  const handleArrivee = () => set(ref(db, `pointages/${user.uid}/${todayKey}`), {
    arrivee: Date.now(), nom: userData?.nom, role: userData?.role, pauses: {}, fin: null
  })
  const handleFin = async () => {
    if (!window.confirm('Confirmer la fin de votre journée ?')) return
    await update(ref(db, `pointages/${user.uid}/${todayKey}`), { fin: Date.now() })
  }
  const handleDebutPause = (type) => {
    const ts = Date.now()
    return update(ref(db, `pointages/${user.uid}/${todayKey}/pauses/${type}_${ts}`), { type, debut: ts, fin: null })
  }
  const handleFinPause = (type) => {
    if (!pointage?.pauses) return
    const id = Object.keys(pointage.pauses).find(k => k.startsWith(type) && !pointage.pauses[k].fin)
    if (id) return update(ref(db, `pointages/${user.uid}/${todayKey}/pauses/${id}`), { fin: Date.now() })
  }

  const getStatus = () => {
    if (!pointage?.arrivee) return 'absent'
    if (pointage.fin) return 'parti'
    const active = pointage?.pauses ? Object.values(pointage.pauses).find(p => !p.fin) : null
    return active ? `pause_${active.type}` : 'present'
  }
  const getActivePause = (type) => pointage?.pauses
    ? Object.entries(pointage.pauses).find(([, p]) => p.type === type && !p.fin) : null
  const getTempsTravail = () => {
    if (!pointage?.arrivee) return 0
    const fin = pointage.fin || Date.now()
    const pauses = Object.values(pointage.pauses || {}).reduce((acc, p) => acc + (p.fin ? p.fin - p.debut : Date.now() - p.debut), 0)
    return fin - pointage.arrivee - pauses
  }

  const status = getStatus()
  const pauseCafe = getActivePause('cafe')
  const pauseDej = getActivePause('dejeuner')
  const anyPause = pauseCafe || pauseDej
  const tt = getTempsTravail()

  const SC = {
    absent:         { label: 'Non pointé',      color: 'text-gray-500',   bg: 'bg-gray-100',   dot: 'bg-gray-400'   },
    present:        { label: 'En service',       color: 'text-green-600',  bg: 'bg-green-100',  dot: 'bg-green-500'  },
    pause_cafe:     { label: 'Pause café',       color: 'text-amber-600',  bg: 'bg-amber-100',  dot: 'bg-amber-400'  },
    pause_dejeuner: { label: 'Pause déjeuner',   color: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-400' },
    parti:          { label: 'Journée terminée', color: 'text-blue-600',   bg: 'bg-blue-100',   dot: 'bg-blue-400'   },
  }
  const sc = SC[status] || SC.absent

  const getMeteoIcon = c => c === 0 ? '☀️' : c <= 3 ? '⛅' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : '🌩️'

  const getCatStyle = (cat) => ({
    'Urgent': 'bg-red-100 text-red-600 border border-red-200',
    'Info': 'bg-blue-100 text-blue-600 border border-blue-200',
    'RH': 'bg-green-100 text-green-600 border border-green-200',
    'Formation': 'bg-purple-100 text-purple-600 border border-purple-200',
    'Consigne': 'bg-orange-100 text-orange-600 border border-orange-200',
    'Bonne Pratique': 'bg-yellow-100 text-yellow-600 border border-yellow-200',
  }[cat] || 'bg-gray-100 text-gray-600')

  const getPrioStyle = p => ({ 'Haute': 'bg-red-100 text-red-600', 'Normale': 'bg-blue-100 text-blue-600' }[p] || 'bg-gray-100 text-gray-600')
  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''
  const getRoleLabel = r => ({ directrice: 'Directrice', superviseure: 'Superviseure', vigie: 'Vigie', formateur: 'Formateur' }[r] || 'Agent')

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
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm border border-white border-opacity-20">ⵣ</div>
                <div className="h-px w-12 bg-white bg-opacity-30"></div>
                <span className="text-white text-opacity-60 text-sm font-light tracking-widest uppercase">Al Hoceima • Rif</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">Bonjour, {userData?.nom?.split(' ')[0]} 👋</h1>
              <p className="text-blue-200 text-sm">{getRoleLabel(userData?.role)} — Myopla Al Hoceima</p>
              <div className="mt-4">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl px-4 py-2 inline-block border border-white border-opacity-10">
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
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl border border-white border-opacity-20 overflow-hidden">
                <img src={amazighImg} alt="Amazigh" className="h-32 w-24 object-cover" />
              </div>
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
            { label: 'Membres',    value: stats.membres,    icon: '👥', color: 'from-blue-500 to-blue-600',    shadow: 'shadow-blue-200'   },
            { label: 'Actualités', value: stats.actualites, icon: '📰', color: 'from-green-500 to-green-600',  shadow: 'shadow-green-200'  },
            { label: 'Consignes',  value: stats.consignes,  icon: '📋', color: 'from-orange-500 to-orange-600',shadow: 'shadow-orange-200' },
            { label: 'Messages',   value: stats.messages,   icon: '💬', color: 'from-purple-500 to-purple-600',shadow: 'shadow-purple-200' },
          ].map((s, i) => (
            <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white shadow-lg ${s.shadow}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg"></div>
              </div>
              <div className="text-3xl font-bold mb-1">{s.value}</div>
              <div className="text-white text-opacity-80 text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Widget Pointage */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">⏱️ Mon Pointage</h2>
            {onNavigate && (
              <button onClick={() => onNavigate('pointage')} className="text-xs text-blue-500 hover:text-blue-700 font-medium transition">Voir détails →</button>
            )}
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${sc.bg} flex-shrink-0`}>
                <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`}></span>
                <span className={`text-sm font-semibold ${sc.color}`}>{sc.label}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 flex-1 flex-wrap">
                {shift && <span>🗓️ {shift.debut} → {shift.fin}</span>}
                {pointage?.arrivee && <span>🟢 {formatTs(pointage.arrivee)}</span>}
                {pointage?.fin     && <span>🔴 {formatTs(pointage.fin)}</span>}
                {tt > 0 && <span className="font-semibold text-blue-600">{formatDur(tt)} travaillés</span>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {!pointage?.arrivee && (
                  <button onClick={handleArrivee} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">🟢 Pointer arrivée</button>
                )}
                {pointage?.arrivee && !pointage?.fin && !anyPause && (
                  <>
                    <button onClick={() => handleDebutPause('cafe')} title="Pause café" className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-xl text-sm transition">☕</button>
                    <button onClick={() => handleDebutPause('dejeuner')} title="Pause déjeuner" className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-xl text-sm transition">🍽️</button>
                    <button onClick={handleFin} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">🔴 Fin journée</button>
                  </>
                )}
                {pauseCafe && <button onClick={() => handleFinPause('cafe')} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition">☕ Fin pause café</button>}
                {pauseDej  && <button onClick={() => handleFinPause('dejeuner')} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition">🍽️ Fin pause déjeuner</button>}
                {pointage?.fin && <span className="text-sm text-gray-400 py-2 italic">Terminé ✅</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* ✅ Actualités — cliquables avec modal */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">📰 Dernières Actualités</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{stats.actualites} total</span>
                <button onClick={() => onNavigate && onNavigate('actualites')}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium transition">Voir tout →</button>
              </div>
            </div>
            <div className="p-4">
              {actualites.length === 0 ? (
                <div className="text-center text-gray-400 py-8"><div className="text-3xl mb-2">📰</div><p className="text-sm">Aucune actualité</p></div>
              ) : (
                <div className="space-y-2">
                  {actualites.map(actu => (
                    <div key={actu.id}
                      onClick={() => { setModalItem(actu); setModalType('actualite') }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition cursor-pointer group">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${getCatStyle(actu.categorie)}`}>{actu.categorie}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition">{actu.titre}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Par {actu.auteur} • {fmtDate(actu.timestamp)}</div>
                      </div>
                      <span className="text-gray-300 group-hover:text-blue-400 transition text-lg flex-shrink-0">›</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ✅ Consignes — cliquables avec modal */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-sm">📋 Consignes Récentes</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{stats.consignes}</span>
                <button onClick={() => onNavigate && onNavigate('consignes')}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium transition">Tout →</button>
              </div>
            </div>
            <div className="p-4">
              {consignes.length === 0 ? (
                <div className="text-center text-gray-400 py-6"><div className="text-3xl mb-2">📋</div><p className="text-xs">Aucune consigne</p></div>
              ) : (
                <div className="space-y-3">
                  {consignes.map(c => (
                    <div key={c.id}
                      onClick={() => { setModalItem(c); setModalType('consigne') }}
                      className="p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition cursor-pointer group">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPrioStyle(c.priorite)}`}>{c.priorite}</span>
                        <span className="text-gray-300 group-hover:text-blue-400 text-base transition">›</span>
                      </div>
                      <div className="text-sm font-medium text-gray-700 truncate group-hover:text-blue-600 transition">{c.titre}</div>
                      <div className="text-xs text-gray-400 mt-1">{fmtDate(c.timestamp)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      {/* ✅ Modal lecture complète */}
      {modalItem && (
        <ModalLecture
          item={modalItem}
          type={modalType}
          onClose={() => { setModalItem(null); setModalType(null) }}
        />
      )}

    </div>
  )
}