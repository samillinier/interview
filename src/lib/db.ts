import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

try {
  prisma = globalForPrisma.prisma ?? new PrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
} catch (error: any) {
  console.error('❌ Failed to initialize Prisma Client:', error)
  console.error('💡 This usually means Prisma client needs to be generated.')
  console.error('💡 Run: npx prisma generate')
  // Re-throw to make the error visible
  throw new Error('Prisma Client not initialized. Please run: npx prisma generate')
}

export { prisma }
export default prisma





