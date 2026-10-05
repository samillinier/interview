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

    // Badge count: inspections recorded in the current calendar week (Monday start).
    if (action === 'count') {
      const now = new Date()
      const day = now.getDay() // 0 = Sunday
      const diffToMonday = (day + 6) % 7
      const start = new Date(now)
      start.setDate(now.getDate() - diffToMonday)
      start.setHours(0, 0, 0, 0)
      const count = await prisma.forkliftInspection.count({
        where: { inspectionDate: { gte: start } },
      })
      return NextResponse.json({ success: true, count })
    }

    // Return the list of forklifts (category "forklift") for the identification dropdown.
    if (action === 'forklifts') {
      const vehicles = await prisma.vehicle.findMany({
        where: { category: 'forklift' },
        orderBy: [{ vehicleMake: 'asc' }, { vehicleModel: 'asc' }],
        select: {
          id: true,
          vehicleYear: true,
          vehicleMake: true,
          vehicleModel: true,
          vin: true,
          plate: true,
          location: true,
          category: true,
        },
      })

      const forklifts = vehicles.map((v) => ({
        id: v.id,
        makeModel: [v.vehicleYear, v.vehicleMake, v.vehicleModel]
          .filter((part) => part !== null && part !== undefined && String(part).trim() !== '')
          .map((part) => String(part))
          .join(' ')
          .trim(),
        serial: v.vin || v.plate || '',
        location: v.location || '',
      }))

      return NextResponse.json({ success: true, forklifts })
    }

    const location = searchParams.get('location')
    const search = searchParams.get('search')

    const where: any = {}
    if (location) where.location = location
    if (search) {
      where.OR = [
        { forkliftId: { contains: search, mode: 'insensitive' } },
        { createdByName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const inspections = await prisma.forkliftInspection.findMany({
      where,
      orderBy: { inspectionDate: 'desc' },
    })

    return NextResponse.json({ success: true, inspections })
  } catch (error: any) {
    console.error('Error fetching forklift inspections:', error)
    return NextResponse.json({ error: 'Failed to fetch forklift inspections', details: error.message }, { status: 500 })
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
      inspectionDate,
      location,
      forkliftId,
      leaks,
      tiresWheelsAxles,
      forksPoleSafetyPin,
      overheadGuard,
      batteryCableConnector,
      mechanicalSafetyDevices,
      operatorControls,
      indicatorLightsAlarmsGauges,
      electricalSafetyDevices,
      mastChainHydraulics,
      steering,
      headBrakeLights,
      brakes,
      engineOil,
      radiatorWater,
      comments,
      inspectionStatement,
    } = body

    if (!inspectionDate || !location?.trim() || !forkliftId?.trim() || !inspectionStatement?.trim()) {
      return NextResponse.json(
        { error: 'Inspection date, location, forklift identification, and inspection statement are required.' },
        { status: 400 },
      )
    }

    const user = session.user as any

    const inspection = await prisma.forkliftInspection.create({
      data: {
        inspectionDate: new Date(inspectionDate),
        location: String(location).trim(),
        forkliftId: String(forkliftId).trim(),
        leaks: leaks?.trim() || null,
        tiresWheelsAxles: tiresWheelsAxles?.trim() || null,
        forksPoleSafetyPin: forksPoleSafetyPin?.trim() || null,
        overheadGuard: overheadGuard?.trim() || null,
        batteryCableConnector: batteryCableConnector?.trim() || null,
        mechanicalSafetyDevices: mechanicalSafetyDevices?.trim() || null,
        operatorControls: operatorControls?.trim() || null,
        indicatorLightsAlarmsGauges: indicatorLightsAlarmsGauges?.trim() || null,
        electricalSafetyDevices: electricalSafetyDevices?.trim() || null,
        mastChainHydraulics: mastChainHydraulics?.trim() || null,
        steering: steering?.trim() || null,
        headBrakeLights: headBrakeLights?.trim() || null,
        brakes: brakes?.trim() || null,
        engineOil: engineOil?.trim() || null,
        radiatorWater: radiatorWater?.trim() || null,
        comments: comments?.trim() || null,
        inspectionStatement: String(inspectionStatement).trim(),
        createdByEmail: user.email || null,
        createdByName: user.name || null,
      },
    })

    await notifyCorporateAuthorizer({
      kind: 'forklift-inspection',
      recordId: inspection.id,
      submittedByEmail: user.email,
      submittedByName: user.name,
      details: `${inspection.forkliftId} · ${inspection.location}`,
    })

    return NextResponse.json({ success: true, inspection })
  } catch (error: any) {
    console.error('Error creating forklift inspection:', error)
    return NextResponse.json({ error: 'Failed to create forklift inspection', details: error.message }, { status: 500 })
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
      return NextResponse.json({ error: 'Inspection id is required' }, { status: 400 })
    }
    await prisma.forkliftInspection.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting forklift inspection:', error)
    return NextResponse.json({ error: 'Failed to delete forklift inspection', details: error.message }, { status: 500 })
  }
}
