import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { usePresence } from '../hooks/usePresence'

function Avatar({ nom, role, photoURL, size = 'md', className = '' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' }
  const colors = { directrice: 'bg-amber-500', vigie: 'bg-indigo-500', formateur: 'bg-teal-500', superviseure: 'bg-purple-600' }
  const color = colors[role] || 'bg-blue-600'
  const sizeClass = sizes[size] || sizes.md
  const initials = nom ? nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
  if (photoURL) return <img src={photoURL} alt={nom} className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`} />
  return <div className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${color} ${className}`}>{initials}</div>
}

const ROLE_CONFIG = {
  directrice:  { label: 'Directrice',   color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', icon: '👑' },
  superviseure:{ label: 'Superviseure', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', icon: '🎯' },
  vigie:       { label: 'Vigie',        color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd', icon: '👁️' },
  formateur:   { label: 'Formateur',    color: '#10b981', bg: '#f0fdf4', border: '#6ee7b7', icon: '📚' },
  agent:       { label: 'Agent',        color: '#6b7280', bg: '#f9fafb', border: '#d1d5db', icon: '👤' },
}

const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.agent
const getRoleLabel = (role, titre) => {
  if (titre) return titre
  return ROLE_CONFIG[role]?.label || 'Agent'
}

export default function CarteAgents({ onNavigate }) {
  const { user, userData } = useAuth()
  const { isOnline } = usePresence()
  const [membres, setMembres] = useState([])
  const [filter, setFilter] = useState('tous')
  const [search, setSearch] = useState('')
  const [selectedMembre, setSelectedMembre] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 100) }, [])

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val()
      if (data) {
        const list = Object.entries(data).map(([id, u]) => ({ id, ...u }))
        list.sort((a, b) => {
          const order = { directrice: 0, superviseure: 1, vigie: 2, formateur: 3, agent: 4 }
          return (order[a.role] ?? 5) - (order[b.role] ?? 5)
        })
        setMembres(list)
      }
    })
    return () => unsubscribe()
  }, [])

  const filteredMembres = membres.filter(m => {
    const matchRole = filter === 'tous' || m.role === filter || (filter === 'agent' && !ROLE_CONFIG[m.role])
    const matchSearch = !search || m.nom?.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const onlineCount = membres.filter(m => isOnline(m.id)).length
  const offlineCount = membres.length - onlineCount

  const roles = ['tous', 'directrice', 'superviseure', 'vigie', 'formateur', 'agent']
  const roleCounts = {}
  membres.forEach(m => { const r = ROLE_CONFIG[m.role] ? m.role : 'agent'; roleCounts[r] = (roleCounts[r] || 0) + 1 })

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff' }}>
      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes pulse3 { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.2);opacity:0.7} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .card-agent { transition: transform .2s ease, box-shadow .2s ease; cursor: pointer; }
        .card-agent:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.12) !important; }
        .filter-btn { transition: all .2s ease; border: none; cursor: pointer; }
        .modal-overlay { animation: fadeIn .2s ease; }
        .modal-card { animation: slideUp .3s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e40af 100%)',
        position: 'relative', overflow: 'hidden',
        animation: 'slideDown .6s ease',
      }}>
        <div style={{ position:'absolute', top:'-60px', right:'-60px', width:'300px', height:'300px', background:'rgba(59,130,246,.12)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:'-80px', left:'5%', width:'250px', height:'250px', background:'rgba(139,92,246,.08)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize:'40px 40px' }} />

        <div style={{ position:'relative', padding:'32px 40px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                <div style={{ width:'40px', height:'40px', background:'rgba(255,255,255,.1)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', border:'1px solid rgba(255,255,255,.15)' }}>👥</div>
                <div style={{ height:'1px', width:'32px', background:'rgba(255,255,255,.2)' }} />
                <span style={{ color:'rgba(255,255,255,.4)', fontSize:'11px', fontWeight:500, letterSpacing:'3px', textTransform:'uppercase' }}>Équipe</span>
              </div>
              <h1 style={{ fontSize:'28px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>Carte des Agents</h1>
              <p style={{ color:'rgba(147,197,253,.7)', fontSize:'14px' }}>Vue en temps réel de toute l'équipe Myopla</p>
            </div>

            {/* Stats online/offline */}
            <div style={{ display:'flex', gap:'12px' }}>
              <div style={{ background:'rgba(16,185,129,.15)', border:'1px solid rgba(16,185,129,.3)', borderRadius:'16px', padding:'16px 20px', textAlign:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#10b981', animation:'pulse3 2s infinite', display:'inline-block' }} />
                  <span style={{ color:'#6ee7b7', fontSize:'13px', fontWeight:600 }}>En ligne</span>
                </div>
                <div style={{ color:'#fff', fontSize:'28px', fontWeight:800 }}>{onlineCount}</div>
              </div>
              <div style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'16px', padding:'16px 20px', textAlign:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#6b7280', display:'inline-block' }} />
                  <span style={{ color:'rgba(255,255,255,.5)', fontSize:'13px', fontWeight:600 }}>Hors ligne</span>
                </div>
                <div style={{ color:'#fff', fontSize:'28px', fontWeight:800 }}>{offlineCount}</div>
              </div>
              <div style={{ background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.3)', borderRadius:'16px', padding:'16px 20px', textAlign:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                  <span style={{ color:'#93c5fd', fontSize:'13px', fontWeight:600 }}>👥 Total</span>
                </div>
                <div style={{ color:'#fff', fontSize:'28px', fontWeight:800 }}>{membres.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'24px 40px 40px' }}>

        {/* Barre de recherche + filtres */}
        <div style={{
          display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px',
          animation:'slideUp .5s ease .1s both',
        }}>
          {/* Recherche */}
          <div style={{ position:'relative', flex:1, maxWidth:'320px' }}>
            <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'16px' }}>🔍</span>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un agent..."
              style={{
                width:'100%', padding:'11px 14px 11px 42px',
                borderRadius:'14px', border:'1px solid #e2e8f0',
                background:'#fff', fontSize:'14px', outline:'none',
                boxShadow:'0 2px 8px rgba(0,0,0,.06)',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'18px' }}>×</button>
            )}
          </div>

          {/* Filtres par rôle */}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {roles.map(r => {
              const config = r === 'tous' ? { label:'Tous', color:'#3b82f6', bg:'#eff6ff', border:'#93c5fd', icon:'👥' } : getRoleConfig(r)
              const count = r === 'tous' ? membres.length : (roleCounts[r] || 0)
              const active = filter === r
              return (
                <button key={r} className="filter-btn" onClick={() => setFilter(r)} style={{
                  padding:'8px 14px', borderRadius:'100px',
                  background: active ? config.color : '#fff',
                  color: active ? '#fff' : config.color,
                  border: `1.5px solid ${active ? config.color : config.border || '#e2e8f0'}`,
                  fontSize:'13px', fontWeight:600,
                  boxShadow: active ? `0 4px 12px ${config.color}40` : '0 2px 6px rgba(0,0,0,.06)',
                  display:'flex', alignItems:'center', gap:'6px',
                }}>
                  <span>{config.icon}</span>
                  <span>{r === 'tous' ? 'Tous' : config.label}</span>
                  <span style={{
                    background: active ? 'rgba(255,255,255,.25)' : config.bg,
                    padding:'1px 7px', borderRadius:'100px', fontSize:'11px', fontWeight:700,
                    color: active ? '#fff' : config.color,
                  }}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Grille agents */}
        {filteredMembres.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px', color:'#94a3b8' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>🔍</div>
            <p style={{ fontSize:'16px', fontWeight:600 }}>Aucun agent trouvé</p>
          </div>
        ) : (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',
            gap:'16px',
            animation:'slideUp .5s ease .2s both',
          }}>
            {filteredMembres.map((membre, i) => {
              const online = isOnline(membre.id)
              const config = getRoleConfig(membre.role)
              const isMe = membre.id === user?.uid
              return (
                <div key={membre.id} className="card-agent"
                  onClick={() => setSelectedMembre(membre)}
                  style={{
                    background:'#fff',
                    borderRadius:'20px',
                    padding:'24px 20px',
                    boxShadow:'0 4px 16px rgba(0,0,0,.06)',
                    border: isMe ? '2px solid #3b82f6' : '1px solid #f1f5f9',
                    position:'relative',
                    animationDelay:`${i * 0.04}s`,
                    textAlign:'center',
                  }}>

                  {/* Badge "Vous" */}
                  {isMe && (
                    <div style={{
                      position:'absolute', top:'12px', right:'12px',
                      background:'#3b82f6', color:'#fff',
                      fontSize:'10px', fontWeight:700, padding:'2px 8px',
                      borderRadius:'100px', letterSpacing:'0.5px',
                    }}>Vous</div>
                  )}

                  {/* Indicateur online */}
                  <div style={{ position:'relative', display:'inline-block', marginBottom:'12px' }}>
                    <Avatar nom={membre.nom} role={membre.role} photoURL={membre.photoURL} size="lg" />
                    <span style={{
                      position:'absolute', bottom:'2px', right:'2px',
                      width:'14px', height:'14px', borderRadius:'50%',
                      background: online ? '#10b981' : '#d1d5db',
                      border:'2.5px solid #fff',
                      animation: online ? 'pulse3 2.5s infinite' : 'none',
                    }} />
                  </div>

                  <div style={{ fontWeight:700, color:'#1e293b', fontSize:'14px', marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {membre.nom}
                  </div>

                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:'4px',
                    background:config.bg, color:config.color,
                    border:`1px solid ${config.border || '#e2e8f0'}`,
                    fontSize:'11px', fontWeight:600, padding:'3px 10px',
                    borderRadius:'100px', marginBottom:'12px',
                  }}>
                    <span>{config.icon}</span>
                    <span>{getRoleLabel(membre.role, membre.titre)}</span>
                  </div>

                  <div style={{ fontSize:'12px', color: online ? '#10b981' : '#94a3b8', fontWeight:500, marginBottom:'14px' }}>
                    {online ? '🟢 En ligne' : '⚫ Hors ligne'}
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
                    {membre.id !== user?.uid && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate('messagerie', membre) }}
                        style={{
                          flex:1, padding:'8px', borderRadius:'10px',
                          background:'#eff6ff', color:'#3b82f6',
                          border:'none', fontSize:'12px', fontWeight:600,
                          cursor:'pointer', transition:'all .2s',
                        }}
                        onMouseEnter={e => { e.target.style.background='#3b82f6'; e.target.style.color='#fff' }}
                        onMouseLeave={e => { e.target.style.background='#eff6ff'; e.target.style.color='#3b82f6' }}>
                        ✉️ Message
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedMembre(membre) }}
                      style={{
                        flex:1, padding:'8px', borderRadius:'10px',
                        background:'#f8fafc', color:'#64748b',
                        border:'none', fontSize:'12px', fontWeight:600,
                        cursor:'pointer', transition:'all .2s',
                      }}
                      onMouseEnter={e => { e.target.style.background='#e2e8f0'; e.target.style.color='#1e293b' }}
                      onMouseLeave={e => { e.target.style.background='#f8fafc'; e.target.style.color='#64748b' }}>
                      👁️ Profil
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal profil agent */}
      {selectedMembre && (
        <div className="modal-overlay" onClick={() => setSelectedMembre(null)}
          style={{
            position:'fixed', inset:0,
            background:'rgba(0,0,0,.5)',
            backdropFilter:'blur(4px)',
            zIndex:50,
            display:'flex', alignItems:'center', justifyContent:'center', padding:'20px',
          }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}
            style={{
              background:'#fff', borderRadius:'28px',
              width:'100%', maxWidth:'420px',
              boxShadow:'0 40px 80px rgba(0,0,0,.2)',
              overflow:'hidden',
            }}>
            {/* Header coloré */}
            <div style={{
              background: `linear-gradient(135deg, ${getRoleConfig(selectedMembre.role).color}22, ${getRoleConfig(selectedMembre.role).color}44)`,
              padding:'32px 28px 24px',
              textAlign:'center',
              position:'relative',
            }}>
              <button onClick={() => setSelectedMembre(null)}
                style={{ position:'absolute', top:'16px', right:'16px', background:'rgba(0,0,0,.1)', border:'none', borderRadius:'50%', width:'32px', height:'32px', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>×</button>

              <div style={{ position:'relative', display:'inline-block', marginBottom:'12px' }}>
                <Avatar nom={selectedMembre.nom} role={selectedMembre.role} photoURL={selectedMembre.photoURL} size="xl" style={{ border:'4px solid #fff', boxShadow:'0 8px 24px rgba(0,0,0,.15)' }} />
                <span style={{
                  position:'absolute', bottom:'4px', right:'4px',
                  width:'18px', height:'18px', borderRadius:'50%',
                  background: isOnline(selectedMembre.id) ? '#10b981' : '#d1d5db',
                  border:'3px solid #fff',
                }} />
              </div>

              <h2 style={{ fontSize:'20px', fontWeight:800, color:'#1e293b', marginBottom:'6px' }}>{selectedMembre.nom}</h2>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'6px',
                background: getRoleConfig(selectedMembre.role).bg,
                color: getRoleConfig(selectedMembre.role).color,
                border:`1px solid ${getRoleConfig(selectedMembre.role).border || '#e2e8f0'}`,
                fontSize:'13px', fontWeight:600, padding:'5px 14px', borderRadius:'100px',
              }}>
                <span>{getRoleConfig(selectedMembre.role).icon}</span>
                <span>{getRoleLabel(selectedMembre.role, selectedMembre.titre)}</span>
              </div>
            </div>

            {/* Infos */}
            <div style={{ padding:'24px 28px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'14px', marginBottom:'24px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#f8fafc', borderRadius:'14px' }}>
                  <span style={{ fontSize:'13px', color:'#64748b', fontWeight:500 }}>Statut</span>
                  <span style={{ fontSize:'13px', fontWeight:700, color: isOnline(selectedMembre.id) ? '#10b981' : '#94a3b8' }}>
                    {isOnline(selectedMembre.id) ? '🟢 En ligne' : '⚫ Hors ligne'}
                  </span>
                </div>
                {selectedMembre.email && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#f8fafc', borderRadius:'14px' }}>
                    <span style={{ fontSize:'13px', color:'#64748b', fontWeight:500 }}>Email</span>
                    <span style={{ fontSize:'13px', fontWeight:600, color:'#1e293b' }}>{selectedMembre.email}</span>
                  </div>
                )}
                {selectedMembre.telephone && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#f8fafc', borderRadius:'14px' }}>
                    <span style={{ fontSize:'13px', color:'#64748b', fontWeight:500 }}>Téléphone</span>
                    <span style={{ fontSize:'13px', fontWeight:600, color:'#1e293b' }}>{selectedMembre.telephone}</span>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:'10px' }}>
                {selectedMembre.id !== user?.uid && (
                  <button
                    onClick={() => { setSelectedMembre(null); onNavigate && onNavigate('messagerie', selectedMembre) }}
                    style={{
                      flex:1, padding:'13px', borderRadius:'14px',
                      background:'linear-gradient(135deg,#3b82f6,#6366f1)',
                      color:'#fff', border:'none', fontSize:'14px', fontWeight:600,
                      cursor:'pointer', boxShadow:'0 6px 16px rgba(99,102,241,.35)',
                    }}>
                    ✉️ Envoyer un message
                  </button>
                )}
                <button
                  onClick={() => setSelectedMembre(null)}
                  style={{
                    padding:'13px 20px', borderRadius:'14px',
                    background:'#f1f5f9', color:'#64748b',
                    border:'none', fontSize:'14px', fontWeight:600, cursor:'pointer',
                  }}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}