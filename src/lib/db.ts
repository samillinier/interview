import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const RETRYABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024'])
const RETRYABLE_MESSAGE = /can't reach database|server has closed the connection|connection terminated|connection reset|too many connections|timed out fetching a new connection|administrator command/i

function isRetryableDbError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  if (err?.code && RETRYABLE_CODES.has(err.code)) return true
  return typeof err?.message === 'string' && RETRYABLE_MESSAGE.test(err.message)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function newClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : [],
    // Neon serverless Postgres: keep connections short-lived.
    // PgBouncer handles pooling; Prisma should not hold idle connections.
    // Requires DATABASE_URL to include ?pgbouncer=true&connection_limit=1
    // in Vercel environment variables.
  })

  // Neon scale-to-zero kills idle sockets. Retry a few times so a sleep/wake
  // looks like a short pause instead of "database disconnected".
  return client.$extends({
    name: 'neon-reconnect',
    query: {
      async $allOperations({ args, query }) {
        const maxAttempts = 4
        let lastError: unknown
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await query(args)
          } catch (error) {
            lastError = error
            if (attempt === maxAttempts || !isRetryableDbError(error)) throw error
            await client.$disconnect().catch(() => {})
            await sleep(400 * 2 ** (attempt - 1))
            await client.$connect().catch(() => {})
          }
        }
        throw lastError
      },
    },
  }) as unknown as PrismaClient
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = newClient()
} else {
  const existing = globalForPrisma.prisma
  // After `prisma generate`, a cached global client can miss new models/fields until this module reloads or restart.
  const models = (existing as { _runtimeDataModel?: { models?: Record<string, { fields?: Record<string, unknown> }> } } | undefined)
    ?._runtimeDataModel?.models
  const websiteFields = models?.WebsiteChat?.fields
  const installerFields = models?.Installer?.fields
  const marketingFields = models?.MarketingLead?.fields
  const inventoryFields = models?.Inventory?.fields
  const vehicleFields = models?.Vehicle?.fields
  const stale =
    existing &&
    (typeof (existing as unknown as { ltrUploadBatch?: unknown }).ltrUploadBatch === 'undefined' ||
      typeof (existing as unknown as { marketingLead?: unknown }).marketingLead === 'undefined' ||
      typeof (existing as unknown as { websiteChat?: unknown }).websiteChat === 'undefined' ||
      typeof (existing as unknown as { appSetting?: unknown }).appSetting === 'undefined' ||
      (websiteFields != null && !('lastSeenAt' in websiteFields)) ||
      (websiteFields != null && !('issueStatus' in websiteFields)) ||
      (websiteFields != null && !('aiEnabled' in websiteFields)) ||
      (installerFields != null && !('aiChatEnabled' in installerFields)) ||
      (marketingFields != null && !('emailOptInSentAt' in marketingFields)) ||
      (inventoryFields != null && !('phoneNumber' in inventoryFields)) ||
      (vehicleFields != null && !('notes' in vehicleFields)) ||
      typeof (existing as unknown as { gpsTelemetryReset?: unknown }).gpsTelemetryReset === 'undefined')
  if (stale) {
    void existing.$disconnect().catch(() => {})
    globalForPrisma.prisma = undefined
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = newClient()
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
export default prisma





