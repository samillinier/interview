import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notifyCorporateAuthorizer } from '@/lib/corporate-authorization-email'

const CORPORATE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MODERATOR', 'ACCOUNTING'])
const REVIEWER_ROLES = new Set(['SUPER_ADMIN'])

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

    // Badge count: open (not yet completed) service requests needing attention.
    if (action === 'count') {
      const count = await prisma.fleetServiceRequest.count({ where: { status: 'open' } })
      return NextResponse.json({ success: true, count })
    }

    const location = searchParams.get('location')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    if (location) where.location = location
    if (status && status !== 'all') where.status = status
    if (search) {
      where.OR = [
        { details: { contains: search, mode: 'insensitive' } },
        { createdByName: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Managers only see their own requests; reviewers see everything.
    const role = roleOf(session)
    if (role === 'MANAGER') {
      where.createdByEmail = session.user.email?.toLowerCase() || ''
    }

    const requests = await prisma.fleetServiceRequest.findMany({
      where,
      orderBy: { requestDate: 'desc' },
    })

    return NextResponse.json({ success: true, requests })
  } catch (error: any) {
    console.error('Error fetching fleet service requests:', error)
    return NextResponse.json({ error: 'Failed to fetch fleet service requests', details: error.message }, { status: 500 })
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
    const { requestDate, location, serviceType, details, attachmentUrls } = body

    if (!requestDate || !location?.trim() || !serviceType?.trim() || !details?.trim()) {
      return NextResponse.json(
        { error: 'Date, location, service type, and request details are required.' },
        { status: 400 },
      )
    }

    const user = session.user as any

    const data: any = {
      requestDate: new Date(requestDate),
      location: String(location).trim(),
      serviceType: String(serviceType).trim(),
      details: String(details).trim(),
      createdByEmail: user.email || null,
      createdByName: user.name || null,
    }
    if (Array.isArray(attachmentUrls) && attachmentUrls.length > 0) {
      data.attachmentUrls = attachmentUrls
    }

    const record = await prisma.fleetServiceRequest.create({ data })

    await notifyCorporateAuthorizer({
      kind: 'fleet-service-request',
      recordId: record.id,
      submittedByEmail: user.email,
      submittedByName: user.name,
      details: `${record.serviceType} · ${record.location}`,
    })

    return NextResponse.json({ success: true, request: record })
  } catch (error: any) {
    console.error('Error creating fleet service request:', error)
    return NextResponse.json({ error: 'Failed to create fleet service request', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = roleOf(session)
  if (!REVIEWER_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Request id is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (status === 'open' || status === 'completed') {
      updateData.status = status
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const record = await prisma.fleetServiceRequest.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, request: record })
  } catch (error: any) {
    console.error('Error updating fleet service request:', error)
    return NextResponse.json({ error: 'Failed to update fleet service request', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = roleOf(session)
  if (!REVIEWER_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Request id is required' }, { status: 400 })
    }
    await prisma.fleetServiceRequest.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting fleet service request:', error)
    return NextResponse.json({ error: 'Failed to delete fleet service request', details: error.message }, { status: 500 })
  }
}
