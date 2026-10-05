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

    // Badge count: inspections recorded in the current calendar month.
    if (action === 'count') {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const count = await prisma.vehicleInspection.count({
        where: { inspectionDate: { gte: start, lt: end } },
      })
      return NextResponse.json({ success: true, count })
    }

    // Return the list of fleet cars (category "car") for the vehicle dropdown.
    if (action === 'vehicles') {
      const vehicles = await prisma.vehicle.findMany({
        where: { category: { in: ['car', 'cat'] } },
        orderBy: [{ vehicleMake: 'asc' }, { vehicleModel: 'asc' }],
        select: {
          id: true,
          vehicleYear: true,
          vehicleMake: true,
          vehicleModel: true,
          plate: true,
          location: true,
          category: true,
        },
      })

      const cars = vehicles.map((v) => ({
        id: v.id,
        makeModel: [v.vehicleYear, v.vehicleMake, v.vehicleModel]
          .filter((part) => part !== null && part !== undefined && String(part).trim() !== '')
          .map((part) => String(part))
          .join(' ')
          .trim(),
        plate: v.plate || '',
        location: v.location || '',
      }))

      return NextResponse.json({ success: true, cars })
    }

    const location = searchParams.get('location')
    const search = searchParams.get('search')

    const where: any = {}
    if (location) where.assignedLocation = location
    if (search) {
      where.OR = [
        { makeModel: { contains: search, mode: 'insensitive' } },
        { tagNumber: { contains: search, mode: 'insensitive' } },
        { createdByName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const inspections = await prisma.vehicleInspection.findMany({
      where,
      orderBy: { inspectionDate: 'desc' },
    })

    return NextResponse.json({ success: true, inspections })
  } catch (error: any) {
    console.error('Error fetching vehicle inspections:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicle inspections', details: error.message }, { status: 500 })
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
      assignedLocation,
      makeModel,
      tagNumber,
      headlightsTailLights,
      brakeLights,
      signalHazardLights,
      autoGlassMirrors,
      wipers,
      brakes,
      horn,
      seatBelts,
      tires,
      firstAidKit,
      fireExtinguisher,
      insuranceRegistration,
      licensePlateSticker,
      cleanedRegularly,
      currentMileage,
      nextOilChangeDate,
      nextOilChangeMileage,
      comments,
      inspectionStatement,
    } = body

    if (!inspectionDate || !assignedLocation?.trim() || !makeModel?.trim() || !tagNumber?.trim() || !inspectionStatement?.trim()) {
      return NextResponse.json(
        { error: 'Inspection date, location, make & model, tag number, and inspection statement are required.' },
        { status: 400 },
      )
    }

    const user = session.user as any

    const inspection = await prisma.vehicleInspection.create({
      data: {
        inspectionDate: new Date(inspectionDate),
        assignedLocation: String(assignedLocation).trim(),
        makeModel: String(makeModel).trim(),
        tagNumber: String(tagNumber).trim(),
        headlightsTailLights: headlightsTailLights?.trim() || null,
        brakeLights: brakeLights?.trim() || null,
        signalHazardLights: signalHazardLights?.trim() || null,
        autoGlassMirrors: autoGlassMirrors?.trim() || null,
        wipers: wipers?.trim() || null,
        brakes: brakes?.trim() || null,
        horn: horn?.trim() || null,
        seatBelts: seatBelts?.trim() || null,
        tires: tires?.trim() || null,
        firstAidKit: firstAidKit?.trim() || null,
        fireExtinguisher: fireExtinguisher?.trim() || null,
        insuranceRegistration: insuranceRegistration?.trim() || null,
        licensePlateSticker: licensePlateSticker?.trim() || null,
        cleanedRegularly: cleanedRegularly?.trim() || null,
        currentMileage: currentMileage ? Number(currentMileage) : null,
        nextOilChangeDate: nextOilChangeDate ? new Date(nextOilChangeDate) : null,
        nextOilChangeMileage: nextOilChangeMileage ? Number(nextOilChangeMileage) : null,
        comments: comments?.trim() || null,
        inspectionStatement: String(inspectionStatement).trim(),
        createdByEmail: user.email || null,
        createdByName: user.name || null,
      },
    })

    await notifyCorporateAuthorizer({
      kind: 'vehicle-inspection',
      recordId: inspection.id,
      submittedByEmail: user.email,
      submittedByName: user.name,
      details: `${inspection.makeModel} · ${inspection.assignedLocation}`,
    })

    return NextResponse.json({ success: true, inspection })
  } catch (error: any) {
    console.error('Error creating vehicle inspection:', error)
    return NextResponse.json({ error: 'Failed to create vehicle inspection', details: error.message }, { status: 500 })
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
    await prisma.vehicleInspection.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting vehicle inspection:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle inspection', details: error.message }, { status: 500 })
  }
}
