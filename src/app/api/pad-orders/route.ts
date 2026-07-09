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
      where.dateReceived = {}
      if (startDate) where.dateReceived.gte = new Date(startDate)
      if (endDate) where.dateReceived.lte = new Date(endDate)
    }

    const [orders, total] = await Promise.all([
      prisma.padOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.padOrder.count({ where }),
    ])

    return NextResponse.json({ success: true, orders, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    console.error('Error fetching pad orders:', error)
    return NextResponse.json({ error: 'Failed to fetch pad orders', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { workroom, dateReceived, items, hasAdditionalItems, attachmentUrls, authorizedBy } = body

    if (!workroom || !dateReceived) {
      return NextResponse.json({ error: 'Workroom and date received are required' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    const user = session.user as any

    // Generate order number: BOL-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    const orderNumber = `BOL-${dateStr}-${rand}`

    const order = await prisma.padOrder.create({
      data: {
        orderNumber,
        workroom,
        dateReceived: new Date(dateReceived),
        items: items,
        hasAdditionalItems: hasAdditionalItems || false,
        attachmentUrls: attachmentUrls || [],
        createdByEmail: user.email || null,
        createdByName: user.name || null,
        authorizedBy: authorizedBy || user.name || user.email || null,
      },
    })

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error creating pad order:', error)
    return NextResponse.json({ error: 'Failed to create pad order', details: error.message }, { status: 500 })
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
      return NextResponse.json({ error: 'Order id is required' }, { status: 400 })
    }

    const updateData: any = {}

    if (typeof authorized === 'boolean') {
      updateData.authorized = authorized
      if (authorized) {
        updateData.authorizationMethod = user.name || user.email || 'Unknown'
        updateData.authorizedBy = user.name || user.email || null
      } else {
        updateData.authorizationMethod = null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const order = await prisma.padOrder.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error updating pad order:', error)
    return NextResponse.json({ error: 'Failed to update pad order', details: error.message }, { status: 500 })
  }
}
