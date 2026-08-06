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
