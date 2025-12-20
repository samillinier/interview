import { NextResponse } from 'next/server'

export async function GET() {
  // Only show non-sensitive info for debugging
  const debugInfo = {
    hasClientId: !!process.env.AZURE_AD_CLIENT_ID,
    clientIdPrefix: process.env.AZURE_AD_CLIENT_ID?.substring(0, 8) + '...',
    hasClientSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
    hasTenantId: !!process.env.AZURE_AD_TENANT_ID,
    tenantId: process.env.AZURE_AD_TENANT_ID || 'not set',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET - THIS IS THE PROBLEM!',
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    nodeEnv: process.env.NODE_ENV,
    expectedCallback: process.env.NEXTAUTH_URL 
      ? `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`
      : 'Cannot determine - NEXTAUTH_URL not set',
  }

  return NextResponse.json(debugInfo, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

