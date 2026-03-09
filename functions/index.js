const { onValueCreated } = require('firebase-functions/v2/database')
const admin = require('firebase-admin')
admin.initializeApp()

const db = admin.database()
const messaging = admin.messaging()

// Notification message PRIVE
exports.notifierMessagePrive = onValueCreated(
  '/messages_prives/{convId}/{msgId}',
  async (event) => {
    const msg = event.data.val()
    if (!msg || !msg.senderId) return null

    const convId = event.params.convId
    const uids = convId.split('_')
    const destinataireId = uids.find(uid => uid !== msg.senderId)
    if (!destinataireId) return null

    const tokenSnap = await db.ref('fcm_tokens/' + destinataireId).once('value')
    const tokenData = tokenSnap.val()
    if (!tokenData || !tokenData.token) return null

    const titre = 'Message de ' + (msg.senderNom || 'Quelquun')
    const corps = msg.imageUrl ? 'Photo' : (msg.texte || '')

    const message = {
      token: tokenData.token,
      notification: { title: titre, body: corps },
      data: {
        type: 'message_prive',
        senderId: msg.senderId,
        senderNom: msg.senderNom || '',
        convId: convId,
      },
      webpush: {
        notification: {
          title: titre,
          body: corps,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'msg-prive-' + msg.senderId,
          renotify: true,
        },
        fcmOptions: { link: '/' }
      }
    }

    try {
      await messaging.send(message)
      console.log('Notif privee envoyee a ' + destinataireId)
    } catch (err) {
      console.error('Erreur notif privee:', err)
      if (err.code === 'messaging/registration-token-not-registered') {
        await db.ref('fcm_tokens/' + destinataireId).remove()
      }
    }

    return null
  }
)

// Notification CHAT GROUPE
exports.notifierChatGroupe = onValueCreated(
  '/chat_groupe/{msgId}',
  async (event) => {
    const msg = event.data.val()
    if (!msg || !msg.nom) return null

    const tokensSnap = await db.ref('fcm_tokens').once('value')
    const tokensData = tokensSnap.val()
    if (!tokensData) return null

    const titre = msg.nom + ' dans le chat groupe'
    const corps = msg.imageUrl ? 'Photo' : (msg.texte || '')

    const tokens = Object.entries(tokensData)
      .filter(function(entry) { return entry[1].nom !== msg.nom })
      .map(function(entry) { return entry[1].token })
      .filter(Boolean)

    if (tokens.length === 0) return null

    const messages = tokens.map(function(token) {
      return {
        token: token,
        notification: { title: titre, body: corps },
        data: { type: 'chat_groupe', senderNom: msg.nom },
        webpush: {
          notification: {
            title: titre,
            body: corps,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'chat-groupe',
            renotify: true,
          },
          fcmOptions: { link: '/' }
        }
      }
    })

    try {
      const response = await messaging.sendEach(messages)
      console.log('Groupe: ' + response.successCount + ' envoyes')
      const tokensEntries = Object.entries(tokensData).filter(function(e) { return e[1].token })
      response.responses.forEach(function(resp, i) {
        if (!resp.success && resp.error && resp.error.code === 'messaging/registration-token-not-registered') {
          const uid = tokensEntries[i] && tokensEntries[i][0]
          if (uid) db.ref('fcm_tokens/' + uid).remove()
        }
      })
    } catch (err) {
      console.error('Erreur notif groupe:', err)
    }

    return null
  }
)

// Notification CONSIGNE
exports.notifierConsigne = onValueCreated(
  '/consignes/{consigneId}',
  async (event) => {
    const consigne = event.data.val()
    if (!consigne) return null

    const tokensSnap = await db.ref('fcm_tokens').once('value')
    const tokensData = tokensSnap.val()
    if (!tokensData) return null

    const titre = 'Nouvelle consigne: ' + (consigne.titre || '')
    const corps = 'Par ' + (consigne.auteur || '')

    const tokens = Object.values(tokensData).map(function(d) { return d.token }).filter(Boolean)
    if (tokens.length === 0) return null

    const messages = tokens.map(function(token) {
      return {
        token: token,
        notification: { title: titre, body: corps },
        webpush: {
          notification: {
            title: titre,
            body: corps,
            icon: '/favicon.ico',
            tag: 'consigne',
            renotify: true
          },
          fcmOptions: { link: '/' }
        }
      }
    })

    try {
      const response = await messaging.sendEach(messages)
      console.log('Consigne: ' + response.successCount + ' envoyes')
    } catch (err) {
      console.error('Erreur notif consigne:', err)
    }

    return null
  }
)