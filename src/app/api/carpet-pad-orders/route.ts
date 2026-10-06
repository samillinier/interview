import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notifyCorporateAuthorizer } from '@/lib/corporate-authorization-email'

const CORPORATE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MODERATOR', 'ACCOUNTING'])
const MODIFY_ROLES = new Set(['ADMIN', 'MODERATOR', 'SUPER_ADMIN'])

function roleOf(session: any): string {
  return String(session?.user?.role || '').toUpperCase()
}

function canAccess(session: any): boolean {
  return CORPORATE_ROLES.has(roleOf(session))
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!canAccess(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Badge count: pending (not yet authorized) orders.
    if (action === 'count') {
      const count = await prisma.carpetPadOrder.count({
        where: { authorized: false },
      })
      return NextResponse.json({ success: true, count })
    }

    const location = searchParams.get('location')
    const classification = searchParams.get('classification')
    const search = searchParams.get('search')

    const where: any = {}
    if (location) where.location = location
    if (classification) where.orderClassification = classification
    if (search) {
      where.OR = [
        { location: { contains: search, mode: 'insensitive' } },
        { orderClassification: { contains: search, mode: 'insensitive' } },
        { createdByName: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Managers only see their own orders; reviewers see everything.
    const role = roleOf(session)
    if (role === 'MANAGER') {
      where.createdByEmail = session.user.email?.toLowerCase() || ''
    }

    const orders = await prisma.carpetPadOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, orders })
  } catch (error: any) {
    console.error('Error fetching carpet pad orders:', error)
    return NextResponse.json({ error: 'Failed to fetch carpet pad orders', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!canAccess(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      location,
      orderClassification,
      recycledBalesPickup,
      recycledBalesCount,
      reviewedPreviousOrders,
      superSixLbRolls,
      stainmasterSelectRolls,
      odorBanRolls,
      stainmasterEliteRolls,
      stainmasterMemoryFoamRolls,
    } = body

    if (!location?.trim() || !orderClassification?.trim() || !recycledBalesPickup?.trim() || !reviewedPreviousOrders?.trim()) {
      return NextResponse.json(
        { error: 'Location, order classification, bales pickup, and prior-order review are required.' },
        { status: 400 },
      )
    }

    const rolls = [
      superSixLbRolls,
      stainmasterSelectRolls,
      odorBanRolls,
      stainmasterEliteRolls,
      stainmasterMemoryFoamRolls,
    ].map((n) => Number(n) || 0)

    if (rolls.every((n) => n === 0)) {
      return NextResponse.json(
        { error: 'Enter a roll quantity for at least one pad type.' },
        { status: 400 },
      )
    }

    const user = session.user as any

    const order = await prisma.carpetPadOrder.create({
      data: {
        location: String(location).trim(),
        orderClassification: String(orderClassification).trim(),
        recycledBalesPickup: String(recycledBalesPickup).trim(),
        recycledBalesCount: recycledBalesCount ? Number(recycledBalesCount) : null,
        reviewedPreviousOrders: String(reviewedPreviousOrders).trim(),
        superSixLbRolls: superSixLbRolls ? Number(superSixLbRolls) : null,
        stainmasterSelectRolls: stainmasterSelectRolls ? Number(stainmasterSelectRolls) : null,
        odorBanRolls: odorBanRolls ? Number(odorBanRolls) : null,
        stainmasterEliteRolls: stainmasterEliteRolls ? Number(stainmasterEliteRolls) : null,
        stainmasterMemoryFoamRolls: stainmasterMemoryFoamRolls ? Number(stainmasterMemoryFoamRolls) : null,
        createdByEmail: user.email || null,
        createdByName: user.name || null,
      },
    })

    await notifyCorporateAuthorizer({
      kind: 'carpet-pad',
      recordId: order.id,
      submittedByEmail: user.email,
      submittedByName: user.name,
      details: `${order.location} · ${order.orderClassification}`,
    })

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error creating carpet pad order:', error)
    return NextResponse.json({ error: 'Failed to create carpet pad order', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = roleOf(session)
  if (!MODIFY_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    const order = await prisma.carpetPadOrder.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error updating carpet pad order:', error)
    return NextResponse.json({ error: 'Failed to update carpet pad order', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = roleOf(session)
  if (!MODIFY_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Order id is required' }, { status: 400 })
    }
    await prisma.carpetPadOrder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting carpet pad order:', error)
    return NextResponse.json({ error: 'Failed to delete carpet pad order', details: error.message }, { status: 500 })
  }
}
