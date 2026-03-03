export default function MobileBlock({ children }) {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768

  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #060d1f, #0a1628, #0d1f3c)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🖥️</div>
        <div style={{
          color: 'white',
          fontSize: '22px',
          fontWeight: 'bold',
          marginBottom: '12px',
          letterSpacing: '0.05em'
        }}>
          Accès réservé aux postes de travail
        </div>
        <div style={{
          color: '#93c5fd',
          fontSize: '14px',
          lineHeight: 1.7,
          maxWidth: '300px',
          marginBottom: '32px'
        }}>
          Cette application est exclusivement accessible depuis les ordinateurs de l'entreprise.
          Veuillez vous connecter depuis votre poste de travail.
        </div>
        <div style={{
          background: 'rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '16px',
          padding: '16px 24px',
          color: '#93c5fd',
          fontSize: '13px'
        }}>
          📍 Myopla Al Hoceima — Plateforme Interne
        </div>
      </div>
    )
  }

  return children
}