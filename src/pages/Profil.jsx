import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { ref as dbRef, update } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { db, storage, auth } from '../firebase'

const getAvatarColor = (role) => {
  if (role === 'directrice') return 'from-amber-400 to-amber-600'
  if (role === 'superviseure') return 'from-purple-500 to-purple-700'
  if (role === 'vigie') return 'from-indigo-500 to-indigo-700'
  if (role === 'formateur') return 'from-teal-500 to-teal-700'
  return 'from-blue-500 to-blue-700'
}

const getRoleLabel = (role, titre) => {
  if (titre) return titre
  return { directrice: 'Directrice', superviseure: 'Superviseure', vigie: 'Vigie', formateur: 'Formateur' }[role] || 'Agent'
}

const getRoleBadgeColor = (role) => {
  if (role === 'directrice') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (role === 'superviseure') return 'bg-purple-100 text-purple-700 border-purple-200'
  if (role === 'vigie') return 'bg-indigo-100 text-indigo-700 border-indigo-200'
  if (role === 'formateur') return 'bg-teal-100 text-teal-700 border-teal-200'
  return 'bg-blue-100 text-blue-700 border-blue-200'
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Profil() {
  const { user, userData } = useAuth()

  const [nom, setNom] = useState(userData?.nom || '')
  const [telephone, setTelephone] = useState(userData?.telephone || '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoSuccess, setInfoSuccess] = useState(false)
  const [infoError, setInfoError] = useState('')

  const [ancienMdp, setAncienMdp] = useState('')
  const [nouveauMdp, setNouveauMdp] = useState('')
  const [confirmMdp, setConfirmMdp] = useState('')
  const [savingMdp, setSavingMdp] = useState(false)
  const [mdpSuccess, setMdpSuccess] = useState(false)
  const [mdpError, setMdpError] = useState('')
  const [showAncien, setShowAncien] = useState(false)
  const [showNouveau, setShowNouveau] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoSuccess, setPhotoSuccess] = useState(false)
  const fileInputRef = useRef(null)

  const handleSaveInfo = async () => {
    if (!nom.trim()) return setInfoError('Le nom ne peut pas être vide')
    setSavingInfo(true)
    setInfoError('')
    try {
      await update(dbRef(db, `users/${user.uid}`), {
        nom: nom.trim(),
        telephone: telephone.trim()
      })
      setInfoSuccess(true)
      setTimeout(() => setInfoSuccess(false), 3000)
    } catch (err) {
      setInfoError('Erreur lors de la sauvegarde')
    }
    setSavingInfo(false)
  }

  const handleChangePassword = async () => {
    setMdpError('')
    if (!ancienMdp || !nouveauMdp || !confirmMdp) return setMdpError('Remplis tous les champs')
    if (nouveauMdp.length < 6) return setMdpError('Le mot de passe doit contenir au moins 6 caractères')
    if (nouveauMdp !== confirmMdp) return setMdpError('Les mots de passe ne correspondent pas')

    setSavingMdp(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, ancienMdp)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, nouveauMdp)
      setMdpSuccess(true)
      setAncienMdp(''); setNouveauMdp(''); setConfirmMdp('')
      setTimeout(() => setMdpSuccess(false), 3000)
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setMdpError('Ancien mot de passe incorrect')
      } else {
        setMdpError('Erreur : ' + err.message)
      }
    }
    setSavingMdp(false)
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return alert('Photo trop lourde (max 2MB)')

    setUploadingPhoto(true)
    try {
      const fileRef = storageRef(storage, `photos_profil/${user.uid}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      await update(dbRef(db, `users/${user.uid}`), { photoURL: url })
      setPhotoSuccess(true)
      setTimeout(() => setPhotoSuccess(false), 3000)
    } catch (err) {
      alert('Erreur lors du téléchargement')
    }
    setUploadingPhoto(false)
  }

  const getMdpStrength = (pwd) => {
    if (!pwd) return null
    if (pwd.length < 6) return { label: 'Trop court', color: 'bg-red-400', width: 'w-1/4' }
    if (pwd.length < 8) return { label: 'Faible', color: 'bg-orange-400', width: 'w-2/4' }
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Moyen', color: 'bg-yellow-400', width: 'w-3/4' }
    return { label: 'Fort', color: 'bg-green-500', width: 'w-full' }
  }

  const strength = getMdpStrength(nouveauMdp)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/2"></div>
        <div className="relative px-8 py-8">
          <h1 className="text-2xl font-bold text-white mb-1">👤 Mon Profil</h1>
          <p className="text-blue-200 text-sm">Gérez vos informations personnelles</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Card Photo + Infos identité */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Photo de profil</h2>
          </div>
          <div className="px-6 py-6 flex items-center gap-6">
            <div className="relative flex-shrink-0">
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt="profil"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-100" />
              ) : (
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarColor(userData?.role)} flex items-center justify-center text-white text-2xl font-bold ring-4 ring-blue-100`}>
                  {getInitials(userData?.nom)}
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-gray-800">{userData?.nom}</div>
              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border mt-1 ${getRoleBadgeColor(userData?.role)}`}>
                {getRoleLabel(userData?.role, userData?.titre)}
              </span>
              <div className="text-xs text-gray-400 mt-1">{user?.email}</div>
              <div className="flex gap-3 mt-4">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" />
                <button onClick={() => fileInputRef.current.click()} disabled={uploadingPhoto}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50">
                  📸 {uploadingPhoto ? 'Téléchargement...' : 'Changer la photo'}
                </button>
                {userData?.photoURL && (
                  <button onClick={async () => {
                    await update(dbRef(db, `users/${user.uid}`), { photoURL: null })
                  }} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm transition">
                    Supprimer
                  </button>
                )}
              </div>
              {photoSuccess && <p className="text-green-600 text-sm mt-2 font-medium">✅ Photo mise à jour !</p>}
              <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 2MB</p>
            </div>
          </div>
        </div>

        {/* Card Informations personnelles */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">✏️ Informations personnelles</h2>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label>
              <input type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                placeholder="Votre nom complet"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro de téléphone</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📞</span>
                <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
                  placeholder="06 XX XX XX XX"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={user?.email || ''} disabled
                className="w-full px-4 py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-400 text-sm cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rôle</label>
              <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${getRoleBadgeColor(userData?.role)}`}>
                {getRoleLabel(userData?.role, userData?.titre)}
                <span className="text-xs opacity-60">(fixe)</span>
              </div>
            </div>

            {infoError && <p className="text-red-500 text-sm font-medium">⚠️ {infoError}</p>}
            {infoSuccess && <p className="text-green-600 text-sm font-medium">✅ Informations sauvegardées !</p>}

            <button onClick={handleSaveInfo} disabled={savingInfo}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium text-sm transition disabled:opacity-50">
              {savingInfo ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Card Changer mot de passe */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">🔑 Changer le mot de passe</h2>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ancien mot de passe</label>
              <div className="relative">
                <input type={showAncien ? 'text' : 'password'} value={ancienMdp} onChange={(e) => setAncienMdp(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition" />
                <button type="button" onClick={() => setShowAncien(!showAncien)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                  {showAncien ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <input type={showNouveau ? 'text' : 'password'} value={nouveauMdp} onChange={(e) => setNouveauMdp(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition" />
                <button type="button" onClick={() => setShowNouveau(!showNouveau)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                  {showNouveau ? '🙈' : '👁️'}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`}></div>
                  </div>
                  <p className={`text-xs mt-1 font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le nouveau mot de passe</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirmMdp} onChange={(e) => setConfirmMdp(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmMdp && nouveauMdp && (
                <p className={`text-xs mt-1 font-medium ${confirmMdp === nouveauMdp ? 'text-green-600' : 'text-red-500'}`}>
                  {confirmMdp === nouveauMdp ? '✅ Les mots de passe correspondent' : '❌ Les mots de passe ne correspondent pas'}
                </p>
              )}
            </div>

            {mdpError && <p className="text-red-500 text-sm font-medium">⚠️ {mdpError}</p>}
            {mdpSuccess && <p className="text-green-600 text-sm font-medium">✅ Mot de passe changé avec succès !</p>}

            <button onClick={handleChangePassword} disabled={savingMdp}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium text-sm transition disabled:opacity-50">
              {savingMdp ? '⏳ Mise à jour...' : '🔑 Changer le mot de passe'}
            </button>
          </div>
        </div>

        {/* Card Infos compte */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">ℹ️ Informations du compte</h2>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Identifiant</span>
              <span className="text-sm font-mono text-gray-400 text-xs">{user?.uid?.slice(0, 16)}...</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-gray-700">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Téléphone</span>
              <span className="text-sm font-medium text-gray-700">{userData?.telephone || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Rôle</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getRoleBadgeColor(userData?.role)}`}>
                {getRoleLabel(userData?.role, userData?.titre)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">Membre depuis</span>
              <span className="text-sm font-medium text-gray-700">
                {user?.metadata?.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}