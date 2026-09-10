import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingAdmin } from '@/lib/marketing-admin'
import { attachLeadCoordinates } from '@/lib/marketing-geocode'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

function leadPayload(body: any, query: string) {
  const website = String(body?.website || '').trim()
  const websiteHost = String(body?.websiteHost || '').trim().toLowerCase().replace(/^www\./, '')
  const companyName = String(body?.companyName || websiteHost || 'Unknown company').trim().slice(0, 160)
  if (!website || !websiteHost) return null
  return {
    query,
    companyName,
    website,
    websiteHost,
    phone: body?.phone ? String(body.phone).slice(0, 40) : null,
    email: body?.email ? String(body.email).toLowerCase().slice(0, 120) : null,
    city: body?.city ? String(body.city).slice(0, 80) : null,
    state: body?.state ? String(body.state).slice(0, 40) : null,
    services: body?.services ? String(body.services).slice(0, 240) : null,
    contactUrl: body?.contactUrl ? String(body.contactUrl).slice(0, 400) : null,
    facebookUrl: body?.facebookUrl ? String(body.facebookUrl).slice(0, 400) : null,
    linkedinUrl: body?.linkedinUrl ? String(body.linkedinUrl).slice(0, 400) : null,
    licenseInfo: body?.licenseInfo ? String(body.licenseInfo).slice(0, 160) : null,
    keywords: Array.isArray(body?.keywords) ? body.keywords.join(', ').slice(0, 240) : body?.keywords ? String(body.keywords).slice(0, 240) : null,
    score: Number.isFinite(Number(body?.score)) ? Math.max(0, Math.min(100, Math.round(Number(body.score)))) : 0,
    sourceUrl: body?.sourceUrl ? String(body.sourceUrl).slice(0, 400) : website,
    snippet: body?.snippet ? String(body.snippet).slice(0, 280) : null,
  }
}

export async function GET() {
  try {
    const auth = await requireMarketingAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: noStoreHeaders })
    }

    const leads = await prisma.marketingLead.findMany({
      orderBy: [{ createdAt: 'desc' }],
    })
    const mapped = await attachLeadCoordinates(leads)
    return NextResponse.json({ success: true, leads: mapped }, { headers: noStoreHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load leads' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMarketingAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: noStoreHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const query = String(body?.query || 'saved').trim().slice(0, 160)
    const items = Array.isArray(body?.leads) ? body.leads : [body]
    const payloads = items.map((item: any) => leadPayload(item, query)).filter(Boolean) as NonNullable<ReturnType<typeof leadPayload>>[]
    if (payloads.length === 0) {
      return NextResponse.json({ error: 'No valid leads to save' }, { status: 400, headers: noStoreHeaders })
    }

    const saved = []
    for (const payload of payloads) {
      const row = await prisma.marketingLead.upsert({
        where: { websiteHost: payload.websiteHost },
        create: { ...payload, savedByEmail: auth.email },
        update: payload,
      })
      saved.push(row)
    }

    return NextResponse.json({ success: true, leads: saved }, { headers: noStoreHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save leads' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
