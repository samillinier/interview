import { cert, getApps, initializeApp } from 'firebase-admin/app'
import type { App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import type { MulticastMessage } from 'firebase-admin/messaging'
import prisma from '@/lib/db'

function getFirebaseApp(): App | null {
  const existing = getApps()
  if (existing.length > 0) return existing[0]

  // Prefer the full service-account JSON (most reliable on Vercel).
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson)
      return initializeApp({
        credential: cert(parsed),
      })
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error)
      return null
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()

  // If someone pasted the whole JSON into PRIVATE_KEY by mistake, accept it.
  if (privateKey?.startsWith('{')) {
    try {
      const parsed = JSON.parse(privateKey)
      return initializeApp({
        credential: cert(parsed),
      })
    } catch (error) {
      console.error('Failed to parse FIREBASE_PRIVATE_KEY as JSON:', error)
      return null
    }
  }

  if (projectId && clientEmail && privateKey) {
    // Strip wrapping quotes that Vercel/UI paste sometimes adds.
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1)
    }

    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    })
  }

  return null
}

export function isPushConfigured(): boolean {
  const hasJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim())
  const hasTriplet = Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_PRIVATE_KEY?.trim()
  )
  return hasJson || hasTriplet
}

export function getPushEnvStatus() {
  return {
    FIREBASE_PROJECT_ID: Boolean(process.env.FIREBASE_PROJECT_ID?.trim()),
    FIREBASE_CLIENT_EMAIL: Boolean(process.env.FIREBASE_CLIENT_EMAIL?.trim()),
    FIREBASE_PRIVATE_KEY: Boolean(process.env.FIREBASE_PRIVATE_KEY?.trim()),
    FIREBASE_SERVICE_ACCOUNT_JSON: Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
    ),
    configured: isPushConfigured(),
  }
}

function getPushConfigGap(): string {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) return ''
  const missing: string[] = []
  if (!process.env.FIREBASE_PROJECT_ID?.trim()) missing.push('FIREBASE_PROJECT_ID')
  if (!process.env.FIREBASE_CLIENT_EMAIL?.trim()) missing.push('FIREBASE_CLIENT_EMAIL')
  if (!process.env.FIREBASE_PRIVATE_KEY?.trim()) missing.push('FIREBASE_PRIVATE_KEY')
  if (missing.length === 0) return 'not-configured'
  return `missing ${missing.join(', ')} — set FIREBASE_SERVICE_ACCOUNT_JSON to the full service-account JSON (easiest), then Redeploy Production`
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
