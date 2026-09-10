export const US_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

export const US_STATE_NAMES: Record<string, string> = Object.fromEntries(
  US_STATE_OPTIONS.map((state) => [state.value, state.label]),
)

export const US_STATE_CENTROIDS: Record<string, { lat: number; lng: number; zoom: number }> = {
  AL: { lat: 32.806671, lng: -86.79113, zoom: 7 },
  AK: { lat: 61.370716, lng: -152.404419, zoom: 4 },
  AZ: { lat: 33.729759, lng: -111.431221, zoom: 6 },
  AR: { lat: 34.969704, lng: -92.373123, zoom: 7 },
  CA: { lat: 36.116203, lng: -119.681564, zoom: 6 },
  CO: { lat: 39.059811, lng: -105.311104, zoom: 6 },
  CT: { lat: 41.597782, lng: -72.755371, zoom: 8 },
  DE: { lat: 39.318523, lng: -75.507141, zoom: 8 },
  DC: { lat: 38.897438, lng: -77.026817, zoom: 11 },
  FL: { lat: 27.766279, lng: -81.686783, zoom: 6 },
  GA: { lat: 33.040619, lng: -83.643074, zoom: 7 },
  HI: { lat: 21.094318, lng: -157.498337, zoom: 7 },
  ID: { lat: 44.240459, lng: -114.478828, zoom: 6 },
  IL: { lat: 40.349457, lng: -88.986137, zoom: 6 },
  IN: { lat: 39.849426, lng: -86.258278, zoom: 7 },
  IA: { lat: 42.011539, lng: -93.210526, zoom: 7 },
  KS: { lat: 38.5266, lng: -96.726486, zoom: 6 },
  KY: { lat: 37.66814, lng: -84.670067, zoom: 7 },
  LA: { lat: 31.169546, lng: -91.867805, zoom: 7 },
  ME: { lat: 44.693947, lng: -69.381927, zoom: 7 },
  MD: { lat: 39.063946, lng: -76.802101, zoom: 8 },
  MA: { lat: 42.230171, lng: -71.530106, zoom: 8 },
  MI: { lat: 43.326618, lng: -84.536095, zoom: 6 },
  MN: { lat: 45.694454, lng: -93.900192, zoom: 6 },
  MS: { lat: 32.741646, lng: -89.678696, zoom: 7 },
  MO: { lat: 38.456085, lng: -92.288368, zoom: 6 },
  MT: { lat: 46.921925, lng: -110.454353, zoom: 6 },
  NE: { lat: 41.12537, lng: -98.268082, zoom: 6 },
  NV: { lat: 38.313515, lng: -117.055374, zoom: 6 },
  NH: { lat: 43.452492, lng: -71.563896, zoom: 8 },
  NJ: { lat: 40.298904, lng: -74.521011, zoom: 8 },
  NM: { lat: 34.840515, lng: -106.248482, zoom: 6 },
  NY: { lat: 42.165726, lng: -74.948051, zoom: 6 },
  NC: { lat: 35.630066, lng: -79.806419, zoom: 7 },
  ND: { lat: 47.528912, lng: -99.784012, zoom: 6 },
  OH: { lat: 40.388783, lng: -82.764915, zoom: 7 },
  OK: { lat: 35.565342, lng: -96.928917, zoom: 6 },
  OR: { lat: 44.572021, lng: -122.070938, zoom: 6 },
  PA: { lat: 40.590752, lng: -77.209755, zoom: 7 },
  RI: { lat: 41.680893, lng: -71.51178, zoom: 9 },
  SC: { lat: 33.856892, lng: -80.945007, zoom: 7 },
  SD: { lat: 44.299782, lng: -99.438828, zoom: 6 },
  TN: { lat: 35.747845, lng: -86.692345, zoom: 7 },
  TX: { lat: 31.054487, lng: -97.563461, zoom: 5 },
  UT: { lat: 40.150032, lng: -111.862434, zoom: 6 },
  VT: { lat: 44.045876, lng: -72.710686, zoom: 8 },
  VA: { lat: 37.769337, lng: -78.169968, zoom: 7 },
  WA: { lat: 47.400902, lng: -121.490494, zoom: 6 },
  WV: { lat: 38.491226, lng: -80.954453, zoom: 7 },
  WI: { lat: 44.268543, lng: -89.616508, zoom: 6 },
  WY: { lat: 42.755966, lng: -107.30249, zoom: 6 },
}

export function normalizeStateCode(value: string | null | undefined): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  if (US_STATE_NAMES[upper]) return upper
  const match = US_STATE_OPTIONS.find((state) => state.label.toLowerCase() === raw.toLowerCase())
  return match?.value || null
}

export function stateLabel(code: string | null | undefined): string {
  const normalized = normalizeStateCode(code)
  return normalized ? US_STATE_NAMES[normalized] : ''
}

export function queryWithState(query: string, stateCode?: string | null): string {
  return queryWithPlace(query, { state: stateCode })
}

export type PlaceFilter = {
  city?: string | null
  county?: string | null
  state?: string | null
}

export function cleanPlacePart(value: string | null | undefined, max = 80): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export function countyName(value: string | null | undefined): string {
  const raw = cleanPlacePart(value)
  if (!raw) return ''
  return raw.replace(/\s+county$/i, '').trim()
}

export function formatPlaceLabel(place: PlaceFilter): string {
  const city = cleanPlacePart(place.city)
  const county = countyName(place.county)
  const state = stateLabel(place.state) || cleanPlacePart(place.state)
  return [city, county ? `${county} County` : '', state].filter(Boolean).join(', ')
}

export function queryWithPlace(query: string, place: PlaceFilter = {}): string {
  let next = query.trim()
  if (!next) return next
  const city = cleanPlacePart(place.city)
  const county = countyName(place.county)
  const code = normalizeStateCode(place.state)
  const name = code ? US_STATE_NAMES[code] : ''
  const lower = next.toLowerCase()

  if (city && !lower.includes(city.toLowerCase())) next += ` ${city}`
  if (county && !next.toLowerCase().includes(county.toLowerCase())) next += ` ${county} County`
  if (name && !next.toLowerCase().includes(name.toLowerCase()) && !(code && new RegExp(`\\b${code}\\b`, 'i').test(next))) {
    next += ` ${name}`
  }
  return next.replace(/\s+/g, ' ').trim()
}
