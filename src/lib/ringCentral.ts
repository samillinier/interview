/**
 * RingCentral API Client
 *
 * Uses JWT auth flow for server-side access to call logs.
 * Environment variables:
 *   RINGCENTRAL_CLIENT_ID     - RingCentral app client ID
 *   RINGCENTRAL_CLIENT_SECRET - RingCentral app client secret
 *   RINGCENTRAL_SERVER_URL    - e.g. https://platform.ringcentral.com
 *   RINGCENTRAL_JWT_TOKEN     - JWT credential (create in RingCentral dev console)
 */

const RC_SERVER = process.env.RINGCENTRAL_SERVER_URL || "https://platform.ringcentral.com"
const RC_CLIENT_ID = process.env.RINGCENTRAL_CLIENT_ID || ""
const RC_CLIENT_SECRET = process.env.RINGCENTRAL_CLIENT_SECRET || ""
const RC_JWT = process.env.RINGCENTRAL_JWT_TOKEN || ""

// ── Token cache ─────────────────────────────────────────────

let cachedToken: { access_token: string; expires_at: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expires_at > now + 60_000) {
    return cachedToken.access_token
  }

  if (!RC_CLIENT_ID || !RC_CLIENT_SECRET || !RC_JWT) {
    throw new Error("RingCentral credentials not configured. Set RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, and RINGCENTRAL_JWT_TOKEN.")
  }

  const res = await fetch(`${RC_SERVER}/restapi/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${RC_CLIENT_ID}:${RC_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: RC_JWT,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RingCentral auth failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in || 3600) * 1000,
  }
  return data.access_token
}

async function rcFetch<T>(path: string, searchParams?: URLSearchParams): Promise<T> {
  const token = await getAccessToken()
  const url = `${RC_SERVER}/restapi/v1.0${path}${searchParams ? `?${searchParams.toString()}` : ""}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RingCentral API error ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ── Types ───────────────────────────────────────────────────

export interface RCCallLogRecord {
  id: string
  uri: string
  sessionId: string
  startTime: string
  duration: number
  type: "Voice" | "Fax"
  direction: "Inbound" | "Outbound"
  action: "Phone Call" | "VoIP Call"
  result: "Accepted" | "Missed" | "Voicemail" | "Call connected" | "Unknown"
  to: { phoneNumber?: string; name?: string; extensionNumber?: string }
  from: { phoneNumber?: string; name?: string; extensionNumber?: string }
  extension?: { id: string; uri: string; extensionNumber: string }
  reason?: string
  reasonDescription?: string
  message?: { id: string; uri: string; type: string }
  recording?: { id: string; uri: string; type: string; contentUri: string }
  telephonySessionId?: string
  transport?: "PSTN" | "RCC"
  lastModifiedTime?: string
  legType?: string
  billing?: { cost: number; currency: string }
}

export interface RCCallLogResponse {
  uri: string
  records: RCCallLogRecord[]
  navigation: { firstPage?: { uri: string }; nextPage?: { uri: string }; previousPage?: { uri: string }; lastPage?: { uri: string } }
  paging: { page: number; perPage: number; totalPages: number; totalElements: number }
}

export interface RCCallRecordingContent {
  /** base64-encoded audio (or raw if text) */
  data: string
  contentType: string
}

// ── Call Logs ───────────────────────────────────────────────

export interface GetCallLogsParams {
  /** ISO date string for start of range */
  dateFrom?: string
  /** ISO date string for end of range */
  dateTo?: string
  /** Filter by direction: Inbound, Outbound */
  direction?: "Inbound" | "Outbound"
  /** Filter by call type: Voice */
  type?: "Voice"
  /** Page number (1-based) */
  page?: number
  /** Records per page (max 250) */
  perPage?: number
  /** Filter by phone number */
  phoneNumber?: string
  /** Show missed calls only */
  missedOnly?: boolean
  /** Show calls with recordings only */
  withRecording?: boolean
}

export async function getCallLogs(params: GetCallLogsParams = {}): Promise<RCCallLogResponse> {
  const sp = new URLSearchParams()

  if (params.dateFrom) sp.set("dateFrom", params.dateFrom)
  if (params.dateTo) sp.set("dateTo", params.dateTo)
  if (params.direction) sp.set("direction", params.direction)
  if (params.type) sp.set("type", params.type)
  if (params.page) sp.set("page", String(params.page))
  if (params.perPage) sp.set("perPage", String(params.perPage))
  if (params.phoneNumber) sp.set("phoneNumber", params.phoneNumber)
  if (params.missedOnly) sp.set("missedCall", "true")
  if (params.withRecording) sp.set("withRecording", "true")

  // Always set type=Voice since we only care about call logs
  sp.set("type", "Voice")

  return rcFetch<RCCallLogResponse>("/account/~/call-log", sp)
}

/** Get account info to verify app type and permissions. */
export async function getAccountInfo(): Promise<any> {
  return rcFetch("/account/~/")
}

/** Get token info to inspect granted scopes. */
export async function getTokenInfo(): Promise<any> {
  const token = await getAccessToken()
  const parts = token.split(".")
  if (parts.length !== 3) return { error: "not a JWT" }
  const payload = Buffer.from(parts[1], "base64").toString("utf8")
  return JSON.parse(payload)
}

/** Fetch content for a call recording (returns base64 data). */
export async function getCallRecording(recordingId: string): Promise<RCCallRecordingContent> {
  const token = await getAccessToken()
  const url = `${RC_SERVER}/restapi/v1.0/account/~/recording/${recordingId}/content`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RingCentral recording error ${res.status}: ${text}`)
  }

  const contentType = res.headers.get("content-type") || "audio/mpeg"
  // Return as base64 data URI for frontend playback
  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString("base64")
  return { data: `data:${contentType};base64,${base64}`, contentType }
}
