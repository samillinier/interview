import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notifyCorporateAuthorizer, notifyRequesterDecision } from '@/lib/corporate-authorization-email'

const REVIEWER_ROLES = new Set(['SUPER_ADMIN'])

function toDateOrNull(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

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
      const count = await prisma.officeSupplyOrder.count({ where })
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

    const orders = await prisma.officeSupplyOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, orders })
  } catch (error: any) {
    console.error('Error fetching office supply orders:', error)
    return NextResponse.json({ error: 'Failed to fetch office supply orders', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { orderDate, workroom, priority, items, additionalItems } = body

    if (!orderDate || !workroom || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order date, workroom, and at least one item are required' },
        { status: 400 },
      )
    }

    const user = session.user as any
    const order = await prisma.officeSupplyOrder.create({
      data: {
        orderDate: new Date(orderDate),
        workroom: String(workroom).trim(),
        priority: priority ? String(priority).trim() : null,
        items,
        additionalItems: additionalItems?.trim() || null,
        createdByEmail: user.email || null,
        createdByName: user.name || null,
      },
    })

    await notifyCorporateAuthorizer({
      kind: 'office-supplies',
      recordId: order.id,
      submittedByEmail: user.email,
      submittedByName: user.name,
      details: `${String(workroom).trim()} · ${items.length} line item${items.length !== 1 ? 's' : ''}`,
    })

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error creating office supply order:', error)
    return NextResponse.json({ error: 'Failed to create office supply order', details: error.message }, { status: 500 })
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

    const order = await prisma.officeSupplyOrder.update({
      where: { id },
      data: updateData,
    })

    if (status === 'approved' || status === 'denied') {
      const itemCount = Array.isArray(order.items) ? order.items.length : 0
      if (order.createdByEmail) {
        await notifyRequesterDecision({
          kind: 'office-supplies',
          recordId: order.id,
          to: order.createdByEmail,
          name: order.createdByName,
          status,
          reviewNote,
          details: `${order.workroom} · ${itemCount} line item${itemCount !== 1 ? 's' : ''}`,
        })
      }
    }

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error updating office supply order:', error)
    return NextResponse.json({ error: 'Failed to update office supply order', details: error.message }, { status: 500 })
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
    await prisma.officeSupplyOrder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting office supply order:', error)
    return NextResponse.json({ error: 'Failed to delete office supply order', details: error.message }, { status: 500 })
  }
}
