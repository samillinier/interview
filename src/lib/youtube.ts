/**
 * Extract a YouTube video ID from a watch URL, youtu.be link, embed URL,
 * Shorts URL, or a pasted iframe snippet.
 */
export function extractYoutubeVideoId(input: string): string | null {
  const raw = String(input || '').trim()
  if (!raw) return null

  // Allow pasting a full iframe tag — pull the src first.
  const iframeSrc = raw.match(/src=["']([^"']+)["']/i)?.[1]
  const value = iframeSrc || raw

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
    const url = new URL(withProtocol)
    const host = url.hostname.replace(/^www\./i, '').toLowerCase()

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return isValidYoutubeId(id) ? id : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = url.searchParams.get('v')
      if (isValidYoutubeId(v)) return v

      const parts = url.pathname.split('/').filter(Boolean)
      // /embed/ID, /shorts/ID, /live/ID, /v/ID
      if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
        const id = parts[1]
        return isValidYoutubeId(id) ? id : null
      }
    }
  } catch {
    // Fall through to regex.
  }

  const match =
    raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i) ||
    raw.match(/[?&]v=([A-Za-z0-9_-]{11})/i)

  return match && isValidYoutubeId(match[1]) ? match[1] : null
}

export function toYoutubeEmbedUrl(input: string): string | null {
  const id = extractYoutubeVideoId(input)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

function isValidYoutubeId(id: string | null | undefined): id is string {
  return Boolean(id && /^[A-Za-z0-9_-]{11}$/.test(id))
}
