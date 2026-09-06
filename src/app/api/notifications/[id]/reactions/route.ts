import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  verifyInstallerToken,
  getInstallerTokenFromRequest,
} from '@/lib/installerToken'

const ALLOWED_EMOJI = new Set([
  '👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥', '👏', '💯',
])

type Reactor = {
  id: string
  type: 'admin' | 'installer'
  name: string | null
}

async function resolveReactor(request: NextRequest): Promise<Reactor | null> {
  // 1) Admin session
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (email) {
    return {
      id: email,
      type: 'admin',
      name: session?.user?.name || email,
    }
  }

  // 2) Installer token
  const token = getInstallerTokenFromRequest(request)
  if (token) {
    try {
      const payload = verifyInstallerToken(token)
      if (payload.installerId) {
        const installer = await prisma.installer.findUnique({
          where: { id: payload.installerId },
          select: { firstName: true, lastName: true },
        })
        const name = [installer?.firstName, installer?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim()
        return {
          id: payload.installerId,
          type: 'installer',
          name: name || null,
        }
      }
    } catch {
      // fall through
    }
  }

  return null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = context.params
  const notificationId = (params instanceof Promise ? await params : params).id

  if (!notificationId) {
    return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
  }

  try {
    const reactions = await prisma.messageReaction.findMany({
      where: { notificationId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, reactions })
  } catch (error: any) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reactions', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = context.params
  const notificationId = (params instanceof Promise ? await params : params).id

  if (!notificationId) {
    return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
  }

  const reactor = await resolveReactor(request)
  if (!reactor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const emoji = typeof body?.emoji === 'string' ? body.emoji.trim() : ''

    if (!emoji || !ALLOWED_EMOJI.has(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 })
    }

    // Verify the notification exists
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true },
    })
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Toggle: remove if this exact reactor+emoji already exists, otherwise add.
    const existing = await prisma.messageReaction.findUnique({
      where: {
        notificationId_reactorId_reactorType_emoji: {
          notificationId,
          reactorId: reactor.id,
          reactorType: reactor.type,
          emoji,
        },
      },
    })

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } })
    } else {
      await prisma.messageReaction.create({
        data: {
          notificationId,
          reactorId: reactor.id,
          reactorType: reactor.type,
          reactorName: reactor.name,
          emoji,
        },
      })
    }

    const reactions = await prisma.messageReaction.findMany({
      where: { notificationId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, reactions })
  } catch (error: any) {
    console.error('Error toggling reaction:', error)
    return NextResponse.json(
      { error: 'Failed to toggle reaction', details: error.message },
      { status: 500 }
    )
  }
}
