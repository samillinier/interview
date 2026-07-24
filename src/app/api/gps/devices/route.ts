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
 * Pulls live position data from Traccar and enriches with local DB metadata.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = (session?.user as any)?.userType

  if (!session || userType !== 'property') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = session.user?.email?.toLowerCase()

  try {
    const property = await (prisma as any).property.findUnique({
      where: { email: userEmail },
      include: {
        GpsDevice: {
          include: { Vehicle: true },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // If Traccar is NOT reachable, return empty — no stale DB data
    console.log('[GPS] TRACCAR_SERVER_URL =', process.env.TRACCAR_SERVER_URL || 'NOT SET')
    console.log('[GPS] TRACCAR_USERNAME =', process.env.TRACCAR_USERNAME ? 'SET' : 'NOT SET')
    console.log('[GPS] TRACCAR_PASSWORD =', process.env.TRACCAR_PASSWORD ? 'SET' : 'NOT SET')
    const traccarReachable = await traccar.isReachable()
    console.log('[GPS] traccarReachable =', traccarReachable)

    if (!traccarReachable) {
      return NextResponse.json({ devices: [], gpsConnected: false })
    }

    // Pull live positions from Traccar
    let livePositions: traccar.TraccarPosition[] = []
    let traccarDevices: traccar.TraccarDevice[] = []

    try {
      ;[traccarDevices, livePositions] = await Promise.all([
        traccar.getDevices(),
        traccar.getPositions(),
      ])
    } catch {
      // Traccar may be reachable but auth fails — degrade gracefully
    }

    // Create a position lookup by deviceId
    const positionByDeviceId = new Map<number, traccar.TraccarPosition>()
    for (const pos of livePositions) {
      positionByDeviceId.set(pos.deviceId, pos)
    }

    // Create a traccar device lookup by uniqueId
    const traccarDeviceByUniqueId = new Map<string, traccar.TraccarDevice>()
    for (const td of traccarDevices) {
      if (td.uniqueId) traccarDeviceByUniqueId.set(td.uniqueId, td)
    }

    // Enrich local devices with Traccar live data (async for geocoding)
    const enriched = await Promise.all(property.GpsDevice.map(async (device: any) => {
      // Match by deviceId (IMEI/uniqueId) if available
      const traccarDevice = device.deviceId
        ? traccarDeviceByUniqueId.get(device.deviceId)
        : undefined
      const livePos =
        traccarDevice != null
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

      // Reverse geocode location (only for devices with valid coordinates)
      const location = (lat && lng) ? await reverseGeocode(lat, lng) : null

      const status: 'online' | 'idle' | 'offline' = livePos
        ? speed > 3 // Ignore GPS drift under 3 mph
          ? 'online'
          : 'idle'
        : (lastSeen != null
            ? Date.now() - new Date(lastSeen).getTime() < 300_000
              ? 'idle'
              : 'offline'
            : 'offline')

      return {
        id: device.id,
        vehicleName: device.Vehicle?.vehicleModel
          ? `${device.Vehicle.vehicleMake ?? ''} ${device.Vehicle.vehicleModel}`.trim()
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
        fuelLevel: device.fuelLevel,
        engineTemp: device.engineTemp,
        batteryVoltage: device.batteryVoltage,
        odometer: device.odometer ?? 0,
        satelliteCount: livePos?.accuracy != null ? Math.round(20 - Math.min(livePos.accuracy, 20)) : 0,
        signalStrength: livePos?.network
          ? typeof (livePos.network as any)?.rssi === 'number'
            ? Math.min(100, Math.max(0, ((livePos.network as any).rssi + 120) * 2))
            : 100
          : 100,
        location,
      }
    }))

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
