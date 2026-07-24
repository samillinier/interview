/**
 * Road snapping via OSRM (Open Source Routing Machine).
 * Uses the free public OSRM demo server to match GPS points to actual roads.
 * Rate limit: ~500 requests/hour (fair use).
 */

const OSRM_BASE = 'https://router.project-osrm.org'

interface OsrmMatchResponse {
  code: string
  matchings?: Array<{
    geometry: {
      coordinates: [number, number][]  // [lng, lat]
    }
  }>
  tracepoints?: Array<{
    location: [number, number]  // [lng, lat]
  } | null>
}

/**
 * Snap sparse GPS positions to actual road paths using OSRM's match service.
 * Returns road-following coordinates, or null if matching fails.
 */
export async function snapToRoads(
  points: { latitude: number; longitude: number }[]
): Promise<{ latitude: number; longitude: number }[] | null> {
  if (points.length < 2) return null

  // Sample to max 100 points to stay within OSRM limits
  let sampled = points
  if (points.length > 100) {
    const step = Math.floor(points.length / 100)
    sampled = points.filter((_, i) => i % step === 0)
    // Always include last point
    if (sampled[sampled.length - 1] !== points[points.length - 1]) {
      sampled.push(points[points.length - 1])
    }
  }

  // Build OSRM match URL: coordinates in lng,lat order, semicolon-separated
  const coords = sampled.map((p) => `${p.longitude},${p.latitude}`).join(';')
  // 30m radius per point — forgiving enough for sparse GPS but still snaps to roads
  const radii = sampled.map(() => '30').join(';')

  const url = `${OSRM_BASE}/match/v1/driving/${coords}?geometries=geojson&overview=full&steps=false&annotations=false&radiuses=${radii}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RecruitingAI-GPS/1.0' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data: OsrmMatchResponse = await res.json()

    if (data.code !== 'Ok' || !data.matchings || data.matchings.length === 0) return null

    // Extract snapped coordinates [lng, lat] → { lat, lng }
    const geometry = data.matchings[0].geometry
    return geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }))
  } catch {
    return null
  }
}
