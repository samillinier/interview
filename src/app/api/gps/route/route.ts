import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/ruhavik'
import { GPS_TIMEZONE, dateRangeBounds, periodBounds } from '@/lib/gpsTime'
import { reverseGeocode } from '@/lib/geocode'
import {
  countGpsPositions,
  loadGpsPositions,
  saveGpsPositions,
} from '@/lib/gpsHistoryStore'

/**
 * GET /api/gps/route?deviceId=GV500MAP&period=today|yesterday|week
 *   or &from=YYYY-MM-DD&to=YYYY-MM-DD (custom calendar range, max 31 days)
 *
 * Returns route positions for a device within the given time period.
 * Archives Ruhavik fixes into GpsPosition and falls back to DB when Ruhavik is down.
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
    let gpsDevice: {
      id: string
      deviceId: string | null
      traccarId: number | null
      [key: string]: unknown
    } | null = null

    if (!isAdmin) {
      const property = await (prisma as any).property.findUnique({
        where: { email: userEmail },
        include: { GpsDevice: { include: { Vehicle: true } } },
      })
      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      gpsDevice = property.GpsDevice.find((d: any) => d.deviceId === deviceId) || null
    } else {
      gpsDevice = await (prisma as any).gpsDevice.findFirst({
        where: { deviceId },
        include: { Vehicle: true },
      })
    }

    if (!gpsDevice) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }
    const localDevice = gpsDevice

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

    const traccarReachable = await traccar.isReachable()
    let traccarDevice: Awaited<ReturnType<typeof traccar.getDevices>>[number] | null = null
    if (traccarReachable) {
      try {
        const traccarDevices = await traccar.getDevices()
        traccarDevice =
          traccarDevices.find(
            (td) =>
              td.uniqueId === deviceId ||
              String(td.id) === deviceId ||
              `tc-${td.id}` === deviceId ||
              (localDevice.traccarId != null && td.id === localDevice.traccarId)
          ) || null
      } catch {
        traccarDevice = null
      }
    }

    let segments: traccar.TraccarPosition[][] = []
    let historySource: 'ruhavik' | 'db' | 'mixed' = 'db'
    let savedCount = 0
    let dbPointCount = 0

    if (traccarDevice) {
      try {
        const points = await traccar.fetchRoutePoints(traccarDevice.id, from, to)
        try {
          savedCount = await saveGpsPositions(localDevice.id, points)
        } catch (err) {
          console.warn('[gps/route] save failed', err)
        }
        segments = await traccar.getRouteSegments(traccarDevice.id, from, to, points)
        historySource = 'ruhavik'
      } catch (err) {
        console.warn('[gps/route] Ruhavik route failed, trying DB', err)
        const dbPoints = await loadGpsPositions(localDevice.id, from, to)
        dbPointCount = dbPoints.length
        segments = traccar.buildRouteSegmentsFromPoints(dbPoints, [], from, to)
        historySource = 'db'
      }
    } else {
      const dbPoints = await loadGpsPositions(localDevice.id, from, to)
      dbPointCount = dbPoints.length
      segments = traccar.buildRouteSegmentsFromPoints(dbPoints, [], from, to)
      historySource = 'db'
    }

    if (segments.length === 0) {
      const dbPoints = await loadGpsPositions(localDevice.id, from, to)
      dbPointCount = dbPoints.length
      if (dbPoints.length > 0) {
        segments = traccar.buildRouteSegmentsFromPoints(dbPoints, [], from, to)
        historySource = historySource === 'ruhavik' ? 'mixed' : 'db'
      }
    }

    try {
      dbPointCount = await countGpsPositions(localDevice.id, from, to)
    } catch {
      // ignore
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
      trips = await traccar.getTripHistory(traccarDevice?.id ?? 0, from, to, segments)
    } catch {
      trips = []
    }

    try {
      if (!traccarDevice) throw new Error('no ruhavik device')
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
        }
      }

      for (const trip of trips) {
        trip.events = (trip.events || []).sort(
          (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime()
        )
      }

      const crashCards: traccar.TripHistoryItem[] = []
      const crashSeen = new Set<number>()
      for (const e of behavior) {
        if (e.icon !== 'crash' || crashSeen.has(e.id)) continue
        crashSeen.add(e.id)
        crashCards.push({
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
      }

      trips.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
      crashCards.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
      const withoutDupCrashCards = trips.filter((t) => !t.id.startsWith('crash-'))
      trips.length = 0
      trips.push(...crashCards, ...withoutDupCrashCards)

      ;(globalThis as any).__gpsRouteCrashDebug = {
        behaviorCount: behavior.length,
        crashCount: crashCards.length,
        behaviorError: null as string | null,
      }
    } catch (err) {
      for (const trip of trips) trip.events = trip.events || []
      ;(globalThis as any).__gpsRouteCrashDebug = {
        behaviorCount: 0,
        crashCount: 0,
        behaviorError: err instanceof Error ? err.message : 'behavior attach failed',
      }
    }

    await Promise.all(
      trips.slice(0, 8).map(async (t) => {
        if (t.id.startsWith('crash-')) return
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

    const crashDebug = (globalThis as any).__gpsRouteCrashDebug as
      | { behaviorCount: number; crashCount: number; behaviorError: string | null }
      | undefined
    delete (globalThis as any).__gpsRouteCrashDebug

    return NextResponse.json({
      positions: rawCoords,
      segments: routeSegments,
      trips,
      summary: {
        tripCount: trips.filter((t) => t.type === 'trip').length,
        parkingCount: trips.filter((t) => t.type === 'parking' && !t.id.startsWith('crash-')).length,
        totalMiles: Math.round(tripMiles * 10) / 10,
        crashCount: trips.filter((t) => t.id.startsWith('crash-')).length,
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
        behaviorCount: crashDebug?.behaviorCount ?? null,
        crashCount: crashDebug?.crashCount ?? trips.filter((t) => t.id.startsWith('crash-')).length,
        behaviorError: crashDebug?.behaviorError ?? null,
        historySource,
        savedCount,
        dbPointCount,
      },
      gpsConnected: !!traccarDevice || routeSegments.length > 0 || dbPointCount > 0,
    })
  } catch {
    return NextResponse.json({ positions: [], segments: [], trips: [], gpsConnected: false }, { status: 500 })
  }
}
