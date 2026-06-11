import { NextResponse } from 'next/server'

export async function GET() {
  // Only show non-sensitive info for debugging
  const debugInfo = {
    hasClientId: !!process.env.AZURE_AD_CLIENT_ID,
    clientIdPrefix: process.env.AZURE_AD_CLIENT_ID?.substring(0, 8) + '...',
    hasClientSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
    hasTenantId: !!process.env.AZURE_AD_TENANT_ID,
    tenantId: process.env.AZURE_AD_TENANT_ID?.trim() || 'not set',
    tenantIdRaw: process.env.AZURE_AD_TENANT_ID ? JSON.stringify(process.env.AZURE_AD_TENANT_ID) : 'not set',
      nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET - THIS IS THE PROBLEM!',
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set',
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV,
      expectedCallback: process.env.NEXTAUTH_URL 
        ? `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`
        : 'Cannot determine - NEXTAUTH_URL not set',
      tenantIdLength: process.env.AZURE_AD_TENANT_ID?.length || 0,
      tenantIdHasNewline: process.env.AZURE_AD_TENANT_ID?.includes('\n') || false,
  }

  return NextResponse.json(debugInfo, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

