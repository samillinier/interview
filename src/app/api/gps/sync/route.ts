import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/traccar'

/**
 * POST /api/gps/sync
 *
 * Syncs Traccar devices to the local database for the authenticated property user.
 * This is called when a property user first connects to Traccar or wants to refresh
 * their device list.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = (session?.user as any)?.userType

  if (!session || !['property', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userType)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = session.user?.email?.toLowerCase()

  try {
    const property = await (prisma as any).property.findUnique({
      where: { email: userEmail },
      include: { Vehicle: true, GpsDevice: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const reachable = await traccar.isReachable()
    if (!reachable) {
      return NextResponse.json(
        { error: 'Traccar server is not reachable' },
        { status: 502 }
      )
    }

    const traccarDevices = await traccar.getDevices()

    // Build plates map from local vehicles
    const vehiclesByPlate = new Map<string, string>()
    for (const v of property.Vehicle) {
      if (v.plate) {
        vehiclesByPlate.set(v.plate.toUpperCase().replace(/\s|-/g, ''), v.id)
      }
    }

    // Build existing device map by traccarId
    const existingByTraccarId = new Map<number, string>()
    for (const d of property.GpsDevice) {
      if (d.traccarId) existingByTraccarId.set(d.traccarId, d.id)
    }

    let created = 0
    let updated = 0

    for (const td of traccarDevices) {
      const existingId = existingByTraccarId.get(td.id)

      // Try to match vehicle by plate (check if uniqueId contains plate)
      let vehicleId: string | null = null
      if (td.uniqueId) {
        const cleanId = td.uniqueId.toUpperCase().replace(/\s|-/g, '')
        vehicleId = vehiclesByPlate.get(cleanId) ?? null
        if (!vehicleId) {
          const found = Array.from(vehiclesByPlate).find(([plate]) => cleanId.includes(plate))
          if (found) vehicleId = found[1]
        }
      }

      const data = {
        traccarId: td.id,
        deviceName: td.name,
        deviceId: td.uniqueId,
        deviceModel: td.model || 'Queclink GV500MAP',
        status: 'offline',
        vehicleId,
      }

      if (existingId) {
        await (prisma as any).gpsDevice.update({
          where: { id: existingId },
          data,
        })
        updated++
      } else {
        await (prisma as any).gpsDevice.create({
          data: {
            ...data,
            propertyId: property.id,
            latitude: 0,
            longitude: 0,
          },
        })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      totalTraccarDevices: traccarDevices.length,
    })
  } catch (error) {
    console.error('Failed to sync devices:', error)
    return NextResponse.json(
      { error: 'Failed to sync devices from Traccar' },
      { status: 500 }
    )
  }
}
