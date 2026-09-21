import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateAliceComplianceReply, shouldGenerateAliceReply } from '@/lib/compliance-chat-ai'
import { isChatAiGloballyEnabled, isWebsiteChatAiEnabled } from '@/lib/chat-ai-settings'
import { sanitizeChatText } from '@/lib/website-chat'
import { chatHeaders, websiteChatCorsPreflight } from '@/lib/website-chat-cors'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

export async function OPTIONS(request: NextRequest) {
  return websiteChatCorsPreflight(request)
}

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

async function maybeCreateAliceReply(
  chat: {
    id: string
    name: string
    aiEnabled?: boolean | null
    messages?: Array<{ senderType: string; senderId?: string | null; content: string; createdAt: Date }>
  },
  options?: { forceAfterWait?: boolean },
) {
  if (!(await isWebsiteChatAiEnabled(chat.id))) return null
  if (!(await isChatAiGloballyEnabled())) return null
  const history = chat.messages || (await prisma.websiteChatMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: 'asc' },
  }))
  if (!shouldGenerateAliceReply(history, options)) return null

  const reply = await generateAliceComplianceReply({
    visitorName: chat.name,
    history,
  })
  if (!reply) return null

  const latest = await prisma.websiteChatMessage.findFirst({
    where: { chatId: chat.id },
    orderBy: { createdAt: 'desc' },
    select: { senderType: true },
  })
  if (latest && latest.senderType !== 'visitor') return null

  const aliceMessage = await prisma.websiteChatMessage.create({
    data: {
      chatId: chat.id,
      senderType: 'alice',
      senderName: 'Alice',
      content: reply,
      isRead: true,
    },
  })
  await prisma.websiteChat.update({
    where: { id: chat.id },
    data: { lastMessageAt: new Date() },
  })
  return aliceMessage
}

export async function GET(request: NextRequest) {
  try {
    const token = visitorToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Chat session required' }, { status: 401, headers: chatHeaders(request) })
    }
    const chat = await loadVisitorMessages(token)
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404, headers: chatHeaders(request) })
    }
    return NextResponse.json({ success: true, messages: chat.messages }, { headers: chatHeaders(request) })
  } catch (error: any) {
    console.error('website-chat messages GET failed', error?.message || error)
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500, headers: chatHeaders(request) },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = visitorToken(request, body)
    if (!token) {
      return NextResponse.json({ error: 'Chat session required' }, { status: 401, headers: chatHeaders(request) })
    }

    if (body?.poll) {
      const sinceId = String(body.sinceId || '')
      const waitMs = Math.max(0, Math.min(Number(body.waitMs) || 0, 8000))
      const deadline = Date.now() + waitMs
      let chat = await loadVisitorMessages(token)
      while (true) {
        const lastId = chat?.messages?.at(-1)?.id || ''
        if (chat && lastId !== sinceId) break
        if (waitMs <= 0 || Date.now() >= deadline) break
        await sleep(400)
        chat = await loadVisitorMessages(token)
      }
      return NextResponse.json(
        { success: true, messages: chat?.messages || [] },
        { headers: chatHeaders(request) },
      )
    }

    const chat = await prisma.websiteChat.findUnique({
      where: { visitorToken: token },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404, headers: chatHeaders(request) })
    }

    if (body?.requestAi) {
      const aliceMessage = await maybeCreateAliceReply(chat, { forceAfterWait: true })
      return NextResponse.json({ success: true, aliceMessage }, { headers: chatHeaders(request) })
    }

    const content = sanitizeChatText(body?.content, 1000)
    if (!content) {
      return NextResponse.json({ error: 'Write a message first.' }, { status: 400, headers: chatHeaders(request) })
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

    const aliceMessage = await maybeCreateAliceReply(
      { ...chat, messages: [...chat.messages, message] },
    )

    return NextResponse.json({ success: true, message, aliceMessage }, { headers: chatHeaders(request) })
  } catch (error: any) {
    console.error('website-chat messages POST failed', error?.message || error)
    return NextResponse.json(
      { error: 'Could not send message. Please try again.' },
      { status: 500, headers: chatHeaders(request) },
    )
  }
}
