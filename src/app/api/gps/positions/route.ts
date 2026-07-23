import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/traccar'

/**
 * GET /api/gps/positions
 *
 * Returns position history for a device within a time range.
 * Query params: deviceId (required), from, to (ISO strings)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = (session?.user as any)?.userType

  if (!session || userType !== 'property') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('deviceId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
  }

  const fromDate = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const toDate = to || new Date().toISOString()

  // Verify ownership
  const userEmail = session.user?.email?.toLowerCase()
  const property = await prisma.property.findUnique({
    where: { email: userEmail },
  })

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  const device = await (prisma as any).gpsDevice.findFirst({
    where: { id: deviceId, propertyId: property.id },
  })

  if (!device || !device.traccarId) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 })
  }

  try {
    const positions = await traccar.getRoute(device.traccarId, fromDate, toDate)

    const mapped = positions.map((pos) => ({
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: Math.round((pos.speed * 1.15078) * 10) / 10,
      heading: pos.course,
      timestamp: pos.deviceTime,
      altitude: pos.altitude,
      accuracy: pos.accuracy,
      address: pos.address,
    }))

    return NextResponse.json({ positions: mapped })
  } catch (error) {
    console.error('Failed to fetch positions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch positions from Traccar' },
      { status: 502 }
    )
  }
}
