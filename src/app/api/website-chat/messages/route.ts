import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { sanitizeChatText } from '@/lib/website-chat'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 10

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

function visitorToken(request: NextRequest, body?: any) {
  return String(request.headers.get('x-website-chat-token') || body?.token || '').trim()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadVisitorMessages(token: string) {
  return prisma.websiteChat.findUnique({
    where: { visitorToken: token },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}

export async function GET(request: NextRequest) {
  try {
    const token = visitorToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Chat session required' }, { status: 401, headers: noStoreHeaders })
    }
    const chat = await loadVisitorMessages(token)
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404, headers: noStoreHeaders })
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
    if (!token) {
      return NextResponse.json({ error: 'Chat session required' }, { status: 401, headers: noStoreHeaders })
    }

    if (body?.poll) {
      const sinceId = String(body.sinceId || '')
      const waitMs = Math.max(0, Math.min(Number(body.waitMs) || 0, 8000))
      const deadline = Date.now() + waitMs
      let chat = await loadVisitorMessages(token)
      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404, headers: noStoreHeaders })
      }
      while (waitMs > 0) {
        const lastId = chat.messages[chat.messages.length - 1]?.id || ''
        if (lastId !== sinceId || Date.now() >= deadline) break
        await sleep(400)
        chat = await loadVisitorMessages(token)
        if (!chat) {
          return NextResponse.json({ error: 'Chat not found' }, { status: 404, headers: noStoreHeaders })
        }
      }
      return NextResponse.json({ success: true, messages: chat.messages }, { headers: noStoreHeaders })
    }

    const content = sanitizeChatText(body?.content, 1000)
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
      data: { lastMessageAt: new Date(), lastSeenAt: new Date() },
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
