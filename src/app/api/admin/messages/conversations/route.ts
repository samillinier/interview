import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const latestByInstaller = await prisma.notification.groupBy({
      by: ['installerId'],
      where: { type: 'message' },
      _max: { createdAt: true },
    })

    const latestPairs = latestByInstaller.filter((row) => row._max.createdAt)
    const lastMessages =
      latestPairs.length === 0
        ? []
        : await prisma.notification.findMany({
            where: {
              type: 'message',
              OR: latestPairs.map((row) => ({
                installerId: row.installerId,
                createdAt: row._max.createdAt as Date,
              })),
            },
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
            },
            orderBy: { createdAt: 'desc' },
          })

    const lastMessageByInstaller = new Map<string, (typeof lastMessages)[number]>()
    for (const message of lastMessages) {
      if (!lastMessageByInstaller.has(message.installerId)) {
        lastMessageByInstaller.set(message.installerId, message)
      }
    }

    const unreadGroups = await prisma.notification.groupBy({
      by: ['installerId'],
      where: {
        type: 'message',
        isRead: false,
        senderType: 'installer',
      },
      _count: { _all: true },
    })
    const unreadByInstaller = new Map(
      unreadGroups.map((row) => [row.installerId, row._count._all])
    )

    const conversations = Array.from(lastMessageByInstaller.values()).map((message) => ({
      installerId: message.installerId,
      lastMessage: message,
      unreadCount: unreadByInstaller.get(message.installerId) || 0,
      Installer: message.Installer,
    }))

    return NextResponse.json({ success: true, conversations })
  } catch (error: any) {
    console.error('Error fetching message conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error.message },
      { status: 500 }
    )
  }
}
