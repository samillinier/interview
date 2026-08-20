import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Get unread notification count
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const installerId = searchParams.get('installerId')
    
    // Match home-screen badge: notification/message/news only, never installer’s own sends
    const where: any = {
      isRead: false,
      type: {
        in: ['notification', 'message', 'news']
      },
      OR: [{ senderType: null }, { senderType: { not: 'installer' } }],
    }
    
    if (installerId) {
      where.installerId = installerId
    }

    const count = await prisma.notification.count({ where })

    return NextResponse.json({
      success: true,
      count,
    })
  } catch (error: any) {
    console.error('Error fetching notification count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification count', details: error.message },
      { status: 500 }
    )
  }
}
