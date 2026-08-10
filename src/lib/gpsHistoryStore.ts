import prisma from '@/lib/db'
import * as ruhavik from '@/lib/ruhavik'
import { dateRangeBounds, parseYmd } from '@/lib/gpsTime'

/** Keep ~90 days of archived GPS points locally. */
export const GPS_HISTORY_RETENTION_DAYS = 90

type SaveablePoint = {
  latitude: number
  longitude: number
  speed?: number | null
  course?: number | null
  heading?: number | null
  altitude?: number | null
  accuracy?: number | null
  deviceTime?: string
  fixTime?: string
  time?: string
  timestamp?: string | Date
}

function pointTimestamp(p: SaveablePoint): Date | null {
  const raw =
    p.deviceTime ||
    p.fixTime ||
    p.time ||
    (p.timestamp instanceof Date ? p.timestamp.toISOString() : p.timestamp)
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Upsert GPS fixes into local storage (deduped on deviceId + timestamp).
 * Speed is stored in km/h to match Ruhavik/TraccarPosition.
 */
export async function saveGpsPositions(
  gpsDeviceDbId: string,
  points: SaveablePoint[]
): Promise<number> {
  if (!gpsDeviceDbId || !points?.length) return 0

  const rows: {
    deviceId: string
    latitude: number
    longitude: number
    speed: number
    heading: number
    altitude: number | null
    accuracy: number | null
    timestamp: Date
  }[] = []
  const seen = new Set<string>()

  for (const p of points) {
    const ts = pointTimestamp(p)
    if (!ts) continue
    if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) continue
    if (p.latitude === 0 && p.longitude === 0) continue
    const key = ts.toISOString()
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      deviceId: gpsDeviceDbId,
      latitude: p.latitude,
      longitude: p.longitude,
      speed: Number(p.speed ?? 0) || 0,
      heading: Number(p.course ?? p.heading ?? 0) || 0,
      altitude: p.altitude != null && Number.isFinite(Number(p.altitude)) ? Number(p.altitude) : null,
      accuracy: p.accuracy != null && Number.isFinite(Number(p.accuracy)) ? Number(p.accuracy) : null,
      timestamp: ts,
    })
  }

  if (rows.length === 0) return 0

  let saved = 0
  const chunkSize = 400
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const result = await (prisma as any).gpsPosition.createMany({
      data: chunk,
      skipDuplicates: true,
    })
    saved += Number(result?.count ?? 0)
  }

  return saved
}

/** Load archived fixes for a local GpsDevice row. */
export async function loadGpsPositions(
  gpsDeviceDbId: string,
  fromIso: string,
  toIso: string
): Promise<ruhavik.TraccarPosition[]> {
  const from = new Date(fromIso)
  const to = new Date(toIso)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return []

  const rows = await (prisma as any).gpsPosition.findMany({
    where: {
      deviceId: gpsDeviceDbId,
      timestamp: { gte: from, lte: to },
    },
    orderBy: { timestamp: 'asc' },
    take: 20000,
  })

  return (rows || []).map((r: any, i: number) => {
    const iso = new Date(r.timestamp).toISOString()
    return {
      id: i + 1,
      deviceId: 0,
      protocol: 'local',
      serverTime: iso,
      deviceTime: iso,
      fixTime: iso,
      outdated: false,
      valid: true,
      latitude: r.latitude,
      longitude: r.longitude,
      altitude: r.altitude ?? 0,
      speed: r.speed ?? 0,
      course: r.heading ?? 0,
      address: null,
      accuracy: r.accuracy ?? 0,
      network: null,
      attributes: { source: 'db' },
    } satisfies ruhavik.TraccarPosition
  })
}

export async function countGpsPositions(
  gpsDeviceDbId: string,
  fromIso: string,
  toIso: string
): Promise<number> {
  const from = new Date(fromIso)
  const to = new Date(toIso)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0
  return (prisma as any).gpsPosition.count({
    where: {
      deviceId: gpsDeviceDbId,
      timestamp: { gte: from, lte: to },
    },
  })
}

/** Drop points older than retention window. */
export async function pruneGpsPositions(
  retentionDays = GPS_HISTORY_RETENTION_DAYS
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  const result = await (prisma as any).gpsPosition.deleteMany({
    where: { timestamp: { lt: cutoff } },
  })
  return Number(result?.count ?? 0)
}

export type BackfillResult = {
  deviceKey: string
  gpsDeviceDbId: string
  days: number
  fetched: number
  saved: number
  errors: string[]
}

/**
 * Pull Ruhavik history day-by-day into local GpsPosition storage.
 */
export async function backfillGpsHistory(opts: {
  gpsDeviceDbId: string
  ruhavikUnitId: number
  deviceKey: string
  fromYmd: string
  toYmd: string
}): Promise<BackfillResult> {
  const errors: string[] = []
  let fetched = 0
  let saved = 0
  let days = 0

  const fromParts = parseYmd(opts.fromYmd)
  const toParts = parseYmd(opts.toYmd)
  if (!fromParts || !toParts) {
    return {
      deviceKey: opts.deviceKey,
      gpsDeviceDbId: opts.gpsDeviceDbId,
      days: 0,
      fetched: 0,
      saved: 0,
      errors: ['Invalid date format (use YYYY-MM-DD)'],
    }
  }

  const spanDays =
    (Date.UTC(toParts.year, toParts.month - 1, toParts.day) -
      Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day)) /
      86_400_000 +
    1
  if (spanDays < 1) {
    return {
      deviceKey: opts.deviceKey,
      gpsDeviceDbId: opts.gpsDeviceDbId,
      days: 0,
      fetched: 0,
      saved: 0,
      errors: ['Start date must be on or before end date'],
    }
  }
  if (spanDays > GPS_HISTORY_RETENTION_DAYS) {
    return {
      deviceKey: opts.deviceKey,
      gpsDeviceDbId: opts.gpsDeviceDbId,
      days: 0,
      fetched: 0,
      saved: 0,
      errors: [`Date range cannot exceed ${GPS_HISTORY_RETENTION_DAYS} days`],
    }
  }

  const cursor = new Date(Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day))
  const end = new Date(Date.UTC(toParts.year, toParts.month - 1, toParts.day))

  while (cursor.getTime() <= end.getTime()) {
    const ymd = cursor.toISOString().slice(0, 10)
    days++
    const dayBounds = dateRangeBounds(ymd, ymd)
    if ('error' in dayBounds) {
      errors.push(`${ymd}: ${dayBounds.error}`)
    } else {
      try {
        const points = await ruhavik.fetchRoutePoints(
          opts.ruhavikUnitId,
          dayBounds.from,
          dayBounds.to
        )
        fetched += points.length
        saved += await saveGpsPositions(opts.gpsDeviceDbId, points)
      } catch (err) {
        errors.push(`${ymd}: ${err instanceof Error ? err.message : 'fetch failed'}`)
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  try {
    await pruneGpsPositions()
  } catch {
    // non-fatal
  }

  return {
    deviceKey: opts.deviceKey,
    gpsDeviceDbId: opts.gpsDeviceDbId,
    days,
    fetched,
    saved,
    errors,
  }
}
