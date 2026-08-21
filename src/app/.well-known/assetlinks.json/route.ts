import { NextResponse } from 'next/server'
import { getAndroidAssetLinks } from '@/lib/androidAssetLinks'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(getAndroidAssetLinks(), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
