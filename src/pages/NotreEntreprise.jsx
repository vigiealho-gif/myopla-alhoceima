import { useState, useEffect } from 'react'
import { ref, onValue, set } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import myoplaBuilding from '../assets/myopla-building.jpg'

export default function NotreEntreprise() {
  const { userData } = useAuth()
  const [presentation, setPresentation] = useState(null)
  const [membres, setMembres] = useState([])
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('presentation')
  const [form, setForm] = useState({ nom: '', description: '', mission: '', vision: '', valeurs: '' })

  const canEdit = userData?.role === 'directrice' || userData?.role === 'superviseure'

  useEffect(() => {
    const presRef = ref(db, 'entreprise')
    const unsubscribe = onValue(presRef, (snap) => {
      const data = snap.val()
      if (data) { setPresentation(data); setForm(data) }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const usersRef = ref(db, 'users')
    const unsubscribe = onValue(usersRef, (snap) => {
      const data = snap.val()
      if (data) setMembres(Object.entries(data).map(([id, u]) => ({ id, ...u })))
    })
    return () => unsubscribe()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    await set(ref(db, 'entreprise'), form)
    setEditing(false)
  }

  const agents = membres.filter(m => m.role === 'agent')
  const superviseures = membres.filter(m => m.role === 'superviseure')

  const PINK = '#ec4899'
  const BLUE = '#3b82f6'
  const NAVY = '#1e3a6e'
  const BG = 'rgba(8,18,45,0.92)'

  const Line = ({ x1, y1, x2, y2 }) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={PINK} strokeWidth={1.5} fill="none" />
  )

  const Box = ({ cx, cy, w, h, text, sub, color = BLUE, badge = null }) => (
    <g>
      {badge && <>
        <rect x={cx - 44} y={cy - h/2 - 22} width={88} height={17} rx={8} fill={PINK} />
        <text x={cx} y={cy - h/2 - 10} textAnchor="middle" fill="white" fontSize={8.5} fontWeight="bold" letterSpacing="1.5">{badge}</text>
      </>}
      <rect x={cx - w/2} y={cy - h/2} width={w} height={h} rx={10} fill={BG} stroke={color} strokeWidth={1.5} />
      <text x={cx} y={sub ? cy - 7 : cy + 4} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold">{text}</text>
      {sub && <text x={cx} y={cy + 11} textAnchor="middle" fill={color === PINK ? '#f9a8d4' : '#93c5fd'} fontSize={7.5} letterSpacing="1.2">{sub}</text>}
    </g>
  )

  const Box2 = ({ cx, cy, w, h, l1, l2, sub, color = BLUE }) => (
    <g>
      <rect x={cx - w/2} y={cy - h/2} width={w} height={h} rx={10} fill={BG} stroke={color} strokeWidth={1.5} />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">{l1}</text>
      <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">{l2}</text>
      {sub && <text x={cx} y={cy + 20} textAnchor="middle" fill="#93c5fd" fontSize={7} letterSpacing="1">{sub}</text>}
    </g>
  )

  const Box3 = ({ cx, cy, w, h, l1, l2, s1, s2, color = BLUE }) => (
    <g>
      <rect x={cx - w/2} y={cy - h/2} width={w} height={h} rx={10} fill={BG} stroke={color} strokeWidth={1.5} />
      <text x={cx} y={cy - 14} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">{l1}</text>
      <text x={cx} y={cy + 2} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">{l2}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill="#93c5fd" fontSize={7} letterSpacing="1">{s1}</text>
      <text x={cx} y={cy + 29} textAnchor="middle" fill="#93c5fd" fontSize={7} letterSpacing="1">{s2}</text>
    </g>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏢 Notre Entreprise</h1>
          <p className="text-gray-400 text-sm mt-1">Présentation de Myopla Al Hoceima</p>
        </div>
        {canEdit && activeTab === 'presentation' && (
          <button onClick={() => setEditing(!editing)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition">
            {editing ? 'Annuler' : '✏️ Modifier'}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => { setActiveTab('presentation'); setEditing(false) }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition ${activeTab === 'presentation' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'}`}>
          🏢 Présentation
        </button>
        <button onClick={() => { setActiveTab('organigramme'); setEditing(false) }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition ${activeTab === 'organigramme' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'}`}>
          👥 Organigramme
        </button>
      </div>

      {/* ══ TAB PRÉSENTATION ══ */}
      {activeTab === 'presentation' && (
        <>
          {editing ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <form onSubmit={handleSave} className="space-y-4">
                {[
                  { label: "Nom de l'entreprise", key: 'nom', placeholder: 'Ex: Myopla Al Hoceima', type: 'input' },
                  { label: 'Description', key: 'description', placeholder: "Description...", type: 'textarea' },
                  { label: 'Notre Mission', key: 'mission', placeholder: 'La mission...', type: 'textarea' },
                  { label: 'Notre Vision', key: 'vision', placeholder: 'La vision...', type: 'textarea' },
                  { label: 'Nos Valeurs', key: 'valeurs', placeholder: 'Les valeurs...', type: 'textarea' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                    {field.type === 'input'
                      ? <input type="text" value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} placeholder={field.placeholder} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                      : <textarea value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} placeholder={field.placeholder} rows={4} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-y" />
                    }
                  </div>
                ))}
                <div className="flex gap-3">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition">Enregistrer</button>
                  <button type="button" onClick={() => setEditing(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium text-sm transition">Annuler</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── PHOTO DU BÂTIMENT ── */}
              <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ height: '380px' }}>
                <img
                  src={myoplaBuilding}
                  alt="Myopla Al Hoceima"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex items-end p-8">
                  <div>
                    <div className="text-white text-3xl font-black tracking-wide">
                      {presentation?.nom || 'Myopla Al Hoceima'}
                    </div>
                    <div className="text-blue-300 text-sm mt-1">Centre d'appels — Al Hoceima • Rif ⵣ</div>
                  </div>
                </div>
              </div>

              {/* ── STATS ── */}
              {presentation && (
                <>
                  <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    {/* ✅ whitespace-pre-wrap pour la description */}
                    {presentation.description && (
                      <p className="text-blue-100 leading-relaxed relative mb-5 whitespace-pre-wrap">{presentation.description}</p>
                    )}
                    <div className="grid grid-cols-3 gap-4 relative">
                      {[
                        { label: 'Agents', value: agents.length, icon: '👤' },
                        { label: 'Superviseures', value: superviseures.length, icon: '⭐' },
                        { label: 'Équipe totale', value: membres.length, icon: '👥' },
                      ].map((s, i) => (
                        <div key={i} className="bg-white bg-opacity-10 rounded-xl p-3 text-center border border-white border-opacity-10">
                          <div className="text-xl mb-1">{s.icon}</div>
                          <div className="text-2xl font-bold">{s.value}</div>
                          <div className="text-blue-200 text-xs">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── MISSION / VISION / VALEURS ── */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { key: 'mission', icon: '🎯', title: 'Notre Mission', color: 'border-blue-500' },
                      { key: 'vision', icon: '🔭', title: 'Notre Vision', color: 'border-indigo-500' },
                      { key: 'valeurs', icon: '💎', title: 'Nos Valeurs', color: 'border-purple-500' },
                    ].map(card => presentation[card.key] && (
                      <div key={card.key} className={`bg-white rounded-2xl p-6 shadow-sm border-t-4 ${card.color}`}>
                        <div className="text-3xl mb-3">{card.icon}</div>
                        <h3 className="font-bold text-gray-800 mb-2">{card.title}</h3>
                        {/* ✅ whitespace-pre-wrap respecte les sauts de ligne */}
                        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{presentation[card.key]}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!presentation && (
                <div className="text-center text-gray-400 mt-10">
                  <div className="text-4xl mb-3">🏢</div>
                  <p>Aucune présentation pour l'instant</p>
                  {canEdit && <p className="text-sm mt-1">Cliquez sur "Modifier" pour ajouter une présentation</p>}
                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* ══ TAB ORGANIGRAMME ══ */}
      {activeTab === 'organigramme' && (
        <div className="rounded-2xl" style={{ background: 'linear-gradient(135deg,#060d1f,#0a1628,#0d1f3c)', padding: '40px 20px 60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: '24px', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'Georgia,serif' }}>SITE AL HOCIMA</div>
            <div style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>Organigramme</div>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="580" viewBox="0 0 1600 580" style={{ display: 'block' }}>

              {/* ── N1 Houda ── */}
              <Box cx={800} cy={60} w={220} h={52} text="Houda CHOUIEKH" sub="DIRECTRICE DE SITE" color={PINK} badge="DIRECTION" />
              <Line x1={800} y1={86} x2={800} y2={128} />

              {/* H N1→N2 */}
              <Line x1={650} y1={128} x2={1380} y2={128} />
              <Line x1={650} y1={128} x2={650} y2={162} />
              <Line x1={1380} y1={128} x2={1380} y2={162} />

              {/* ── N2 Adnane + Sanae ── */}
              <Box cx={650} cy={190} w={240} h={52} text="Adnane ElBouzaidi Cheikhi" sub="ENCADRANT ASY / FRONT" />
              <Box cx={1380} cy={190} w={240} h={52} text="Sanae SOUMAR" sub="CHARGÉE DE FLUX ET PILOTAGE" />

              {/* Adnane → bas */}
              <Line x1={650} y1={216} x2={650} y2={255} />

              {/* H N2→N3 */}
              <Line x1={300} y1={255} x2={1100} y2={255} />
              <Line x1={300}  y1={255} x2={300}  y2={288} />
              <Line x1={750}  y1={255} x2={750}  y2={288} />
              <Line x1={1100} y1={255} x2={1100} y2={288} />

              {/* ── N3 SupFront + SupASY + Formateur ── */}
              <Box cx={300}  cy={316} w={210} h={52} text="Superviseurs Front" sub="FRONT" />
              <Box cx={750}  cy={316} w={210} h={52} text="Superviseurs ASY" sub="ASY" />
              <Box2 cx={1100} cy={323} w={200} h={62} l1="Mohamed Ayoub" l2="Bouckachab" sub="FORMATEUR" />

              {/* SupFront → bas */}
              <Line x1={300} y1={342} x2={300} y2={378} />

              {/* H agents Front : 70 → 650 */}
              <Line x1={70}  y1={378} x2={650} y2={378} />
              <Line x1={70}  y1={378} x2={70}  y2={408} />
              <Line x1={230} y1={378} x2={230} y2={408} />
              <Line x1={390} y1={378} x2={390} y2={408} />
              <Line x1={650} y1={378} x2={650} y2={408} />

              {/* ── N4 Agents Front ── */}
              <Box2 cx={70}  cy={448} w={130} h={65} l1="Chaimae"  l2="Hdidouch"   sub="SUPERVISEURE FRONT" color={NAVY} />
              <Box2 cx={230} cy={448} w={130} h={65} l1="Fatima"   l2="ALLAT"       sub="SUPERVISEURE FRONT" color={NAVY} />
              <Box2 cx={390} cy={448} w={130} h={65} l1="Ikram"    l2="Allat"       sub="SUPERVISEURE FRONT" color={NAVY} />
              <Box2 cx={650} cy={448} w={145} h={65} l1="Safae"    l2="Bouisaferne" sub="SUPERVISEURE FRONT" color={NAVY} />

              {/* SupASY → bas */}
              <Line x1={750} y1={342} x2={750} y2={378} />

              {/* H agents ASY : 780 → 1010 */}
              <Line x1={780} y1={378} x2={1010} y2={378} />
              <Line x1={780} y1={378} x2={780}  y2={408} />
              <Line x1={900} y1={378} x2={900}  y2={408} />
              <Line x1={1010} y1={378} x2={1010} y2={408} />

              {/* ── N4 Agents ASY ── */}
              <Box2 cx={780}  cy={448} w={145} h={65} l1="Kaoutar" l2="Zaghdoud"  sub="SUPERVISEURE ASY MP" color={NAVY} />
              <Box2 cx={920}  cy={448} w={145} h={65} l1="Yasmina" l2="LABHAR"    sub="SUPERVISEURE ASY CD" color={NAVY} />
              <Box3 cx={1060} cy={453} w={155} h={75} l1="Ayoub"   l2="Bouharaka" s1="RÉFÉRENT MÉTIER" s2="ASY MP" color={NAVY} />

            </svg>
          </div>
        </div>
      )}
    </div>
  )
}