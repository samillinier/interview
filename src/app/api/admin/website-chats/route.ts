import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { sanitizeChatText, visitorDisplayParts, websiteChatDbId, websiteChatUiId, isVisitorOnline, VISITOR_ONLINE_MS } from '@/lib/website-chat'

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
    try {
      const staleBefore = new Date(Date.now() - VISITOR_ONLINE_MS)
      await prisma.websiteChat.deleteMany({
        where: {
          messages: { none: { senderType: { in: ['visitor', 'admin'] } } },
          OR: [
            { lastSeenAt: null },
            { lastSeenAt: { lt: staleBefore } },
            { email: { endsWith: '@fiscorponline.com' } },
            { email: { endsWith: '@floorinteriorservices.com' } },
          ],
        },
      })
    } catch (cleanupError) {
      console.error('website-chat cleanup failed', cleanupError)
    }

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
      .filter((chat) => {
        const hasRealMessage = chat.messages.some(
          (message) => message.senderType === 'visitor' || message.senderType === 'admin',
        )
        const email = String(chat.email || '').toLowerCase()
        const staffGhost =
          !hasRealMessage &&
          (email.endsWith('@fiscorponline.com') || email.endsWith('@floorinteriorservices.com'))
        if (staffGhost) return false
        return isVisitorOnline(chat.lastSeenAt) || hasRealMessage
      })
      .map((chat) => {
        const last = chat.messages[0]
        const { firstName, lastName } = visitorDisplayParts(chat.name, chat.email)
        const online = isVisitorOnline(chat.lastSeenAt)
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
            : null,
          Installer: {
            id: websiteChatUiId(chat.id),
            firstName,
            lastName,
            email: chat.email,
            photoUrl: null,
            status: 'website_chat',
            online,
            lastSeenAt: chat.lastSeenAt,
          },
        }
      })

    const unreadCount = conversations.reduce((sum, row) => sum + row.unreadCount, 0)
    const onlineCount = conversations.filter((row) => row.Installer.online).length
    const startedCount = await prisma.websiteChat.count({
      where: { messages: { some: { senderType: { in: ['visitor', 'admin'] } } } },
    })
    return NextResponse.json(
      { success: true, conversations, unreadCount, visitorCount: startedCount, startedCount, onlineCount },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load website chats' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const content = sanitizeChatText(body?.content, 1000)
    if (!content) {
      return NextResponse.json({ error: 'Write a message first.' }, { status: 400, headers: noStoreHeaders })
    }

    const requestedIds = Array.isArray(body?.chatIds)
      ? body.chatIds.map((id: unknown) => websiteChatDbId(String(id || '')))
      : []
    const chats = body?.all
      ? await prisma.websiteChat.findMany({
          where: { messages: { some: { senderType: { in: ['visitor', 'admin'] } } } },
          select: { id: true },
        })
      : requestedIds.length > 0
        ? await prisma.websiteChat.findMany({
            where: { id: { in: requestedIds.filter(Boolean) } },
            select: { id: true },
          })
        : []

    if (chats.length === 0) {
      return NextResponse.json({ error: 'Choose a website visitor first.' }, { status: 400, headers: noStoreHeaders })
    }

    const senderName = session.user?.name || session.user?.email || 'Admin'
    await prisma.$transaction(
      chats.flatMap((chat) => [
        prisma.websiteChatMessage.create({
          data: {
            chatId: chat.id,
            senderType: 'admin',
            senderName,
            content,
            isRead: true,
          },
        }),
        prisma.websiteChat.update({
          where: { id: chat.id },
          data: { lastMessageAt: new Date() },
        }),
      ]),
    )

    return NextResponse.json(
      { success: true, sent: chats.length },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to send message' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
