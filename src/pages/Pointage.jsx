import { useState, useEffect } from 'react'
import { ref, onValue, update, push, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

const isSupOrEquivalent = (role) => ['superviseure', 'vigie', 'formateur'].includes(role)

const PAUSE_TYPES = {
  cafe: { label: 'Pause Café', icon: '☕', maxMin: 30, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  dejeuner: { label: 'Pause Déjeuner', icon: '🍽️', maxMin: 60, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0min'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h}h${m > 0 ? m + 'min' : ''}`
  return `${m}min`
}

function formatTime(ts) {
  if (!ts) return '--:--'
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function Pointage({ onNavigate }) {
  const { user, userData } = useAuth()
  const [now, setNow] = useState(new Date())
  const [pointage, setPointage] = useState(null) // pointage du jour de l'utilisateur courant
  const [allUsers, setAllUsers] = useState([])
  const [allPointages, setAllPointages] = useState({}) // { uid: { today: {...}, history: [...] } }
  const [activeTab, setActiveTab] = useState('today') // 'today' | 'history' | 'equipe'
  const [selectedUser, setSelectedUser] = useState(null)
  const [shiftModal, setShiftModal] = useState(null) // { uid, nom }
  const [shiftInput, setShiftInput] = useState({ debut: '', fin: '' })
  const [shiftsAssignes, setShiftsAssignes] = useState({}) // { uid: { debut, fin } }

  const isManager = userData?.role === 'directrice' || isSupOrEquivalent(userData?.role)
  const todayKey = getTodayKey()

  // Horloge en temps réel
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Charger tous les utilisateurs
  useEffect(() => {
    onValue(ref(db, 'users'), (snap) => {
      const data = snap.val()
      if (data) setAllUsers(Object.entries(data).map(([id, u]) => ({ id, ...u })))
    })
  }, [])

  // Charger les shifts assignés
  useEffect(() => {
    onValue(ref(db, 'shifts'), (snap) => {
      setShiftsAssignes(snap.val() || {})
    })
  }, [])

  // Charger le pointage du jour de l'utilisateur courant
  useEffect(() => {
    if (!user?.uid) return
    const r = ref(db, `pointages/${user.uid}/${todayKey}`)
    return onValue(r, (snap) => setPointage(snap.val() || null))
  }, [user?.uid, todayKey])

  // Charger tous les pointages (pour managers)
  useEffect(() => {
    if (!isManager) return
    onValue(ref(db, 'pointages'), (snap) => {
      setAllPointages(snap.val() || {})
    })
  }, [isManager])

  // ── Actions de pointage ──

  const handleArrivee = async () => {
    const ts = Date.now()
    await set(ref(db, `pointages/${user.uid}/${todayKey}`), {
      arrivee: ts,
      nom: userData?.nom,
      role: userData?.role,
      pauses: {},
      fin: null
    })
  }

  const handleDebutPause = async (type) => {
    const ts = Date.now()
    const pauseId = `${type}_${ts}`
    await update(ref(db, `pointages/${user.uid}/${todayKey}/pauses/${pauseId}`), {
      type, debut: ts, fin: null
    })
  }

  const handleFinPause = async (type) => {
    if (!pointage?.pauses) return
    const pauseId = Object.keys(pointage.pauses).find(k => k.startsWith(type) && !pointage.pauses[k].fin)
    if (!pauseId) return
    await update(ref(db, `pointages/${user.uid}/${todayKey}/pauses/${pauseId}`), { fin: Date.now() })
  }

  const handleFin = async () => {
    if (!window.confirm('Confirmer la fin de votre journée ?')) return
    await update(ref(db, `pointages/${user.uid}/${todayKey}`), { fin: Date.now() })
  }

  // ── Calculs ──

  const getStatus = (p) => {
    if (!p?.arrivee) return 'absent'
    if (p.fin) return 'parti'
    const pauseActive = p.pauses ? Object.values(p.pauses).find(pa => !pa.fin) : null
    if (pauseActive) return `pause_${pauseActive.type}`
    return 'present'
  }

  const getTotalPauseDuration = (pauses, type) => {
    if (!pauses) return 0
    return Object.values(pauses)
      .filter(p => p.type === type && p.fin)
      .reduce((acc, p) => acc + (p.fin - p.debut), 0)
  }

  const getActivePause = (pauses, type) => {
    if (!pauses) return null
    return Object.entries(pauses).find(([, p]) => p.type === type && !p.fin)
  }

  const getTempseTravail = (p) => {
    if (!p?.arrivee) return 0
    const fin = p.fin || Date.now()
    const totalPauses = Object.values(p.pauses || {}).reduce((acc, pa) => {
      if (pa.fin) return acc + (pa.fin - pa.debut)
      return acc + (Date.now() - pa.debut)
    }, 0)
    return fin - p.arrivee - totalPauses
  }

  const isRetard = (p, uid) => {
    if (!p?.arrivee || !shiftsAssignes[uid]?.debut) return false
    const shift = shiftsAssignes[uid].debut // "HH:MM"
    const [h, m] = shift.split(':').map(Number)
    const dateArrivee = new Date(p.arrivee)
    const shiftDate = new Date(p.arrivee)
    shiftDate.setHours(h, m, 0, 0)
    return dateArrivee > shiftDate + 5 * 60000 // 5 min de tolérance
  }

  const isPauseDepassed = (pauses, type) => {
    const active = getActivePause(pauses, type)
    if (!active) return false
    const elapsed = Date.now() - active[1].debut
    return elapsed > PAUSE_TYPES[type].maxMin * 60000
  }

  // ── Assignation shift ──
  const saveShift = async () => {
    if (!shiftModal || !shiftInput.debut || !shiftInput.fin) return
    await update(ref(db, `shifts/${shiftModal.uid}`), {
      debut: shiftInput.debut,
      fin: shiftInput.fin,
      nom: shiftModal.nom
    })
    setShiftModal(null)
    setShiftInput({ debut: '', fin: '' })
  }

  // ── Données équipe aujourd'hui ──
  const equipeAujourdhui = allUsers
    .filter(u => u.id !== user.uid || isManager)
    .map(u => ({
      ...u,
      pointageAujourdhui: allPointages[u.id]?.[todayKey] || null,
      shift: shiftsAssignes[u.id] || null
    }))
    .sort((a, b) => {
      const order = { present: 0, pause_cafe: 1, pause_dejeuner: 1, parti: 2, absent: 3 }
      return (order[getStatus(a.pointageAujourdhui)] ?? 3) - (order[getStatus(b.pointageAujourdhui)] ?? 3)
    })

  // ── Historique personnel ──
  const myHistory = user?.uid && allPointages[user.uid]
    ? Object.entries(allPointages[user.uid])
        .filter(([key]) => key !== todayKey)
        .map(([date, p]) => ({ date, ...p }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 14)
    : []

  const status = getStatus(pointage)
  const pauseCafeActive = getActivePause(pointage?.pauses, 'cafe')
  const pauseDejActive = getActivePause(pointage?.pauses, 'dejeuner')
  const totalCafe = getTotalPauseDuration(pointage?.pauses, 'cafe')
  const totalDej = getTotalPauseDuration(pointage?.pauses, 'dejeuner')
  const tempsTravail = getTempseTravail(pointage)

  const getStatusBadge = (s) => {
    switch (s) {
      case 'present': return { label: 'Présent', color: 'bg-green-100 text-green-700', dot: 'bg-green-400' }
      case 'pause_cafe': return { label: 'Pause café', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' }
      case 'pause_dejeuner': return { label: 'Pause déjeuner', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' }
      case 'parti': return { label: 'Parti', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
      default: return { label: 'Absent', color: 'bg-red-100 text-red-600', dot: 'bg-red-400' }
    }
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

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">⏱️ Pointage</h1>
          <p className="text-gray-400 text-sm mt-1">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' — '}
            <span className="font-mono font-bold text-gray-600">
              {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            {['today', 'equipe', 'history'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {tab === 'today' ? '🕐 Mon Pointage' : tab === 'equipe' ? '👥 Équipe' : '📅 Historique'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── MON POINTAGE ── */}
      {(activeTab === 'today' || !isManager) && (
        <div className="space-y-6">

          {/* Shift assigné */}
          {shiftsAssignes[user?.uid] && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <span className="text-blue-500 text-xl">🗓️</span>
              <div>
                <span className="text-sm font-semibold text-blue-800">Shift du jour : </span>
                <span className="text-sm text-blue-700">{shiftsAssignes[user.uid].debut} → {shiftsAssignes[user.uid].fin}</span>
              </div>
            </div>
          )}

          {/* Carte principale */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-lg font-bold text-gray-800">Ma journée</div>
                <div className="text-sm text-gray-400">{formatDate(Date.now())}</div>
              </div>
              {pointage && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadge(status).color}`}>
                  <span className={`w-2 h-2 rounded-full ${getStatusBadge(status).dot}`}></span>
                  {getStatusBadge(status).label}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Arrivée', value: formatTime(pointage?.arrivee), icon: '🟢', active: !!pointage?.arrivee },
                { label: 'Pause café', value: totalCafe > 0 ? formatDuration(totalCafe) : '--', icon: '☕', active: totalCafe > 0 },
                { label: 'Pause déjeuner', value: totalDej > 0 ? formatDuration(totalDej) : '--', icon: '🍽️', active: totalDej > 0 },
                { label: 'Fin', value: formatTime(pointage?.fin), icon: '🔴', active: !!pointage?.fin },
              ].map((item, i) => (
                <div key={i} className={`rounded-xl p-4 text-center ${item.active ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className={`text-sm font-bold ${item.active ? 'text-blue-700' : 'text-gray-400'}`}>{item.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Temps travaillé */}
            {pointage?.arrivee && (
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-4 text-white text-center mb-6">
                <div className="text-3xl font-bold">{formatDuration(tempsTravail)}</div>
                <div className="text-blue-200 text-sm mt-1">Temps travaillé (pauses déduites)</div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="space-y-3">

              {/* Bouton Arrivée */}
              {!pointage?.arrivee && (
                <button onClick={handleArrivee}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-3">
                  <span>🟢</span> Pointer mon arrivée
                </button>
              )}

              {/* Boutons pauses */}
              {pointage?.arrivee && !pointage?.fin && (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(PAUSE_TYPES).map(([type, config]) => {
                    const activeP = type === 'cafe' ? pauseCafeActive : pauseDejActive
                    const total = type === 'cafe' ? totalCafe : totalDej
                    const depasse = isPauseDepassed(pointage?.pauses, type)
                    const totalUsed = total + (activeP ? (now - activeP[1].debut) : 0)
                    const pct = Math.min(100, (totalUsed / (config.maxMin * 60000)) * 100)

                    return (
                      <div key={type} className={`rounded-xl border p-4 ${config.bg} ${config.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-gray-700">{config.icon} {config.label}</span>
                          <span className={`text-xs font-medium ${depasse ? 'text-red-500' : config.color}`}>
                            {formatDuration(totalUsed)} / {config.maxMin}min
                          </span>
                        </div>
                        {/* Barre de progression */}
                        <div className="w-full bg-white rounded-full h-1.5 mb-3">
                          <div className={`h-1.5 rounded-full transition-all ${depasse ? 'bg-red-500' : 'bg-current'} ${config.color}`}
                            style={{ width: `${pct}%` }}></div>
                        </div>
                        {activeP ? (
                          <button onClick={() => handleFinPause(type)}
                            className={`w-full py-2 rounded-lg text-sm font-medium transition ${depasse ? 'bg-red-500 text-white animate-pulse' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}>
                            {depasse ? '⚠️ Fin pause (dépassée !)' : `Fin de ${config.label.toLowerCase()}`}
                          </button>
                        ) : (
                          <button onClick={() => handleDebutPause(type)}
                            disabled={!!pauseCafeActive || !!pauseDejActive}
                            className="w-full py-2 rounded-lg text-sm font-medium bg-white border text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                            Démarrer
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Bouton Fin */}
              {pointage?.arrivee && !pointage?.fin && !pauseCafeActive && !pauseDejActive && (
                <button onClick={handleFin}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                  <span>🔴</span> Fin de journée
                </button>
              )}

              {pointage?.fin && (
                <div className="text-center py-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl mb-1">✅</div>
                  <div className="font-semibold text-gray-700">Bonne journée !</div>
                  <div className="text-sm text-gray-400">Pointage terminé à {formatTime(pointage.fin)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Historique personnel rapide */}
          {myHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">📅 Mes derniers jours</h3>
              <div className="space-y-2">
                {myHistory.slice(0, 5).map(({ date, arrivee, fin, pauses }) => {
                  const tt = fin && arrivee ? fin - arrivee - Object.values(pauses || {}).reduce((a, p) => p.fin ? a + (p.fin - p.debut) : a, 0) : null
                  return (
                    <div key={date} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{formatDate(new Date(date + 'T00:00:00'))}</span>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>🟢 {formatTime(arrivee)}</span>
                        <span>🔴 {formatTime(fin)}</span>
                        {tt && <span className="font-semibold text-blue-600">{formatDuration(tt)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ÉQUIPE (managers) ── */}
      {isManager && activeTab === 'equipe' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {['present', 'pause_cafe', 'pause_dejeuner', 'absent'].map(s => {
              const badge = getStatusBadge(s)
              const count = equipeAujourdhui.filter(u => getStatus(u.pointageAujourdhui) === s).length
              return (
                <div key={s} className={`rounded-2xl p-4 ${badge.color} border`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm font-medium mt-1">{badge.label}</div>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Présences du jour</h2>
              <span className="text-xs text-gray-400">{equipeAujourdhui.length} membres</span>
            </div>
            <div className="divide-y divide-gray-50">
              {equipeAujourdhui.map(u => {
                const s = getStatus(u.pointageAujourdhui)
                const badge = getStatusBadge(s)
                const retard = isRetard(u.pointageAujourdhui, u.id)
                const tt = getTempseTravail(u.pointageAujourdhui)

                return (
                  <div key={u.id} className="px-6 py-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(u.role)}`}>
                      {getInitials(u.nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">{u.nom}</span>
                        {retard && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">⚠️ Retard</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        {u.shift && <span>🗓️ {u.shift.debut}→{u.shift.fin}</span>}
                        {u.pointageAujourdhui?.arrivee && <span>🟢 {formatTime(u.pointageAujourdhui.arrivee)}</span>}
                        {u.pointageAujourdhui?.fin && <span>🔴 {formatTime(u.pointageAujourdhui.fin)}</span>}
                        {tt > 0 && <span className="font-medium text-blue-500">{formatDuration(tt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${badge.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                        {badge.label}
                      </span>
                      <button onClick={() => { setShiftModal({ uid: u.id, nom: u.nom }); setShiftInput(shiftsAssignes[u.id] || { debut: '', fin: '' }) }}
                        className="text-xs bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-500 px-3 py-1.5 rounded-lg transition">
                        🗓️ Shift
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORIQUE (managers) ── */}
      {isManager && activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
            <h2 className="font-bold text-gray-800">Historique des pointages</h2>
            <select value={selectedUser || ''} onChange={e => setSelectedUser(e.target.value || null)}
              className="ml-auto border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="">Tous les agents</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.nom}</option>)}
            </select>
          </div>
          <div className="divide-y divide-gray-50">
            {allUsers
              .filter(u => !selectedUser || u.id === selectedUser)
              .flatMap(u => {
                const userPointages = allPointages[u.id] || {}
                return Object.entries(userPointages)
                  .map(([date, p]) => ({ uid: u.id, nom: u.nom, role: u.role, date, ...p }))
              })
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 30)
              .map((entry, i) => {
                const tt = entry.fin && entry.arrivee
                  ? entry.fin - entry.arrivee - Object.values(entry.pauses || {}).reduce((a, p) => p.fin ? a + (p.fin - p.debut) : a, 0)
                  : null
                const retard = isRetard(entry, entry.uid)
                return (
                  <div key={i} className="px-6 py-3 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(entry.role)}`}>
                      {getInitials(entry.nom)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{entry.nom}</span>
                        {retard && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">⚠️ Retard</span>}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(new Date(entry.date + 'T00:00:00'))}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>🟢 {formatTime(entry.arrivee)}</span>
                      <span>🔴 {formatTime(entry.fin)}</span>
                      {tt && <span className="font-semibold text-blue-600 text-sm">{formatDuration(tt)}</span>}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ── Modal assignation shift ── */}
      {shiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4" onClick={() => setShiftModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-1">🗓️ Assigner un shift</h3>
            <p className="text-sm text-gray-400 mb-4">{shiftModal.nom}</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Heure de début</label>
                <input type="time" value={shiftInput.debut} onChange={e => setShiftInput(p => ({ ...p, debut: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Heure de fin</label>
                <input type="time" value={shiftInput.fin} onChange={e => setShiftInput(p => ({ ...p, fin: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveShift} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium text-sm transition">Enregistrer</button>
              <button onClick={() => setShiftModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm transition">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}