import type { NextRequest } from 'next/server'

/**
 * Best-effort client IP from common proxy headers (Vercel / Cloudflare / nginx).
 */
export function getClientIp(request: NextRequest): string | null {
  const candidates = [
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
    request.headers.get('cf-connecting-ip'),
    request.headers.get('true-client-ip'),
    request.headers.get('x-vercel-forwarded-for'),
  ]

  for (const raw of candidates) {
    if (!raw) continue
    let ip = String(raw).split(',')[0]?.trim() || ''
    if (!ip) continue

    const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/)
    if (bracketed?.[1]) {
      ip = bracketed[1]
    } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
      ip = ip.replace(/:\d+$/, '')
    }

    if (ip && ip.toLowerCase() !== 'unknown') return ip.slice(0, 64)
  }

  return null
}
