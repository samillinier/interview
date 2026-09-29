import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notifyCorporateAuthorizer } from '@/lib/corporate-authorization-email'

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
      const count = await prisma.purchaseRequest.count({ where })
      return NextResponse.json({ success: true, count })
    }

    const role = String((session.user as any)?.role || '').toUpperCase()
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (search) {
      where.itemName = { contains: search, mode: 'insensitive' }
    }

    // Managers only see their own requests; reviewers see everything.
    if (role === 'MANAGER') {
      where.createdByEmail = session.user.email?.toLowerCase() || ''
    }

    const requests = await prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, requests })
  } catch (error: any) {
    console.error('Error fetching purchase requests:', error)
    return NextResponse.json({ error: 'Failed to fetch purchase requests', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const {
      dateRequested,
      priority,
      itemName,
      itemDescription,
      reason,
      priceRange,
      neededByDate,
      purchaseMethod,
      purchaseMethodNote,
    } = body

    if (!dateRequested || !itemName?.trim()) {
      return NextResponse.json(
        { error: 'Date of request and item name are required' },
        { status: 400 },
      )
    }

    const user = session.user as any
    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        dateRequested: new Date(dateRequested),
        priority: priority?.trim() || null,
        itemName: String(itemName).trim(),
        itemDescription: itemDescription?.trim() || null,
        reason: reason?.trim() || null,
        priceRange: priceRange?.trim() || null,
        neededByDate: toDateOrNull(neededByDate),
        purchaseMethod: purchaseMethod?.trim() || 'corporate',
        purchaseMethodNote: purchaseMethodNote?.trim() || null,
        createdByEmail: user.email || null,
        createdByName: user.name || null,
      },
    })

    await notifyCorporateAuthorizer({
      kind: 'purchase-request',
      recordId: purchaseRequest.id,
      submittedByEmail: user.email,
      submittedByName: user.name,
      details: String(itemName).trim(),
    })

    return NextResponse.json({ success: true, purchaseRequest })
  } catch (error: any) {
    console.error('Error creating purchase request:', error)
    return NextResponse.json({ error: 'Failed to create purchase request', details: error.message }, { status: 500 })
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
      return NextResponse.json({ error: 'Request id is required' }, { status: 400 })
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

    const purchaseRequest = await prisma.purchaseRequest.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, purchaseRequest })
  } catch (error: any) {
    console.error('Error updating purchase request:', error)
    return NextResponse.json({ error: 'Failed to update purchase request', details: error.message }, { status: 500 })
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
      return NextResponse.json({ error: 'Request id is required' }, { status: 400 })
    }
    await prisma.purchaseRequest.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting purchase request:', error)
    return NextResponse.json({ error: 'Failed to delete purchase request', details: error.message }, { status: 500 })
  }
}
