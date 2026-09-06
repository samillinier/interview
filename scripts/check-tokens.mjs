import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const count = await prisma.deviceToken.count()
console.log('Total device tokens:', count)
const tokens = await prisma.deviceToken.findMany({
  select: { installerId: true, platform: true, createdAt: true, updatedAt: true },
  orderBy: { updatedAt: 'desc' },
  take: 20,
})
for (const t of tokens) {
  console.log(t.installerId, '|', t.platform, '| created', t.createdAt.toISOString(), '| updated', t.updatedAt.toISOString())
}
await prisma.$disconnect()
