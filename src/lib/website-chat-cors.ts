import { NextRequest, NextResponse } from 'next/server'

/**
 * Origins allowed to call the public website-chat endpoints cross-origin.
 * The WordPress marketing site (www redirects to the apex, so both are listed).
 */
export const WEBSITE_CHAT_ALLOWED_ORIGINS = [
  'https://floorinteriorservices.com',
  'https://www.floorinteriorservices.com',
]

export function websiteChatCorsHeaders(origin?: string | null): Record<string, string> {
  const value = origin ? String(origin).trim().toLowerCase() : ''
  const allowed = WEBSITE_CHAT_ALLOWED_ORIGINS.includes(value)
    ? value
    : WEBSITE_CHAT_ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-website-chat-token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/**
 * Full response headers (no-store cache headers + CORS) for the visitor chat endpoints.
 */
export function chatHeaders(request: NextRequest) {
  return {
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    ...websiteChatCorsHeaders(request.headers.get('origin')),
  }
}

/**
 * Handles the OPTIONS preflight triggered by the custom `x-website-chat-token`
 * header and `Content-Type: application/json` from cross-origin requests.
 */
export function websiteChatCorsPreflight(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: websiteChatCorsHeaders(request.headers.get('origin')),
  })
}
