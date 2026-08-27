import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyInstallerToken } from '@/lib/installerToken'
import { classifyDevice } from '@/lib/deviceDetection'

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

      // Heartbeat: refresh how the installer last accessed the app.
      if (payload.installerId) {
        const lastPlatform = classifyDevice(request.headers.get('user-agent'))
        try {
          await prisma.installer.update({
            where: { id: payload.installerId },
            data: { lastPlatform, lastSeenAt: new Date() },
          })
        } catch (err) {
          console.error('Failed to record installer heartbeat:', err)
        }
      }

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
