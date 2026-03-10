import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import amazighImg from '../assets/amazigh.png'

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const duration = 1000
    const step = 16
    const increment = value / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, step)
    return () => clearInterval(timer)
  }, [value])
  return <>{display}</>
}

function MiniBarChart({ data, color }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '32px' }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: '3px',
          background: color,
          opacity: 0.3 + (i / data.length) * 0.7,
          height: `${(v / max) * 100}%`,
          minHeight: '4px',
          transition: 'height 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transitionDelay: `${i * 60}ms`,
        }} />
      ))}
    </div>
  )
}

function DonutChart({ value, max, color, size = 56 }) {
  const [animated, setAnimated] = useState(0)
  const pct = max > 0 ? animated / max : 0
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  useEffect(() => { setTimeout(() => setAnimated(value), 300) }, [value])
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.3s' }} />
    </svg>
  )
}

function ActivityLine({ data }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 200, h = 60
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 8)}`)
  const path = `M ${pts.join(' L ')}`
  const area = `M 0,${h} L ${pts.join(' L ')} L ${w},${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '60px', overflow: 'visible' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lineGrad)" />
      <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * w} cy={h - (v / max) * (h - 8)}
          r="3" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
      ))}
    </svg>
  )
}

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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {(item.categorie || item.priorite) && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getCatStyle(item.categorie || item.priorite)}`}>{item.categorie || item.priorite}</span>
              )}
              <span className="text-xs text-gray-400">{type === 'actualite' ? '📰 Actualité' : '📋 Consigne'}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800 leading-snug">{item.titre}</h2>
            <div className="text-xs text-gray-400 mt-1">
              Par <span className="font-medium text-gray-600">{item.auteur}</span>
              {item.timestamp && <span> · {formatDateFull(item.timestamp)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0 mt-1">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{item.contenu || item.description || 'Aucun contenu disponible.'}</div>
          {item.imageUrl && <div className="mt-4 rounded-xl overflow-hidden"><img src={item.imageUrl} alt="illustration" className="w-full object-cover" /></div>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition">Fermer</button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const { userData } = useAuth()
  const [stats, setStats] = useState({ membres: 0, consignes: 0, messages: 0, actualites: 0 })
  const [actualites, setActualites] = useState([])
  const [consignes, setConsignes] = useState([])
  const [meteo, setMeteo] = useState(null)
  const [time, setTime] = useState(new Date())
  const [modalItem, setModalItem] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [activiteJours, setActiviteJours] = useState([2, 5, 3, 8, 6, 4, 7])
  const [membresEnLigne, setMembresEnLigne] = useState(0)
  const [rolesData, setRolesData] = useState({ directrice: 0, superviseure: 0, vigie: 0, formateur: 0, agent: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    onValue(ref(db, 'users'), (snap) => {
      const data = snap.val()
      if (data) {
        const users = Object.values(data)
        setStats(prev => ({ ...prev, membres: users.length }))
        const roles = { directrice: 0, superviseure: 0, vigie: 0, formateur: 0, agent: 0 }
        users.forEach(u => { if (roles[u.role] !== undefined) roles[u.role]++; else roles.agent++ })
        setRolesData(roles)
      }
    })
    onValue(ref(db, 'presence'), (snap) => {
      const data = snap.val()
      if (data) setMembresEnLigne(Object.values(data).filter(p => p.online).length)
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
      setActualites(list.slice(0, 4))
      setStats(prev => ({ ...prev, actualites: list.length }))
      const days = [0,1,2,3,4,5,6].map(d => {
        const date = new Date(); date.setDate(date.getDate() - (6-d))
        return list.filter(a => a.timestamp && new Date(a.timestamp).toDateString() === date.toDateString()).length
      })
      if (days.some(d => d > 0)) setActiviteJours(days)
    })
    onValue(ref(db, 'chat_groupe'), (snap) => {
      const data = snap.val()
      setStats(prev => ({ ...prev, messages: data ? Object.keys(data).length : 0 }))
    })
  }, [])

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=35.2517&longitude=-3.9372&current_weather=true&timezone=Africa/Casablanca')
      .then(r => r.json()).then(d => setMeteo(d.current_weather)).catch(() => setMeteo(null))
  }, [])

  const getMeteoIcon = c => c === 0 ? '☀️' : c <= 3 ? '⛅' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : '🌩️'
  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''
  const getCatIcon = cat => ({ 'Urgent':'🚨', 'Info':'ℹ️', 'RH':'👔', 'Formation':'📚', 'Consigne':'📋', 'Bonne Pratique':'⭐' }[cat] || '📢')
  const getCatStyle = (cat) => ({ 'Urgent': 'bg-red-100 text-red-600 border border-red-200', 'Info': 'bg-blue-100 text-blue-600 border border-blue-200', 'RH': 'bg-green-100 text-green-600 border border-green-200', 'Formation': 'bg-purple-100 text-purple-600 border border-purple-200', 'Consigne': 'bg-orange-100 text-orange-600 border border-orange-200', 'Bonne Pratique': 'bg-yellow-100 text-yellow-600 border border-yellow-200' }[cat] || 'bg-gray-100 text-gray-600')
  const getRoleLabel = (r, titre) => {
    if (titre) return titre
    return { directrice: 'Directrice', superviseure: 'Superviseure', vigie: 'Vigie', formateur: 'Formateur' }[r] || 'Agent'
  }
  const jours = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  const statCards = [
    { label: 'Membres', value: stats.membres, icon: '👥', grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', mini: [3,5,4,6,5,7,stats.membres], donutColor: '#93c5fd' },
    { label: 'Actualités', value: stats.actualites, icon: '📰', grad: 'linear-gradient(135deg,#10b981,#059669)', mini: [1,3,2,4,3,5,stats.actualites], donutColor: '#6ee7b7' },
    { label: 'Consignes', value: stats.consignes, icon: '📋', grad: 'linear-gradient(135deg,#f59e0b,#d97706)', mini: [2,4,3,5,4,6,stats.consignes], donutColor: '#fcd34d' },
    { label: 'Messages', value: stats.messages, icon: '💬', grad: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', mini: [5,8,6,10,8,12,stats.messages], donutColor: '#c4b5fd' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff' }}>
      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp2 { from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulse2 { 0%,100%{opacity:1}50%{opacity:0.5} }
        .stat-card{transition:transform .2s,box-shadow .2s}
        .stat-card:hover{transform:translateY(-5px);box-shadow:0 24px 48px rgba(0,0,0,.18)!important}
        .card-h{transition:transform .2s,box-shadow .2s;background:#fff}
        .card-h:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,.08)!important}
        .row-h{transition:background .15s;border-radius:14px;cursor:pointer}
        .row-h:hover{background:#f0f7ff}
        .btn-link{background:none;border:none;cursor:pointer;transition:all .2s}
      `}</style>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e40af 100%)', position:'relative', overflow:'hidden', animation:'slideDown .6s ease' }}>
        <div style={{ position:'absolute', top:'-80px', right:'-80px', width:'350px', height:'350px', background:'rgba(59,130,246,.12)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:'-100px', left:'5%', width:'300px', height:'300px', background:'rgba(139,92,246,.08)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize:'40px 40px' }} />

        <div style={{ position:'relative', padding:'32px 40px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                <div style={{ width:'40px', height:'40px', background:'rgba(255,255,255,.1)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', border:'1px solid rgba(255,255,255,.15)' }}>ⵣ</div>
                <div style={{ height:'1px', width:'40px', background:'rgba(255,255,255,.2)' }} />
                <span style={{ color:'rgba(255,255,255,.4)', fontSize:'11px', fontWeight:500, letterSpacing:'3px', textTransform:'uppercase' }}>Al Hoceima · Rif</span>
              </div>
              <h1 style={{ fontSize:'32px', fontWeight:800, color:'#fff', marginBottom:'4px', lineHeight:1.2 }}>
                Bonjour, {userData?.nom?.split(' ')[0]} 👋
              </h1>
              <p style={{ color:'rgba(147,197,253,.8)', fontSize:'14px', marginBottom:'20px' }}>
                {getRoleLabel(userData?.role, userData?.titre)} — Myopla Al Hoceima
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ background:'rgba(255,255,255,.08)', borderRadius:'14px', padding:'10px 18px', border:'1px solid rgba(255,255,255,.1)' }}>
                  <div style={{ color:'#fff', fontSize:'22px', fontWeight:700, letterSpacing:'2px' }}>{time.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
                  <div style={{ color:'rgba(147,197,253,.6)', fontSize:'11px', marginTop:'2px' }}>{time.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
                </div>
                {membresEnLigne > 0 && (
                  <div style={{ background:'rgba(16,185,129,.15)', border:'1px solid rgba(16,185,129,.3)', borderRadius:'14px', padding:'10px 16px', display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#10b981', animation:'pulse2 2s infinite', display:'inline-block' }} />
                    <span style={{ color:'#6ee7b7', fontSize:'13px', fontWeight:500 }}>{membresEnLigne} en ligne</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ background:'rgba(255,255,255,.08)', borderRadius:'20px', border:'1px solid rgba(255,255,255,.15)', overflow:'hidden' }}>
                <img src={amazighImg} alt="Amazigh" style={{ height:'130px', width:'95px', objectFit:'cover', display:'block' }} />
              </div>
              {meteo && (
                <div style={{ background:'rgba(255,255,255,.08)', borderRadius:'20px', padding:'20px 24px', textAlign:'center', border:'1px solid rgba(255,255,255,.1)' }}>
                  <div style={{ fontSize:'44px', marginBottom:'6px' }}>{getMeteoIcon(meteo.weathercode)}</div>
                  <div style={{ color:'#fff', fontSize:'28px', fontWeight:700 }}>{Math.round(meteo.temperature)}°C</div>
                  <div style={{ color:'rgba(147,197,253,.6)', fontSize:'11px', marginTop:'4px' }}>Al Hoceima</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'0 40px 40px' }}>

        {/* Stat Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginTop:'-28px', position:'relative', zIndex:10, animation:'slideUp2 .6s ease .1s both' }}>
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={{ background:s.grad, borderRadius:'20px', padding:'20px', boxShadow:'0 8px 24px rgba(0,0,0,.12)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div>
                  <div style={{ fontSize:'24px', marginBottom:'4px' }}>{s.icon}</div>
                  <div style={{ color:'rgba(255,255,255,.6)', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{s.label}</div>
                </div>
                <DonutChart value={s.value} max={Math.max(s.value * 1.5, 10)} color={s.donutColor} size={52} />
              </div>
              <div style={{ color:'#fff', fontSize:'36px', fontWeight:800, lineHeight:1, marginBottom:'10px' }}>
                <AnimatedNumber value={s.value} />
              </div>
              <MiniBarChart data={s.mini} color="rgba(255,255,255,.7)" />
            </div>
          ))}
        </div>

        {/* Graphiques */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginTop:'24px', animation:'slideUp2 .6s ease .2s both' }}>

          {/* Activité */}
          <div className="card-h" style={{ borderRadius:'20px', padding:'24px', boxShadow:'0 4px 16px rgba(0,0,0,.06)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <div>
                <h3 style={{ fontWeight:700, color:'#1e293b', fontSize:'15px', marginBottom:'2px' }}>📈 Activité récente</h3>
                <p style={{ color:'#94a3b8', fontSize:'12px' }}>Publications des 7 derniers jours</p>
              </div>
              <span style={{ background:'#eff6ff', color:'#3b82f6', fontSize:'11px', fontWeight:600, padding:'4px 10px', borderRadius:'100px' }}>7 jours</span>
            </div>
            <ActivityLine data={activiteJours} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'8px' }}>
              {jours.map((j, i) => <span key={i} style={{ color:'#94a3b8', fontSize:'10px', fontWeight:500 }}>{j}</span>)}
            </div>
          </div>

          {/* Répartition équipe */}
          <div className="card-h" style={{ borderRadius:'20px', padding:'24px', boxShadow:'0 4px 16px rgba(0,0,0,.06)' }}>
            <div style={{ marginBottom:'20px' }}>
              <h3 style={{ fontWeight:700, color:'#1e293b', fontSize:'15px', marginBottom:'2px' }}>👥 Répartition équipe</h3>
              <p style={{ color:'#94a3b8', fontSize:'12px' }}>Composition par rôle</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {[
                { label:'Directrice', value:rolesData.directrice, color:'#f59e0b' },
                { label:'Superviseure', value:rolesData.superviseure, color:'#8b5cf6' },
                { label:'Vigie', value:rolesData.vigie, color:'#3b82f6' },
                { label:'Formateur', value:rolesData.formateur, color:'#10b981' },
                { label:'Agent', value:rolesData.agent, color:'#6b7280' },
              ].filter(r => r.value > 0).map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'12px', fontWeight:600, color:'#64748b', width:'90px', flexShrink:0 }}>{r.label}</span>
                  <div style={{ flex:1, height:'8px', background:'#f1f5f9', borderRadius:'100px', overflow:'hidden' }}>
                    <div style={{
                      height:'100%', background:r.color, borderRadius:'100px',
                      width: mounted ? `${stats.membres > 0 ? (r.value / stats.membres) * 100 : 0}%` : '0%',
                      transition:`width 1.2s cubic-bezier(0.34,1.56,0.64,1) ${i*0.1}s`,
                    }} />
                  </div>
                  <span style={{ fontSize:'13px', fontWeight:700, color:r.color, width:'20px', textAlign:'right' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actualités + Consignes */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px', marginTop:'20px', animation:'slideUp2 .6s ease .3s both' }}>

          {/* Actualités */}
          <div className="card-h" style={{ borderRadius:'20px', boxShadow:'0 4px 16px rgba(0,0,0,.06)', overflow:'hidden' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ fontWeight:700, color:'#1e293b', fontSize:'15px', marginBottom:'2px' }}>📰 Dernières Actualités</h3>
                <p style={{ color:'#94a3b8', fontSize:'12px' }}>{stats.actualites} publication{stats.actualites > 1 ? 's' : ''} au total</p>
              </div>
              <button className="btn-link" onClick={() => onNavigate && onNavigate('actualites')}
                style={{ background:'#eff6ff', color:'#3b82f6', borderRadius:'10px', padding:'6px 14px', fontSize:'12px', fontWeight:600 }}
                onMouseEnter={e => { e.target.style.background='#3b82f6'; e.target.style.color='#fff' }}
                onMouseLeave={e => { e.target.style.background='#eff6ff'; e.target.style.color='#3b82f6' }}>
                Voir tout →
              </button>
            </div>
            <div style={{ padding:'8px' }}>
              {actualites.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>
                  <div style={{ fontSize:'32px', marginBottom:'8px' }}>📰</div>
                  <p style={{ fontSize:'13px' }}>Aucune actualité</p>
                </div>
              ) : actualites.map(actu => (
                <div key={actu.id} className="row-h" onClick={() => { setModalItem(actu); setModalType('actualite') }}
                  style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', marginBottom:'2px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'12px', flexShrink:0, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>
                    {getCatIcon(actu.categorie)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'14px', fontWeight:600, color:'#1e293b', marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{actu.titre}</div>
                    <div style={{ fontSize:'12px', color:'#94a3b8' }}>Par {actu.auteur} · {fmtDate(actu.timestamp)}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${getCatStyle(actu.categorie)}`}>{actu.categorie}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Colonne droite */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            {/* Consignes */}
            <div className="card-h" style={{ borderRadius:'20px', boxShadow:'0 4px 16px rgba(0,0,0,.06)', overflow:'hidden', flex:1 }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3 style={{ fontWeight:700, color:'#1e293b', fontSize:'14px' }}>📋 Consignes</h3>
                <button className="btn-link" onClick={() => onNavigate && onNavigate('consignes')}
                  style={{ color:'#3b82f6', fontSize:'12px', fontWeight:600 }}>Tout →</button>
              </div>
              <div style={{ padding:'8px' }}>
                {consignes.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'24px', color:'#94a3b8' }}>
                    <div style={{ fontSize:'24px', marginBottom:'4px' }}>📋</div>
                    <p style={{ fontSize:'12px' }}>Aucune consigne</p>
                  </div>
                ) : consignes.map(c => (
                  <div key={c.id} className="row-h" onClick={() => { setModalItem(c); setModalType('consigne') }}
                    style={{ padding:'10px 12px', marginBottom:'4px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                      <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'100px', background:c.priorite==='Haute'?'#fef2f2':'#eff6ff', color:c.priorite==='Haute'?'#ef4444':'#3b82f6' }}>{c.priorite}</span>
                      <span style={{ fontSize:'11px', color:'#94a3b8' }}>{fmtDate(c.timestamp)}</span>
                    </div>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.titre}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget Rif */}
            <div style={{ background:'linear-gradient(135deg,#1e3a5f,#1e40af)', borderRadius:'20px', padding:'20px', boxShadow:'0 4px 16px rgba(30,64,175,.3)', display:'flex', alignItems:'center', gap:'14px' }}>
              <span style={{ fontSize:'32px', opacity:0.5 }}>ⵣ</span>
              <div>
                <div style={{ color:'#93c5fd', fontSize:'14px', fontWeight:700, letterSpacing:'0.5px' }}>ⴰⵣⵓⵍ ⴼⵍⵍⴰⵡⵏ</div>
                <div style={{ color:'rgba(147,197,253,.45)', fontSize:'11px', marginTop:'2px' }}>Bonjour à tous — Rif</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalItem && (
        <ModalLecture item={modalItem} type={modalType} onClose={() => { setModalItem(null); setModalType(null) }} />
      )}
    </div>
  )
}