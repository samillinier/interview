import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { pickVisitorName, sanitizeChatText, visitorDisplayParts, websiteChatDbId, websiteChatUiId } from '@/lib/website-chat'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session
}

function mapMessage(message: { id: string; createdAt: Date; senderType: string; senderName: string | null; content: string; isRead: boolean; chatId: string }, chat: { id: string; name: string; email: string }) {
  const { firstName, lastName } = visitorDisplayParts(chat.name, chat.email)
  return {
    id: message.id,
    installerId: websiteChatUiId(chat.id),
    type: 'message',
    title: 'Message',
    content: message.content,
    priority: 'normal',
    isRead: message.isRead,
    createdAt: message.createdAt,
    senderId:
      message.senderType === 'admin' ? 'admin' : message.senderType === 'alice' ? 'alice' : 'visitor',
    senderType: message.senderType,
    Installer: {
      id: websiteChatUiId(chat.id),
      firstName,
      lastName,
      email: chat.email,
      photoUrl: null,
    },
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const id = websiteChatDbId(String(params.id || ''))
    const chat = await prisma.websiteChat.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404, headers: noStoreHeaders })

    return NextResponse.json(
      {
        success: true,
        notifications: chat.messages.map((message) => mapMessage(message, chat)),
      },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load chat' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const id = websiteChatDbId(String(params.id || ''))
    const body = await request.json().catch(() => ({}))
    const content = sanitizeChatText(body?.content, 1000)
    if (!content) {
      return NextResponse.json({ error: 'Write a message first.' }, { status: 400, headers: noStoreHeaders })
    }

    const chat = await prisma.websiteChat.findUnique({ where: { id } })
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404, headers: noStoreHeaders })

    const message = await prisma.websiteChatMessage.create({
      data: {
        chatId: chat.id,
        senderType: 'admin',
        senderName: session.user?.name || session.user?.email || 'Admin',
        content,
        isRead: true,
      },
    })
    await prisma.websiteChat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date() },
    })
    await prisma.websiteChatMessage.updateMany({
      where: { chatId: chat.id, senderType: 'visitor', isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json(
      { success: true, notification: mapMessage(message, chat) },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to send reply' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const id = websiteChatDbId(String(params.id || ''))
    const body = await request.json().catch(() => ({}))

    if (body?.unread) {
      const lastVisitor = await prisma.websiteChatMessage.findFirst({
        where: { chatId: id, senderType: 'visitor' },
        orderBy: { createdAt: 'desc' },
      })
      if (lastVisitor) {
        await prisma.websiteChatMessage.update({
          where: { id: lastVisitor.id },
          data: { isRead: false },
        })
      }
      return NextResponse.json({ success: true }, { headers: noStoreHeaders })
    }

    const nextName = pickVisitorName(body?.name)
    const issueStatus = String(body?.issueStatus || '').trim().toLowerCase()
    const allowedStatus = ['open', 'in_progress', 'solved', 'not_solved']
    if (nextName || allowedStatus.includes(issueStatus)) {
      const chat = await prisma.websiteChat.update({
        where: { id },
        data: {
          ...(nextName ? { name: nextName } : {}),
          ...(allowedStatus.includes(issueStatus) ? { issueStatus } : {}),
        },
        select: { name: true, issueStatus: true },
      })
      return NextResponse.json({ success: true, chat }, { headers: noStoreHeaders })
    }

    await prisma.websiteChatMessage.updateMany({
      where: { chatId: id, senderType: 'visitor', isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true }, { headers: noStoreHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to mark read' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const id = websiteChatDbId(String(params.id || ''))
    await prisma.websiteChat.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: noStoreHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete chat' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
