import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; notificationId: string }> | { id: string; notificationId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const { id: installerId, notificationId } = resolvedParams

    if (!installerId || !notificationId) {
      return NextResponse.json(
        { error: 'Installer ID and Notification ID are required' },
        { status: 400 }
      )
    }

    // Verify the notification belongs to this installer
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        installerId: installerId,
      },
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Delete the notification
    await prisma.notification.delete({
      where: { id: notificationId },
    })

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification', details: error.message },
      { status: 500 }
    )
  }
}
