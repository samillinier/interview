import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const installerId = searchParams.get('installerId')
    
    // If installerId is provided, get count for that installer
    // Otherwise, get count for all installers (admin view)
    const where: any = {
      isRead: false,
      // Include notification, message, and news types (exclude 'job' as it's handled separately)
      type: {
        in: ['notification', 'message', 'news']
      }
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
