import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/traccar'

/**
 * GET /api/gps/route?deviceId=GV500MAP&period=today|yesterday|week
 *
 * Returns route positions for a device within the given time period.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = (session?.user as any)?.userType

  if (!session || userType !== 'property') {
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
    const property = await (prisma as any).property.findUnique({
      where: { email: userEmail },
      include: { GpsDevice: { include: { Vehicle: true } } },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const gpsDevice = property.GpsDevice.find(
      (d: any) => d.deviceId === deviceId
    )

    if (!gpsDevice) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const traccarReachable = await traccar.isReachable()
    if (!traccarReachable) {
      return NextResponse.json({ positions: [], gpsConnected: false })
    }

    // Look up the Traccar device to get the numeric ID
    const traccarDevices = await traccar.getDevices()
    const traccarDevice = traccarDevices.find(
      (td) => td.uniqueId === deviceId
    )

    if (!traccarDevice) {
      return NextResponse.json({ positions: [] })
    }

    // Calculate time range
    const now = new Date()
    let from: string
    const to = now.toISOString()

    switch (period) {
      case 'yesterday': {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        from = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString()
        break
      }
      case 'week': {
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        from = weekAgo.toISOString()
        break
      }
      case 'today':
      default: {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        break
      }
    }

    let positions: traccar.TraccarPosition[] = []
    try {
      positions = await traccar.getRoute(traccarDevice.id, from, to)
    } catch {
      return NextResponse.json({ positions: [], error: 'Failed to fetch route from Traccar' })
    }

    // Convert to simple lat/lng array for the map
    const coords = positions.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed != null ? traccar.convertSpeedToMph(p.speed) : 0,
      time: p.deviceTime || p.fixTime,
    }))

    return NextResponse.json({ positions: coords, gpsConnected: true })
  } catch {
    return NextResponse.json({ positions: [], gpsConnected: false }, { status: 500 })
  }
}
