import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function newClient() {
  return new PrismaClient()
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = newClient()
} else {
  const existing = globalForPrisma.prisma
  // After `prisma generate`, a cached global client can miss new models until this module reloads or restart.
  const stale =
    existing &&
    typeof (existing as unknown as { ltrUploadBatch?: unknown }).ltrUploadBatch === 'undefined'
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





