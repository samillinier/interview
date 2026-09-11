import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/db'
import { aliceGreeting, sanitizeChatText } from '@/lib/website-chat'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
    const token = visitorTokenFrom(request)
    if (!token) {
      return NextResponse.json({ success: true, chat: null }, { headers: noStoreHeaders })
    }
    const chat = await prisma.websiteChat.findUnique({
      where: { visitorToken: token },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    })
    return NextResponse.json({ success: true, chat }, { headers: noStoreHeaders })
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
    const name = sanitizeChatText(body?.name, 80)
    const email = String(body?.email || '').trim().toLowerCase()
    const phone = sanitizeChatText(body?.phone, 40) || null
    const existingToken = visitorTokenFrom(request, body)

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400, headers: noStoreHeaders })
    }
    if (!validEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400, headers: noStoreHeaders })
    }

    if (existingToken) {
      const existing = await prisma.websiteChat.findUnique({ where: { visitorToken: existingToken } })
      if (existing) {
        const chat = await prisma.websiteChat.update({
          where: { id: existing.id },
          data: { name, email, phone },
        })
        return NextResponse.json({ success: true, token: existingToken, chat }, { headers: noStoreHeaders })
      }
    }

    const token = crypto.randomBytes(24).toString('hex')
    const chat = await prisma.websiteChat.create({
      data: {
        visitorToken: token,
        name,
        email,
        phone,
        messages: {
          create: {
            senderType: 'alice',
            senderName: 'Alice',
            content: aliceGreeting(name),
            isRead: true,
          },
        },
      },
    })
    return NextResponse.json({ success: true, token, chat }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('website-chat POST failed', error?.message || error)
    return NextResponse.json(
      { error: 'Could not start chat. Please try again.' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
