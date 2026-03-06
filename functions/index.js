// functions/index.js
const { onValueCreated } = require("firebase-functions/v2/database")
const { initializeApp } = require("firebase-admin/app")
const { getMessaging } = require("firebase-admin/messaging")
const { getDatabase } = require("firebase-admin/database")

initializeApp()

// ─────────────────────────────────────────────
// 🔔 Notification : nouveau message privé
// ─────────────────────────────────────────────
exports.notifyMessagePrive = onValueCreated(
  {
    ref: "/messages_prives/{convId}/{msgId}",
    region: "us-central1",
    database: "https://callconnect-b328a-default-rtdb.firebaseio.com",
  },
  async (event) => {
    const msg = event.data.val()
    if (!msg || !msg.senderId) return

    const convId = event.params.convId
    const uids = convId.split("_")
    const receiverUid = uids.find((uid) => uid !== msg.senderId)
    if (!receiverUid) return

    const db = getDatabase()
    const tokenSnap = await db.ref(`fcm_tokens/${receiverUid}`).get()
    if (!tokenSnap.exists()) return

    const { token } = tokenSnap.val()
    if (!token) return

    const title = `✉️ ${msg.senderNom || "Message privé"}`
    const body = msg.imageUrl ? "📷 Photo" : msg.texte || ""

    try {
      await getMessaging().send({
        token,
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: `msg-prive-${msg.senderId}`,
            renotify: "true",
            vibrate: "200,100,200",
          },
          fcmOptions: { link: "/" },
        },
      })
    } catch (e) {
      if (e.code === "messaging/registration-token-not-registered") {
        await db.ref(`fcm_tokens/${receiverUid}`).remove()
      }
    }
  }
)

// ─────────────────────────────────────────────
// 🔔 Notification : nouveau message groupe
// ─────────────────────────────────────────────
exports.notifyMessageGroupe = onValueCreated(
  {
    ref: "/chat_groupe/{msgId}",
    region: "us-central1",
    database: "https://callconnect-b328a-default-rtdb.firebaseio.com",
  },
  async (event) => {
    const msg = event.data.val()
    if (!msg || !msg.nom) return

    const db = getDatabase()
    const tokensSnap = await db.ref("fcm_tokens").get()
    if (!tokensSnap.exists()) return

    const tokens = []
    tokensSnap.forEach((child) => {
      const uid = child.key
      const { token, nom } = child.val()
      if (nom !== msg.nom && token) tokens.push({ uid, token })
    })

    if (tokens.length === 0) return

    const title = `💬 ${msg.nom}`
    const body = msg.imageUrl ? "📷 Photo" : msg.texte || ""

    await Promise.all(
      tokens.map(async ({ uid, token }) => {
        try {
          await getMessaging().send({
            token,
            notification: { title, body },
            webpush: {
              notification: {
                title,
                body,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: "chat-groupe",
                renotify: "true",
                vibrate: "200,100,200",
              },
              fcmOptions: { link: "/" },
            },
          })
        } catch (e) {
          if (e.code === "messaging/registration-token-not-registered") {
            await db.ref(`fcm_tokens/${uid}`).remove()
          }
        }
      })
    )
  }
)