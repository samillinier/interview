/** Build Google Maps search URL for an address. */
export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/** Build Apple Maps search URL — opens the native Maps app on iOS. */
export function appleMapsSearchUrl(address: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`
}

/** Embed URL for the in-page Google Maps iframe. */
export function googleMapsEmbedUrl(address: string, apiKey?: string | null): string {
  const q = encodeURIComponent(address)
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${q}`
  }
  return `https://www.google.com/maps?q=${q}&output=embed`
}

function isAppleMapsPreferred(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  // iPadOS desktop UA
  if (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1) return true
  return false
}

/** Driving directions to a lat/lng (Apple Maps on iOS, Google Maps elsewhere). */
export function drivingDirectionsUrl(
  latitude: number,
  longitude: number,
  label?: string
): string {
  const lat = Number(latitude)
  const lng = Number(longitude)
  const name = (label || 'Vehicle').trim() || 'Vehicle'
  if (isAppleMapsPreferred()) {
    // daddr = destination; dirflg=d = driving. Start = user's current location.
    return `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}&dirflg=d`
  }
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${encodeURIComponent(`${lat},${lng}`)}` +
    `&travelmode=driving`
  )
}

/** Open turn-by-turn navigation to coordinates in the system maps app / browser. */
export function openDrivingDirections(
  latitude: number,
  longitude: number,
  label?: string
): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false
  if (latitude === 0 && longitude === 0) return false
  const url = drivingDirectionsUrl(latitude, longitude, label)
  if (typeof window === 'undefined') return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
