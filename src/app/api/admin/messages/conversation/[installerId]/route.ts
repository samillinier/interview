import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ installerId: string }> | { installerId: string } }
) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const installerId = params.installerId
    if (!installerId) return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    if (body.unread !== true) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const latestInstallerMessage = await prisma.notification.findFirst({
      where: {
        installerId,
        type: 'message',
        senderType: 'installer',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (!latestInstallerMessage) {
      return NextResponse.json(
        { error: 'No installer message to mark unread' },
        { status: 400 }
      )
    }

    const updated = await prisma.notification.update({
      where: { id: latestInstallerMessage.id },
      data: { isRead: false, readAt: null },
    })

    return NextResponse.json({ success: true, notification: updated })
  } catch (error: any) {
    console.error('Error marking conversation unread:', error)
    return NextResponse.json(
      { error: 'Failed to mark unread', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ installerId: string }> | { installerId: string } }
) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const installerId = params.installerId
    if (!installerId) return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })

    await prisma.notification.deleteMany({
      where: { installerId, type: 'message' },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation', details: error.message },
      { status: 500 }
    )
  }
}
