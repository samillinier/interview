import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { isLoggedInVisitor, pickVisitorEmail, pickVisitorName } from '@/lib/website-chat'
import { chatHeaders, websiteChatCorsPreflight } from '@/lib/website-chat-cors'
import { getClientIp } from '@/lib/client-ip'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return websiteChatCorsPreflight(request)
}

function generatedVisitor() {
  const code = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return {
    name: `Visitor ${code}`,
    email: `visitor-${code.toLowerCase()}@noreply.local`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (isLoggedInVisitor(session?.user)) {
      return NextResponse.json({ success: true, skipped: true }, { headers: chatHeaders(request) })
    }

    const body = await request.json().catch(() => ({}))
    const token = String(request.headers.get('x-website-chat-token') || body?.token || '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Chat session required' }, { status: 401, headers: chatHeaders(request) })
    }

    const existing = await prisma.websiteChat.findUnique({
      where: { visitorToken: token },
      select: { id: true, name: true, email: true },
    })
    if (!existing) {
      return NextResponse.json({ success: true, token }, { headers: chatHeaders(request) })
    }

    const fallback = generatedVisitor()
    const name = pickVisitorName(body?.name, existing.name) || existing.name || fallback.name
    const email = pickVisitorEmail(body?.email, existing.email) || existing.email || fallback.email
    const ipAddress = getClientIp(request)

    await prisma.websiteChat.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: new Date(),
        name,
        email,
        ...(ipAddress ? { ipAddress } : {}),
      },
    })
    return NextResponse.json({ success: true, token, name, email }, { headers: chatHeaders(request) })
  } catch (error: any) {
    console.error('website-chat ping failed', error?.message || error)
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500, headers: chatHeaders(request) })
  }
}
