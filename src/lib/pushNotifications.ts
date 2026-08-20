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
    return { sent: 0, failed: 0, skipped: true, reason: 'not-configured' }
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
    },
    tokens: uniqueTokens,
  }

  try {
    const messaging = getMessaging(app)
    const result = await messaging.sendEachForMulticast(message)

    // Remove tokens that FCM reported as invalid/expired so they don't keep failing.
    const invalidTokens: string[] = []
    result.responses.forEach((response, index) => {
      const code = (response as { error?: { code?: string } }).error?.code
      if (!response.success && code && INVALID_TOKEN_ERROR_CODES.has(code)) {
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
    }
  } catch (error) {
    console.error('Failed to send push notifications:', error)
    return {
      sent: 0,
      failed: uniqueTokens.length,
      skipped: false,
      reason: 'send-error',
    }
  }
}
