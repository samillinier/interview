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

    // Attach driving-behavior events (speeding, harsh, crash, tow, idle) to each trip/parking
    try {
      const rawEvents = await traccar.getEvents(traccarDevice.id, from, to)
      const behavior = rawEvents
        .map((e) => traccar.classifyEvent(e))
        .filter(
          (e): e is traccar.ClassifiedEvent =>
            !!e &&
            (e.icon === 'speed' ||
              e.icon === 'harsh' ||
              e.icon === 'crash' ||
              e.icon === 'tow' ||
              e.icon === 'idle')
        )
        .map(
          (e): traccar.TripBehaviorEvent => ({
            id: e.id,
            label: e.label,
            icon: e.icon,
            severity: e.severity,
            detail: e.detail,
            eventTime: e.eventTime,
          })
        )

      for (const trip of trips) trip.events = []

      const tripWindow = (trip: traccar.TripHistoryItem) => {
        const startMs = new Date(trip.windowStart || trip.startTime).getTime()
        const endMs = new Date(trip.windowEnd || trip.endTime).getTime()
        return { startMs, endMs }
      }

      const attached = new Set<number>()

      // Pass 1: events that fall inside a trip/stop window (extra buffer for crashes)
      for (const e of behavior) {
        const t = new Date(e.eventTime).getTime()
        if (!Number.isFinite(t)) continue
        const bufferMs = e.icon === 'crash' ? 5 * 60_000 : 30_000
        let best: traccar.TripHistoryItem | null = null
        let bestDist = Number.POSITIVE_INFINITY
        for (const trip of trips) {
          const allowed =
            trip.type === 'parking'
              ? e.icon === 'tow' || e.icon === 'crash' || e.icon === 'idle'
              : e.icon === 'speed' ||
                e.icon === 'harsh' ||
                e.icon === 'crash' ||
                e.icon === 'tow' ||
                e.icon === 'idle'
          if (!allowed) continue
          const { startMs, endMs } = tripWindow(trip)
          if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue
          const lo = startMs - bufferMs
          const hi = endMs + bufferMs
          if (t < lo || t > hi) continue
          const dist = t < startMs ? startMs - t : t > endMs ? t - endMs : 0
          // Prefer the containing window; for ties prefer parking for crash/tow/idle
          const prefer =
            dist < bestDist ||
            (dist === bestDist &&
              best &&
              best.type === 'trip' &&
              trip.type === 'parking' &&
              (e.icon === 'crash' || e.icon === 'tow' || e.icon === 'idle'))
          if (prefer) {
            bestDist = dist
            best = trip
          }
        }
        if (best) {
          best.events = best.events || []
          best.events.push(e)
          attached.add(e.id)
        }
      }

      // Pass 2: leftover crashes → nearest trip/stop within 15 minutes, else standalone card
      for (const e of behavior) {
        if (e.icon !== 'crash' || attached.has(e.id)) continue
        const t = new Date(e.eventTime).getTime()
        if (!Number.isFinite(t)) continue
        let best: traccar.TripHistoryItem | null = null
        let bestDist = Number.POSITIVE_INFINITY
        for (const trip of trips) {
          const { startMs, endMs } = tripWindow(trip)
          if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue
          const dist = t < startMs ? startMs - t : t > endMs ? t - endMs : 0
          if (dist < bestDist) {
            bestDist = dist
            best = trip
          }
        }
        if (best && bestDist <= 15 * 60_000) {
          best.events = best.events || []
          best.events.push(e)
          attached.add(e.id)
          continue
        }
        trips.push({
          id: `crash-${e.id}`,
          type: 'parking',
          startTime: e.eventTime,
          endTime: e.eventTime,
          durationSec: 0,
          distanceMiles: 0,
          avgSpeedMph: 0,
          maxSpeedMph: 0,
          startLatitude: 0,
          startLongitude: 0,
          endLatitude: 0,
          endLongitude: 0,
          address: e.detail || 'Crash event',
          segmentIndex: null,
          events: [e],
          windowStart: e.eventTime,
          windowEnd: e.eventTime,
        })
        attached.add(e.id)
      }

      for (const trip of trips) {
        trip.events = (trip.events || []).sort(
          (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
        )
      }
      trips.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
    } catch {
      for (const trip of trips) trip.events = trip.events || []
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
