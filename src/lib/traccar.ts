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
    throw new Error(`Traccar API error ${res.status}: ${text.slice(0, 200)}`)
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
  serverTime: string
  deviceId: number
  positionId: number
  geofenceId: number | null
  maintenanceId: number | null
  attributes: Record<string, unknown>
}

// ── API Methods ──────────────────────────────────────────────────────────────

/** List all devices */
export function getDevices(): Promise<TraccarDevice[]> {
  return traccarFetch<TraccarDevice[]>('/devices?all=true')
}

/** Get a single device by Traccar ID */
export function getDevice(id: number): Promise<TraccarDevice> {
  return traccarFetch<TraccarDevice>(`/devices/${id}`)
}

/** Get latest positions for all devices (or a specific device) */
export function getPositions(deviceId?: number): Promise<TraccarPosition[]> {
  const query = deviceId ? `?deviceId=${deviceId}` : ''
  return traccarFetch<TraccarPosition[]>(`/positions${query}`)
}

/** Get route / position history for a device between two dates (ISO strings) */
export function getRoute(deviceId: number, from: string, to: string): Promise<TraccarPosition[]> {
  return traccarFetch<TraccarPosition[]>(
    `/reports/route?deviceId=${deviceId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  )
}

/** Get trips for a device between two dates */
export function getTrips(deviceId: number, from: string, to: string): Promise<TraccarTrip[]> {
  return traccarFetch<TraccarTrip[]>(
    `/reports/trips?deviceId=${deviceId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  )
}

/** Get events for a device between two dates */
export function getEvents(deviceId: number, from: string, to: string): Promise<TraccarEvent[]> {
  return traccarFetch<TraccarEvent[]>(
    `/reports/events?deviceId=${deviceId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  )
}

/** Check whether Traccar is reachable */
export async function isReachable(): Promise<boolean> {
  if (!TRACCAR_URL) return false
  try {
    const res = await fetch(`${TRACCAR_URL}/api/server`, {
      headers: { Authorization: authHeader() },
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}
