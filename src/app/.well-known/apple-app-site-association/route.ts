import { NextResponse } from 'next/server'
import { appleAppSiteAssociation } from '@/lib/appleAppSiteAssociation'

export function GET() {
  return NextResponse.json(appleAppSiteAssociation, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
