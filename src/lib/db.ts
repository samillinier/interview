import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaDatabaseUrl: string | undefined
}

function newClient() {
  return new PrismaClient()
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = newClient()
} else {
  const existing = globalForPrisma.prisma
  const currentDatabaseUrl = process.env.DATABASE_URL || ''
  const databaseUrlChanged = Boolean(existing && globalForPrisma.prismaDatabaseUrl !== currentDatabaseUrl)
  // After `prisma generate`, a cached global client can miss new models until this module reloads or restart.
  const stale =
    existing &&
    typeof (existing as unknown as { ltrUploadBatch?: unknown }).ltrUploadBatch === 'undefined'
  if (stale || databaseUrlChanged) {
    void existing?.$disconnect().catch(() => {})
    globalForPrisma.prisma = undefined
    globalForPrisma.prismaDatabaseUrl = undefined
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = newClient()
    globalForPrisma.prismaDatabaseUrl = currentDatabaseUrl
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
export default prisma





