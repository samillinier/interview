import placesData from '@/lib/us-places-data.json'

const PLACES = placesData as Record<string, Record<string, string[]>>

export function countiesForState(stateCode: string): string[] {
  return Object.keys(PLACES[stateCode] || {}).sort((a, b) => a.localeCompare(b))
}

export function citiesForState(stateCode: string): string[] {
  const seen = new Set<string>()
  const cities: string[] = []
  for (const list of Object.values(PLACES[stateCode] || {})) {
    for (const city of list) {
      if (!seen.has(city)) {
        seen.add(city)
        cities.push(city)
      }
    }
  }
  return cities.sort((a, b) => a.localeCompare(b))
}

export function citiesForCounty(stateCode: string, county: string): string[] {
  if (!county) return citiesForState(stateCode)
  return [...(PLACES[stateCode]?.[county] || [])].sort((a, b) => a.localeCompare(b))
}

export function countyForCity(stateCode: string, city: string): string | null {
  if (!city) return null
  const counties = PLACES[stateCode] || {}
  for (const [county, cities] of Object.entries(counties)) {
    if (cities.includes(city)) return county
  }
  return null
}

export function defaultPlaceForState(stateCode: string): { county: string; city: string } {
  if (stateCode === 'AL') return { county: 'Houston', city: 'Dothan' }
  return { county: '', city: '' }
}
