/**
 * Traccar REST API client.
 *
 * Traccar exposes a full REST API at /api on its web server (default port 8082).
 * Authentication uses HTTP Basic Auth (the same credentials as the web dashboard).
 *
 * Docs: https://www.traccar.org/api-reference/
 */

const TRACCAR_URL = (process.env.TRACCAR_SERVER_URL || '').replace(/\/+$/, '')
const TRACCAR_USER = process.env.TRACCAR_USERNAME || ''
const TRACCAR_PASS = process.env.TRACCAR_PASSWORD || ''

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${TRACCAR_USER}:${TRACCAR_PASS}`).toString('base64')
}

async function traccarFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!TRACCAR_URL) {
    throw new Error('TRACCAR_SERVER_URL is not configured')
  }

  const url = `${TRACCAR_URL}/api${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error("Traccar API error " + res.status + ": " + text.slice(0, 200))
  }

  return res.json()
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface TraccarDevice {
  id: number
  name: string
  uniqueId: string
  status: string
  disabled: boolean
  lastUpdate: string | null
  positionId: number | null
  groupId: number | null
  phone: string | null
  model: string | null
  contact: string | null
  category: string | null
  attributes: Record<string, unknown>
}

export interface TraccarPosition {
  id: number
  deviceId: number
  protocol: string | null
  serverTime: string
  deviceTime: string
  fixTime: string
  outdated: boolean
  valid: boolean
  latitude: number
  longitude: number
  altitude: number
  speed: number
  course: number
  address: string | null
  accuracy: number
  network: unknown
  attributes: Record<string, unknown>
}

export interface TraccarTrip {
  id: number
  deviceId: number
  deviceName: string
  startTime: string
  endTime: string
  startLatitude: number
  startLongitude: number
  endLatitude: number
  endLongitude: number
  distance: number
  averageSpeed: number
  maxSpeed: number
  spentFuel: number
  duration: number
  startAddress: string
  endAddress: string
  startPositionId: number
  endPositionId: number
}

export interface TraccarEvent {
  id: number
  type: string
  eventTime: string
  deviceId: number
  positionId: number | null
  geofenceId: number | null
  maintenanceId: number | null
  attributes: Record<string, unknown>
}

export interface TraccarReportStop {
  deviceId: number
  deviceName: string
  duration: number
  startTime: string
  endTime: string
  address: string | null
  latitude: number
  longitude: number
  spentFuel: number
}

export interface TraccarReportSummary {
  deviceId: number
  deviceName: string
  distance: number
  averageSpeed: number
  maxSpeed: number
  spentFuel: number
  engineHours: number
}

// ── OBDII enrichment ─────────────────────────────────────────────────────────

export interface ObdiiPayload {
  rpm?: number
  fuelLevel?: number
  engineTemp?: number
  batteryVoltage?: number
  odometer?: number
  vin?: string
  dtcCodes?: string[]
  obdSpeed?: number
  motionDetected?: boolean
  totalDistance?: number
}

export function extractObdiiData(attrs: Record<string, unknown> | undefined): ObdiiPayload {
  if (!attrs) return {}
  const payload: ObdiiPayload = {}

  const val = (key: string): number | undefined => {
    const v = attrs[key]
    if (v === null || v === undefined) return undefined
    const n = Number(v)
    return isNaN(n) ? undefined : n
  }

  const rpm = val('rpm') ?? val('obdRpm')
  if (rpm !== undefined) payload.rpm = Math.round(rpm)

  const fuel = val('fuel') ?? val('obdFuel') ?? val('fuelLevel')
  if (fuel !== undefined) payload.fuelLevel = Math.round(fuel)

  const temp = val('coolantTemp') ?? val('obdCoolantTemp') ?? val('engineTemp')
  if (temp !== undefined) payload.engineTemp = Math.round(temp)

  const battery = val('battery') ?? val('power') ?? val('obdBattery')
  if (battery !== undefined) payload.batteryVoltage = Math.round(battery * 10) / 10

  const odo = val('odometer') ?? val('obdOdometer')
  if (odo !== undefined) payload.odometer = Math.round(odo)

  const vin = attrs['vin'] ?? attrs['obdVin']
  if (typeof vin === 'string' && vin.length > 0) payload.vin = vin

  const dtc = attrs['dtc'] ?? attrs['obdDtc'] ?? attrs['dtcs']
  if (typeof dtc === 'string' && dtc.length > 0) payload.dtcCodes = dtc.split(',').map(function(s: string) { return s.trim() }).filter(Boolean)

  const obdSpeed = val('obdSpeed')
  if (obdSpeed !== undefined) payload.obdSpeed = Math.round(obdSpeed * 0.621371 * 10) / 10

  if (attrs['motion'] === true || attrs['motion'] === 'true') payload.motionDetected = true
  if (attrs['totalDistance'] !== undefined) payload.totalDistance = Math.round(Number(attrs['totalDistance']) * 0.000621371)

  return payload
}

// ── Event classification ─────────────────────────────────────────────────────

export interface ClassifiedEvent {
  id: number
  type: string
  eventTime: string
  label: string
  icon: string
  severity: string
  detail?: string
}

export function classifyEvent(event: TraccarEvent): ClassifiedEvent | null {
  const t = event.type
  const attrs = event.attributes || {}
  const result = (attrs['result'] as string) || ''
  const b = { id: event.id, type: event.type, eventTime: event.eventTime, label: '', icon: 'generic', severity: 'info', detail: undefined as string | undefined }

  if (t === 'alarm') {
    const alarmType = (attrs['alarm'] as string) || ''
    if (alarmType.includes('harshAcceleration')) return { ...b, label: 'Harsh Acceleration', icon: 'harsh', severity: 'warning', detail: 'Rapid acceleration detected' }
    if (alarmType.includes('harshBraking')) return { ...b, label: 'Harsh Braking', icon: 'harsh', severity: 'warning', detail: 'Sudden braking detected' }
    if (alarmType.includes('harshCornering') || alarmType.includes('harshTurn')) return { ...b, label: 'Harsh Cornering', icon: 'harsh', severity: 'warning', detail: 'Aggressive turn detected' }
    if (alarmType.includes('crash') || alarmType.includes('accident')) return { ...b, label: 'Crash Detected', icon: 'crash', severity: 'critical', detail: 'Impact event recorded' }
    if (alarmType.includes('tow')) return { ...b, label: 'Tow Alarm', icon: 'tow', severity: 'warning', detail: 'Vehicle movement while ignition off' }
    if (alarmType.includes('jamming')) return { ...b, label: 'Signal Jamming', icon: 'generic', severity: 'warning', detail: 'GPS or cellular signal interference' }
    return { ...b, label: alarmType, icon: 'generic', severity: 'warning' }
  }

  if (t === 'commandResult') {
    if (result.includes('GTHBM')) return { ...b, label: 'Harsh Behavior Active', icon: 'harsh', severity: 'info', detail: 'Driving behavior monitoring configured' }
    if (result.includes('GTTOW')) return { ...b, label: 'Tow Alarm Ready', icon: 'tow', severity: 'info', detail: 'Tow detection active' }
    if (result.includes('GTSPD')) return { ...b, label: 'Speed Alert Enabled', icon: 'speed', severity: 'info', detail: 'Overspeed monitoring configured' }
    if (result.includes('GTIDL')) return { ...b, label: 'Idle Monitor Ready', icon: 'idle', severity: 'info', detail: 'Non-movement detection active' }
    if (result.includes('GTOBD')) return { ...b, label: 'OBD Activated', icon: 'maintenance', severity: 'info', detail: 'Vehicle diagnostics enabled' }
    if (result.includes('GTCFG')) return { ...b, label: 'Config Applied', icon: 'generic', severity: 'info' }
    if (result.includes('GTFRI')) return { ...b, label: 'Report Interval Set', icon: 'generic', severity: 'info' }
    return { ...b, label: result.replace('+ACK:', ''), icon: 'generic', severity: 'info' }
  }

  if (t === 'geofenceEnter') return { ...b, label: 'Geofence Entered', icon: 'geofence', severity: 'info', detail: (attrs['geofenceName'] as string) || undefined }
  if (t === 'geofenceExit') return { ...b, label: 'Geofence Exited', icon: 'geofence', severity: 'warning', detail: (attrs['geofenceName'] as string) || undefined }
  if (t === 'deviceOverspeed') return { ...b, label: 'Overspeed', icon: 'speed', severity: 'warning', detail: 'Speeding alert' }
  if (t === 'deviceMoving') return null
  if (t === 'deviceStopped') return null
  if (t === 'maintenance') return { ...b, label: 'Maintenance Due', icon: 'maintenance', severity: 'warning', detail: (attrs['name'] as string) || 'Scheduled maintenance' }
  if (t === 'fuelDrop') return { ...b, label: 'Fuel Drop', icon: 'generic', severity: 'warning' }
  if (t === 'fuelIncrease') return { ...b, label: 'Fuel Increase', icon: 'generic', severity: 'info' }

  return { ...b, label: t, icon: 'generic', severity: 'info' }
}

// ── API Methods ──────────────────────────────────────────────────────────────

export function getDevices(): Promise<TraccarDevice[]> {
  return traccarFetch<TraccarDevice[]>('/devices?all=true')
}

export function getDevice(id: number): Promise<TraccarDevice> {
  return traccarFetch<TraccarDevice>("/devices/" + id)
}

export function getPositions(deviceId?: number): Promise<TraccarPosition[]> {
  const query = deviceId ? "?deviceId=" + deviceId : ''
  return traccarFetch<TraccarPosition[]>('/positions' + query)
}

export function getRoute(deviceId: number, from: string, to: string): Promise<TraccarPosition[]> {
  return traccarFetch<TraccarPosition[]>(
    "/reports/route?deviceId=" + deviceId + "&from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to)
  )
}

export function getTrips(deviceId: number, from: string, to: string): Promise<TraccarTrip[]> {
  return traccarFetch<TraccarTrip[]>(
    "/reports/trips?deviceId=" + deviceId + "&from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to)
  )
}

export function getStops(deviceId: number, from: string, to: string): Promise<TraccarReportStop[]> {
  return traccarFetch<TraccarReportStop[]>(
    "/reports/stops?deviceId=" + deviceId + "&from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to)
  )
}

export function getEvents(deviceId: number, from: string, to: string): Promise<TraccarEvent[]> {
  return traccarFetch<TraccarEvent[]>(
    "/reports/events?deviceId=" + deviceId + "&from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to)
  )
}

export function getSummary(deviceId: number, from: string, to: string): Promise<TraccarReportSummary[]> {
  return traccarFetch<TraccarReportSummary[]>(
    "/reports/summary?deviceId=" + deviceId + "&from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to)
  )
}

export function convertSpeedToMph(rawSpeed: number): number {
  const asKnots = rawSpeed * 1.15078
  if (asKnots > 120) {
    return Math.round((rawSpeed / 1.609344) * 10) / 10
  }
  const mph = Math.round(asKnots * 10) / 10
  return mph > 120 ? 0 : mph
}

export function metersToMiles(meters: number): number {
  return Math.round(meters * 0.000621371 * 10) / 10
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return h + "h " + m + "m"
  if (m > 0) return m + "m"
  return seconds + "s"
}

export async function isReachable(): Promise<boolean> {
  if (!TRACCAR_URL) return false
  try {
    const res = await fetch(TRACCAR_URL + "/api/server", {
      headers: { Authorization: authHeader() },
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}
