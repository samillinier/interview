import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/ruhavik'
import { reverseGeocode } from '@/lib/geocode'
import { periodBounds } from '@/lib/gpsTime'

/**
 * GET /api/gps/devices
 *
 * Returns GPS devices for the authenticated property user.
 * Enriches with live position, OBDII, recent events, and today's driving summary.
 *
 * PATCH /api/gps/devices  (admin only)
 * Body: { deviceId: string, name: string }
 * Saves a custom display name for the GPS unit (replaces GV500MAP etc. in the UI).
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = ((session?.user as any)?.userType || '').toUpperCase()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    userType === 'ADMIN' ||
    userType === 'SUPER_ADMIN'

  if (!session || !isAdmin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const deviceId = String(body?.deviceId || '').trim()
    const name = String(body?.name || '').trim()

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    }
    if (!name || name.length > 80) {
      return NextResponse.json({ error: 'Name must be 1–80 characters' }, { status: 400 })
    }

    const alias = await (prisma as any).gpsDeviceAlias.upsert({
      where: { deviceKey: deviceId },
      create: { deviceKey: deviceId, name },
      update: { name },
    })

    // Keep property-linked GpsDevice.deviceName in sync when present
    await (prisma as any).gpsDevice.updateMany({
      where: { deviceId },
      data: { deviceName: name },
    }).catch(() => {})

    return NextResponse.json({ success: true, deviceId, name: alias.name })
  } catch (error) {
    console.error('Failed to rename GPS device:', error)
    return NextResponse.json({ error: 'Failed to rename GPS device' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = ((session?.user as any)?.userType || '').toUpperCase()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    userType === 'ADMIN' ||
    userType === 'SUPER_ADMIN'
  const allowedTypes = ['PROPERTY', 'SUPER_ADMIN', 'ADMIN']
  if (!session || !allowedTypes.includes(userType)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = session.user?.email?.toLowerCase()

  try {
    let gpsDevices: any[] = []

    if (!isAdmin) {
      // True property user: get their own devices from DB
      const property = await (prisma as any).property.findUnique({
        where: { email: userEmail },
        include: { GpsDevice: { include: { Vehicle: true } } },
      })
      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      gpsDevices = property.GpsDevice || []
    }
    // Admin users: devices are built directly from Ruhavik below, no DB needed

    const traccarReachable = await traccar.isReachable()
    console.log('[gps/devices] isReachable:', traccarReachable, 'provider: ruhavik')

    if (!traccarReachable) {
      return NextResponse.json({ devices: [], gpsConnected: false })
    }

    // Pull live data from Ruhavik
    let livePositions: traccar.TraccarPosition[] = []
    let traccarDevices: traccar.TraccarDevice[] = []

    try {
      ;[traccarDevices, livePositions] = await Promise.all([
        traccar.getDevices(),
        traccar.getPositions(),
      ])
      console.log('[gps/devices] Ruhavik returned:', traccarDevices.length, 'devices,', livePositions.length, 'positions')
    } catch (e) {
      console.error('[gps/devices] Error fetching Ruhavik data:', e)
    }

    // Custom admin labels (e.g. rename GV500MAP → "Van 1")
    const aliases = await (prisma as any).gpsDeviceAlias.findMany().catch(() => [])
    const aliasByKey = new Map<string, string>()
    for (const a of aliases || []) {
      if (a?.deviceKey && a?.name) aliasByKey.set(String(a.deviceKey), String(a.name))
    }

    // Admin users: build device entries directly from Ruhavik live data
    if (isAdmin && traccarDevices.length > 0) {
      console.log('[gps/devices] Admin building', traccarDevices.length, 'devices from Ruhavik')
      const posById = new Map<number, traccar.TraccarPosition>()
      for (const pos of livePositions) {
        posById.set(pos.deviceId, pos)
      }
      gpsDevices = traccarDevices.map((td) => {
        const pos = posById.get(td.id)
        // Prefer last Ruhavik heartbeat (serverTime) over GPS fix time (deviceTime)
        const seenAt = pos?.serverTime || pos?.deviceTime || td.lastUpdate
        const active =
          !!seenAt && Date.now() - new Date(seenAt).getTime() < 15 * 60_000
        const mph = pos?.speed != null ? traccar.convertSpeedToMph(pos.speed) : 0
        const deviceKey = td.uniqueId || ('tc-' + td.id)
        return {
          id: 'tc-' + td.id,
          traccarId: td.id,
          deviceId: deviceKey,
          deviceName: aliasByKey.get(deviceKey) || td.name || 'Unnamed',
          deviceModel: 'Queclink GV500MAP',
          // Match Ruhavik: connected/reporting = online (even when speed is 0)
          status: active ? 'online' : 'offline',
          lastSeen: seenAt ? new Date(seenAt).toISOString() : null,
          latitude: pos?.latitude ?? 0,
          longitude: pos?.longitude ?? 0,
          speed: pos?.speed ?? 0,
          heading: pos?.course ?? 0,
          ignition: mph > 3,
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

    // Time range for reports — Eastern day bounds (not UTC server midnight)
    const { from: todayStart, to: nowIso } = periodBounds('today')
    const { from: weekAgo } = periodBounds('week')

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
      const traccarDevice =
        (device.traccarId != null
          ? traccarDevices.find((d) => d.id === device.traccarId)
          : undefined) ||
        (device.deviceId ? traccarDeviceByUniqueId.get(String(device.deviceId)) : undefined)

      const livePos =
        (device.traccarId != null ? positionByDeviceId.get(device.traccarId) : undefined) ||
        (traccarDevice != null ? positionByDeviceId.get(traccarDevice.id) : undefined)

      const speed = livePos?.speed != null
        ? traccar.convertSpeedToMph(livePos.speed)
        : traccar.convertSpeedToMph(Number(device.speed ?? 0))
      const heading = livePos?.course ?? (device.heading ?? 0)
      const lat = livePos?.latitude ?? (device.latitude ?? 0)
      const lng = livePos?.longitude ?? (device.longitude ?? 0)

      // Mirror Ruhavik: online = device recently communicated (heartbeat),
      // not "GPS fix updated in last N minutes". Parked units stay online.
      const toIso = (v: unknown): string | null => {
        if (v == null) return null
        if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString()
        if (typeof v === 'string' || typeof v === 'number') {
          const d = new Date(v)
          return Number.isNaN(d.getTime()) ? null : d.toISOString()
        }
        return null
      }
      const lastSeen =
        toIso(livePos?.serverTime) ||
        toIso(livePos?.deviceTime) ||
        toIso(traccarDevice?.lastUpdate) ||
        toIso(device.lastSeen)

      const location = (lat && lng) ? await reverseGeocode(lat, lng) : null

      const ACTIVE_MS = 15 * 60_000
      const recentlyActive =
        lastSeen != null && Date.now() - new Date(lastSeen).getTime() < ACTIVE_MS

      // online = connected in Ruhavik; UI uses speed to show LIVE vs Online
      const status: 'online' | 'offline' = recentlyActive ? 'online' : 'offline'

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

      const deviceKey = String(device.deviceId ?? device.id)
      const customName = aliasByKey.get(deviceKey)
      const linkedVehicleName = device.Vehicle?.vehicleModel
        ? `${device.Vehicle.vehicleMake || ''} ${device.Vehicle.vehicleModel}`.trim()
        : ''

      return {
        id: device.id,
        // Admin custom name wins, then linked vehicle, then hardware/Ruhavik name
        vehicleName: customName || linkedVehicleName || device.deviceName,
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
      if (device.status === 'offline' || !device.lastSeen) continue
      // Admin-built devices use synthetic ids like "tc-8690054" — skip DB writes
      if (typeof device.id !== 'string' || device.id.startsWith('tc-')) continue
      ;(prisma as any).gpsDevice.update({
        where: { id: device.id },
        data: { lastSeen: new Date(device.lastSeen) },
      }).catch(() => {})
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
