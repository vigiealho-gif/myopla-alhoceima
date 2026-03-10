// src/components/Avatar.jsx
// Composant réutilisable — affiche la photo de profil si disponible, sinon les initiales

const getAvatarColor = (role) => {
  if (role === 'directrice') return 'bg-amber-500'
  if (role === 'vigie') return 'bg-indigo-500'
  if (role === 'formateur') return 'bg-teal-500'
  if (['superviseure', 'vigie', 'formateur'].includes(role)) return 'bg-purple-600'
  return 'bg-blue-600'
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Avatar({ nom, role, photoURL, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-24 h-24 text-2xl',
  }
  const sizeClass = sizes[size] || sizes.md

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={nom}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${getAvatarColor(role)} ${className}`}>
      {getInitials(nom)}
    </div>
  )
}