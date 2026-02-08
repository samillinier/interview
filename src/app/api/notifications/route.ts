import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Create notification(s) for installer(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { installerIds, type, title, content, priority, link, senderId, senderType } = body

    if (!installerIds || !Array.isArray(installerIds) || installerIds.length === 0) {
      return NextResponse.json(
        { error: 'Installer IDs are required' },
        { status: 400 }
      )
    }

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Create notifications for all specified installers
    const notifications = await Promise.all(
      installerIds.map((installerId: string) =>
        prisma.notification.create({
          data: {
            installerId,
            type: type || 'notification',
            title,
            content,
            priority: priority || 'normal',
            link: link || null,
            senderId: senderId || 'admin',
            senderType: senderType || 'admin',
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    })
  } catch (error: any) {
    console.error('Error creating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to create notifications', details: error.message },
      { status: 500 }
    )
  }
}

// Get all notifications (admin view)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const installerId = searchParams.get('installerId')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (installerId) {
      where.installerId = installerId
    }
    if (type) {
      where.type = type
    }

    const total = await prisma.notification.count({ where })

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    )
  }
}
