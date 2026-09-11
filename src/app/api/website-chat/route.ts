import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { aliceGreeting, isLoggedInVisitor, pickVisitorEmail, pickVisitorName, sanitizeChatText } from '@/lib/website-chat'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

function generatedVisitor() {
  const code = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return {
    name: `Visitor ${code}`,
    email: `visitor-${code.toLowerCase()}@noreply.local`,
  }
}

function resolveIdentity(
  body: any,
  sessionUser?: { name?: string | null; email?: string | null } | null,
  existing?: { name: string; email: string } | null,
) {
  const fallback = generatedVisitor()
  return {
    name:
      pickVisitorName(body?.name, sessionUser?.name, existing?.name) ||
      existing?.name ||
      fallback.name,
    email:
      pickVisitorEmail(body?.email, sessionUser?.email, existing?.email) ||
      existing?.email ||
      fallback.email,
  }
}

function visitorTokenFrom(request: NextRequest, body?: any) {
  return String(
    request.headers.get('x-website-chat-token') ||
      body?.token ||
      '',
  ).trim()
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (isLoggedInVisitor(session?.user)) {
      return NextResponse.json({ success: true, chat: null, skipped: true }, { headers: noStoreHeaders })
    }
    const token = visitorTokenFrom(request)
    if (!token) {
      return NextResponse.json({ success: true, chat: null }, { headers: noStoreHeaders })
    }
    const chat = await prisma.websiteChat.findUnique({
      where: { visitorToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { messages: true } },
      },
    })
    if (chat) {
      await prisma.websiteChat.update({
        where: { id: chat.id },
        data: { lastSeenAt: new Date() },
      })
    }
    return NextResponse.json(
      { success: true, chat: chat ? { ...chat, messageCount: chat._count.messages } : null },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    console.error('website-chat GET failed', error?.message || error)
    return NextResponse.json(
      { error: 'Failed to load chat' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const presenceOnly = Boolean(body?.presence)
    const phone = sanitizeChatText(body?.phone, 40) || null
    const existingToken = visitorTokenFrom(request, body)
    const session = await getServerSession(authOptions)
    const sessionUser = session?.user || null

    if (presenceOnly && isLoggedInVisitor(sessionUser)) {
      return NextResponse.json(
        { success: true, skipped: true, token: existingToken || '' },
        { headers: noStoreHeaders },
      )
    }

    if (existingToken) {
      const existing = await prisma.websiteChat.findUnique({
        where: { visitorToken: existingToken },
        include: { _count: { select: { messages: true } } },
      })
      if (existing) {
        const identity = resolveIdentity(body, sessionUser, existing)
        const chat = await prisma.websiteChat.update({
          where: { id: existing.id },
          data: presenceOnly
            ? { name: identity.name, email: identity.email, lastSeenAt: new Date() }
            : { name: identity.name, email: identity.email, phone, lastSeenAt: new Date() },
        })
        return NextResponse.json(
          {
            success: true,
            token: existingToken,
            chat: { ...chat, messageCount: existing._count.messages },
          },
          { headers: noStoreHeaders },
        )
      }
    }

    const identity = resolveIdentity(body, sessionUser)
    const token = existingToken || crypto.randomBytes(24).toString('hex')
    const chat = await prisma.websiteChat.upsert({
      where: { visitorToken: token },
      create: presenceOnly
        ? {
            visitorToken: token,
            name: identity.name,
            email: identity.email,
            phone,
            lastSeenAt: new Date(),
          }
        : {
            visitorToken: token,
            name: identity.name,
            email: identity.email,
            phone,
            lastSeenAt: new Date(),
            messages: {
              create: {
                senderType: 'alice',
                senderName: 'Alice',
                content: aliceGreeting(identity.name),
                isRead: true,
              },
            },
          },
      update: presenceOnly
        ? { name: identity.name, email: identity.email, lastSeenAt: new Date() }
        : { name: identity.name, email: identity.email, phone, lastSeenAt: new Date() },
    })
    if (!presenceOnly) {
      const hasAlice = await prisma.websiteChatMessage.findFirst({
        where: { chatId: chat.id, senderType: 'alice' },
        select: { id: true },
      })
      if (!hasAlice) {
        await prisma.websiteChatMessage.create({
          data: {
            chatId: chat.id,
            senderType: 'alice',
            senderName: 'Alice',
            content: aliceGreeting(identity.name),
            isRead: true,
          },
        })
      }
    }
    const messageCount = await prisma.websiteChatMessage.count({ where: { chatId: chat.id } })
    return NextResponse.json(
      { success: true, token, chat: { ...chat, messageCount } },
      { headers: noStoreHeaders },
    )
  } catch (error: any) {
    console.error('website-chat POST failed', error?.message || error)
    return NextResponse.json(
      { error: 'Could not start chat. Please try again.' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
