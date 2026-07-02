import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Only show boolean config status, never actual values
  const debugInfo = {
    hasClientId: !!process.env.AZURE_AD_CLIENT_ID,
    hasClientSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
    hasTenantId: !!process.env.AZURE_AD_TENANT_ID,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nodeEnv: process.env.NODE_ENV,
    tenantIdHasNewline: process.env.AZURE_AD_TENANT_ID?.includes('\n') || false,
  }

  return NextResponse.json(debugInfo, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

