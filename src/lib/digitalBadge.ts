const FADV_ORIGIN = 'https://ca.fadv.com'
const FADV_BADGE_PREFIX = `${FADV_ORIGIN}/CA/DigitalBadge/dbId/`
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

export type ScrapedDigitalBadge = {
  badgeUrl: string | null
  badgeNumber: string | null
  expiresOn: string | null
  badgeType: string | null
  badgeName: string | null
  badgeCompany: string | null
  qrImage: string | null
  photoImage: string | null
  logoImage: string | null
}

/** Resolve a stored wallet id (full URL, dbId UUID, or path) to a FADV badge URL. */
export function resolveDigitalBadgeUrl(raw: string): string | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const fromPath = trimmed.match(/dbId\/([0-9a-fA-F-]+)/i)
  if (fromPath) return `${FADV_BADGE_PREFIX}${fromPath[1]}`

  const uuid = trimmed.match(UUID_RE)
  if (uuid) return `${FADV_BADGE_PREFIX}${uuid[0]}`

  return null
}

function cookieHeader(res: Response): string {
  const cookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie') as string]
        : []
  return cookies
    .map((c) => c.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ')
}

function guessMime(buf: Buffer, headerType: string | null): string | null {
  const declared = headerType?.split(';')[0]?.trim()
  if (declared && declared.startsWith('image/') && declared !== 'image/unknown') {
    return declared
  }
  if (buf.length >= 3 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e) return 'image/png'
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg'
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return 'image/bmp'
  if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif'
  if (buf.length >= 4 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    return 'image/webp'
  }
  return null
}

async function toDataUri(res: Response): Promise<string | null> {
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 32 || buf.length > 2_500_000) return null
  const mime = guessMime(buf, res.headers.get('content-type'))
  if (!mime) return null
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function fetchAsset(url: string, cookie: string, referer: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        Accept: 'image/*,*/*',
        Cookie: cookie,
        Referer: referer,
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await toDataUri(res)
  } catch {
    return null
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function scrapeDigitalBadge(badgeUrl: string): Promise<ScrapedDigitalBadge> {
  const empty: ScrapedDigitalBadge = {
    badgeUrl,
    badgeNumber: null,
    expiresOn: null,
    badgeType: null,
    badgeName: null,
    badgeCompany: null,
    qrImage: null,
    photoImage: null,
    logoImage: null,
  }

  const res = await fetch(badgeUrl, {
    headers: {
      'User-Agent': MOBILE_UA,
      Accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  })

  if (!res.ok) return empty

  const html = await res.text()
  const cookie = cookieHeader(res)

  const badgeMatch = html.match(/Badge\s*#\s*([A-Za-z0-9]+)/i)
  const expMatch = html.match(/Expires\s+on\s+([^<\n\r]+)/i)
  const typeMatch = html.match(/\b(CONTRACTOR|INSTALLER|TECHNICIAN|EMPLOYEE|VENDOR|WORKER)\b/i)
  const nameMatch = html.match(
    /<!--\s*Name\s*-->[\s\S]*?font-weight:\s*bold;?">\s*([\s\S]*?)<\/div>/i
  )
  const companyMatch = html.match(/Badge\s*#[A-Za-z0-9]+[\s\S]{0,800}?([A-Z][A-Z0-9 .,&'-]{3,})\s*<br/i)

  const inlineImages: string[] = []
  const inlineRe = /src=["'](data:image\/[^"']+)["']/g
  let m: RegExpExecArray | null
  while ((m = inlineRe.exec(html)) !== null) {
    inlineImages.push(m[1])
  }

  const origin = (() => {
    try {
      return new URL(badgeUrl).origin
    } catch {
      return FADV_ORIGIN
    }
  })()

  const [photoImage, logoImage] = await Promise.all([
    fetchAsset(`${origin}/CA/downloadImageServlet.do`, cookie, badgeUrl),
    fetchAsset(`${origin}/CA/images/Lowes_QR_Code_Image.png`, cookie, badgeUrl),
  ])

  return {
    badgeUrl,
    badgeNumber: badgeMatch ? badgeMatch[1] : null,
    expiresOn: expMatch ? expMatch[1].trim() : null,
    badgeType: typeMatch ? typeMatch[1].toUpperCase() : null,
    badgeName: nameMatch ? decodeHtml(nameMatch[1]) : null,
    badgeCompany: companyMatch ? decodeHtml(companyMatch[1]) : null,
    qrImage: inlineImages.find((d) => /data:image\/(png|jpe?g|gif|webp|bmp)/i.test(d)) || null,
    photoImage,
    logoImage,
  }
}
