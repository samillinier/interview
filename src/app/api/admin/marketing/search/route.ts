import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingAdmin } from '@/lib/marketing-admin'
import { crawlSearchHits, searchContractorSites } from '@/lib/marketing-leads'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMarketingAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: noStoreHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const query = String(body?.query || '').trim().slice(0, 160)
    if (query.length < 3) {
      return NextResponse.json({ error: 'Enter a search like “metal building installers in Georgia”.' }, { status: 400, headers: noStoreHeaders })
    }

    const { hits, source } = await searchContractorSites(query)
    if (hits.length === 0) {
      return NextResponse.json(
        { success: true, query, source, leads: [], message: 'No public contractor websites found for that search.' },
        { headers: noStoreHeaders },
      )
    }

    const leads = await crawlSearchHits(hits)
    const hosts = leads.map((lead) => lead.websiteHost)
    const saved = hosts.length
      ? await prisma.marketingLead.findMany({
          where: { websiteHost: { in: hosts } },
          select: { websiteHost: true },
        })
      : []
    const savedHosts = new Set(saved.map((row) => row.websiteHost))

    return NextResponse.json(
      {
        success: true,
        query,
        source,
        leads: leads.map((lead) => ({
          ...lead,
          alreadySaved: savedHosts.has(lead.websiteHost),
        })),
      },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Search failed' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
