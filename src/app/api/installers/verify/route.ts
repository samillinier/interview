import { NextRequest, NextResponse } from 'next/server'
import { verifyInstallerToken } from '@/lib/installerToken'
import { resolveInstallerPlatform } from '@/lib/deviceDetection'
import { recordInstallerAccess } from '@/lib/installerAccess'
import { getClientIp } from '@/lib/client-ip'

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
        const incoming = resolveInstallerPlatform({
          clientHint: client || request.headers.get('x-installer-client'),
          bodyUserAgent: userAgent,
          headerUserAgent: request.headers.get('user-agent'),
        })
        try {
          await recordInstallerAccess(payload.installerId, incoming, {
            userAgent: userAgent || request.headers.get('user-agent'),
            ipAddress: getClientIp(request),
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
