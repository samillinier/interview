import { cert, getApps, initializeApp } from 'firebase-admin/app'
import type { App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import type { MulticastMessage } from 'firebase-admin/messaging'
import prisma from '@/lib/db'

function getFirebaseApp(): App | null {
  const existing = getApps()
  if (existing.length > 0) return existing[0]

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    })
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (serviceAccountJson) {
    try {
      return initializeApp({
        credential: cert(JSON.parse(serviceAccountJson)),
      })
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error)
      return null
    }
  }

  return null
}

export function isPushConfigured(): boolean {
  return Boolean(
    (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY) ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  )
}

function getPushConfigGap(): string {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return ''
  const missing: string[] = []
  if (!process.env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID')
  if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL')
  if (!process.env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY')
  return missing.length ? `missing ${missing.join(', ')}` : 'not-configured'
}

export async function sendPushToInstaller(args: {
  installerId: string
  title: string
  body: string
  link?: string | null
  data?: Record<string, string>
}): Promise<PushSendResult> {
  return sendPushToInstallers({
    installerIds: [args.installerId],
    title: args.title,
    body: args.body,
    link: args.link,
    data: args.data,
  })
}

export type PushSendResult = {
  sent: number
  failed: number
  skipped: boolean
  reason?: string
  errors?: string[]
}

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
  'messaging/mismatched-credential',
])

export async function sendPushToInstallers(args: {
  installerIds: string[]
  title: string
  body: string
  link?: string | null
  data?: Record<string, string>
}): Promise<PushSendResult> {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0, skipped: true, reason: getPushConfigGap() }
  }

  const app = getFirebaseApp()
  if (!app) {
    return { sent: 0, failed: 0, skipped: true, reason: 'init-failed' }
  }

  const tokens = await prisma.deviceToken.findMany({
    where: { installerId: { in: args.installerIds } },
    select: { token: true },
  })

  const uniqueTokens = Array.from(new Set(tokens.map((t) => t.token)))
  if (uniqueTokens.length === 0) {
    return { sent: 0, failed: 0, skipped: true, reason: 'no-tokens' }
  }

  const message: MulticastMessage = {
    notification: {
      title: args.title,
      body: args.body,
    },
    data: {
      ...(args.link ? { link: args.link } : {}),
      ...(args.data || {}),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
      },
      payload: {
        aps: {
          alert: {
            title: args.title,
            body: args.body,
          },
          sound: 'default',
          badge: 1,
          contentAvailable: true,
        },
      },
    },
    tokens: uniqueTokens,
  }

  try {
    const messaging = getMessaging(app)
    const result = await messaging.sendEachForMulticast(message)

    // Remove tokens that FCM reported as invalid/expired so they don't keep failing.
    const invalidTokens: string[] = []
    const errors: string[] = []
    result.responses.forEach((response, index) => {
      if (response.success) return
      const err = response.error
      const code = err?.code || 'unknown'
      const msg = err?.message || 'no message'
      errors.push(`${code}: ${msg}`)
      console.error('FCM send failure:', code, msg, uniqueTokens[index]?.slice(0, 16))
      if (INVALID_TOKEN_ERROR_CODES.has(code)) {
        invalidTokens.push(uniqueTokens[index])
      }
    })

    if (invalidTokens.length > 0) {
      await prisma.deviceToken
        .deleteMany({ where: { token: { in: invalidTokens } } })
        .catch(() => {})
    }

    return {
      sent: result.successCount,
      failed: result.failureCount,
      skipped: false,
      reason: errors[0],
      errors: errors.length ? errors : undefined,
    }
  } catch (error: any) {
    console.error('Failed to send push notifications:', error)
    return {
      sent: 0,
      failed: uniqueTokens.length,
      skipped: false,
      reason: error?.message || 'send-error',
      errors: [error?.message || 'send-error'],
    }
  }
}
