import { useState, useEffect } from 'react'
import { ref, push, onValue, serverTimestamp, remove } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import * as XLSX from 'xlsx'

export default function Resultats() {
  const { userData } = useAuth()
  const [resultats, setResultats] = useState([])
  const canPublish = userData?.role === 'directrice' || userData?.role === 'superviseure'

  useEffect(() => {
    const resultatsRef = ref(db, 'resultats')
    const unsubscribe = onValue(resultatsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, r]) => ({ id, ...r }))
        list.sort((a, b) => b.timestamp - a.timestamp)
        setResultats(list)
      } else {
        setResultats([])
      }
    })
    return () => unsubscribe()
  }, [])

  const handleFileImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: 'binary' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet)

      for (const row of rows) {
        await push(ref(db, 'resultats'), {
          agent: row['Agent'] || row['agent'] || '',
          periode: row['Période'] || row['periode'] || row['Periode'] || '',
          appels: row['Appels'] || row['appels'] || '',
          ventes: row['Ventes'] || row['ventes'] || '',
          satisfaction: row['Satisfaction'] || row['satisfaction'] || '',
          auteur: userData?.nom,
          timestamp: serverTimestamp()
        })
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  const handleDelete = async (id) => {
    await remove(ref(db, `resultats/${id}`))
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Supprimer tous les résultats ?')) return
    for (const r of resultats) {
      await remove(ref(db, `resultats/${r.id}`))
    }
  }

  const getSatisfactionColor = (satisfaction) => {
    const val = parseInt(satisfaction)
    if (val >= 80) return 'text-green-600'
    if (val >= 60) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📊 Résultats</h1>
          <p className="text-gray-400 text-sm mt-1">Performances de l'équipe</p>
        </div>
        {canPublish && (
          <div className="flex gap-3">
            {resultats.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="bg-red-50 hover:bg-red-100 text-red-500 px-5 py-2.5 rounded-xl font-medium text-sm transition"
              >
                🗑️ Tout supprimer
              </button>
            )}
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition cursor-pointer">
              📂 Importer Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Format attendu */}
      {canPublish && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-sm text-blue-700">
          <strong>Format Excel attendu :</strong> Les colonnes doivent s'appeler exactement :
          <span className="font-mono bg-blue-100 px-1 rounded mx-1">Agent</span>
          <span className="font-mono bg-blue-100 px-1 rounded mx-1">Période</span>
          <span className="font-mono bg-blue-100 px-1 rounded mx-1">Appels</span>
          <span className="font-mono bg-blue-100 px-1 rounded mx-1">Ventes</span>
          <span className="font-mono bg-blue-100 px-1 rounded mx-1">Satisfaction</span>
        </div>
      )}

      {resultats.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
          <div className="text-5xl mb-3">📊</div>
          <p>Aucun résultat pour l'instant</p>
          {canPublish && <p className="text-sm mt-1">Importez un fichier Excel pour commencer</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Agent</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Période</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Appels</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ventes</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Satisfaction</th>
                {canPublish && <th className="px-6 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resultats.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-800">{r.agent}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{r.periode}</td>
                  <td className="px-6 py-4 text-center text-blue-600 font-semibold">{r.appels}</td>
                  <td className="px-6 py-4 text-center text-green-600 font-semibold">{r.ventes}</td>
                  <td className={`px-6 py-4 text-center font-semibold ${getSatisfactionColor(r.satisfaction)}`}>
                    {r.satisfaction}%
                  </td>
                  {canPublish && (
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-500 transition">
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}