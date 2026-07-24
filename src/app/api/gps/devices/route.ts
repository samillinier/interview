import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/traccar'
import { reverseGeocode } from '@/lib/geocode'

/**
 * GET /api/gps/devices
 *
 * Returns GPS devices for the authenticated property user.
 * Enriches with live position, OBDII, recent events, and today's driving summary.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = ((session?.user as any)?.userType || '').toUpperCase()
  const allowedTypes = ['PROPERTY', 'SUPER_ADMIN', 'ADMIN']
  if (!session || !allowedTypes.includes(userType)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = session.user?.email?.toLowerCase()

  try {
    let gpsDevices: any[] = []

    if (userType === 'PROPERTY') {
      // Property user: get their own devices from DB
      const property = await (prisma as any).property.findUnique({
        where: { email: userEmail },
        include: { GpsDevice: { include: { Vehicle: true } } },
      })
      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      gpsDevices = property.GpsDevice || []
    }
    // Admin users: devices are built directly from Traccar below, no DB needed

    const traccarReachable = await traccar.isReachable()

    if (!traccarReachable) {
      return NextResponse.json({ devices: [], gpsConnected: false })
    }

    // Pull live data from Traccar
    let livePositions: traccar.TraccarPosition[] = []
    let traccarDevices: traccar.TraccarDevice[] = []

    try {
      ;[traccarDevices, livePositions] = await Promise.all([
        traccar.getDevices(),
        traccar.getPositions(),
      ])
    } catch {
      // Traccar may be reachable but auth fails
    }

    // Admin users: build device entries directly from Traccar live data
    if (userType !== 'PROPERTY' && traccarDevices.length > 0) {
      console.log('[gps/devices] Admin building', traccarDevices.length, 'devices from Traccar')
      const posById = new Map<number, traccar.TraccarPosition>()
      for (const pos of livePositions) {
        posById.set(pos.deviceId, pos)
      }
      gpsDevices = traccarDevices.map((td) => {
        const pos = posById.get(td.id)
        return {
          id: 'tc-' + td.id,
          traccarId: td.id,
          deviceId: td.uniqueId || ('tc-' + td.id),
          deviceName: td.name || 'Unnamed',
          deviceModel: 'Queclink GV500MAP',
          status: pos ? 'online' : 'offline',
          lastSeen: pos?.deviceTime ? new Date(pos.deviceTime).toISOString() : null,
          latitude: pos?.latitude ?? 0,
          longitude: pos?.longitude ?? 0,
          speed: pos?.speed ?? 0,
          heading: pos?.course ?? 0,
          ignition: (pos?.speed ?? 0) > 3,
          fuelLevel: null,
          engineTemp: null,
          batteryVoltage: null,
          odometer: 0,
          Vehicle: null,
        }
      })
    }

    const positionByDeviceId = new Map<number, traccar.TraccarPosition>()
    for (const pos of livePositions) {
      positionByDeviceId.set(pos.deviceId, pos)
    }

    const traccarDeviceByUniqueId = new Map<string, traccar.TraccarDevice>()
    for (const td of traccarDevices) {
      if (td.uniqueId) traccarDeviceByUniqueId.set(td.uniqueId, td)
    }

    // Time range for reports
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const nowIso = now.toISOString()

    // Fetch all events and summary in parallel for all traccar devices
    const allEvents: traccar.TraccarEvent[] = []
    let allSummary: traccar.TraccarReportSummary[] = []

    if (traccarDevices.length > 0) {
      const eventPromises = traccarDevices.map(d =>
        traccar.getEvents(d.id, weekAgo, nowIso).catch(() => [] as traccar.TraccarEvent[])
      )
      const summaryPromises = traccarDevices.map(d =>
        traccar.getSummary(d.id, todayStart, nowIso).catch(() => [] as traccar.TraccarReportSummary[])
      )
      const [eventsArrays, summaryArrays] = await Promise.all([
        Promise.all(eventPromises),
        Promise.all(summaryPromises),
      ])
      allEvents.push(...eventsArrays.flat())
      allSummary.push(...summaryArrays.flat())
    }

    // Group events by deviceId
    const eventsByDeviceId = new Map<number, traccar.TraccarEvent[]>()
    for (const evt of allEvents) {
      const arr = eventsByDeviceId.get(evt.deviceId) || []
      arr.push(evt)
      eventsByDeviceId.set(evt.deviceId, arr)
    }

    // Group summary by deviceId
    const summaryByDeviceId = new Map<number, traccar.TraccarReportSummary>()
    for (const s of allSummary) {
      summaryByDeviceId.set(s.deviceId, s)
    }

    // Enrich each device
    const enriched = await Promise.all(gpsDevices.map(async (device: any) => {
      const traccarDevice = device.deviceId
        ? traccarDeviceByUniqueId.get(device.deviceId)
        : undefined
      const livePos = traccarDevice != null
        ? positionByDeviceId.get(traccarDevice.id)
        : undefined

      const speed = livePos?.speed != null
        ? traccar.convertSpeedToMph(livePos.speed)
        : (device.speed ?? 0)
      const heading = livePos?.course ?? (device.heading ?? 0)
      const lat = livePos?.latitude ?? (device.latitude ?? 0)
      const lng = livePos?.longitude ?? (device.longitude ?? 0)
      const lastSeen = livePos?.deviceTime
        ? new Date(livePos.deviceTime).toISOString()
        : (device.lastSeen?.toISOString() ?? null)

      const location = (lat && lng) ? await reverseGeocode(lat, lng) : null

      const status: 'online' | 'idle' | 'offline' = livePos
        ? (livePos.deviceTime && Date.now() - new Date(livePos.deviceTime).getTime() > 300_000)
            ? 'offline'   // position is older than 5 minutes — device is no longer reporting
            : speed > 3 ? 'online' : 'idle'
        : (lastSeen != null
            ? Date.now() - new Date(lastSeen).getTime() < 300_000 ? 'idle' : 'offline'
            : 'offline')

      // OBDII data from position attributes
      const obdii = traccar.extractObdiiData(livePos?.attributes as Record<string, unknown> | undefined)

      // Recent events (last 7 days)
      const tcId = traccarDevice?.id
      const deviceEvents = tcId ? (eventsByDeviceId.get(tcId) || []) : []
      const recentEvents = deviceEvents
        .slice(-20)
        .map(e => traccar.classifyEvent(e))
        .filter((e): e is traccar.ClassifiedEvent => e !== null && e.icon !== 'movement' && e.icon !== 'idle' && e.icon !== 'generic')
        .reverse()

      // Today's summary
      const tcSummary = tcId ? summaryByDeviceId.get(tcId) : undefined
      const summaryOdometer = tcSummary?.endOdometer != null ? traccar.metersToMiles(tcSummary.endOdometer) : undefined
      const todaySummary = tcSummary ? {
        trips: 0,
        distance: traccar.metersToMiles(tcSummary.distance),
        drivingTime: traccar.formatDuration(Math.round((tcSummary.engineHours || 0) * 3600)),
        maxSpeed: traccar.convertSpeedToMph(tcSummary.maxSpeed),
        avgSpeed: traccar.convertSpeedToMph(tcSummary.averageSpeed),
        odometer: summaryOdometer,
      } : undefined

      return {
        id: device.id,
        vehicleName: device.Vehicle?.vehicleModel
          ? (device.Vehicle.vehicleMake || '') + ' ' + device.Vehicle.vehicleModel
          : device.deviceName,
        vehiclePlate: device.Vehicle?.plate ?? null,
        deviceId: device.deviceId ?? device.id,
        deviceModel: device.deviceModel ?? 'Queclink GV500MAP',
        status,
        lastSeen,
        latitude: lat,
        longitude: lng,
        speed,
        heading,
        ignition: speed > 3,
        fuelLevel: obdii.fuelLevel ?? device.fuelLevel ?? undefined,
        engineTemp: obdii.engineTemp ?? device.engineTemp ?? undefined,
        batteryVoltage: obdii.batteryVoltage ?? device.batteryVoltage ?? undefined,
        odometer: obdii.odometer ?? summaryOdometer ?? device.odometer ?? 0,
        satelliteCount: livePos?.accuracy != null ? Math.round(20 - Math.min(livePos.accuracy, 20)) : 0,
        signalStrength: livePos?.network
          ? typeof (livePos.network as any)?.rssi === 'number'
            ? Math.min(100, Math.max(0, ((livePos.network as any).rssi + 120) * 2))
            : 100
          : 100,
        location,
        obdii: Object.keys(obdii).length > 0 ? {
          rpm: obdii.rpm,
          fuelLevel: obdii.fuelLevel,
          obdSpeed: obdii.obdSpeed,
          vin: obdii.vin,
          dtcCodes: obdii.dtcCodes,
          motionDetected: obdii.motionDetected,
          totalDistance: obdii.totalDistance,
        } : undefined,
        recentEvents: recentEvents.length > 0 ? recentEvents : undefined,
        todaySummary,
      }
    }))

    // Fire-and-forget: update local DB lastSeen for devices with fresh positions
    for (const device of enriched) {
      if (device.status !== 'offline') {
        (prisma as any).gpsDevice.update({
          where: { id: device.id },
          data: { lastSeen: new Date(device.lastSeen) },
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      devices: enriched.length > 0 ? enriched : [],
      gpsConnected: true,
    })
  } catch (error) {
    console.error('Failed to fetch GPS devices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GPS devices' },
      { status: 500 }
    )
  }
}
