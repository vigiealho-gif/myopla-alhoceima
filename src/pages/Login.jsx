import { useState } from 'react'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'
import logo from '../assets/logo.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('Aucun compte trouvé avec cet email.')
          break
        case 'auth/wrong-password':
          setError('Mot de passe incorrect.')
          break
        case 'auth/invalid-email':
          setError('Adresse email invalide.')
          break
        default:
          setError('Erreur de connexion. Réessayez.')
      }
    }
    setLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSuccess(true)
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('Aucun compte trouvé avec cet email.')
          break
        case 'auth/invalid-email':
          setError('Adresse email invalide.')
          break
        default:
          setError('Erreur. Réessayez.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        <div className="text-center mb-8">
          <img src={logo} alt="Myopla" className="h-14 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Myopla Al Hoceima</h1>
          <p className="text-gray-500 text-sm mt-1">Plateforme Interne</p>
        </div>

        {resetMode ? (
          // Mode réinitialisation mot de passe
          resetSuccess ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="font-bold text-gray-800 mb-2">Email envoyé !</h2>
              <p className="text-gray-500 text-sm mb-6">
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail.
              </p>
              <button
                onClick={() => { setResetMode(false); setResetSuccess(false) }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <h2 className="font-bold text-gray-800 mb-1">Réinitialiser le mot de passe</h2>
                <p className="text-gray-400 text-sm mb-4">Entrez votre email pour recevoir un lien de réinitialisation</p>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 transition"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>

              <button
                type="button"
                onClick={() => { setResetMode(false); setError('') }}
                className="w-full text-gray-400 hover:text-gray-600 text-sm transition"
              >
                ← Retour à la connexion
              </button>
            </form>
          )
        ) : (
          // Mode connexion normal
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 transition"
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setResetMode(true); setError('') }}
                className="text-sm text-blue-600 hover:text-blue-700 transition"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Accès réservé aux membres de l'équipe Myopla
        </p>
      </div>
    </div>
  )
}