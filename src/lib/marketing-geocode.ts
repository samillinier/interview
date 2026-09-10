import { countyName, normalizeStateCode, stateLabel, US_STATE_CENTROIDS, type PlaceFilter } from '@/lib/us-states'

export type Coord = { lat: number; lng: number }

const cache = new Map<string, Coord | null>()

function cacheKey(city: string, stateCode: string, county?: string) {
  return `${city.trim().toLowerCase()}|${countyName(county).toLowerCase()}|${stateCode}`
}

async function geocodeCity(city: string, stateCode: string, county?: string): Promise<Coord | null> {
  const key = cacheKey(city, stateCode, county)
  if (cache.has(key)) return cache.get(key) || null

  const name = stateLabel(stateCode)
  const countyPart = countyName(county)
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=8&language=en&format=json&countryCode=US`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      cache.set(key, null)
      return null
    }
    const data = await res.json().catch(() => null)
    const rows = Array.isArray(data?.results) ? data.results : []
    const inState = rows.filter(
      (row: any) =>
        String(row?.admin1 || '').toLowerCase() === name.toLowerCase() ||
        String(row?.admin1 || '').toUpperCase() === stateCode,
    )
    const match =
      (countyPart
        ? inState.find((row: any) => String(row?.admin2 || '').toLowerCase().includes(countyPart.toLowerCase()))
        : null) ||
      inState[0] ||
      rows[0]
    const lat = Number(match?.latitude)
    const lng = Number(match?.longitude)
    const point = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
    cache.set(key, point)
    return point
  } catch {
    cache.set(key, null)
    return null
  }
}

function jitter(point: Coord, index: number): Coord {
  if (index <= 0) return point
  const angle = index * 2.399
  const dist = 0.01 + 0.007 * index
  return {
    lat: point.lat + Math.cos(angle) * dist,
    lng: point.lng + Math.sin(angle) * dist,
  }
}

export function stateCenter(stateCode?: string | null): Coord & { zoom: number } {
  const code = normalizeStateCode(stateCode) || 'AL'
  return US_STATE_CENTROIDS[code] || US_STATE_CENTROIDS.AL
}

export async function geocodeSearchPlace(place: PlaceFilter): Promise<(Coord & { zoom: number }) | null> {
  const state = normalizeStateCode(place.state)
  const city = String(place.city || '').trim()
  const county = countyName(place.county)
  if (city && state) {
    const point = await geocodeCity(city, state, county)
    if (point) return { ...point, zoom: 11 }
  }
  if (county && state) {
    const point = await geocodeCity(`${county} County`, state)
    if (point) return { ...point, zoom: 9 }
  }
  if (state) return stateCenter(state)
  return null
}

export async function attachLeadCoordinates<T extends { city?: string | null; county?: string | null; state?: string | null }>(
  leads: T[],
  fallbackPlace?: PlaceFilter | string | null,
): Promise<(T & { lat: number; lng: number })[]> {
  const place: PlaceFilter =
    typeof fallbackPlace === 'string' ? { state: fallbackPlace } : fallbackPlace || {}
  const fallbackState = normalizeStateCode(place.state)
  const fallbackCity = String(place.city || '').trim()
  const fallbackCounty = countyName(place.county)

  const unique = new Map<string, { city: string; state: string; county?: string }>()
  for (const lead of leads) {
    const city = String(lead.city || '').trim() || fallbackCity
    const state = normalizeStateCode(lead.state) || fallbackState
    const county = countyName(lead.county) || fallbackCounty
    if (city && state) unique.set(cacheKey(city, state, county), { city, state, county })
    else if (county && state) unique.set(cacheKey(`${county} County`, state), { city: `${county} County`, state })
  }
  if (fallbackCity && fallbackState) {
    unique.set(cacheKey(fallbackCity, fallbackState, fallbackCounty), {
      city: fallbackCity,
      state: fallbackState,
      county: fallbackCounty,
    })
  } else if (fallbackCounty && fallbackState) {
    unique.set(cacheKey(`${fallbackCounty} County`, fallbackState), {
      city: `${fallbackCounty} County`,
      state: fallbackState,
    })
  }

  await Promise.all(
    Array.from(unique.values()).map((item) => geocodeCity(item.city, item.state, item.county)),
  )

  const fallbackPoint =
    (fallbackCity && fallbackState
      ? cache.get(cacheKey(fallbackCity, fallbackState, fallbackCounty))
      : null) ||
    (fallbackCounty && fallbackState
      ? cache.get(cacheKey(`${fallbackCounty} County`, fallbackState))
      : null) ||
    (fallbackState ? stateCenter(fallbackState) : null)

  const used = new Map<string, number>()
  return leads.map((lead) => {
    const city = String(lead.city || '').trim() || fallbackCity
    const state = normalizeStateCode(lead.state) || fallbackState
    const county = countyName(lead.county) || fallbackCounty
    const point =
      (city && state ? cache.get(cacheKey(city, state, county)) : null) ||
      (county && state ? cache.get(cacheKey(`${county} County`, state)) : null) ||
      fallbackPoint ||
      (state ? stateCenter(state) : null) ||
      stateCenter('AL')
    const stamp = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`
    const offset = used.get(stamp) || 0
    used.set(stamp, offset + 1)
    const shifted = jitter(point, offset)
    return { ...lead, lat: shifted.lat, lng: shifted.lng }
  })
}
