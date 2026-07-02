import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Get unread survey notification count
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const installerId = searchParams.get('installerId')

    if (!installerId) {
      return NextResponse.json({ error: 'installerId is required' }, { status: 400 })
    }

    const count = await prisma.notification.count({
      where: {
        installerId,
        isRead: false,
        type: 'survey',
      },
    })

    return NextResponse.json({ success: true, count })
  } catch (error: any) {
    console.error('Error fetching survey notification count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch survey notification count', details: error.message },
      { status: 500 }
    )
  }
}

