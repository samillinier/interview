import crypto from 'crypto'
import type { NextRequest } from 'next/server'

function getTokenSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("TOKEN_SECRET: JWT_SECRET and NEXTAUTH_SECRET are both missing — token signing is unsafe")
  }
  return secret
}

export type InstallerTokenPayload = {
  installerId?: string
  username?: string
  email?: string
  exp?: number
  [key: string]: any
}

export function generateInstallerToken(payload: InstallerTokenPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', getTokenSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export function verifyInstallerToken(token: string): InstallerTokenPayload {
  const [encodedHeader, encodedPayload, signature] = token.split('.')

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Invalid token')
  }

  const expectedSignature = crypto
    .createHmac('sha256', getTokenSecret() as string)
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

