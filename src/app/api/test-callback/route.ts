import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Test endpoint to verify callback route is accessible
  const testInfo = {
    message: 'Callback route test',
    timestamp: new Date().toISOString(),
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasClientId: !!process.env.AZURE_AD_CLIENT_ID,
    hasClientSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
  }

  return NextResponse.json(testInfo, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

