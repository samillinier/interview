/**
 * Ruhavik / GPS-Trace JSON-RPC client.
 *
 * Drop-in replacement for the former Traccar client. Exports the same shapes
 * and helpers so GPS API routes and the UI stay unchanged.
 *
 * Auth: login.gurtam.space → X-AccessToken
 * Data: POST https://ruhavik.gurtam.space/api/platform (JSON-RPC 2.0)
 */

const RUHAVIK_USER = process.env.RUHAVIK_USERNAME || process.env.TRACCAR_USERNAME || ''
const RUHAVIK_PASS = process.env.RUHAVIK_PASSWORD || process.env.TRACCAR_PASSWORD || ''
const RUHAVIK_CLIENT_ID = process.env.RUHAVIK_CLIENT_ID || '00010000000000000300'
const RUHAVIK_REDIRECT =
  process.env.RUHAVIK_REDIRECT_URI || 'https://ruhavik.gps-trace.com/auth/callback'
const RUHAVIK_API =
  (process.env.RUHAVIK_API_URL || 'https://ruhavik.gurtam.space/api/platform').replace(/\/+$/, '')
const LOGIN_BASE = 'https://login.gurtam.space'

// ── Token cache ──────────────────────────────────────────────────────────────

let cachedToken: string | null = null
let tokenFetchedAt = 0
const TOKEN_TTL_MS = 50 * 60 * 1000 // refresh hourly-ish; expires_in=0 from Gurtam

function parseSetCookies(res: Response): string[] {
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie().map((c) => c.split(';')[0])
  }
  const single = res.headers.get('set-cookie')
  return single ? [single.split(';')[0]] : []
}

function mergeCookies(existing: string[], incoming: string[]): string[] {
  const map = new Map<string, string>()
  for (const c of [...existing, ...incoming]) {
    const name = c.split('=')[0]
    if (name) map.set(name, c)
  }
  return Array.from(map.values())
}

async function loginForToken(): Promise<string> {
  if (!RUHAVIK_USER || !RUHAVIK_PASS) {
    throw new Error('RUHAVIK_USERNAME / RUHAVIK_PASSWORD are not configured')
  }

  const loginUrl =
    `${LOGIN_BASE}/auth/login` +
    `?client_id=${encodeURIComponent(RUHAVIK_CLIENT_ID)}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(RUHAVIK_REDIRECT)}`

  let cookies: string[] = []

  const seed = await fetch(loginUrl, { signal: AbortSignal.timeout(15000) })
  cookies = mergeCookies(cookies, parseSetCookies(seed))
  await seed.text().catch(() => '')

  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: cookies.join('; '),
    },
    body: JSON.stringify({ login: RUHAVIK_USER, password: RUHAVIK_PASS }),
    signal: AbortSignal.timeout(15000),
  })
  cookies = mergeCookies(cookies, parseSetCookies(loginRes))
  const loginJson = (await loginRes.json()) as {
    result?: Array<{ url?: string }>
    errors?: Array<{ reason?: string }>
  }

  const nextPath = loginJson.result?.[0]?.url
  if (!nextPath) {
    const reason = loginJson.errors?.[0]?.reason || 'Login failed'
    throw new Error(`Ruhavik login failed: ${reason}`)
  }

  const authRes = await fetch(`${LOGIN_BASE}${nextPath}`, {
    headers: { Cookie: cookies.join('; '), Accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  })

  const location = authRes.headers.get('location') || ''
  const match = location.match(/access_token=([^&]+)/)
  if (!match?.[1]) {
    throw new Error('Ruhavik login did not return an access token')
  }
  return match[1]
}

async function getAccessToken(force = false): Promise<string> {
  const fresh = process.env.RUHAVIK_ACCESS_TOKEN
  if (fresh) return fresh

  if (!force && cachedToken && Date.now() - tokenFetchedAt < TOKEN_TTL_MS) {
    return cachedToken
  }
  cachedToken = await loginForToken()
  tokenFetchedAt = Date.now()
  return cachedToken
}

async function rpc<T>(method: string, params: Record<string, unknown> = {}, retry = true): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(RUHAVIK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-AccessToken': token,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ruhavik API HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  const body = (await res.json()) as {
    result?: T
    error?: { code?: number; message?: string; data?: unknown }
  }

  if (body.error) {
    // Invalid/expired token — refresh once
    if (retry && (body.error.code === 401 || body.error.message?.toLowerCase().includes('token'))) {
      cachedToken = null
      await getAccessToken(true)
      return rpc<T>(method, params, false)
    }
    throw new Error(`Ruhavik RPC ${method}: ${body.error.message || JSON.stringify(body.error)}`)
  }

  return body.result as T
}

// ── Types (Traccar-compatible shapes for existing routes/UI) ─────────────────

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
  startOdometer?: number
  endOdometer?: number
}

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

export interface ClassifiedEvent {
  id: number
  type: string
  eventTime: string
  label: string
  icon: string
  severity: string
  detail?: string
}

// ── Ruhavik raw shapes ───────────────────────────────────────────────────────

interface RuhavikUnit {
  id: number
  name: string
  ident?: string
  enabled?: boolean
  hw_id?: number
  device_type_id?: number
  last_active?: number | null
  created_at?: number
  updated_at?: number
}

type TelemetryMap = Record<string, { ts?: number; value?: unknown }>

interface RuhavikMessage {
  'device.id'?: number
  'position.latitude'?: number
  'position.longitude'?: number
  'position.altitude'?: number
  'position.speed'?: number
  'position.direction'?: number
  'position.valid'?: boolean
  'position.timestamp'?: number
  'position.hdop'?: number
  timestamp?: number
  'server.timestamp'?: number
  'protocol.id'?: number
  'gsm.signal.dbm'?: number
  'external.powersource.voltage'?: number
  'backup.battery.voltage'?: number
  'vehicle.mileage'?: number
  [key: string]: unknown
}

interface RuhavikTripStop {
  id?: number | string
  type?: string
  n_type?: string
  unit_id: number
  unit_name?: string
  begin?: number
  end?: number | null
  duration?: number
  lat?: number
  lon?: number
  lat_last?: number
  lon_last?: number
  speed_average?: number
  event_time?: number
  mileage?: number
  [key: string]: unknown
}

interface RuhavikMileageInterval {
  unit_id: number
  begin?: number
  end?: number
  duration?: number
  mileage?: number
  speed_average?: number
  speed_max?: number
  total_mileage?: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function unixToIso(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return new Date().toISOString()
  const ms = ts > 1e12 ? ts : ts * 1000
  return new Date(ms).toISOString()
}

function isoToUnix(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000)
}

function teleValue<T = unknown>(tele: TelemetryMap, key: string): T | undefined {
  const entry = tele[key]
  if (!entry || entry.value === undefined || entry.value === null) return undefined
  return entry.value as T
}

function teleTs(tele: TelemetryMap, key: string): number | undefined {
  return tele[key]?.ts
}

/** Normalize Ruhavik unix (sec or ms) → unix seconds */
function toUnixSec(ts: number | null | undefined): number | undefined {
  if (ts == null || !Number.isFinite(ts)) return undefined
  return ts > 1e12 ? ts / 1000 : ts
}

/**
 * Last time the unit talked to Ruhavik (heartbeat / any telemetry),
 * not just the last GPS fix. Parked devices often keep heartbeating
 * while the GPS fix stays unchanged for many minutes.
 */
function telemetryActivityUnix(tele: TelemetryMap): number | undefined {
  const candidates: number[] = []
  const push = (v: unknown) => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      const sec = toUnixSec(v)
      if (sec != null) candidates.push(sec)
    }
  }
  for (const key of ['server.timestamp', 'timestamp', 'position.latitude', 'movement.status', 'gsm.signal.dbm']) {
    push(teleValue(tele, key))
    push(teleTs(tele, key))
  }
  const posObj = teleValue<{ timestamp?: number }>(tele, 'position')
  if (posObj && typeof posObj === 'object') push(posObj.timestamp)
  push(teleTs(tele, 'position'))

  // Newest telemetry sample as fallback (heartbeat fields update even when GPS is idle)
  for (const entry of Object.values(tele)) {
    push(entry?.ts)
  }
  if (candidates.length === 0) return undefined
  return Math.max(...candidates)
}

function isRecentlyActive(unixSec: number | null | undefined, maxAgeMs = 15 * 60_000): boolean {
  const sec = toUnixSec(unixSec)
  if (sec == null) return false
  return Date.now() - sec * 1000 < maxAgeMs
}

/** Ruhavik/flespi speeds are km/h → mph */
export function convertSpeedToMph(rawSpeedKmh: number): number {
  if (!Number.isFinite(rawSpeedKmh) || rawSpeedKmh < 0) return 0
  const mph = Math.round(rawSpeedKmh * 0.621371 * 10) / 10
  return mph > 200 ? 0 : mph
}

export function metersToMiles(meters: number): number {
  return Math.round(meters * 0.000621371 * 10) / 10
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return h + 'h ' + m + 'm'
  if (m > 0) return m + 'm'
  return seconds + 's'
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

  const rpm = val('rpm') ?? val('obdRpm') ?? val('can.engine.rpm')
  if (rpm !== undefined) payload.rpm = Math.round(rpm)

  const fuel = val('fuel') ?? val('obdFuel') ?? val('fuelLevel') ?? val('fuel.level')
  if (fuel !== undefined) payload.fuelLevel = Math.round(fuel)

  const temp = val('coolantTemp') ?? val('obdCoolantTemp') ?? val('engineTemp') ?? val('engine.coolant.temperature')
  if (temp !== undefined) payload.engineTemp = Math.round(temp)

  const battery =
    val('battery') ??
    val('power') ??
    val('obdBattery') ??
    val('external.powersource.voltage') ??
    val('backup.battery.voltage')
  if (battery !== undefined) payload.batteryVoltage = Math.round(battery * 10) / 10

  const odo = val('odometer') ?? val('obdOdometer') ?? val('vehicle.mileage')
  if (odo !== undefined) {
    // vehicle.mileage from Ruhavik is typically km
    payload.odometer = Math.round(odo > 100000 ? odo * 0.000621371 : odo * 0.621371)
  }

  const vin = attrs['vin'] ?? attrs['obdVin'] ?? attrs['vehicle.vin']
  if (typeof vin === 'string' && vin.length > 0) payload.vin = vin

  const dtc = attrs['dtc'] ?? attrs['obdDtc'] ?? attrs['dtcs']
  if (typeof dtc === 'string' && dtc.length > 0) {
    payload.dtcCodes = dtc.split(',').map((s: string) => s.trim()).filter(Boolean)
  }

  const obdSpeed = val('obdSpeed') ?? val('can.vehicle.speed')
  if (obdSpeed !== undefined) payload.obdSpeed = convertSpeedToMph(obdSpeed)

  if (attrs['motion'] === true || attrs['motion'] === 'true' || attrs['movement.status'] === true) {
    payload.motionDetected = true
  }
  if (attrs['totalDistance'] !== undefined) {
    payload.totalDistance = Math.round(Number(attrs['totalDistance']) * 0.000621371)
  } else if (attrs['vehicle.mileage'] !== undefined) {
    payload.totalDistance = Math.round(Number(attrs['vehicle.mileage']) * 0.621371)
  }

  return payload
}

export function classifyEvent(event: TraccarEvent): ClassifiedEvent | null {
  const t = event.type
  const attrs = event.attributes || {}
  const result = (attrs['result'] as string) || ''
  const b = {
    id: event.id,
    type: event.type,
    eventTime: event.eventTime,
    label: '',
    icon: 'generic',
    severity: 'info',
    detail: undefined as string | undefined,
  }

  if (t === 'alarm') {
    const alarmType = (attrs['alarm'] as string) || ''
    if (alarmType.includes('harshAcceleration')) {
      return { ...b, label: 'Harsh Acceleration', icon: 'harsh', severity: 'warning', detail: 'Rapid acceleration detected' }
    }
    if (alarmType.includes('harshBraking')) {
      return { ...b, label: 'Harsh Braking', icon: 'harsh', severity: 'warning', detail: 'Sudden braking detected' }
    }
    if (alarmType.includes('harshCornering') || alarmType.includes('harshTurn')) {
      return { ...b, label: 'Harsh Cornering', icon: 'harsh', severity: 'warning', detail: 'Aggressive turn detected' }
    }
    if (alarmType.includes('crash') || alarmType.includes('accident')) {
      return { ...b, label: 'Crash Detected', icon: 'crash', severity: 'critical', detail: 'Impact event recorded' }
    }
    if (alarmType.includes('tow')) {
      return { ...b, label: 'Tow Alarm', icon: 'tow', severity: 'warning', detail: 'Vehicle movement while ignition off' }
    }
    if (alarmType.includes('jamming')) {
      return { ...b, label: 'Signal Jamming', icon: 'generic', severity: 'warning', detail: 'GPS or cellular signal interference' }
    }
    return { ...b, label: alarmType || 'Alarm', icon: 'generic', severity: 'warning' }
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
  if (t === 'trip') return null
  if (t === 'stop') return null

  return { ...b, label: t, icon: 'generic', severity: 'info' }
}

function mapUnitToDevice(unit: RuhavikUnit, tele?: TelemetryMap): TraccarDevice {
  const lastTs =
    telemetryActivityUnix(tele || {}) ??
    unit.last_active ??
    unit.updated_at ??
    null
  const speed = Number(teleValue(tele || {}, 'position.speed') ?? 0)
  // Match Ruhavik: unit is active if it recently communicated, even if GPS fix is older.
  const online = isRecentlyActive(lastTs)

  // Prefer short hardware-style names in our UI (e.g. "GV500MAP" not "My Queclink GV500MAP")
  const rawName = (unit.name || '').trim()
  const shortName = rawName.replace(/^My\s+Queclink\s+/i, '').trim() || rawName || 'Unnamed'

  return {
    id: unit.id,
    name: shortName,
    uniqueId: unit.ident || String(unit.id),
    status: online ? (speed > 3 ? 'online' : 'unknown') : 'offline',
    disabled: unit.enabled === false,
    lastUpdate: lastTs != null ? unixToIso(lastTs) : null,
    positionId: null,
    groupId: null,
    phone: null,
    model: 'Queclink GV500MAP',
    contact: null,
    category: null,
    attributes: {},
  }
}

function telemetryToPosition(unitId: number, tele: TelemetryMap): TraccarPosition | null {
  const posObj = teleValue<{
    latitude?: number
    longitude?: number
    altitude?: number
    speed?: number
    direction?: number
    valid?: boolean
    timestamp?: number
  }>(tele, 'position')

  const lat = posObj?.latitude ?? teleValue<number>(tele, 'position.latitude')
  const lng = posObj?.longitude ?? teleValue<number>(tele, 'position.longitude')
  if (lat == null || lng == null) return null

  const fixTs =
    posObj?.timestamp ??
    teleValue<number>(tele, 'position.timestamp') ??
    teleTs(tele, 'position') ??
    teleTs(tele, 'position.latitude')
  // serverTime = last Ruhavik communication; deviceTime/fixTime = GPS fix time
  const activityTs = telemetryActivityUnix(tele) ?? fixTs

  const speed = posObj?.speed ?? teleValue<number>(tele, 'position.speed') ?? 0
  const course = posObj?.direction ?? teleValue<number>(tele, 'position.direction') ?? 0
  const altitude = posObj?.altitude ?? teleValue<number>(tele, 'position.altitude') ?? 0
  const valid = posObj?.valid ?? teleValue<boolean>(tele, 'position.valid') ?? false
  const hdop = teleValue<number>(tele, 'position.hdop')
  const signalDbm = teleValue<number>(tele, 'gsm.signal.dbm')

  const attrs: Record<string, unknown> = {}
  for (const [k, entry] of Object.entries(tele)) {
    if (entry?.value !== undefined) attrs[k] = entry.value
  }

  const fixIso = unixToIso(fixTs)
  const serverIso = unixToIso(activityTs)
  return {
    id: unitId,
    deviceId: unitId,
    protocol: 'queclink',
    serverTime: serverIso,
    deviceTime: fixIso,
    fixTime: fixIso,
    outdated: !isRecentlyActive(activityTs),
    valid: Boolean(valid),
    latitude: Number(lat),
    longitude: Number(lng),
    altitude: Number(altitude),
    speed: Number(speed),
    course: Number(course),
    address: null,
    accuracy: hdop != null ? Number(hdop) : 0,
    network: signalDbm != null ? { rssi: Number(signalDbm) } : null,
    attributes: attrs,
  }
}

function isConfirmedGpsFix(valid: unknown): boolean {
  return valid === true || valid === 1 || valid === '1' || valid === 'true'
}

function messageToPosition(msg: RuhavikMessage, index: number): TraccarPosition | null {
  const lat = msg['position.latitude']
  const lng = msg['position.longitude']
  if (lat == null || lng == null) return null

  // Drop invalid / non-GPS fixes — cell/LBS junk creates fake trips (e.g. panhandle spikes)
  if (!isConfirmedGpsFix(msg['position.valid'])) return null

  const deviceId = Number(msg['device.id'] || 0)
  const ts = msg['position.timestamp'] ?? msg.timestamp ?? msg['server.timestamp']
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null
  const iso = unixToIso(ts)

  const speed = Number(msg['position.speed'] ?? 0)
  // Ruhavik speed is km/h. Drop absurd cold-start / multipath junk (e.g. 247 km/h
  // "teleports" that placed today's trip start in San Antonio, FL).
  if (speed > 160) return null

  return {
    id: index,
    deviceId,
    protocol: msg['protocol.id'] != null ? String(msg['protocol.id']) : 'queclink',
    serverTime: unixToIso(typeof msg['server.timestamp'] === 'number' ? msg['server.timestamp'] : undefined),
    deviceTime: iso,
    fixTime: iso,
    outdated: false,
    valid: true,
    latitude: Number(lat),
    longitude: Number(lng),
    altitude: Number(msg['position.altitude'] ?? 0),
    speed,
    course: Number(msg['position.direction'] ?? 0),
    address: null,
    accuracy: Number(msg['position.hdop'] ?? 0),
    network: msg['gsm.signal.dbm'] != null ? { rssi: Number(msg['gsm.signal.dbm']) } : null,
    attributes: { ...msg },
  }
}

/** Haversine distance in meters */
function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Drop teleport / spike points that imply impossible travel */
function filterRouteSpikes(positions: TraccarPosition[]): TraccarPosition[] {
  if (positions.length < 2) return positions
  const out: TraccarPosition[] = [positions[0]]
  for (let i = 1; i < positions.length; i++) {
    const prev = out[out.length - 1]
    const cur = positions[i]
    const dtSec = Math.max(
      1,
      (new Date(cur.deviceTime).getTime() - new Date(prev.deviceTime).getTime()) / 1000
    )
    const distM = haversineMeters(prev.latitude, prev.longitude, cur.latitude, cur.longitude)
    const speedMph = (distM / dtSec) * 2.236936
    // Ignore single-point teleports (>95 mph implied, or >25 miles in one hop)
    if (speedMph > 95 || distM > 40_000) continue
    out.push(cur)
  }
  return out
}

/**
 * Drop leading/trailing GPS junk before/after a real lock.
 * Cold starts often invent a faraway town (e.g. San Antonio, FL) for a few samples
 * at high speed, then snap onto the real highway track.
 */
function trimSegmentTeleports(positions: TraccarPosition[]): TraccarPosition[] {
  if (positions.length < 5) return filterRouteSpikes(positions)

  const lats = positions.map((p) => p.latitude).sort((a, b) => a - b)
  const lngs = positions.map((p) => p.longitude).sort((a, b) => a - b)
  const mid = Math.floor(positions.length / 2)
  const medLat = lats[mid]
  const medLng = lngs[mid]

  const MAX_FROM_CORE_M = 25_000 // ~15.5 miles

  let start = 0
  while (start < positions.length - 2) {
    const d = haversineMeters(positions[start].latitude, positions[start].longitude, medLat, medLng)
    if (d <= MAX_FROM_CORE_M) break
    start++
  }

  let end = positions.length - 1
  while (end > start + 1) {
    const d = haversineMeters(positions[end].latitude, positions[end].longitude, medLat, medLng)
    if (d <= MAX_FROM_CORE_M) break
    end--
  }

  return filterRouteSpikes(positions.slice(start, end + 1))
}

function mapRuhavikEventType(raw: RuhavikTripStop): string {
  const t = String(raw.n_type || raw.type || '').toLowerCase()
  if (t === 'trip') return 'trip'
  if (t === 'stop' || t === 'parking') return 'deviceStopped'
  if (t.includes('speed') || t.includes('overspeed')) return 'deviceOverspeed'
  if (t.includes('geofence') && (t.includes('in') || t.includes('enter'))) return 'geofenceEnter'
  if (t.includes('geofence') && (t.includes('out') || t.includes('exit') || t.includes('left'))) return 'geofenceExit'
  if (t.includes('tow')) return 'alarm'
  if (t.includes('alarm')) return 'alarm'
  return t || 'generic'
}

function toEventId(raw: RuhavikTripStop, index: number): number {
  if (typeof raw.id === 'number') return raw.id
  if (typeof raw.id === 'string') {
    const n = parseInt(raw.id, 10)
    if (!isNaN(n)) return n
  }
  return index + 1
}

// ── API Methods ──────────────────────────────────────────────────────────────

export async function getDevices(): Promise<TraccarDevice[]> {
  const units = await rpc<RuhavikUnit[]>('units.get', {})
  if (!Array.isArray(units)) return []

  const withTele = await Promise.all(
    units.map(async (unit) => {
      try {
        const tele = await rpc<TelemetryMap>('unit.get_telemetry', { unit_id: unit.id })
        return mapUnitToDevice(unit, tele || {})
      } catch {
        return mapUnitToDevice(unit)
      }
    })
  )
  return withTele
}

export async function getDevice(id: number): Promise<TraccarDevice> {
  const units = await rpc<RuhavikUnit[]>('units.get', {})
  const unit = (units || []).find((u) => u.id === id)
  if (!unit) throw new Error(`Ruhavik unit ${id} not found`)
  try {
    const tele = await rpc<TelemetryMap>('unit.get_telemetry', { unit_id: id })
    return mapUnitToDevice(unit, tele || {})
  } catch {
    return mapUnitToDevice(unit)
  }
}

export async function getPositions(deviceId?: number): Promise<TraccarPosition[]> {
  const units = await rpc<RuhavikUnit[]>('units.get', {})
  const list = (units || []).filter((u) => (deviceId != null ? u.id === deviceId : true))

  const positions: TraccarPosition[] = []
  await Promise.all(
    list.map(async (unit) => {
      try {
        const tele = await rpc<TelemetryMap>('unit.get_telemetry', { unit_id: unit.id })
        const pos = telemetryToPosition(unit.id, tele || {})
        if (pos) positions.push(pos)
      } catch {
        // skip unit
      }
    })
  )
  return positions
}

export async function getRoute(deviceId: number, from: string, to: string): Promise<TraccarPosition[]> {
  const segments = await getRouteSegments(deviceId, from, to)
  return segments.flat()
}

/**
 * Route history as separate trip segments (does not connect parking gaps).
 * Drawing one continuous polyline across overnight/parked gaps invents fake travel.
 */
export async function getRouteSegments(
  deviceId: number,
  from: string,
  to: string
): Promise<TraccarPosition[][]> {
  const fromUnix = isoToUnix(from)
  const toUnix = isoToUnix(to)

  const [messages, tripStops] = await Promise.all([
    rpc<RuhavikMessage[]>('unit.messages.get', {
      unit_id: deviceId,
      from: fromUnix,
      to: toUnix,
      count: 5000,
    }).catch(() => [] as RuhavikMessage[]),
    rpc<RuhavikTripStop[]>('units.events.trips_stops.get', {
      ids: [deviceId],
      from: fromUnix,
      to: toUnix,
    }).catch(() => [] as RuhavikTripStop[]),
  ])

  const points: TraccarPosition[] = []
  ;(messages || []).forEach((msg, i) => {
    const pos = messageToPosition(msg, i)
    if (!pos) return
    const ts = isoToUnix(pos.deviceTime)
    if (ts < fromUnix || ts > toUnix) return
    pos.deviceId = deviceId
    points.push(pos)
  })

  points.sort((a, b) => new Date(a.deviceTime).getTime() - new Date(b.deviceTime).getTime())

  const trips = (tripStops || [])
    .filter((e) => {
      const t = String(e.n_type || e.type || '').toLowerCase()
      if (t !== 'trip') return false
      const begin = Number(e.begin ?? e.event_time ?? 0)
      const endRaw = e.end
      const end = endRaw == null ? toUnix : Number(endRaw)
      // Overlaps requested window
      return end >= fromUnix && begin <= toUnix
    })
    .sort((a, b) => Number(a.begin ?? 0) - Number(b.begin ?? 0))

  if (trips.length > 0) {
    const segments: TraccarPosition[][] = []
    for (const trip of trips) {
      const begin = Math.max(fromUnix, Number(trip.begin ?? 0))
      const endRaw = trip.end
      const end = Math.min(toUnix, endRaw == null ? toUnix : Number(endRaw))
      if (end < begin) continue
      const seg = trimSegmentTeleports(
        points.filter((p) => {
          const ts = isoToUnix(p.deviceTime)
          return ts >= begin && ts <= end
        })
      )
      if (seg.length >= 2) segments.push(seg)
    }
    if (segments.length > 0) return segments
  }

  // Fallback: only moving points, split on long parking gaps so days don't connect
  const moving = trimSegmentTeleports(points.filter((p) => Number(p.speed || 0) > 1))
  return splitRouteByGaps(moving, 20 * 60)
}

/** Split a track into segments when the gap between points exceeds maxGapSec */
function splitRouteByGaps(positions: TraccarPosition[], maxGapSec: number): TraccarPosition[][] {
  if (positions.length < 2) return positions.length ? [positions] : []
  const segments: TraccarPosition[][] = []
  let current: TraccarPosition[] = [positions[0]]
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1]
    const cur = positions[i]
    const gap =
      (new Date(cur.deviceTime).getTime() - new Date(prev.deviceTime).getTime()) / 1000
    if (gap > maxGapSec) {
      if (current.length >= 2) segments.push(current)
      current = [cur]
    } else {
      current.push(cur)
    }
  }
  if (current.length >= 2) segments.push(current)
  return segments
}

export async function getTrips(deviceId: number, from: string, to: string): Promise<TraccarTrip[]> {
  const items = await rpc<RuhavikTripStop[]>('units.events.trips_stops.get', {
    ids: [deviceId],
    from: isoToUnix(from),
    to: isoToUnix(to),
  })

  return (items || [])
    .filter((e) => String(e.n_type || e.type).toLowerCase() === 'trip')
    .map((e, i) => {
      const begin = e.begin ?? e.event_time ?? 0
      const end = e.end ?? begin
      const durationSec = e.duration ?? Math.max(0, end - begin)
      const mileageKm = Number(e.mileage ?? 0)
      return {
        id: toEventId(e, i),
        deviceId,
        deviceName: e.unit_name || '',
        startTime: unixToIso(begin),
        endTime: unixToIso(end),
        startLatitude: Number(e.lat ?? 0),
        startLongitude: Number(e.lon ?? 0),
        endLatitude: Number(e.lat_last ?? e.lat ?? 0),
        endLongitude: Number(e.lon_last ?? e.lon ?? 0),
        distance: mileageKm * 1000, // meters (Traccar-compatible)
        averageSpeed: Number(e.speed_average ?? 0),
        maxSpeed: 0,
        spentFuel: 0,
        duration: durationSec * 1000, // ms
        startAddress: '',
        endAddress: '',
        startPositionId: 0,
        endPositionId: 0,
      }
    })
}

export async function getStops(deviceId: number, from: string, to: string): Promise<TraccarReportStop[]> {
  const items = await rpc<RuhavikTripStop[]>('units.events.trips_stops.get', {
    ids: [deviceId],
    from: isoToUnix(from),
    to: isoToUnix(to),
  })

  return (items || [])
    .filter((e) => {
      const t = String(e.n_type || e.type).toLowerCase()
      return t === 'stop' || t === 'parking'
    })
    .map((e) => {
      const begin = e.begin ?? e.event_time ?? 0
      const end = e.end ?? begin
      return {
        deviceId,
        deviceName: e.unit_name || '',
        duration: (e.duration ?? Math.max(0, end - begin)) * 1000,
        startTime: unixToIso(begin),
        endTime: unixToIso(end),
        address: null,
        latitude: Number(e.lat ?? 0),
        longitude: Number(e.lon ?? 0),
        spentFuel: 0,
      }
    })
}

export async function getEvents(deviceId: number, from: string, to: string): Promise<TraccarEvent[]> {
  const fromUnix = isoToUnix(from)
  const toUnix = isoToUnix(to)
  const items = await rpc<RuhavikTripStop[]>('units.events.get', {
    ids: [deviceId],
    from: fromUnix,
    to: toUnix,
  })

  return (items || [])
    .filter((e) => {
      const ts = Number(e.event_time ?? e.begin ?? 0)
      return ts >= fromUnix && ts <= toUnix
    })
    .map((e, i) => {
    const type = mapRuhavikEventType(e)
    const attrs: Record<string, unknown> = { ...e }
    if (type === 'alarm' && String(e.n_type || e.type).toLowerCase().includes('tow')) {
      attrs.alarm = 'tow'
    }
    return {
      id: toEventId(e, i),
      type,
      eventTime: unixToIso(e.event_time ?? e.begin ?? e.timestamp as number | undefined),
      deviceId: e.unit_id || deviceId,
      positionId: null,
      geofenceId: null,
      maintenanceId: null,
      attributes: attrs,
    }
  })
}

export async function getSummary(deviceId: number, from: string, to: string): Promise<TraccarReportSummary[]> {
  const fromUnix = isoToUnix(from)
  const toUnix = isoToUnix(to)

  const [mileage, trips] = await Promise.all([
    rpc<RuhavikMileageInterval[]>('units.mileage.intervals.get', {
      ids: [deviceId],
      from: fromUnix,
      to: toUnix,
    }).catch(() => [] as RuhavikMileageInterval[]),
    rpc<RuhavikTripStop[]>('units.events.trips_stops.get', {
      ids: [deviceId],
      from: fromUnix,
      to: toUnix,
    }).catch(() => [] as RuhavikTripStop[]),
  ])

  // Ruhavik often returns intervals/trips outside the requested window — filter locally.
  const intervals = (mileage || []).filter((i) => {
    const begin = Number(i.begin || 0)
    return begin >= fromUnix && begin <= toUnix
  })

  const tripEvents = (trips || []).filter((e) => {
    const t = String(e.n_type || e.type || '').toLowerCase()
    if (t !== 'trip') return false
    const begin = Number(e.begin ?? e.event_time ?? 0)
    return begin >= fromUnix && begin <= toUnix
  })

  // Prefer trip events when available (cleaner day totals); else mileage intervals.
  const useTrips = tripEvents.length > 0
  const totalKm = useTrips
    ? tripEvents.reduce((sum, i) => sum + Number(i.mileage || 0), 0)
    : intervals.reduce((sum, i) => sum + Number(i.mileage || 0), 0)
  const totalDurationSec = useTrips
    ? tripEvents.reduce((sum, i) => sum + Number(i.duration || 0), 0)
    : intervals.reduce((sum, i) => sum + Number(i.duration || 0), 0)

  const rawMax = Math.max(
    0,
    ...intervals.map((i) => Number(i.speed_max || 0)),
    ...tripEvents.map((i) => Number(i.speed_max || 0))
  )
  // Cap absurd GPS spike speeds (e.g. 198 km/h junk fixes)
  const maxSpeed = Math.min(rawMax, 160)

  const weighted = useTrips ? tripEvents : intervals
  let avgSpeed = 0
  if (weighted.length > 0 && totalDurationSec > 0) {
    const speedSum = weighted.reduce(
      (sum, i) => sum + Number(i.speed_average || 0) * Number(i.duration || 0),
      0
    )
    avgSpeed = speedSum / totalDurationSec
  }

  const endOdometerKm = Math.max(0, ...intervals.map((i) => Number(i.total_mileage || 0)))

  return [
    {
      deviceId,
      deviceName: '',
      distance: totalKm * 1000, // meters
      averageSpeed: avgSpeed,
      maxSpeed,
      spentFuel: 0,
      engineHours: totalDurationSec / 3600,
      endOdometer: endOdometerKm > 0 ? endOdometerKm * 1000 : undefined,
    },
  ]
}

export async function isReachable(): Promise<boolean> {
  // Prefer a preconfigured access token — avoids login storms that can lock the account.
  if (!RUHAVIK_USER || !RUHAVIK_PASS) {
    if (!process.env.RUHAVIK_ACCESS_TOKEN) return false
  }
  try {
    // Do NOT force a fresh login here — /api/gps/devices calls this on every poll.
    await rpc('units.get', {})
    return true
  } catch (e) {
    console.error('[ruhavik] isReachable failed:', e)
    return false
  }
}
