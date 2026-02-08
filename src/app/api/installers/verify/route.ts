import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const TOKEN_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'

function verifyToken(token: string): any {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.')
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url')
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature')
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired')
    }
    
    return payload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    try {
      const payload = verifyToken(token)
      
      return NextResponse.json({
        success: true,
        installerId: payload.installerId,
        username: payload.username,
        email: payload.email,
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Error verifying token:', error)
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    )
  }
}
