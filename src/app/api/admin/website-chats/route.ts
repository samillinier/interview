import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { splitVisitorName, websiteChatUiId } from '@/lib/website-chat'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
  }

  try {
    const chats = await prisma.websiteChat.findMany({
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    const unreadGroups = await prisma.websiteChatMessage.groupBy({
      by: ['chatId'],
      where: { senderType: 'visitor', isRead: false },
      _count: { _all: true },
    })
    const unreadByChat = new Map(unreadGroups.map((row) => [row.chatId, row._count._all]))

    const conversations = chats
      .map((chat) => {
        const last = chat.messages[0]
        const { firstName, lastName } = splitVisitorName(chat.name)
        return {
          installerId: websiteChatUiId(chat.id),
          unreadCount: unreadByChat.get(chat.id) || 0,
          lastMessage: last
            ? {
                id: last.id,
                installerId: websiteChatUiId(chat.id),
                type: 'message',
                title: 'Message',
                content: last.content,
                priority: 'normal',
                isRead: last.isRead,
                createdAt: last.createdAt,
                senderId: last.senderType === 'admin' ? 'admin' : last.senderType === 'alice' ? 'alice' : 'visitor',
                senderType: last.senderType,
              }
            : {
                id: `start-${chat.id}`,
                installerId: websiteChatUiId(chat.id),
                type: 'message',
                title: 'Message',
                content: 'Started a website chat',
                priority: 'normal',
                isRead: true,
                createdAt: chat.lastMessageAt || chat.createdAt,
                senderId: 'visitor',
                senderType: 'visitor',
              },
          Installer: {
            id: websiteChatUiId(chat.id),
            firstName,
            lastName,
            email: chat.email,
            photoUrl: null,
            status: 'website_chat',
          },
        }
      })

    const unreadCount = conversations.reduce((sum, row) => sum + row.unreadCount, 0)
    return NextResponse.json({ success: true, conversations, unreadCount }, { headers: noStoreHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load website chats' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
