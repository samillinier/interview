import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => null)
    const installerId = String(body?.installerId || '').trim()
    if (!installerId) return NextResponse.json({ error: 'installerId is required' }, { status: 400 })

    await prisma.notification.updateMany({
      where: { installerId, type: 'survey', isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error marking survey notifications read:', error)
    return NextResponse.json(
      { error: 'Failed to mark survey notifications read', details: error.message },
      { status: 500 }
    )
  }
}

