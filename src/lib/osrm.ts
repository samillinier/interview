/**
 * Road snapping via OSRM (Open Source Routing Machine).
 * Uses OSRM's route service to find actual road paths between GPS points.
 * Falls back to simple line on failure.
 */

const OSRM_BASE = 'https://router.project-osrm.org'

interface OsrmRouteResponse {
  code: string
  routes?: Array<{
    distance: number
    geometry: {
      coordinates: [number, number][]
    }
  }>
}

/**
 * Build road-following path from GPS points using OSRM route service.
 * Works even with sparse points (e.g. one point every few miles).
 * Returns road-following coordinates, or null if routing fails.
 */
export async function snapToRoads(
  points: { latitude: number; longitude: number }[]
): Promise<{ latitude: number; longitude: number }[] | null> {
  if (points.length < 2) return null

  // Sample to max 25 waypoints to keep URL under OSRM's limit
  let waypoints = points
  if (points.length > 25) {
    const step = Math.floor(points.length / 25)
    waypoints = points.filter((_, i) => i % step === 0)
    if (waypoints[waypoints.length - 1] !== points[points.length - 1]) {
      waypoints.push(points[points.length - 1])
    }
  }

  // Build coordinates string: lng,lat in order
  const coords = waypoints.map((p) => `${p.longitude},${p.latitude}`).join(';')

  const url = `${OSRM_BASE}/route/v1/driving/${coords}?geometries=geojson&overview=full&steps=false&alternatives=false`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RecruitingAI-GPS/1.0' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data: OsrmRouteResponse = await res.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return null

    const geometry = data.routes[0].geometry
    return geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }))
  } catch {
    return null
  }
}
