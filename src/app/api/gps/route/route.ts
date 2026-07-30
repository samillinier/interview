import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/ruhavik'
import { GPS_TIMEZONE, periodBounds } from '@/lib/gpsTime'

/**
 * GET /api/gps/route?deviceId=GV500MAP&period=today|yesterday|week
 *
 * Returns route positions for a device within the given time period.
 * Uses raw GPS track points (not OSRM road-snapping) so history matches Ruhavik.
 */

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = ((session?.user as any)?.userType || '').toUpperCase()
  const isAdmin = (session?.user as any)?.isAdmin === true

  if (!session || !['PROPERTY', 'SUPER_ADMIN', 'ADMIN'].includes(userType)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = session.user?.email?.toLowerCase()
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('deviceId')
  const period = searchParams.get('period') || 'today'

  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
  }

  try {
    let gpsDevice = null

    if (!isAdmin) {
      const property = await (prisma as any).property.findUnique({
        where: { email: userEmail },
        include: { GpsDevice: { include: { Vehicle: true } } },
      })
      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      gpsDevice = property.GpsDevice.find((d: any) => d.deviceId === deviceId)
    } else {
      // Admin: look up device directly
      gpsDevice = await (prisma as any).gpsDevice.findFirst({
        where: { deviceId },
        include: { Vehicle: true },
      })
    }

    if (!gpsDevice) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const traccarReachable = await traccar.isReachable()
    if (!traccarReachable) {
      return NextResponse.json({ positions: [], gpsConnected: false })
    }

    // Look up the Ruhavik unit to get the numeric ID
    const traccarDevices = await traccar.getDevices()
    const traccarDevice = traccarDevices.find(
      (td) => td.uniqueId === deviceId || String(td.id) === deviceId || `tc-${td.id}` === deviceId
    )

    if (!traccarDevice) {
      return NextResponse.json({ positions: [] })
    }

    const { from, to } = periodBounds(period)

    let positions: traccar.TraccarPosition[] = []
    try {
      positions = await traccar.getRoute(traccarDevice.id, from, to)
    } catch {
      return NextResponse.json({ positions: [], error: 'Failed to fetch route from Ruhavik' })
    }

    // Raw GPS track only — OSRM road-snapping invents highway paths through cities
    // the vehicle never visited when a bad/outlier fix is present.
    const rawCoords = positions.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed != null ? traccar.convertSpeedToMph(p.speed) : 0,
      time: p.deviceTime || p.fixTime,
    }))

    return NextResponse.json({
      positions: rawCoords,
      roadPath: null,
      debug: {
        rawCount: rawCoords.length,
        from,
        to,
        timeZone: GPS_TIMEZONE,
        period,
      },
      gpsConnected: true,
    })
  } catch {
    return NextResponse.json({ positions: [], gpsConnected: false }, { status: 500 })
  }
}
