import { NextResponse } from 'next/server'

export async function GET() {
  // Test endpoint to verify callback route is accessible
  const testInfo = {
    message: 'Callback route test',
    timestamp: new Date().toISOString(),
    callbackUrl: process.env.NEXTAUTH_URL 
      ? `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`
      : 'NEXTAUTH_URL not set',
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasClientId: !!process.env.AZURE_AD_CLIENT_ID,
    hasClientSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
    clientId: process.env.AZURE_AD_CLIENT_ID?.substring(0, 8) + '...',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
  }

  return NextResponse.json(testInfo, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

