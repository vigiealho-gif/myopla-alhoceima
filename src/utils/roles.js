// src/utils/roles.js
// Utilitaire centralisé pour la gestion des rôles

export const isSupOrEquivalent = (role) =>
  ['superviseure', 'vigie', 'formateur'].includes(role)

export const getRoleLabel = (role) => {
  switch (role) {
    case 'directrice':   return 'Directrice'
    case 'superviseure': return 'Superviseure'
    case 'vigie':        return 'Vigie'
    case 'formateur':    return 'Formateur'
    default:             return 'Agent'
  }
}

export const getRoleColor = (role) => {
  switch (role) {
    case 'directrice':   return 'bg-amber-100 text-amber-600'
    case 'superviseure': return 'bg-purple-100 text-purple-600'
    case 'vigie':        return 'bg-indigo-100 text-indigo-600'
    case 'formateur':    return 'bg-teal-100 text-teal-600'
    default:             return 'bg-blue-100 text-blue-600'
  }
}

export const getRoleTextColor = (role) => {
  switch (role) {
    case 'directrice':   return 'text-amber-600'
    case 'superviseure': return 'text-purple-600'
    case 'vigie':        return 'text-indigo-600'
    case 'formateur':    return 'text-teal-600'
    default:             return 'text-blue-600'
  }
}

export const getAvatarColor = (role) => {
  switch (role) {
    case 'directrice':   return 'bg-amber-500'
    case 'superviseure': return 'bg-purple-600'
    case 'vigie':        return 'bg-indigo-500'
    case 'formateur':    return 'bg-teal-500'
    default:             return 'bg-blue-600'
  }
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase()
}