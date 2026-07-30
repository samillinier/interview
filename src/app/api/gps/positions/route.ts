import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/ruhavik'

/**
 * GET /api/gps/positions
 *
 * Returns position history for a device within a time range.
 * Query params: deviceId (required), from, to (ISO strings)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = ((session?.user as any)?.userType || '').toUpperCase()
  const isAdmin = (session?.user as any)?.isAdmin === true

  if (!session || !['PROPERTY', 'SUPER_ADMIN', 'ADMIN'].includes(userType)) {
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

  // Look up device — admins query directly, property users scope by propertyId
  let traccarId: number | null = null

  if (!isAdmin) {
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
    traccarId = device.traccarId
  } else {
    const device = await (prisma as any).gpsDevice.findFirst({
      where: { id: deviceId },
    })
    traccarId = device?.traccarId ?? null

    // Admin live devices may not be in DB — resolve from Ruhavik by id / IMEI
    if (!traccarId) {
      const tcMatch = deviceId.match(/^tc-(\d+)$/)
      if (tcMatch) {
        traccarId = Number(tcMatch[1])
      } else if (/^\d+$/.test(deviceId)) {
        traccarId = Number(deviceId)
      } else {
        try {
          const devices = await traccar.getDevices()
          const found = devices.find((d) => d.uniqueId === deviceId || String(d.id) === deviceId)
          traccarId = found?.id ?? null
        } catch {
          traccarId = null
        }
      }
    }
  }

  if (!traccarId) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 })
  }

  try {
    const positions = await traccar.getRoute(traccarId, fromDate, toDate)

    const mapped = positions.map((pos) => ({
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: traccar.convertSpeedToMph(pos.speed),
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
      { error: 'Failed to fetch positions from Ruhavik' },
      { status: 502 }
    )
  }
}
