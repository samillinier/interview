import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isNativeShellUserAgent } from '@/lib/deviceDetection'
import { recordInstallerAccess } from '@/lib/installerAccess'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    if (isNativeShellUserAgent(request.headers.get('user-agent'))) {
      try {
        await recordInstallerAccess(installerId, 'native-app', { forceNative: true })
      } catch (err) {
        console.error('Failed to stamp App platform from native badge sync:', err)
      }
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'notification', 'message', 'news', or null for all

    const where: any = { installerId }
    if (type) {
      where.type = type
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
          },
        },
        MessageReaction: true,
      },
      orderBy: {
        createdAt: 'asc', // Oldest first for chat view
      },
    })

    return NextResponse.json({
      success: true,
      notifications,
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    )
  }
}
