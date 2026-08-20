import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPushEnvStatus } from '@/lib/pushNotifications'

// Admin-only: shows which Firebase env vars are present (booleans only, no secrets).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    push: getPushEnvStatus(),
    hint:
      'If FIREBASE_PRIVATE_KEY and FIREBASE_SERVICE_ACCOUNT_JSON are both false, add FIREBASE_SERVICE_ACCOUNT_JSON in Vercel (Production) with the full service-account JSON, then Redeploy.',
  })
}
