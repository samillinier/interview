import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import * as traccar from '@/lib/ruhavik'
import { todayYmd } from '@/lib/gpsTime'
import {
  GPS_HISTORY_RETENTION_DAYS,
  backfillGpsHistory,
} from '@/lib/gpsHistoryStore'

/**
 * POST /api/gps/history/backfill
 * Body: { deviceId?: string, from?: "YYYY-MM-DD", to?: "YYYY-MM-DD", days?: number }
 *
 * Pulls past trip GPS points from Ruhavik into local GpsPosition storage.
 * Admin/property users can backfill their devices (default last 30 days).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userType = ((session?.user as any)?.userType || '').toUpperCase()
  const isAdmin = (session?.user as any)?.isAdmin === true

  if (!session || !['PROPERTY', 'SUPER_ADMIN', 'ADMIN'].includes(userType)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = session.user?.email?.toLowerCase()
  let body: { deviceId?: string; from?: string; to?: string; days?: number } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const toYmd = body.to || todayYmd()
  let fromYmd = body.from
  if (!fromYmd) {
    const days = Math.min(
      Math.max(Number(body.days) || 30, 1),
      GPS_HISTORY_RETENTION_DAYS
    )
    const [y, m, d] = toYmd.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() - (days - 1))
    fromYmd = dt.toISOString().slice(0, 10)
  }

  try {
    const reachable = await traccar.isReachable()
    if (!reachable) {
      return NextResponse.json({ error: 'Ruhavik is not reachable' }, { status: 502 })
    }

    const ruhavikDevices = await traccar.getDevices()

    let localDevices: any[] = []
    if (!isAdmin) {
      const property = await (prisma as any).property.findUnique({
        where: { email: userEmail },
        include: { GpsDevice: true },
      })
      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
      localDevices = property.GpsDevice || []
    } else {
      localDevices = await (prisma as any).gpsDevice.findMany()
    }

    if (body.deviceId) {
      localDevices = localDevices.filter(
        (d: any) => d.deviceId === body.deviceId || d.id === body.deviceId
      )
    }

    if (localDevices.length === 0) {
      return NextResponse.json({ error: 'No GPS devices to backfill' }, { status: 404 })
    }

    const results = []
    for (const local of localDevices) {
      const unit = ruhavikDevices.find(
        (td) =>
          td.uniqueId === local.deviceId ||
          (local.traccarId != null && td.id === local.traccarId) ||
          String(td.id) === String(local.deviceId)
      )
      if (!unit) {
        results.push({
          deviceKey: local.deviceId || local.id,
          gpsDeviceDbId: local.id,
          days: 0,
          fetched: 0,
          saved: 0,
          errors: ['Ruhavik unit not found for this device'],
        })
        continue
      }

      const result = await backfillGpsHistory({
        gpsDeviceDbId: local.id,
        ruhavikUnitId: unit.id,
        deviceKey: local.deviceId || String(unit.id),
        fromYmd,
        toYmd,
      })
      results.push(result)
    }

    return NextResponse.json({
      success: true,
      from: fromYmd,
      to: toYmd,
      results,
      savedTotal: results.reduce((s, r) => s + (r.saved || 0), 0),
      fetchedTotal: results.reduce((s, r) => s + (r.fetched || 0), 0),
    })
  } catch (error) {
    console.error('[gps/history/backfill]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backfill failed' },
      { status: 500 }
    )
  }
}
