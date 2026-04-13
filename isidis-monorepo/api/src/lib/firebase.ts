import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0]

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Env vars em Railway/Render armazenam \n literal — corrigir para quebra de linha real
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  })
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  await getMessaging(getFirebaseApp()).send({
    token,
    notification: { title, body },
    data: data ?? {},
    android: {
      priority: 'normal',
      notification: { sound: 'default' },
    },
    apns: {
      payload: { aps: { sound: 'default' } },
    },
  })
}
