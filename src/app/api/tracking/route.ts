import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({
      where: { email },
    })
    
    // Only admins can access tracking
    if (!admin?.isActive || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending | ongoing | resolved | solved
    const type = searchParams.get('type') // issue | activity | status_change | document | communication
    const installerId = searchParams.get('installerId')
    const priority = searchParams.get('priority')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    
    if (status) {
      where.status = status
    }
    if (type) {
      where.type = type
    }
    if (installerId) {
      where.installerId = installerId
    }
    if (priority) {
      where.priority = priority
    }

    const total = await prisma.installerTracking.count({ where })

    const trackingItems = await prisma.installerTracking.findMany({
      where,
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
            photoUrl: true,
            status: true,
            trackerStage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    }).catch((error) => {
      console.error('Prisma query error:', error)
      throw error
    }).catch((error) => {
      console.error('Prisma error:', error)
      throw error
    })

    return NextResponse.json({
      success: true,
      tracking: trackingItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching tracking data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracking data', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({
      where: { email },
    })
    
    // Only admins can create tracking items
    if (!admin?.isActive || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      installerId,
      type,
      title,
      description,
      status = 'pending',
      priority = 'normal',
      category,
      metadata,
      notes,
    } = body

    if (!type || !title) {
      return NextResponse.json(
        { error: 'Type and title are required' },
        { status: 400 }
      )
    }

    // For manual entries, installerId can be null
    // The metadata should contain manualInstallerName if it's a manual entry
    const trackingItem = await prisma.installerTracking.create({
      data: {
        installerId: installerId || null,
        type,
        title,
        description,
        status,
        priority,
        category,
        metadata: metadata || {},
        notes,
      },
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
            photoUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      tracking: trackingItem,
    })
  } catch (error: any) {
    console.error('Error creating tracking item:', error)
    return NextResponse.json(
      { error: 'Failed to create tracking item', details: error.message },
      { status: 500 }
    )
  }
}
