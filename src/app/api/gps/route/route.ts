import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/ruhavik'

/**
 * GET /api/gps/route?deviceId=GV500MAP&period=today|yesterday|week
 *
 * Returns route positions for a device within the given time period.
 * Uses raw GPS track points (not OSRM road-snapping) so history matches Ruhavik.
 */

const ROUTE_TZ = process.env.GPS_TIMEZONE || 'America/New_York'

function tzParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** Offset (ms) to add to UTC instant to get wall-clock in timeZone */
function tzOffsetMs(date: Date, timeZone: string): number {
  const p = tzParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - date.getTime()
}

/** Convert a wall-clock datetime in timeZone → UTC Date */
function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second)
  utcMs -= tzOffsetMs(new Date(utcMs), timeZone)
  utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - tzOffsetMs(new Date(utcMs), timeZone)
  return new Date(utcMs)
}

function addCalendarDays(year: number, month: number, day: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1, day + delta))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/** Period bounds in GPS_TIMEZONE (default America/New_York) */
function periodBounds(period: string, timeZone = ROUTE_TZ): { from: string; to: string } {
  const now = new Date()
  const today = tzParts(now, timeZone)

  if (period === 'yesterday') {
    const y = addCalendarDays(today.year, today.month, today.day, -1)
    const from = zonedLocalToUtc(y.year, y.month, y.day, 0, 0, 0, timeZone)
    const to = zonedLocalToUtc(y.year, y.month, y.day, 23, 59, 59, timeZone)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (period === 'week') {
    const start = addCalendarDays(today.year, today.month, today.day, -6)
    const from = zonedLocalToUtc(start.year, start.month, start.day, 0, 0, 0, timeZone)
    return { from: from.toISOString(), to: now.toISOString() }
  }

  // today (default)
  const from = zonedLocalToUtc(today.year, today.month, today.day, 0, 0, 0, timeZone)
  return { from: from.toISOString(), to: now.toISOString() }
}

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
        timeZone: ROUTE_TZ,
        period,
      },
      gpsConnected: true,
    })
  } catch {
    return NextResponse.json({ positions: [], gpsConnected: false }, { status: 500 })
  }
}
