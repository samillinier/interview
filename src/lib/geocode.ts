/**
 * Simple reverse geocoding using Nominatim (OpenStreetMap).
 * Free, no API key required.
 * Rate limited to 1 request per second (Nominatim policy).
 */

// In-memory cache to avoid repeated calls for same coordinates
const cache = new Map<string, { location: string; expiry: number }>()
const CACHE_TTL_MS = 60_000 // 1 minute

/** Reverse geocode lat/lng to a human-readable address */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!lat || !lng) return null

  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.location
  }

  try {
    // zoom=18 gives house-number-level specificity
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RecruitingAI-GPS/1.0',
      },
      signal: AbortSignal.timeout(3000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const addr = data.address
    if (!addr) return null

    // Build a concise location string: "1405 Julie Lagoon, Lutz, Florida"
    const parts: string[] = []

    // Combine house number + road for specific street address
    if (addr.house_number && addr.road) {
      parts.push(`${addr.house_number} ${addr.road}`)
    } else if (addr.road) {
      parts.push(addr.road)
    } else if (addr.neighbourhood) {
      parts.push(addr.neighbourhood)
    } else if (addr.suburb) {
      parts.push(addr.suburb)
    } else if (addr.hamlet) {
      parts.push(addr.hamlet)
    } else if (addr.village) {
      parts.push(addr.village)
    }

    if (addr.city) parts.push(addr.city)
    else if (addr.town) parts.push(addr.town)
    else if (addr.county) parts.push(addr.county)

    if (addr.state) parts.push(addr.state)

    const location = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',').trim() || null

    if (location) {
      cache.set(key, { location, expiry: Date.now() + CACHE_TTL_MS })
    }

    return location
  } catch {
    return null
  }
}
