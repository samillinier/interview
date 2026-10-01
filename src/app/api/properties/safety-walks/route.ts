import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0',
} as const

async function getSafetyWalkActor() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase().trim()
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'ACCOUNTING') {
    const admin = await prisma.admin.findUnique({
      where: { email },
    })

    if (!admin || !admin.isActive) {
      return { error: NextResponse.json({ error: 'Admin access not found' }, { status: 403 }) }
    }

    const fullName = String(session?.user?.name || '').trim()
    const [firstName, ...rest] = fullName ? fullName.split(' ') : ['Admin']
    const lastName = rest.join(' ') || 'User'

    const property = await prisma.property.upsert({
      where: { email },
      update: {
        firstName: firstName || 'Admin',
        lastName: lastName || 'User',
        status: 'active',
      },
      create: {
        email,
        firstName: firstName || 'Admin',
        lastName: lastName || 'User',
        status: 'active',
      },
    })

    return { actorType: 'admin' as const, property, role }
  }

  const property = await prisma.property.findUnique({
    where: { email },
  })

  if (!property || property.status !== 'active') {
    return { error: NextResponse.json({ error: 'Property access not found' }, { status: 403 }) }
  }

  return { actorType: 'property' as const, property, role }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getSafetyWalkActor()
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const workroom = (url.searchParams.get('workroom') || '').trim()
    const take = Math.min(Math.max(Number(url.searchParams.get('take') || 50) || 50, 1), 200)

    if (auth.actorType === 'admin') {
      const isFullAdmin = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN'
      const scopedWhere: Record<string, unknown> = {}
      if (!isFullAdmin) scopedWhere.propertyId = auth.property.id
      if (workroom) scopedWhere.workroom = workroom

      const safetyWalks = await prisma.propertySafetyWalk.findMany({
        where: scopedWhere,
        orderBy: [{ inspectionDate: 'desc' }, { createdAt: 'desc' }],
        take,
        select: {
          id: true,
          createdAt: true,
          inspectionDate: true,
          inspectorName: true,
          workroom: true,
          analytics: true,
          propertyId: true,
        },
      })

      const workroomCounts = await prisma.propertySafetyWalk.groupBy({
        by: ['workroom'],
        where: isFullAdmin ? undefined : { propertyId: auth.property.id },
        _count: { id: true },
      })

      return NextResponse.json(
        {
          safetyWalk: safetyWalks[0] ?? null,
          safetyWalks,
          workroomCounts: workroomCounts.map((row) => ({
            workroom: row.workroom,
            count: row._count?.id ?? 0,
          })),
        },
        { headers: noStoreHeaders }
      )
    }

    const safetyWalk = await prisma.propertySafetyWalk.findFirst({
      where: { propertyId: auth.property.id },
      orderBy: [{ inspectionDate: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ safetyWalk }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('Error fetching safety walks:', error)
    return NextResponse.json({ error: 'Failed to fetch safety walks' }, { status: 500, headers: noStoreHeaders })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSafetyWalkActor()
    if (auth.error) return auth.error

    const body = await request.json()
    const form = body?.form ?? {}
    const analytics = body?.analytics ?? null

    const inspectorName = String(form.name || '').trim()
    const inspectionDateRaw = String(form.inspectionDate || '').trim()
    const startTime = String(form.startTime || '').trim()
    const completionTime = String(form.completionTime || '').trim()
    const workroom = String(form.workroom || '').trim()

    if (!inspectorName || !inspectionDateRaw || !workroom) {
      return NextResponse.json({ error: 'Missing required safety walk fields' }, { status: 400 })
    }

    const inspectionDate = new Date(`${inspectionDateRaw}T00:00:00`)
    if (Number.isNaN(inspectionDate.getTime())) {
      return NextResponse.json({ error: 'Invalid inspection date' }, { status: 400 })
    }

    const safetyWalk = await prisma.propertySafetyWalk.create({
      data: {
        propertyId: auth.property.id,
        inspectorName,
        inspectionDate,
        startTime,
        completionTime,
        workroom,
        comments: String(form.comments || '').trim() || null,
        actionPlan: String(form.actionPlan || '').trim() || null,
        payload: form,
        analytics: analytics && typeof analytics === 'object' ? analytics : null,
      },
    })

    return NextResponse.json({ safetyWalk }, { status: 201 })
  } catch (error) {
    console.error('Error creating safety walk:', error)
    return NextResponse.json({ error: 'Failed to save safety walk' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getSafetyWalkActor()
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const id = (url.searchParams.get('id') || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Missing safety walk id' }, { status: 400 })
    }

    if (auth.actorType === 'property') {
      return NextResponse.json({ error: 'Not authorized to delete safety walks' }, { status: 403 })
    }

    const isFullAdmin = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN'
    const where = isFullAdmin
      ? { id }
      : { id, propertyId: auth.property.id }

    const existing = await prisma.propertySafetyWalk.findFirst({ where })
    if (!existing) {
      return NextResponse.json(
        { error: 'Safety walk not found or you do not have permission to delete it' },
        { status: 404 }
      )
    }

    await prisma.propertySafetyWalk.delete({ where: { id } })

    return NextResponse.json({ success: true }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('Error deleting safety walk:', error)
    return NextResponse.json({ error: 'Failed to delete safety walk' }, { status: 500 })
  }
}
