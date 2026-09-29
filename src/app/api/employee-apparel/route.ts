import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notifyCorporateAuthorizer } from '@/lib/corporate-authorization-email'

const REVIEWER_ROLES = new Set(['SUPER_ADMIN'])

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'count') {
      const role = String((session.user as any)?.role || '').toUpperCase()
      const where: any = { status: 'pending' }
      if (role === 'MANAGER') {
        where.createdByEmail = session.user.email?.toLowerCase() || ''
      }
      const count = await prisma.apparelOrder.count({ where })
      return NextResponse.json({ success: true, count })
    }

    const role = String((session.user as any)?.role || '').toUpperCase()
    const status = searchParams.get('status')
    const workroom = searchParams.get('workroom')
    const search = searchParams.get('search')

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (workroom) where.workroom = workroom
    if (search) {
      where.createdByName = { contains: search, mode: 'insensitive' }
    }

    if (role === 'MANAGER') {
      where.createdByEmail = session.user.email?.toLowerCase() || ''
    }

    const orders = await prisma.apparelOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, orders })
  } catch (error: any) {
    console.error('Error fetching apparel orders:', error)
    return NextResponse.json({ error: 'Failed to fetch apparel orders', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { orderDate, workroom, employeeName, items, notes } = body

    if (!orderDate || !workroom || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order date, workroom, and at least one apparel item are required' },
        { status: 400 },
      )
    }

    const user = session.user as any
    const order = await prisma.apparelOrder.create({
      data: {
        orderDate: new Date(orderDate),
        workroom: String(workroom).trim(),
        employeeName: employeeName?.trim() || null,
        items,
        notes: notes?.trim() || null,
        createdByEmail: user.email || null,
        createdByName: user.name || null,
      },
    })

    await notifyCorporateAuthorizer({
      kind: 'employee-apparel',
      recordId: order.id,
      submittedByEmail: user.email,
      submittedByName: user.name,
      details: `${String(workroom).trim()} · ${items.length} item${items.length !== 1 ? 's' : ''}`,
    })

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error creating apparel order:', error)
    return NextResponse.json({ error: 'Failed to create apparel order', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = session.user as any
  const role = String(user?.role || '').toUpperCase()
  if (!REVIEWER_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, status, reviewNote } = body

    if (!id) {
      return NextResponse.json({ error: 'Order id is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (status === 'approved' || status === 'denied') {
      updateData.status = status
      updateData.reviewedBy = user.name || user.email || null
      updateData.reviewedAt = new Date()
      updateData.reviewNote = typeof reviewNote === 'string' ? reviewNote.trim() || null : null
    } else if (status === 'pending') {
      updateData.status = 'pending'
      updateData.reviewedBy = null
      updateData.reviewedAt = null
      updateData.reviewNote = null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const order = await prisma.apparelOrder.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error updating apparel order:', error)
    return NextResponse.json({ error: 'Failed to update apparel order', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = session.user as any
  const role = String(user?.role || '').toUpperCase()
  if (!REVIEWER_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Order id is required' }, { status: 400 })
    }
    await prisma.apparelOrder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting apparel order:', error)
    return NextResponse.json({ error: 'Failed to delete apparel order', details: error.message }, { status: 500 })
  }
}
