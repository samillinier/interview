import { NextRequest, NextResponse } from 'next/server'
import { verifyInstallerToken } from '@/lib/installerToken'

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
      const payload = verifyInstallerToken(token)
      
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
