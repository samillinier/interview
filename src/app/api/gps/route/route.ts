import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/ruhavik'
import { GPS_TIMEZONE, dateRangeBounds, periodBounds } from '@/lib/gpsTime'
import { reverseGeocode } from '@/lib/geocode'

/**
 * GET /api/gps/route?deviceId=GV500MAP&period=today|yesterday|week
 *   or &from=YYYY-MM-DD&to=YYYY-MM-DD (custom calendar range, max 31 days)
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
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

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

    let from: string
    let to: string
    let resolvedPeriod = period

    if (fromParam && toParam) {
      const bounds = dateRangeBounds(fromParam, toParam)
      if ('error' in bounds) {
        return NextResponse.json({ error: bounds.error, positions: [], segments: [] }, { status: 400 })
      }
      from = bounds.from
      to = bounds.to
      resolvedPeriod = `range:${fromParam}:${toParam}`
    } else {
      const bounds = periodBounds(period)
      from = bounds.from
      to = bounds.to
    }

    let segments: traccar.TraccarPosition[][] = []
    try {
      segments = await traccar.getRouteSegments(traccarDevice.id, from, to)
    } catch {
      return NextResponse.json({ positions: [], segments: [], trips: [], error: 'Failed to fetch route from Ruhavik' })
    }

    const toCoord = (p: traccar.TraccarPosition) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed != null ? traccar.convertSpeedToMph(p.speed) : 0,
      time: p.deviceTime || p.fixTime,
    })

    const routeSegments = segments.map((seg) => seg.map(toCoord))
    const rawCoords = routeSegments.flat()

    let trips: traccar.TripHistoryItem[] = []
    try {
      trips = await traccar.getTripHistory(traccarDevice.id, from, to, segments)
    } catch {
      trips = []
    }

    // Attach addresses for the feed (cap + parallel; Nominatim cache helps repeats)
    await Promise.all(
      trips.slice(0, 8).map(async (t) => {
        if (!t.startLatitude || !t.startLongitude) return
        try {
          t.address = await reverseGeocode(t.startLatitude, t.startLongitude)
        } catch {
          t.address = null
        }
      })
    )

    const tripMiles = trips
      .filter((t) => t.type === 'trip')
      .reduce((s, t) => s + (t.distanceMiles || 0), 0)

    return NextResponse.json({
      positions: rawCoords,
      segments: routeSegments,
      trips,
      summary: {
        tripCount: trips.filter((t) => t.type === 'trip').length,
        parkingCount: trips.filter((t) => t.type === 'parking').length,
        totalMiles: Math.round(tripMiles * 10) / 10,
      },
      roadPath: null,
      debug: {
        rawCount: rawCoords.length,
        segmentCount: routeSegments.length,
        tripCount: trips.length,
        from,
        to,
        timeZone: GPS_TIMEZONE,
        period: resolvedPeriod,
      },
      gpsConnected: true,
    })
  } catch {
    return NextResponse.json({ positions: [], segments: [], trips: [], gpsConnected: false }, { status: 500 })
  }
}
