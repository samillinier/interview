/**
 * Simple reverse geocoding using Nominatim (OpenStreetMap).
 * Free, no API key required.
 * Rate limited to 1 request per second (Nominatim policy).
 */

// In-memory cache to avoid repeated calls for same coordinates
const cache = new Map<string, { location: string; expiry: number }>()
const CACHE_TTL_MS = 60_000 // 1 minute

const US_STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH',
  'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN',
  Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
}

const STREET_TYPE_ABBR: Array<[RegExp, string]> = [
  [/\b(Street)\b/gi, 'St'],
  [/\b(Avenue)\b/gi, 'Ave'],
  [/\b(Boulevard)\b/gi, 'Blvd'],
  [/\b(Drive)\b/gi, 'Dr'],
  [/\b(Road)\b/gi, 'Rd'],
  [/\b(Lane)\b/gi, 'Ln'],
  [/\b(Court)\b/gi, 'Ct'],
  [/\b(Circle)\b/gi, 'Cir'],
  [/\b(Place)\b/gi, 'Pl'],
  [/\b(Terrace)\b/gi, 'Ter'],
  [/\b(Parkway)\b/gi, 'Pkwy'],
  [/\b(Highway)\b/gi, 'Hwy'],
  [/\b(Expressway)\b/gi, 'Expy'],
  [/\b(Freeway)\b/gi, 'Fwy'],
  [/\b(Trail)\b/gi, 'Trl'],
  [/\b(Way)\b/gi, 'Way'],
]

const DIRECTIONAL_ABBR: Array<[RegExp, string]> = [
  [/\bNorth\b/gi, 'N'],
  [/\bSouth\b/gi, 'S'],
  [/\bEast\b/gi, 'E'],
  [/\bWest\b/gi, 'W'],
  [/\bNortheast\b/gi, 'NE'],
  [/\bNorthwest\b/gi, 'NW'],
  [/\bSoutheast\b/gi, 'SE'],
  [/\bSouthwest\b/gi, 'SW'],
]

function abbreviateRoad(road: string): string {
  let out = road
  for (const [re, abbr] of DIRECTIONAL_ABBR) out = out.replace(re, abbr)
  for (const [re, abbr] of STREET_TYPE_ABBR) out = out.replace(re, abbr)
  return out.replace(/\s+/g, ' ').trim()
}

function formatState(addr: Record<string, string>): string | null {
  if (addr['ISO3166-2-lvl4']?.startsWith('US-')) {
    return addr['ISO3166-2-lvl4'].slice(3)
  }
  if (!addr.state) return null
  return US_STATE_ABBR[addr.state] || addr.state
}

function formatCountry(addr: Record<string, string>): string | null {
  if (addr.country_code === 'us') return 'USA'
  if (addr.country === 'United States' || addr.country === 'United States of America') return 'USA'
  return addr.country || null
}

/** Build "4420 Adamo Dr, Tampa, FL 33605, USA" from Nominatim address parts */
export function formatPostalAddress(addr: Record<string, string>): string | null {
  const parts: string[] = []

  const road = addr.road ? abbreviateRoad(addr.road) : null
  if (addr.house_number && road) {
    parts.push(`${addr.house_number} ${road}`)
  } else if (road) {
    parts.push(road)
  } else if (addr.neighbourhood) {
    parts.push(addr.neighbourhood)
  } else if (addr.suburb) {
    parts.push(addr.suburb)
  } else if (addr.hamlet) {
    parts.push(addr.hamlet)
  } else if (addr.village) {
    parts.push(addr.village)
  }

  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county
  if (city) parts.push(city)

  const state = formatState(addr)
  const zip = addr.postcode?.split(';')[0]?.trim() || null
  if (state && zip) {
    parts.push(`${state} ${zip}`)
  } else if (state) {
    parts.push(state)
  } else if (zip) {
    parts.push(zip)
  }

  const country = formatCountry(addr)
  if (country) parts.push(country)

  return parts.length > 0 ? parts.join(', ') : null
}

/** Reverse geocode lat/lng to a human-readable address */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!lat || !lng) return null

  // ~1.1m precision so nearby houses don't share a cached street-only label
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.location
  }

  try {
    // zoom=18 gives house-number-level specificity
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}` +
      `&zoom=18&addressdetails=1&accept-language=en`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RecruitingAI-GPS/1.0',
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const addr = data.address as Record<string, string> | undefined
    if (!addr) return null

    const location =
      formatPostalAddress(addr) ||
      data.display_name?.split(',').slice(0, 4).join(',').trim() ||
      null

    if (location) {
      cache.set(key, { location, expiry: Date.now() + CACHE_TTL_MS })
    }

    return location
  } catch {
    return null
  }
}
