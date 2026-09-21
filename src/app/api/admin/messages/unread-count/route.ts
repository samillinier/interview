import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

/**
 * Lightweight unread total for the Messages nav badge (installer chats + website visitors).
 * Mirrors /api/admin/change-requests/count — count only, no conversation payloads.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
  }

  try {
    const [installerUnread, websiteUnread] = await Promise.all([
      prisma.notification.count({
        where: {
          type: 'message',
          isRead: false,
          senderType: 'installer',
        },
      }),
      prisma.websiteChatMessage.count({
        where: {
          senderType: 'visitor',
          isRead: false,
        },
      }),
    ])

    const count = installerUnread + websiteUnread
    return NextResponse.json(
      { success: true, count, installerUnread, websiteUnread },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    console.error('messages unread-count failed', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch unread count' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
