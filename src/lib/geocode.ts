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
    // zoom=16 gives street-level accuracy, zoom=18 is too granular (returns water bodies, etc.)
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
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

    // If Nominatim resolved to a natural feature (lake, lagoon, park), skip it and use broader context
    const isNaturalFeature = data.category === 'natural' || data.category === 'waterway' || data.type === 'water'

    // Build a concise location string: "Street/Neighborhood, City, State"
    const parts: string[] = []

    // Only use road if it's an actual road (not a natural feature name)
    if (addr.road && !isNaturalFeature) {
      parts.push(addr.road)
    } else if (addr.neighbourhood && !isNaturalFeature) {
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
