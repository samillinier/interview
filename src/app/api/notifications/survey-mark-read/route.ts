import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireInstallerOrAdmin } from '@/lib/installerAccess'
import { syncInstallerAppBadge } from '@/lib/pushNotifications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const requestedId = String(body?.installerId || '').trim()
    if (!requestedId) return NextResponse.json({ error: 'installerId is required' }, { status: 400 })

    const access = await requireInstallerOrAdmin(request, requestedId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    await prisma.notification.updateMany({
      where: { installerId: requestedId, type: 'survey', isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    await syncInstallerAppBadge(requestedId).catch(() => 0)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error marking survey notifications read:', error)
    return NextResponse.json(
      { error: 'Failed to mark survey notifications read', details: error.message },
      { status: 500 }
    )
  }
}
