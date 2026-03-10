import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'
import logo from '../assets/logo.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [focused, setFocused] = useState(null)

  useEffect(() => {
    setTimeout(() => setMounted(true), 50)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
          setError('Email ou mot de passe incorrect.')
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#0a0f1e',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .login-wrap * { font-family: 'Outfit', 'Segoe UI', sans-serif; }

        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.97); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 20px) scale(1.03); }
          66% { transform: translate(20px, -30px) scale(0.98); }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -25px); }
        }
        @keyframes gridMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(60px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(99, 179, 237, 0.3); box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.05); }
          50% { border-color: rgba(99, 179, 237, 0.6); box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.1); }
        }
        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes particle {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) scale(1); opacity: 0; }
        }

        .input-field {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 14px 18px;
          color: #fff;
          font-size: 15px;
          font-family: 'Outfit', sans-serif;
          transition: all 0.3s ease;
          outline: none;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.25); }
        .input-field:focus {
          border-color: rgba(99, 179, 237, 0.7);
          background: rgba(99, 179, 237, 0.05);
          box-shadow: 0 0 0 4px rgba(99, 179, 237, 0.1);
        }
        .input-field:-webkit-autofill,
        .input-field:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #131929 inset;
          -webkit-text-fill-color: #fff;
        }

        .btn-primary {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          border: none;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: white;
          letter-spacing: 0.3px;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(99, 102, 241, 0.4);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.5s ease;
        }
        .btn-primary:hover::before { left: 100%; }

        .label-text {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          margin-bottom: 8px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .card-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          padding: 40px;
          width: 100%;
          max-width: 420px;
        }

        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(99, 179, 237, 0.6);
          animation: particle linear infinite;
          pointer-events: none;
        }
      `}</style>

      {/* Orbes animées en arrière-plan */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'floatOrb1 12s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'floatOrb2 15s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '40%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'floatOrb3 10s ease-in-out infinite',
        }} />

        {/* Grille animée */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99,179,237,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,179,237,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'gridMove 8s linear infinite',
        }} />

        {/* Particules */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${10 + i * 12}%`,
            animationDuration: `${6 + i * 1.5}s`,
            animationDelay: `${i * 0.8}s`,
            opacity: 0.4 + (i % 3) * 0.2,
          }} />
        ))}
      </div>

      {/* Côté gauche — branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(-30px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '100px',
          padding: '6px 16px',
          marginBottom: '32px',
          width: 'fit-content',
          animation: 'fadeIn 1s ease 0.3s both',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', animation: 'pulse 2s ease infinite' }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.5px' }}>
            Plateforme Interne
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 4vw, 52px)',
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.1,
          marginBottom: '20px',
          animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        }}>
          Myopla<br />
          <span style={{
            background: 'linear-gradient(135deg, #60a5fa, #818cf8, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Al Hoceima</span>
        </h1>

        <p style={{
          fontSize: '16px',
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.7,
          maxWidth: '380px',
          marginBottom: '48px',
          animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
        }}>
          Votre espace de travail centralisé — communications, consignes et gestion d'équipe au même endroit.
        </p>

        {/* Features */}
        {[
          { icon: '💬', label: 'Messagerie temps réel' },
          { icon: '📋', label: 'Consignes & Planning' },
          { icon: '🔔', label: 'Notifications instantanées' },
        ].map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '14px',
            animation: `slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.1}s both`,
          }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>{f.icon}</div>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{f.label}</span>
          </div>
        ))}

        {/* Amazigh symbol */}
        <div style={{
          marginTop: '48px',
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'fadeIn 1s ease 0.7s both',
        }}>
          <span style={{ fontSize: '28px', opacity: 0.3 }}>ⵣ</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Al Hoceima · Rif
          </span>
        </div>
      </div>

      {/* Séparateur vertical */}
      <div style={{
        width: '1px',
        background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent)',
        margin: '60px 0',
        flexShrink: 0,
      }} />

      {/* Côté droit — formulaire */}
      <div style={{
        width: '480px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 48px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(30px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
        position: 'relative',
        zIndex: 1,
      }} className="login-wrap">

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '40px',
          animation: 'fadeIn 0.8s ease 0.2s both',
        }}>
          <img src={logo} alt="Myopla" style={{ height: '36px', objectFit: 'contain' }} />
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>Accès membre</span>
        </div>

        <div className="card-panel" style={{
          animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
        }}>

          {resetMode ? (
            resetSuccess ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '64px', height: '64px',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', margin: '0 auto 20px',
                }}>📧</div>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>Email envoyé !</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
                  Un lien de réinitialisation a été envoyé à<br />
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{email}</strong>
                </p>
                <button className="btn-primary" onClick={() => { setResetMode(false); setResetSuccess(false) }}>
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Mot de passe oublié</h2>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', lineHeight: 1.6 }}>
                    Entrez votre email pour recevoir un lien de réinitialisation
                  </p>
                </div>
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label className="label-text">Adresse email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="votre@email.com" required className="input-field"
                    />
                  </div>
                  {error && (
                    <div style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#fca5a5', fontSize: '13px', padding: '12px 16px', borderRadius: '12px',
                      animation: 'errorShake 0.4s ease',
                    }}>{error}</div>
                  )}
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                        Envoi en cours...
                      </span>
                    ) : 'Envoyer le lien'}
                  </button>
                  <button type="button" onClick={() => { setResetMode(false); setError('') }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '13px', cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
                    ← Retour à la connexion
                  </button>
                </form>
              </div>
            )
          ) : (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>Bienvenue 👋</h2>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Connectez-vous à votre espace</p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label className="label-text">Adresse email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com" required className="input-field"
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  />
                </div>

                <div>
                  <label className="label-text">Mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required className="input-field"
                      style={{ paddingRight: '48px' }}
                      onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.3)', fontSize: '16px', padding: '4px',
                      transition: 'color 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                  <button type="button" onClick={() => { setResetMode(true); setError('') }}
                    style={{ background: 'none', border: 'none', color: 'rgba(99,179,237,0.7)', fontSize: '13px', cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#60a5fa'}
                    onMouseLeave={e => e.target.style.color = 'rgba(99,179,237,0.7)'}>
                    Mot de passe oublié ?
                  </button>
                </div>

                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#fca5a5', fontSize: '13px', padding: '12px 16px', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    animation: 'errorShake 0.4s ease',
                  }}>
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                      Connexion...
                    </span>
                  ) : 'Se connecter →'}
                </button>
              </form>

              <div style={{
                marginTop: '24px', paddingTop: '24px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.3px' }}>
                  Accès réservé aux membres de l'équipe Myopla
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px', textAlign: 'center',
          animation: 'fadeIn 1s ease 0.6s both',
        }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.5px' }}>
            © 2025 Myopla Al Hoceima · Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  )
}