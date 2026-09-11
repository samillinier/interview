import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { aliceGreeting, sanitizeChatText } from '@/lib/website-chat'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

function visitorToken(request: NextRequest, body?: any) {
  return String(request.headers.get('x-website-chat-token') || body?.token || '').trim()
}

export async function GET(request: NextRequest) {
  try {
    const token = visitorToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Chat session required' }, { status: 401, headers: noStoreHeaders })
    }
    const chat = await prisma.websiteChat.findUnique({
      where: { visitorToken: token },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404, headers: noStoreHeaders })
    }
    if (!chat.messages.some((message) => message.senderType === 'alice')) {
      await prisma.websiteChatMessage.create({
        data: {
          chatId: chat.id,
          senderType: 'alice',
          senderName: 'Alice',
          content: aliceGreeting(chat.name),
          isRead: true,
          createdAt: chat.createdAt,
        },
      })
      const refreshed = await prisma.websiteChat.findUnique({
        where: { id: chat.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
      return NextResponse.json(
        { success: true, messages: refreshed?.messages || [] },
        { headers: noStoreHeaders },
      )
    }
    return NextResponse.json({ success: true, messages: chat.messages }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('website-chat messages GET failed', error?.message || error)
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = visitorToken(request, body)
    const content = sanitizeChatText(body?.content, 1000)
    if (!token) {
      return NextResponse.json({ error: 'Chat session required' }, { status: 401, headers: noStoreHeaders })
    }
    if (!content) {
      return NextResponse.json({ error: 'Write a message first.' }, { status: 400, headers: noStoreHeaders })
    }

    const chat = await prisma.websiteChat.findUnique({ where: { visitorToken: token } })
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404, headers: noStoreHeaders })
    }

    const message = await prisma.websiteChatMessage.create({
      data: {
        chatId: chat.id,
        senderType: 'visitor',
        senderName: chat.name,
        content,
        isRead: false,
      },
    })
    await prisma.websiteChat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date() },
    })
    return NextResponse.json({ success: true, message }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('website-chat messages POST failed', error?.message || error)
    return NextResponse.json(
      { error: 'Could not send message. Please try again.' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
