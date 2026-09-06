import { PrismaClient } from '@prisma/client'
import { cert, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

const prisma = new PrismaClient()
const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
const app = initializeApp({ credential: cert(JSON.parse(saJson)) })
const messaging = getMessaging(app)

const tokens = await prisma.deviceToken.findMany({
  select: { token: true, installerId: true, platform: true },
  orderBy: { updatedAt: 'desc' },
})
console.log('Sending test push to', tokens.length, 'tokens...\n')

for (const { token, installerId, platform } of tokens) {
  try {
    const id = await messaging.send({
      token,
      notification: { title: 'Push test', body: 'This is a diagnostic test' },
      data: { link: '/installer/notifications', badge: '0' },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    })
    console.log('OK   ', platform, installerId, '=> messageId', id)
  } catch (e) {
    console.log('FAIL ', platform, installerId, '=>', e.code || 'no-code', '-', e.message)
  }
}
await prisma.$disconnect()
