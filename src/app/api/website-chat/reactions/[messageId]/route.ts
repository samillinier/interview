import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { chatHeaders, websiteChatCorsPreflight } from '@/lib/website-chat-cors'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED_EMOJI = new Set([
  '👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥', '👏', '💯',
])

type Reactor = {
  id: string
  type: 'admin' | 'visitor'
  name: string | null
}

async function resolveReactor(request: NextRequest, messageId: string): Promise<Reactor | null> {
  // 1) Admin session (dashboard / admin chat popup)
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (email) {
    return {
      id: email,
      type: 'admin',
      name: session?.user?.name || email,
    }
  }

  // 2) Visitor token (public landing chat widget / WordPress embed)
  const token = String(request.headers.get('x-website-chat-token') || '').trim()
  if (token) {
    const message = await prisma.websiteChatMessage.findUnique({
      where: { id: messageId },
      select: {
        Chat: { select: { id: true, visitorToken: true, name: true } },
      },
    })
    if (message && message.Chat.visitorToken === token) {
      return {
        id: message.Chat.id,
        type: 'visitor',
        name: message.Chat.name || null,
      }
    }
  }

  return null
}

function mapReaction(r: {
  id: string
  emoji: string
  reactorId: string
  reactorType: string
  reactorName: string | null
}) {
  return {
    id: r.id,
    emoji: r.emoji,
    reactorId: r.reactorId,
    reactorType: r.reactorType,
    reactorName: r.reactorName,
  }
}

async function listReactions(messageId: string) {
  return prisma.websiteChatReaction.findMany({
    where: { messageId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function OPTIONS(request: NextRequest) {
  return websiteChatCorsPreflight(request)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> | { messageId: string } },
) {
  const params = context.params instanceof Promise ? await context.params : context.params
  const messageId = String(params.messageId || '')

  if (!messageId) {
    return NextResponse.json({ error: 'Message ID is required' }, { status: 400, headers: chatHeaders(request) })
  }

  try {
    const reactions = await listReactions(messageId)
    return NextResponse.json(
      { success: true, reactions: reactions.map(mapReaction) },
      { headers: chatHeaders(request) },
    )
  } catch (error: any) {
    console.error('website-chat reactions GET failed', error?.message || error)
    return NextResponse.json(
      { error: 'Failed to load reactions' },
      { status: 500, headers: chatHeaders(request) },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> | { messageId: string } },
) {
  const params = context.params instanceof Promise ? await context.params : context.params
  const messageId = String(params.messageId || '')

  if (!messageId) {
    return NextResponse.json({ error: 'Message ID is required' }, { status: 400, headers: chatHeaders(request) })
  }

  const reactor = await resolveReactor(request, messageId)
  if (!reactor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: chatHeaders(request) })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const emoji = typeof body?.emoji === 'string' ? body.emoji.trim() : ''

    if (!emoji || !ALLOWED_EMOJI.has(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400, headers: chatHeaders(request) })
    }

    const message = await prisma.websiteChatMessage.findUnique({
      where: { id: messageId },
      select: { id: true },
    })
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404, headers: chatHeaders(request) })
    }

    // Toggle: remove if this exact reactor+emoji already exists, otherwise add.
    const existing = await prisma.websiteChatReaction.findUnique({
      where: {
        messageId_reactorId_reactorType_emoji: {
          messageId,
          reactorId: reactor.id,
          reactorType: reactor.type,
          emoji,
        },
      },
    })

    if (existing) {
      await prisma.websiteChatReaction.delete({ where: { id: existing.id } })
    } else {
      await prisma.websiteChatReaction.create({
        data: {
          messageId,
          reactorId: reactor.id,
          reactorType: reactor.type,
          reactorName: reactor.name,
          emoji,
        },
      })
    }

    const reactions = await listReactions(messageId)
    return NextResponse.json(
      { success: true, reactions: reactions.map(mapReaction) },
      { headers: chatHeaders(request) },
    )
  } catch (error: any) {
    console.error('website-chat reactions POST failed', error?.message || error)
    return NextResponse.json(
      { error: 'Failed to toggle reaction' },
      { status: 500, headers: chatHeaders(request) },
    )
  }
}
