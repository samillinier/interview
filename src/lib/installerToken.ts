import crypto from 'crypto'
import type { NextRequest } from 'next/server'

const TOKEN_SECRET =
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'

export type InstallerTokenPayload = {
  installerId?: string
  username?: string
  email?: string
  exp?: number
  [key: string]: any
}

export function verifyInstallerToken(token: string): InstallerTokenPayload {
  const [encodedHeader, encodedPayload, signature] = token.split('.')

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Invalid token')
  }

  const expectedSignature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  if (signature !== expectedSignature) {
    throw new Error('Invalid token')
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as InstallerTokenPayload

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }

  return payload
}

export function getInstallerTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }

  const headerToken =
    request.headers.get('x-installer-token') || request.headers.get('X-Installer-Token')
  if (headerToken) return headerToken.trim()

  return null
}

