import type { BrowserContext, Page } from 'playwright-core'
import {
  getMarketingPage,
  launchMarketingContext,
  renderPageHtml,
  searchBingWithPlaywright,
  searchDuckDuckGoWithPlaywright,
  searchGoogleWithPlaywright,
} from '@/lib/marketing-playwright'
import { countyName, stateLabel, type PlaceFilter } from '@/lib/us-states'

export type SearchHit = {
  url: string
  title: string
  snippet: string
}

export type MarketingLeadDraft = {
  companyName: string
  website: string
  websiteHost: string
  phone: string | null
  email: string | null
  city: string | null
  county: string | null
  state: string | null
  services: string | null
  contactUrl: string | null
  facebookUrl: string | null
  linkedinUrl: string | null
  licenseInfo: string | null
  keywords: string[]
  score: number
  sourceUrl: string
  snippet: string | null
}

const RESULT_LIMIT = 15
const PLAYWRIGHT_ENRICH_LIMIT = 8

const ALWAYS_SKIP_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'bing.com',
  'www.bing.com',
  'duckduckgo.com',
  'html.duckduckgo.com',
  'lite.duckduckgo.com',
  'youtube.com',
  'www.youtube.com',
  'wikipedia.org',
  'en.wikipedia.org',
  'facebook.com',
  'www.facebook.com',
  'linkedin.com',
  'www.linkedin.com',
  'instagram.com',
  'www.instagram.com',
  'maps.google.com',
  'play.google.com',
  'apple.com',
  'reddit.com',
  'www.reddit.com',
  'pinterest.com',
  'www.pinterest.com',
  'tiktok.com',
  'www.tiktok.com',
])

const DIRECTORY_HOSTS = new Set([
  'yelp.com',
  'www.yelp.com',
  'angi.com',
  'www.angi.com',
  'angieslist.com',
  'bbb.org',
  'www.bbb.org',
  'yellowpages.com',
  'www.yellowpages.com',
  'thumbtack.com',
  'www.thumbtack.com',
  'houzz.com',
  'www.houzz.com',
  'nextdoor.com',
  'indeed.com',
  'www.indeed.com',
  'glassdoor.com',
  'www.glassdoor.com',
  'craigslist.org',
  'homeadvisor.com',
  'www.homeadvisor.com',
  'superpages.com',
  'www.superpages.com',
  'downtobid.com',
  'procore.com',
  'network.procore.com',
  'mapquest.com',
  'www.mapquest.com',
  'porch.com',
  'www.porch.com',
  'bark.com',
  'www.bark.com',
  'buildzoom.com',
  'www.buildzoom.com',
  'manta.com',
  'www.manta.com',
  'merchantcircle.com',
  'www.merchantcircle.com',
])

const CHAIN_HOSTS = new Set([
  'lowes.com',
  'www.lowes.com',
  'homedepot.com',
  'www.homedepot.com',
  'menards.com',
  'www.menards.com',
  'flooranddecor.com',
  'www.flooranddecor.com',
  'walmart.com',
  'www.walmart.com',
  'amazon.com',
  'www.amazon.com',
  'costco.com',
  'www.costco.com',
  'target.com',
  'www.target.com',
  'ikea.com',
  'www.ikea.com',
  'empiretoday.com',
  'www.empiretoday.com',
  'llflooring.com',
  'www.llflooring.com',
  'lumberliquidators.com',
  'www.lumberliquidators.com',
  'acehardware.com',
  'www.acehardware.com',
])

const JUNK_COMPANY_RE =
  /^(access denied|error page|just a moment|attention required|403|404|forbidden|blocked|cloudflare|enable javascript|pardon our interruption|request unsuccessful|unavailable)/i

const SKIP_EMAIL_HOSTS = new Set([
  'example.com',
  'sentry.io',
  'wixpress.com',
  'schema.org',
  'googleapis.com',
  'cloudflare.com',
  'w3.org',
  'wordpress.com',
  'godaddy.com',
  'squarespace.com',
])

const SERVICE_PHRASES = [
  'metal building',
  'steel building',
  'pole barn',
  'pre-engineered',
  'pre engineered',
  'peb',
  'barndominium',
  'building installer',
  'building erection',
  'metal erection',
  'steel erection',
  'commercial construction',
  'general contractor',
  'estimator',
  'installer',
  'builder',
  'flooring',
  'floor installer',
  'carpet',
  'hardwood',
]

const US_STATES: Record<string, string> = {
  AL: 'AL', AK: 'AK', AZ: 'AZ', AR: 'AR', CA: 'CA', CO: 'CO', CT: 'CT', DE: 'DE', FL: 'FL',
  GA: 'GA', HI: 'HI', ID: 'ID', IL: 'IL', IN: 'IN', IA: 'IA', KS: 'KS', KY: 'KY', LA: 'LA',
  ME: 'ME', MD: 'MD', MA: 'MA', MI: 'MI', MN: 'MN', MS: 'MS', MO: 'MO', MT: 'MT', NE: 'NE',
  NV: 'NV', NH: 'NH', NJ: 'NJ', NM: 'NM', NY: 'NY', NC: 'NC', ND: 'ND', OH: 'OH', OK: 'OK',
  OR: 'OR', PA: 'PA', RI: 'RI', SC: 'SC', SD: 'SD', TN: 'TN', TX: 'TX', UT: 'UT', VT: 'VT',
  VA: 'VA', WA: 'WA', WV: 'WV', WI: 'WI', WY: 'WY', DC: 'DC',
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

export function hostnameOf(rawUrl: string): string | null {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase()
    return host.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function originOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin
  } catch {
    return null
  }
}

function decodeDuckDuckGoHref(href: string): string | null {
  try {
    const absolute = href.startsWith('http') ? href : `https:${href}`
    const parsed = new URL(absolute)
    const uddg = parsed.searchParams.get('uddg')
    if (uddg) return decodeURIComponent(uddg)
    if (parsed.hostname.includes('duckduckgo.com')) return null
    return parsed.toString()
  } catch {
    return href.startsWith('http') ? href : null
  }
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
    })
    if (!res.ok) return null
    const contentType = String(res.headers.get('content-type') || '')
    if (contentType && !/text\/html|application\/xhtml|text\/plain/i.test(contentType)) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function isNoiseHost(host: string): boolean {
  const bare = host.replace(/^www\./, '')
  return (
    ALWAYS_SKIP_HOSTS.has(bare) ||
    ALWAYS_SKIP_HOSTS.has(host) ||
    DIRECTORY_HOSTS.has(bare) ||
    DIRECTORY_HOSTS.has(host) ||
    CHAIN_HOSTS.has(bare) ||
    CHAIN_HOSTS.has(host)
  )
}

function isJunkCompany(name: string): boolean {
  return JUNK_COMPANY_RE.test(name.trim())
}

function placeFromQuery(query: string): { city: string | null; state: string | null } {
  const cityState = query.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),?\s*([A-Z]{2})\b/)
  if (cityState && US_STATES[cityState[2]]) {
    return { city: cityState[1], state: cityState[2] }
  }
  const inPlace = query.match(/\bin\s+([A-Za-z]+(?:\s[A-Za-z]+)?)\b/i)
  if (inPlace?.[1]) {
    const parts = inPlace[1].trim().split(/\s+/)
    const maybeState = parts[parts.length - 1].toUpperCase()
    if (parts.length > 1 && US_STATES[maybeState]) {
      return { city: parts.slice(0, -1).join(' '), state: maybeState }
    }
    return { city: inPlace[1].trim(), state: null }
  }
  return { city: null, state: null }
}

function hitPlaceScore(hit: SearchHit, place: PlaceFilter): number {
  const city = String(place.city || '').trim().toLowerCase()
  const county = countyName(place.county).toLowerCase()
  const stateCode = String(place.state || '').trim().toLowerCase()
  const stateName = stateLabel(place.state).toLowerCase()
  if (!city && !county && !stateCode) return 0
  const text = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase()
  let score = 0
  if (city && text.includes(city)) score += 4
  if (county && text.includes(county)) score += 3
  if (stateName && text.includes(stateName)) score += 1
  if (stateCode && new RegExp(`\\b${stateCode}\\b`).test(text)) score += 1
  return score
}

function rankHitsForQuery(hits: SearchHit[], query: string, place?: PlaceFilter): SearchHit[] {
  const parsed = placeFromQuery(query)
  const next: PlaceFilter = {
    city: place?.city || parsed.city,
    county: place?.county || null,
    state: place?.state || parsed.state,
  }
  if (!next.city && !next.county && !next.state) return hits
  return [...hits].sort((a, b) => hitPlaceScore(b, next) - hitPlaceScore(a, next))
}

function uniqueUrls(hits: SearchHit[], limit: number): SearchHit[] {
  const seen = new Set<string>()
  const out: SearchHit[] = []
  for (const hit of hits) {
    const host = hostnameOf(hit.url)
    if (!host || isNoiseHost(host)) continue
    if (seen.has(host)) continue
    seen.add(host)
    out.push(hit)
    if (out.length >= limit) break
  }
  return out
}

function parseBraveResults(data: any): SearchHit[] {
  const rows = Array.isArray(data?.web?.results) ? data.web.results : []
  return rows
    .map((row: any) => ({
      url: String(row?.url || '').trim(),
      title: String(row?.title || '').trim(),
      snippet: String(row?.description || '').trim(),
    }))
    .filter((row: SearchHit) => row.url.startsWith('http'))
}

async function fetchBravePage(query: string, offset: number): Promise<SearchHit[] | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (!key) return null
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20&offset=${offset}&country=US&search_lang=en`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': key,
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return parseBraveResults(data)
  } catch {
    return null
  }
}

async function searchBrave(query: string): Promise<SearchHit[] | null> {
  const first = await fetchBravePage(query, 0)
  if (!first) return null
  if (uniqueUrls(first, RESULT_LIMIT).length >= 10) return first
  const second = await fetchBravePage(query, 20)
  return second && second.length > 0 ? [...first, ...second] : first
}

async function searchGoogleCse(query: string): Promise<SearchHit[] | null> {
  const key = process.env.GOOGLE_CSE_API_KEY?.trim()
  const cx = process.env.GOOGLE_CSE_CX?.trim()
  if (!key || !cx) return null
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=10`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    const rows = Array.isArray(data?.items) ? data.items : []
    return rows
      .map((row: any) => ({
        url: String(row?.link || '').trim(),
        title: String(row?.title || '').trim(),
        snippet: String(row?.snippet || '').trim(),
      }))
      .filter((row: SearchHit) => row.url.startsWith('http'))
  } catch {
    return null
  }
}

function parseDuckDuckGoHtml(html: string): SearchHit[] {
  const hits: SearchHit[] = []
  const linkRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = linkRe.exec(html))) {
    const url = decodeDuckDuckGoHref(match[1])
    if (!url) continue
    hits.push({
      url,
      title: stripTags(match[2]).trim(),
      snippet: '',
    })
  }
  const snippetRe = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>|<td[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/gi
  const snippets: string[] = []
  while ((match = snippetRe.exec(html))) {
    snippets.push(stripTags(match[1] || match[2] || '').trim())
  }
  return hits.map((hit, index) => ({ ...hit, snippet: snippets[index] || '' }))
}

async function searchDuckDuckGo(query: string): Promise<SearchHit[]> {
  const html = await fetchText(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    12000,
  )
  return html ? parseDuckDuckGoHtml(html) : []
}

export async function searchContractorSites(query: string, place?: PlaceFilter): Promise<{ hits: SearchHit[]; source: string }> {
  const brave = await searchBrave(query)
  if (brave && brave.length > 0) {
    return { hits: rankHitsForQuery(uniqueUrls(brave, RESULT_LIMIT), query, place), source: 'brave' }
  }
  const google = await searchGoogleCse(query)
  if (google && google.length > 0) {
    return { hits: rankHitsForQuery(uniqueUrls(google, RESULT_LIMIT), query, place), source: 'google' }
  }
  const duck = await searchDuckDuckGo(query)
  return { hits: rankHitsForQuery(uniqueUrls(duck, RESULT_LIMIT), query, place), source: 'duckduckgo' }
}

function stripTags(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function attr(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
  const match = html.match(re)
  if (match?.[1]) return decodeHtml(match[1]).trim()
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i')
  const match2 = html.match(re2)
  return match2?.[1] ? decodeHtml(match2[1]).trim() : null
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function firstMatch(html: string, re: RegExp): string | null {
  const match = html.match(re)
  return match?.[1]?.trim() || null
}

function collectHrefs(html: string, origin: string): string[] {
  const hrefs: string[] = []
  const re = /<a[^>]+href=["']([^"']+)["']/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    const href = match[1].trim()
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue
    try {
      hrefs.push(new URL(href, origin).toString())
    } catch {
      // ignore bad urls
    }
  }
  return hrefs
}

function pickSocial(hrefs: string[], hostPart: string): string | null {
  return hrefs.find((href) => href.toLowerCase().includes(hostPart)) || null
}

function pickContactUrl(hrefs: string[], origin: string): string | null {
  const ranked = hrefs
    .map((href) => href.split('#')[0])
    .filter((href) => href.startsWith(origin))
    .filter((href) => /contact|about|estimate|quote|get-a-quote/i.test(href))
  return ranked[0] || null
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return null
}

function extractPhones(text: string): string | null {
  const re = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g
  const matches = text.match(re) || []
  for (const match of matches) {
    const phone = normalizePhone(match)
    if (phone) return phone
  }
  return null
}

function extractEmails(text: string, html: string): string | null {
  const fromMailto = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1]
  const candidates = [fromMailto, ...(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])].filter(Boolean) as string[]
  for (const email of candidates) {
    const lower = email.toLowerCase()
    const host = lower.split('@')[1] || ''
    if (SKIP_EMAIL_HOSTS.has(host)) continue
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lower)) continue
    if (/^(no-?reply|privacy|webmaster|support@wix)/i.test(lower)) continue
    return lower
  }
  return null
}

function extractCityState(text: string): { city: string | null; state: string | null } {
  const re = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})\b/g
  const skip = /^(from|the|serving|call|visit|contact|office|located|near|in|and|for|our|your|this)$/i
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (!US_STATES[match[2]]) continue
    const parts = match[1].split(/\s+/)
    const city = skip.test(parts[0]) ? parts.slice(1).join(' ') : match[1]
    if (!city) continue
    return { city, state: match[2] }
  }
  const stateOnly = text.match(/\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i)
  return { city: null, state: stateOnly?.[1] || null }
}

function extractCounty(text: string): string | null {
  const skip = /^(the|our|your|this|home|united|washington|this)$/i
  const match = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+County\b/)
  if (!match?.[1] || skip.test(match[1])) return null
  return match[1]
}

function extractLicense(text: string): string | null {
  const match = text.match(/\b(?:license|licence|lic\.?)\s*(?:#|no\.?|number)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{2,20})/i)
  return match ? `${match[0].trim()}` : null
}

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const phrase of ['installer', 'estimator', 'builder', 'contractor', 'erector', ...SERVICE_PHRASES]) {
    if (lower.includes(phrase) && !found.includes(phrase)) found.push(phrase)
  }
  return found.slice(0, 8)
}

function extractServices(text: string): string | null {
  const lower = text.toLowerCase()
  const found = SERVICE_PHRASES.filter((phrase) => lower.includes(phrase))
  return found.length ? found.slice(0, 6).join(', ') : null
}

function companyFromHtml(html: string, host: string, fallbackTitle: string): string {
  const siteName = attr(html, 'og:site_name')
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
  const h1 = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const raw = siteName || (h1 ? stripTags(h1) : '') || (title ? stripTags(title).split(/[|–—-]/)[0] : '') || fallbackTitle || host
  return raw.replace(/\s+/g, ' ').trim().slice(0, 120) || host
}

function scoreLead(lead: Omit<MarketingLeadDraft, 'score'>): number {
  let score = 20
  if (lead.phone) score += 20
  if (lead.email) score += 20
  if (lead.contactUrl) score += 8
  if (lead.city || lead.state) score += 8
  if (lead.county) score += 4
  if (lead.licenseInfo) score += 10
  if (lead.facebookUrl) score += 4
  if (lead.linkedinUrl) score += 4
  const keywords = lead.keywords.map((k) => k.toLowerCase())
  if (keywords.includes('installer')) score += 15
  if (keywords.includes('estimator')) score += 12
  if (keywords.includes('flooring') || keywords.includes('floor installer') || keywords.includes('carpet')) score += 10
  if (keywords.includes('builder') || keywords.includes('contractor')) score += 8
  if (keywords.some((k) => k.includes('metal building') || k.includes('steel'))) score += 10
  if (!lead.phone && !lead.email) score -= 15
  return Math.max(0, Math.min(100, score))
}

export function extractLeadFromHtml(html: string, pageUrl: string, snippet?: string, fallbackTitle?: string): MarketingLeadDraft | null {
  const host = hostnameOf(pageUrl)
  const origin = originOf(pageUrl)
  if (!host || !origin || isNoiseHost(host)) return null

  const text = `${stripTags(html)} ${snippet || ''}`.slice(0, 40000)
  const hrefs = collectHrefs(html, origin)
  const { city, state } = extractCityState(text)
  const draft: Omit<MarketingLeadDraft, 'score'> = {
    companyName: companyFromHtml(html, host, fallbackTitle || ''),
    website: origin,
    websiteHost: host,
    phone: extractPhones(text),
    email: extractEmails(text, html),
    city,
    county: extractCounty(text),
    state,
    services: extractServices(text),
    contactUrl: pickContactUrl(hrefs, origin),
    facebookUrl: pickSocial(hrefs, 'facebook.com'),
    linkedinUrl: pickSocial(hrefs, 'linkedin.com'),
    licenseInfo: extractLicense(text),
    keywords: extractKeywords(text),
    sourceUrl: pageUrl,
    snippet: (snippet || attr(html, 'og:description') || text.slice(0, 220) || null)?.slice(0, 280) || null,
  }
  if (isJunkCompany(draft.companyName)) return null
  return { ...draft, score: scoreLead(draft) }
}

function mergeLeads(lead: MarketingLeadDraft, extra: MarketingLeadDraft): MarketingLeadDraft {
  const merged: Omit<MarketingLeadDraft, 'score'> = {
    ...lead,
    phone: lead.phone || extra.phone,
    email: lead.email || extra.email,
    city: lead.city || extra.city,
    county: lead.county || extra.county,
    state: lead.state || extra.state,
    licenseInfo: lead.licenseInfo || extra.licenseInfo,
    facebookUrl: lead.facebookUrl || extra.facebookUrl,
    linkedinUrl: lead.linkedinUrl || extra.linkedinUrl,
    keywords: Array.from(new Set([...lead.keywords, ...extra.keywords])).slice(0, 8),
    services: lead.services || extra.services,
  }
  return { ...merged, score: scoreLead(merged) }
}

function leadFromSnippet(hit: SearchHit): MarketingLeadDraft | null {
  const host = hostnameOf(hit.url)
  const origin = originOf(hit.url)
  if (!host || !origin || isNoiseHost(host) || isJunkCompany(hit.title)) return null
  const draft: Omit<MarketingLeadDraft, 'score'> = {
    companyName: hit.title || host,
    website: origin,
    websiteHost: host,
    phone: extractPhones(hit.snippet),
    email: extractEmails(hit.snippet, ''),
    city: extractCityState(hit.snippet).city,
    county: extractCounty(`${hit.title} ${hit.snippet}`),
    state: extractCityState(hit.snippet).state,
    services: extractServices(hit.snippet),
    contactUrl: null,
    facebookUrl: null,
    linkedinUrl: null,
    licenseInfo: extractLicense(hit.snippet),
    keywords: extractKeywords(`${hit.title} ${hit.snippet}`),
    sourceUrl: hit.url,
    snippet: hit.snippet || null,
  }
  return { ...draft, score: scoreLead(draft) }
}

async function enrichFromContactPage(lead: MarketingLeadDraft): Promise<MarketingLeadDraft> {
  if ((lead.phone && lead.email) || !lead.contactUrl) return lead
  const html = await fetchText(lead.contactUrl, 8000)
  if (!html) return lead
  const extra = extractLeadFromHtml(html, lead.contactUrl, lead.snippet || undefined, lead.companyName)
  return extra ? mergeLeads(lead, extra) : lead
}

async function crawlWithFetch(hits: SearchHit[]): Promise<MarketingLeadDraft[]> {
  const crawled = await Promise.allSettled(
    hits.map(async (hit) => {
      const html = await fetchText(hit.url, 8000)
      if (!html) return leadFromSnippet(hit)
      const extracted = extractLeadFromHtml(html, hit.url, hit.snippet, hit.title)
      if (!extracted) return null
      return enrichFromContactPage(extracted)
    }),
  )

  return crawled
    .map((result) => (result.status === 'fulfilled' ? result.value : null))
    .filter((lead): lead is MarketingLeadDraft => {
      if (!lead) return false
      return !isJunkCompany(lead.companyName) && !isNoiseHost(lead.websiteHost)
    })
    .sort((a, b) => b.score - a.score)
}

async function enrichLeadsWithPlaywright(page: Page, leads: MarketingLeadDraft[]): Promise<MarketingLeadDraft[]> {
  const out: MarketingLeadDraft[] = []
  let used = 0
  for (const lead of leads) {
    if (used >= PLAYWRIGHT_ENRICH_LIMIT || (lead.phone && lead.email)) {
      out.push(lead)
      continue
    }
    used += 1
    const rendered = await renderPageHtml(page, lead.sourceUrl, 9000)
    let next = rendered
      ? extractLeadFromHtml(rendered.html, rendered.finalUrl || lead.sourceUrl, lead.snippet || undefined, lead.companyName)
      : null
    if (next) next = mergeLeads(lead, next)
    else next = lead
    if ((!next.phone || !next.email) && next.contactUrl) {
      const contact = await renderPageHtml(page, next.contactUrl, 8000)
      if (contact) {
        const extra = extractLeadFromHtml(contact.html, contact.finalUrl, next.snippet || undefined, next.companyName)
        if (extra) next = mergeLeads(next, extra)
      }
    }
    if (!isJunkCompany(next.companyName)) out.push(next)
  }
  return out.sort((a, b) => b.score - a.score)
}

export async function crawlSearchHits(hits: SearchHit[]): Promise<MarketingLeadDraft[]> {
  const { leads } = await crawlContractorSites(hits)
  return leads
}

export async function crawlContractorSites(
  hits: SearchHit[],
  context?: BrowserContext | null,
): Promise<{ leads: MarketingLeadDraft[]; crawler: 'playwright' | 'fetch' }> {
  const fetched = await crawlWithFetch(hits)
  const needsEnrich = fetched.some((lead) => !lead.phone || !lead.email)
  if (!needsEnrich) {
    return { leads: fetched, crawler: 'fetch' }
  }

  let launched = context || null
  let ownsContext = false
  if (!launched) {
    try {
      launched = await launchMarketingContext()
      ownsContext = true
    } catch {
      launched = null
    }
  }

  if (!launched) {
    return { leads: fetched, crawler: 'fetch' }
  }

  try {
    const page = await getMarketingPage(launched)
    return { leads: await enrichLeadsWithPlaywright(page, fetched), crawler: 'playwright' }
  } finally {
    if (ownsContext) await launched.close().catch(() => {})
  }
}

export async function runMarketingDiscovery(query: string, place?: PlaceFilter): Promise<{
  hits: SearchHit[]
  source: string
  leads: MarketingLeadDraft[]
  crawler: 'playwright' | 'fetch'
}> {
  const braveHits = await searchBrave(query)
  let hits = braveHits && braveHits.length > 0 ? rankHitsForQuery(uniqueUrls(braveHits, RESULT_LIMIT), query, place) : []
  let source = hits.length > 0 ? 'brave' : ''

  if (hits.length > 0) {
    const crawled = await crawlContractorSites(hits)
    return { hits, source, ...crawled }
  }

  let context: BrowserContext | null = null
  try {
    context = await launchMarketingContext()
  } catch {
    context = null
  }

  if (!context) {
    const fallback = await searchContractorSites(query, place)
    return { ...fallback, leads: await crawlWithFetch(fallback.hits), crawler: 'fetch' }
  }

  try {
    const page = await getMarketingPage(context)
    hits = uniqueUrls(await searchGoogleWithPlaywright(page, query), RESULT_LIMIT)
    source = 'google'
    if (hits.length === 0) {
      hits = uniqueUrls(await searchBingWithPlaywright(page, query), RESULT_LIMIT)
      source = 'bing'
    }
    if (hits.length === 0) {
      hits = uniqueUrls(await searchDuckDuckGoWithPlaywright(page, query), RESULT_LIMIT)
      source = 'duckduckgo'
    }
    hits = rankHitsForQuery(hits, query, place)
    const crawled = await crawlContractorSites(hits, context)
    return { hits, source, ...crawled }
  } finally {
    await context.close().catch(() => {})
  }
}
