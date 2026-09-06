import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
      const count = await prisma.travelRequest.count({ where })
      return NextResponse.json({ success: true, count })
    }

    const role = String((session.user as any)?.role || '').toUpperCase()
    const status = searchParams.get('status')
    const chargeWorkroom = searchParams.get('chargeWorkroom')
    const search = searchParams.get('search')

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (chargeWorkroom) where.chargeWorkroom = chargeWorkroom
    if (search) {
      where.travelerName = { contains: search, mode: 'insensitive' }
    }

    // Managers only see their own requests; reviewers see everything.
    if (role === 'MANAGER') {
      where.createdByEmail = session.user.email?.toLowerCase() || ''
    }

    const requests = await prisma.travelRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, requests })
  } catch (error: any) {
    console.error('Error fetching travel requests:', error)
    return NextResponse.json({ error: 'Failed to fetch travel requests', details: error.message }, { status: 500 })
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
      dateOfRequest, travelerName, travelReason, chargeWorkroom,
      stayType, destinationCity, checkInDate, checkOutDate, stayComments,
      departingFrom, arrivingAt, departureDate, arrivalDate, flightComments,
      vehiclePickupLocation, vehicleReturnLocation, vehiclePickupDate, vehicleReturnDate,
      licenseState, licenseNumber, carComments, rideshareBudget,
    } = body

    if (!dateOfRequest || !travelerName?.trim() || !travelReason?.trim() || !chargeWorkroom) {
      return NextResponse.json(
        { error: 'Date of request, traveler name, reason, and charge workroom are required' },
        { status: 400 }
      )
    }

    const user = session.user as any
    const travelRequest = await prisma.travelRequest.create({
      data: {
        dateOfRequest: new Date(dateOfRequest),
        travelerName: String(travelerName).trim(),
        travelReason: String(travelReason).trim(),
        chargeWorkroom: String(chargeWorkroom).trim(),
        stayType: stayType || null,
        destinationCity: destinationCity?.trim() || null,
        checkInDate: toDateOrNull(checkInDate),
        checkOutDate: toDateOrNull(checkOutDate),
        stayComments: stayComments?.trim() || null,
        departingFrom: departingFrom?.trim() || null,
        arrivingAt: arrivingAt?.trim() || null,
        departureDate: toDateOrNull(departureDate),
        arrivalDate: toDateOrNull(arrivalDate),
        flightComments: flightComments?.trim() || null,
        vehiclePickupLocation: vehiclePickupLocation?.trim() || null,
        vehicleReturnLocation: vehicleReturnLocation?.trim() || null,
        vehiclePickupDate: toDateOrNull(vehiclePickupDate),
        vehicleReturnDate: toDateOrNull(vehicleReturnDate),
        licenseState: licenseState?.trim() || null,
        licenseNumber: licenseNumber?.trim() || null,
        carComments: carComments?.trim() || null,
        rideshareBudget: rideshareBudget?.trim() || null,
        createdByEmail: user.email || null,
        createdByName: user.name || null,
      },
    })

    return NextResponse.json({ success: true, travelRequest })
  } catch (error: any) {
    console.error('Error creating travel request:', error)
    return NextResponse.json({ error: 'Failed to create travel request', details: error.message }, { status: 500 })
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

    const travelRequest = await prisma.travelRequest.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, travelRequest })
  } catch (error: any) {
    console.error('Error updating travel request:', error)
    return NextResponse.json({ error: 'Failed to update travel request', details: error.message }, { status: 500 })
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
    await prisma.travelRequest.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting travel request:', error)
    return NextResponse.json({ error: 'Failed to delete travel request', details: error.message }, { status: 500 })
  }
}
