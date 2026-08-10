'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import {
  History,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Loader2,
  MapPin,
  Car,
  ParkingSquare,
  Play,
} from 'lucide-react'

export type TripBehaviorEventRow = {
  id: number
  label: string
  icon: string
  severity: string
  detail?: string
  eventTime: string
}

export type TripHistoryRow = {
  id: string
  type: 'trip' | 'parking'
  startTime: string
  endTime: string
  durationSec: number
  distanceMiles: number
  avgSpeedMph: number
  maxSpeedMph: number
  startLatitude: number
  startLongitude: number
  endLatitude: number
  endLongitude: number
  address?: string | null
  segmentIndex: number | null
  /** Speeding / harsh accel / crash / tow during this trip or stop */
  events?: TripBehaviorEventRow[]
}

type RoutePoint = { latitude: number; longitude: number; speed?: number; time?: string }

type Props = {
  open: boolean
  onToggle: () => void
  routePeriod: string | null
  isLoading: boolean
  tripHistory: TripHistoryRow[]
  tripSummary: { tripCount: number; parkingCount: number; totalMiles: number } | null
  selectedTripId: string | null
  onSelectTrip: (id: string | null) => void
  /** Force replay animation for the currently selected trip */
  onPlayTrip?: (id: string) => void
  onSelectPeriod: (period: string | null) => void
  routeSegments: RoutePoint[][]
  showCalendar: boolean
  onToggleCalendar: () => void
  customFrom: string
  customTo: string
  onCustomFrom: (v: string) => void
  onCustomTo: (v: string) => void
  onApplyCustom: () => void
  rangeError: string | null
  todayStr: string
  /** Live idle from Ruhavik (temporary state — shown in trip history, not vitals) */
  idleDurationSec?: number | null
  idleStatus?: boolean | null
}

function easternYmd(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}

export function buildHistoryDateTabs(): { key: string; label: string; ymd: string }[] {
  const today = easternYmd()
  const tabs: { key: string; label: string; ymd: string }[] = []
  for (let i = 0; i < 7; i++) {
    const ymd = addDaysYmd(today, -i)
    let label: string
    let key: string
    if (i === 0) {
      label = 'Today'
      key = 'today'
    } else if (i === 1) {
      label = 'Yesterday'
      key = 'yesterday'
    } else {
      const [, m, d] = ymd.split('-')
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      label = `${months[Number(m) - 1]} ${Number(d)}`
      key = `range:${ymd}:${ymd}`
    }
    tabs.push({ key, label, ymd })
  }
  return tabs
}

export function routePeriodToDayKey(period: string | null): string | null {
  if (!period) return null
  if (period === 'today' || period === 'yesterday') return period
  if (period.startsWith('range:')) {
    const [, f, t] = period.split(':')
    if (f && f === t) return period
  }
  return period
}

function formatTripStamp(iso: string, timeOnly = false, withSeconds = false): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--'
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  }).format(d)
  if (timeOnly) return time
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/New_York',
    day: '2-digit',
    month: '2-digit',
  }).format(d)
  return `${time}, ${date}`
}

function formatTripDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function formatIdleDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return r > 0 ? `${m}m ${r}s` : `${m}m`
  return `${r}s`
}

function TripRoutePreview({ points }: { points?: RoutePoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<{ remove: () => void } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (!points || points.length < 2) return

    let cancelled = false

    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      const step = Math.max(1, Math.floor(points.length / 120))
      const latlngs: [number, number][] = points
        .filter((_, i) => i % step === 0 || i === points.length - 1)
        .map((p) => [p.latitude, p.longitude])

      const line = L.polyline(latlngs, {
        color: '#f59e0b',
        weight: 4,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map)

      const start = points[0]
      const end = points[points.length - 1]
      L.circleMarker([start.latitude, start.longitude], {
        radius: 5,
        color: '#fff',
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 1,
      }).addTo(map)
      L.circleMarker([end.latitude, end.longitude], {
        radius: 5,
        color: '#fff',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 1,
      }).addTo(map)

      const fit = () => {
        try {
          map.invalidateSize()
          map.fitBounds(line.getBounds().pad(0.18), { animate: false, maxZoom: 15 })
        } catch {
          /* empty bounds */
        }
      }
      requestAnimationFrame(fit)
      window.setTimeout(fit, 80)
    })()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [points])

  if (!points || points.length < 2) {
    return <div className="h-32 w-full flex items-center justify-center text-[10px] text-slate-400">No track</div>
  }

  return <div ref={containerRef} className="h-32 w-full z-0" />
}

export function GpsTripHistory({
  open,
  onToggle,
  routePeriod,
  isLoading,
  tripHistory,
  tripSummary,
  selectedTripId,
  onSelectTrip,
  onPlayTrip,
  onSelectPeriod,
  routeSegments,
  showCalendar,
  onToggleCalendar,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  onApplyCustom,
  rangeError,
  todayStr,
  idleDurationSec,
  idleStatus,
}: Props) {
  const dateTabs = buildHistoryDateTabs()
  const activeDayKey = routePeriodToDayKey(routePeriod)

  const headerLabel = (() => {
    if (!routePeriod) return 'Pick a day'
    const tab = dateTabs.find((t) => t.key === routePeriod)
    if (tab) return tab.label
    if (routePeriod.startsWith('range:')) {
      const [, f, t] = routePeriod.split(':')
      return f === t ? f : `${f} → ${t}`
    }
    return routePeriod
  })()

  return (
    <div className="mb-3 rounded-2xl border border-slate-200 bg-[#f3f4f6] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left bg-white border-b border-slate-100"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <History className="w-3.5 h-3.5 text-brand-green flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800">Trip History</p>
            <p className="text-[10px] text-brand-green font-medium truncate">
              {isLoading
                ? 'Loading…'
                : `${headerLabel}${tripSummary ? ` · ${tripSummary.tripCount} trips · ${tripSummary.totalMiles} mi` : ''}`}
            </p>
            {idleDurationSec != null || idleStatus != null ? (
              <p className={`text-[10px] font-medium truncate ${idleStatus ? 'text-amber-600' : 'text-slate-400'}`}>
                Idle {idleDurationSec != null ? formatIdleDuration(idleDurationSec) : '--'}
                {idleStatus != null ? (idleStatus ? ' · Idling' : ' · Not idle') : ''}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-brand-green animate-spin" />}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="pb-3">
          <div className="bg-white px-2 pt-2 pb-1 border-b border-slate-100">
            <div className="flex items-center gap-0.5">
              <div className="flex-1 min-w-0 overflow-x-auto flex items-stretch gap-0">
                {dateTabs.map((tab) => {
                  const active = activeDayKey === tab.key || routePeriod === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        onSelectTrip(null)
                        onSelectPeriod(routePeriod === tab.key ? null : tab.key)
                      }}
                      className={`relative flex-shrink-0 px-3 py-2 text-xs font-semibold transition-colors ${
                        active ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                      } disabled:opacity-50`}
                    >
                      {tab.label}
                      {active && (
                        <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-full bg-amber-400" />
                      )}
                    </button>
                  )
                })}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <button
                type="button"
                onClick={onToggleCalendar}
                className={`p-2 rounded-lg flex-shrink-0 ${
                  showCalendar ? 'bg-brand-green/10 text-brand-green' : 'text-slate-400 hover:bg-slate-50'
                }`}
                title="Custom dates"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showCalendar && (
            <div className="mx-3 mt-2 p-2.5 rounded-xl bg-white border border-slate-200">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="block min-w-0">
                  <span className="text-[10px] text-slate-400">From</span>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || todayStr}
                    onChange={(e) => onCustomFrom(e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="text-[10px] text-slate-400">To</span>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    max={todayStr}
                    onChange={(e) => onCustomTo(e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={isLoading || !customFrom || !customTo}
                onClick={onApplyCustom}
                className="w-full px-3 py-1.5 rounded-md text-xs font-semibold bg-brand-green text-white hover:bg-brand-green/90 disabled:opacity-40"
              >
                Load trips
              </button>
              {rangeError && <p className="mt-1.5 text-[10px] text-amber-600">{rangeError}</p>}
            </div>
          )}

          <div className="px-3 pt-3 space-y-2.5 max-h-[min(70vh,36rem)] overflow-y-auto">
            {(idleDurationSec != null || idleStatus != null) && (
              <div
                className={`rounded-xl border px-3 py-2 ${
                  idleStatus
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-white border-slate-100'
                }`}
              >
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Current idle</p>
                <p className={`text-sm font-bold ${idleStatus ? 'text-amber-700' : 'text-slate-800'}`}>
                  {idleDurationSec != null ? formatIdleDuration(idleDurationSec) : '--'}
                </p>
                {idleStatus != null ? (
                  <p className="text-[10px] text-slate-500">
                    {idleStatus ? 'Vehicle is idling now' : 'Not currently idle'}
                  </p>
                ) : null}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading trips…</span>
              </div>
            )}

            {!isLoading && routePeriod && tripHistory.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-8">No trips or stops for this day.</p>
            )}

            {!isLoading && selectedTripId && (
              <button
                type="button"
                onClick={() => onSelectTrip(null)}
                className="text-[10px] font-semibold text-sky-600 hover:underline"
              >
                Show all trips on map
              </button>
            )}

            {!isLoading &&
              tripHistory.map((item) => {
                const active = selectedTripId === item.id
                if (item.type === 'parking') {
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-white shadow-sm border border-slate-100/80 border-l-[3px] border-l-amber-400 p-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <ParkingSquare className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatTripStamp(item.startTime, false, true)}
                          </p>
                          <div className="flex items-start gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-500 leading-snug">
                              {item.address ||
                                (item.startLatitude
                                  ? `${item.startLatitude.toFixed(5)}, ${item.startLongitude.toFixed(5)}`
                                  : 'Location unavailable')}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            <span className="text-slate-400">Duration:</span>{' '}
                            <span className="font-medium text-slate-700">{formatTripDuration(item.durationSec)}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            <span className="text-slate-400">End of parking:</span>{' '}
                            <span className="font-medium text-slate-700">{formatTripStamp(item.endTime)}</span>
                          </p>
                          {item.events && item.events.length > 0 ? (
                            <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                Alerts during stop
                              </p>
                              {item.events.map((ev) => (
                                <div key={`${ev.id}-${ev.eventTime}`} className="flex items-start gap-2">
                                  <span className="text-[10px] font-mono tabular-nums text-slate-500 flex-shrink-0 pt-0.5">
                                    {formatTripStamp(ev.eventTime, true)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-800 leading-snug">{ev.label}</p>
                                    {ev.detail ? (
                                      <p className="text-[10px] text-slate-400 leading-snug">{ev.detail}</p>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                }

                const seg = item.segmentIndex != null ? routeSegments[item.segmentIndex] : undefined

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectTrip(active ? null : item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectTrip(active ? null : item.id)
                      }
                    }}
                    className={`w-full text-left rounded-2xl bg-white shadow-sm border p-3 transition-shadow cursor-pointer ${
                      active ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-100/80 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Car className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{formatTripStamp(item.startTime)}</p>
                          {active && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-sky-600">On map</span>
                          )}
                        </div>
                        <div className="flex items-start gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-slate-500 leading-snug">
                            {item.address ||
                              (item.startLatitude
                                ? `${item.startLatitude.toFixed(5)}, ${item.startLongitude.toFixed(5)}`
                                : 'Location unavailable')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 relative rounded-xl overflow-hidden bg-[#e8eef3] border border-slate-100">
                      <div className="pointer-events-none">
                        <TripRoutePreview
                          key={`${item.id}-${seg?.length ?? 0}-${seg?.[0]?.time ?? ''}`}
                          points={seg}
                        />
                      </div>
                      <div className="absolute right-1.5 top-1.5 z-[500]">
                        <button
                          type="button"
                          title="Play trip on map"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onPlayTrip) onPlayTrip(item.id)
                            else onSelectTrip(item.id)
                          }}
                          className="w-7 h-7 rounded-md bg-white/95 shadow-sm flex items-center justify-center hover:bg-white border border-slate-200"
                        >
                          <Play className="w-3.5 h-3.5 text-slate-700" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      <div>
                        <p className="text-[9px] text-slate-400">Duration</p>
                        <p className="text-[11px] font-bold text-slate-800">{formatTripDuration(item.durationSec)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">Distance</p>
                        <p className="text-[11px] font-bold text-slate-800">
                          {item.distanceMiles > 0 ? `${item.distanceMiles} mi` : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">Avg</p>
                        <p className="text-[11px] font-bold text-slate-800">
                          {item.avgSpeedMph > 0 ? `${Math.round(item.avgSpeedMph)}` : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400">Max</p>
                        <p className="text-[11px] font-bold text-slate-800">
                          {item.maxSpeedMph > 0 ? `${Math.round(item.maxSpeedMph)} mph` : '--'}
                        </p>
                      </div>
                    </div>

                    {item.events && item.events.length > 0 ? (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          During this trip
                        </p>
                        {item.events.map((ev) => (
                          <div key={`${ev.id}-${ev.eventTime}`} className="flex items-start gap-2">
                            <span className="text-[10px] font-mono tabular-nums text-slate-500 flex-shrink-0 pt-0.5">
                              {formatTripStamp(ev.eventTime, true)}
                            </span>
                            <div className="min-w-0">
                              <p
                                className={`text-[11px] font-semibold leading-snug ${
                                  ev.icon === 'crash'
                                    ? 'text-red-600'
                                    : ev.icon === 'speed' || ev.icon === 'harsh' || ev.icon === 'tow'
                                      ? 'text-orange-600'
                                      : 'text-slate-800'
                                }`}
                              >
                                {ev.label}
                              </p>
                              {ev.detail ? (
                                <p className="text-[10px] text-slate-400 leading-snug">{ev.detail}</p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
          </div>

          {routePeriod && (
            <div className="px-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  onSelectPeriod(null)
                  onSelectTrip(null)
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
              >
                Clear history
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
