import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingAdmin } from '@/lib/marketing-admin'
import { attachLeadCoordinates, geocodeSearchPlace } from '@/lib/marketing-geocode'
import { runMarketingDiscovery } from '@/lib/marketing-leads'
import { cleanPlacePart, countyName, formatPlaceLabel, normalizeStateCode, queryWithPlace } from '@/lib/us-states'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

function leadPlaceScore(lead: { city?: string | null; county?: string | null; state?: string | null; snippet?: string | null; companyName?: string }, place: { city: string; county: string; state: string | null }) {
  const hay = `${lead.city || ''} ${lead.county || ''} ${lead.state || ''} ${lead.snippet || ''} ${lead.companyName || ''}`.toLowerCase()
  let score = 0
  if (place.city && (String(lead.city || '').toLowerCase() === place.city.toLowerCase() || hay.includes(place.city.toLowerCase()))) score += 6
  if (place.county && hay.includes(place.county.toLowerCase())) score += 4
  if (place.state && String(lead.state || '').toUpperCase() === place.state) score += 2
  return score
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMarketingAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: noStoreHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const query = String(body?.query || '').trim().slice(0, 160)
    const city = cleanPlacePart(body?.city)
    const county = countyName(body?.county)
    const state = normalizeStateCode(body?.state)
    if (query.length < 3) {
      return NextResponse.json({ error: 'Enter a search like “Floor installers”.' }, { status: 400, headers: noStoreHeaders })
    }

    const place = { city, county, state }
    const searchQuery = queryWithPlace(query, place)
    const { hits, source, leads, crawler } = await runMarketingDiscovery(searchQuery, place)
    if (hits.length === 0 && leads.length === 0) {
      return NextResponse.json(
        { success: true, query: searchQuery, city, county, state, source, crawler, leads: [], message: 'No public contractor websites found for that search.' },
        { headers: noStoreHeaders },
      )
    }

    const hosts = leads.map((lead) => lead.websiteHost)
    const saved = hosts.length
      ? await prisma.marketingLead.findMany({
          where: { websiteHost: { in: hosts } },
          select: { id: true, websiteHost: true, outreachStatus: true, savedByEmail: true, rowColor: true, remark: true },
        })
      : []
    const savedByHost = new Map(saved.map((row) => [row.websiteHost, row]))
    const mapped = await attachLeadCoordinates(leads, place)
    const ranked = [...mapped].sort((a, b) => {
      const diff = leadPlaceScore(b, place) - leadPlaceScore(a, place)
      return diff || b.score - a.score
    })
    const focus = await geocodeSearchPlace(place)

    return NextResponse.json(
      {
        success: true,
        query: searchQuery,
        city,
        county,
        state,
        placeLabel: formatPlaceLabel(place),
        focus,
        source,
        crawler,
        leads: ranked.map((lead) => {
          const savedLead = savedByHost.get(lead.websiteHost)
          return {
            ...lead,
            alreadySaved: Boolean(savedLead),
            id: savedLead?.id,
            outreachStatus: savedLead?.outreachStatus || 'pending',
            savedByEmail: savedLead?.savedByEmail || null,
            rowColor: savedLead?.rowColor || null,
            remark: savedLead?.remark || null,
          }
        }),
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
