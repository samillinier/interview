import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyInstallerToken } from '@/lib/installerToken'
import { resolveInstallerPlatform } from '@/lib/deviceDetection'

export async function POST(request: NextRequest) {
  try {
    const { token, client, userAgent } = await request.json()

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
        const lastPlatform = resolveInstallerPlatform({
          clientHint: client || request.headers.get('x-installer-client'),
          bodyUserAgent: userAgent,
          headerUserAgent: request.headers.get('user-agent'),
        })
        const data: { lastSeenAt: Date; lastPlatform?: string } = { lastSeenAt: new Date() }
        // Don't stamp Mobile Web over App when WKWebView fetch omits the custom UA.
        if (client || userAgent || lastPlatform === 'native-app') {
          data.lastPlatform = lastPlatform
        }
        try {
          await prisma.installer.update({
            where: { id: payload.installerId },
            data,
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
