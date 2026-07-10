import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const workroom = searchParams.get('workroom')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (workroom) where.workroom = workroom
    if (startDate || endDate) {
      where.cycleCountDate = {}
      if (startDate) where.cycleCountDate.gte = new Date(startDate)
      if (endDate) where.cycleCountDate.lte = new Date(endDate)
    }

    const [cycles, total] = await Promise.all([
      prisma.inventoryCycle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryCycle.count({ where }),
    ])

    return NextResponse.json({ success: true, cycles, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    console.error('Error fetching inventory cycles:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory cycles', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { cycleCountDate, cycleCountType, workroom, rollCounts, linearFeetCounts, attachmentUrls } = body

    if (!cycleCountDate || !cycleCountType || !workroom) {
      return NextResponse.json({ error: 'Cycle count date, type, and workroom are required' }, { status: 400 })
    }

    const user = session.user as any
    const cycle = await prisma.inventoryCycle.create({
      data: {
        cycleCountDate: new Date(cycleCountDate),
        cycleCountType,
        workroom,
        rollCounts: rollCounts || {},
        linearFeetCounts: linearFeetCounts || {},
        attachmentUrls: attachmentUrls || [],
        createdByEmail: user.email || null,
        createdByName: user.name || null,
        authorizedBy: null,
      },
    })

    return NextResponse.json({ success: true, cycle })
  } catch (error: any) {
    console.error('Error creating inventory cycle:', error)
    return NextResponse.json({ error: 'Failed to create inventory cycle', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any

  try {
    const body = await request.json()
    const { id, authorized } = body

    if (!id) {
      return NextResponse.json({ error: 'Cycle id is required' }, { status: 400 })
    }

    const updateData: any = {}

    if (typeof authorized === 'boolean') {
      updateData.authorized = authorized
      if (authorized) {
        updateData.authorizationMethod = user.name || user.email || 'Unknown'
        updateData.authorizedBy = user.name || user.email || null
      } else {
        updateData.authorizationMethod = null
        updateData.authorizedBy = null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const cycle = await prisma.inventoryCycle.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, cycle })
  } catch (error: any) {
    console.error('Error updating inventory cycle:', error)
    return NextResponse.json({ error: 'Failed to update inventory cycle', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Cycle id is required' }, { status: 400 })
    }
    await prisma.inventoryCycle.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting inventory cycle:', error)
    return NextResponse.json({ error: 'Failed to delete inventory cycle', details: error.message }, { status: 500 })
  }
}
