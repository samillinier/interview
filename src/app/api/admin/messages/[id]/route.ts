import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session
}

async function findMessage(id: string) {
  return prisma.notification.findFirst({
    where: { id, type: 'message' },
  })
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const message = await findMessage(params.id)
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))

    if (body.unread === true) {
      const fromInstaller = message.senderType === 'installer'
      let targetId = fromInstaller ? message.id : ''

      if (!fromInstaller) {
        const latestInstallerMessage = await prisma.notification.findFirst({
          where: {
            installerId: message.installerId,
            type: 'message',
            senderType: 'installer',
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
        targetId = latestInstallerMessage?.id || ''
      }

      if (!targetId) {
        return NextResponse.json(
          { error: 'No installer message to mark unread' },
          { status: 400 }
        )
      }

      const updated = await prisma.notification.update({
        where: { id: targetId },
        data: { isRead: false, readAt: null },
      })

      return NextResponse.json({ success: true, notification: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating admin message:', error)
    return NextResponse.json(
      { error: 'Failed to update message', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const message = await findMessage(params.id)
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    await prisma.notification.delete({ where: { id: message.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting admin message:', error)
    return NextResponse.json(
      { error: 'Failed to delete message', details: error.message },
      { status: 500 }
    )
  }
}
