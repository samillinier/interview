import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const TOKEN_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'

function verifyToken(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [encodedHeader, encodedPayload, signature] = parts

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url')

    if (signature !== expectedSignature) {
      return null
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const payload = verifyToken(token)

    if (!payload || !payload.propertyId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      propertyId: payload.propertyId,
      email: payload.email,
      username: payload.username,
    })
  } catch (error: any) {
    console.error('Error verifying token:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify token' },
      { status: 500 }
    )
  }
}
