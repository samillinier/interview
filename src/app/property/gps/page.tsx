'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  Loader2,
  AlertCircle,
  AlertTriangle,
  Car,
  Satellite,
  Signal,
  Gauge,
  Fuel,
  Thermometer,
  Battery,
  WifiOff,
  RefreshCw,
  Clock,
  Navigation,
  CarFront,
  HardDrive,
  Play,
  Pause,
  Activity,
  Shield,
  RotateCcw,
  MapPin,
  ChevronDown,
  LocateFixed,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'
import { PropertySidebar } from '@/components/PropertySidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { propertyMobileSafeLeftPad } from '@/lib/propertyMobileLayout'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import type { VehicleDevice } from '@/components/GpsLiveMap'
import type { TripHistoryRow } from '@/components/GpsTripHistory'

type RoutePoint = { latitude: number; longitude: number; speed?: number; time?: string }

const GpsLiveMap = dynamic(() => import('@/components/GpsLiveMap').then((mod) => mod.GpsLiveMap), {
  ssr: false,
  loading: () => <div className="h-full w-full min-h-[500px] bg-slate-100 animate-pulse rounded-b-2xl flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>,
})

const GpsTripHistory = dynamic(
  () => import('@/components/GpsTripHistory').then((mod) => mod.GpsTripHistory),
  { ssr: false }
)

interface PropertyProfile {
  id: string
  firstName: string
  lastName: string
  email: string
}

const POLL_INTERVAL_MS = 10000 // 10 seconds between GPS position polls

export default function GPSPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()

  const [property, setProperty] = useState<PropertyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [devices, setDevices] = useState<VehicleDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<VehicleDevice | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [gpsConnected, setGpsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [routePeriod, setRoutePeriod] = useState<string | null>(null)
  const [routePositions, setRoutePositions] = useState<{ latitude: number; longitude: number; speed?: number; time?: string }[]>([])
  const [routeSegments, setRouteSegments] = useState<{ latitude: number; longitude: number; speed?: number; time?: string }[][]>([])
  const [tripHistory, setTripHistory] = useState<TripHistoryRow[]>([])
  const [tripSummary, setTripSummary] = useState<{ tripCount: number; parkingCount: number; totalMiles: number } | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [playTick, setPlayTick] = useState(0)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [locateTick, setLocateTick] = useState(0)
  // Prefer role — isAdmin was missing from session for some logins
  const sessionRole = String((session?.user as any)?.role || '').toUpperCase()
  const sessionUserType = String((session?.user as any)?.userType || '').toUpperCase()
  const canRenameGps =
    (session?.user as any)?.isAdmin === true ||
    sessionRole === 'ADMIN' ||
    sessionRole === 'SUPER_ADMIN' ||
    sessionUserType === 'ADMIN' ||
    sessionUserType === 'SUPER_ADMIN'

  function locateVehicle(device?: VehicleDevice | null) {
    const target = device || selectedDevice || devices[0]
    if (!target) return
    if (!selectedDevice || selectedDevice.id !== target.id) {
      setSelectedDevice(target)
    }
    // Exit history so the map focuses on the live car
    if (routePeriod) setRoutePeriod(null)
    setLocateTick((n) => n + 1)
  }

  async function renameDevice(device: VehicleDevice, name: string) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Name is required')
    if (trimmed === device.vehicleName) return true
    const res = await fetch('/api/gps/devices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, name: trimmed }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to rename')
    }
    setDevices((prev) =>
      prev.map((d) => (d.id === device.id ? { ...d, vehicleName: trimmed } : d))
    )
    setSelectedDevice((prev) =>
      prev && prev.id === device.id ? { ...prev, vehicleName: trimmed } : prev
    )
    return true
  }

  // Load property profile
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/property/login')
      return
    }
    if (status === 'authenticated') {
      const userType = ((session?.user as any)?.userType || '').toUpperCase()
      const allowedTypes = ['PROPERTY', 'SUPER_ADMIN', 'ADMIN', 'MANAGER']
      if (!allowedTypes.includes(userType)) {
        router.push('/property/login')
        return
      }
      loadPropertyProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session])

  const loadPropertyProfile = async () => {
    const userType = ((session?.user as any)?.userType || '').toUpperCase()
    if (userType === 'PROPERTY') {
      try {
        const res = await fetch('/api/properties/by-email', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setProperty(data.property || data)
        }
      } catch {
        // will retry or show error state
      }
    } else {
      // Admin: use session data
      setProperty({
        id: (session?.user as any)?.id || '',
        firstName: (session?.user as any)?.name?.split(' ')[0] || '',
        lastName: (session?.user as any)?.name?.split(' ').slice(1).join(' ') || '',
        email: session?.user?.email || '',
      } as PropertyProfile)
    }
    setIsLoading(false)
  }

  // Fetch GPS devices via our API
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch(`/api/gps/devices?_t=${Date.now()}`, { cache: 'no-store' })
      console.log('[GPS page] fetchDevices status:', res.status, 'ok:', res.ok)
      if (!res.ok) {
        const errText = await res.text()
        console.error('[GPS page] devices API error:', errText)
        setGpsConnected(false)
        return
      }
      const data = await res.json()
      console.log('[GPS page] devices count:', data.devices?.length, 'gpsConnected:', data.gpsConnected)
      setDevices(data.devices || [])
      setGpsConnected(!!data.gpsConnected)
      setLastRefresh(new Date())
    } catch (e) {
      console.error('[GPS page] network error:', e)
      setGpsConnected(false)
    }
  }, [])

  // Sync GPS devices to local DB
  const syncDevices = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/gps/sync', { method: 'POST' })
      if (res.ok) {
        await fetchDevices()
      }
    } catch {
      // silently fail
    }
    setIsSyncing(false)
  }

  // Fetch route history for selected device
  const fetchRoute = useCallback(async (deviceId: string, period: string) => {
    setIsLoadingRoute(true)
    setSelectedTripId(null)
    try {
      let url = `/api/gps/route?deviceId=${encodeURIComponent(deviceId)}`
      if (period.startsWith('range:')) {
        const [, from, to] = period.split(':')
        url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      } else {
        url += `&period=${encodeURIComponent(period)}`
      }
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        console.log('[GPS] route API:', data.debug)
        const segments = Array.isArray(data.segments) ? data.segments : []
        setRouteSegments(segments)
        setRoutePositions(data.positions || segments.flat() || [])
        setTripHistory(Array.isArray(data.trips) ? data.trips : [])
        setTripSummary(data.summary || null)
      } else {
        setRoutePositions([])
        setRouteSegments([])
        setTripHistory([])
        setTripSummary(null)
      }
    } catch {
      setRoutePositions([])
      setRouteSegments([])
      setTripHistory([])
      setTripSummary(null)
    }
    setIsLoadingRoute(false)
  }, [])

  // When period or selected device changes, fetch route
  useEffect(() => {
    if (routePeriod && selectedDevice) {
      fetchRoute(selectedDevice.deviceId, routePeriod)
    } else {
      setRoutePositions([])
      setRouteSegments([])
      setTripHistory([])
      setTripSummary(null)
      setSelectedTripId(null)
    }
  }, [routePeriod, selectedDevice?.deviceId, fetchRoute])

  const mapSegments = useMemo(() => {
    if (!selectedTripId) return [] as typeof routeSegments
    const trip = tripHistory.find((t) => t.id === selectedTripId)
    if (!trip || trip.type !== 'trip' || trip.segmentIndex == null) return []
    const seg = routeSegments[trip.segmentIndex]
    return seg && seg.length >= 2 ? [seg] : []
  }, [selectedTripId, tripHistory, routeSegments])

  const mapPositions = useMemo(() => mapSegments.flat(), [mapSegments])

  const selectedTripInfo = useMemo(() => {
    if (!selectedTripId) return null
    const trip = tripHistory.find((t) => t.id === selectedTripId)
    if (!trip || trip.type !== 'trip') return null
    const tripStart = new Date(trip.startTime).getTime()
    const preceding = tripHistory.find((p) => {
      if (p.type !== 'parking') return false
      const end = new Date(p.endTime).getTime()
      return Math.abs(end - tripStart) < 10 * 60_000
    })
    return {
      type: 'trip' as const,
      startTime: trip.startTime,
      endTime: trip.endTime,
      durationSec: trip.durationSec,
      distanceMiles: trip.distanceMiles,
      avgSpeedMph: trip.avgSpeedMph,
      maxSpeedMph: trip.maxSpeedMph,
      address: trip.address,
      parkingEndedAt: preceding?.endTime ?? null,
      events: (trip.events || []).map((e) => ({
        label: e.label,
        detail: e.detail,
        eventTime: e.eventTime,
      })),
    }
  }, [selectedTripId, tripHistory])

  // Initial load
  useEffect(() => {
    if (status === 'authenticated') {
      fetchDevices()
    }
  }, [status, fetchDevices])

  // Poll for live positions
  useEffect(() => {
    if (!isLive) return
    fetchDevices()
    const interval = setInterval(fetchDevices, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isLive, fetchDevices])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unauthorized</h2>
          <p className="text-slate-500 mb-6">Please log in to access the GPS portal.</p>
          <button
            onClick={() => router.push('/property/login')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  const onlineCount = devices.filter((d) => d.status === 'online').length

  return (
    <div className="min-h-screen bg-slate-50 flex" data-gps-version="2">
      <PropertySidebar
        pathname={pathname}
        subtitle="GPS Tracking"
        userName={property ? `${property.firstName} ${property.lastName}` : ''}
        userEmail={property?.email || session?.user?.email || ''}
        userImage={(session?.user as any)?.image || null}
        onLogout={() => signOut({ callbackUrl: '/property/login' })}
      />
      <PropertyMobileMenu pathname={pathname} />

      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        } w-full`}
      >
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className={`px-4 lg:px-6 pt-16 lg:pt-6 pb-6 ${propertyMobileSafeLeftPad}`}>
            <div className="max-w-[1400px] mx-auto">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-brand-green mb-2">
                    Property Portal / GPS Tracking
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                    GPS Fleet Tracking
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    Last update: {lastRefresh.toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => setIsLive(!isLive)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isLive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isLive ? (
                      <>
                        <Activity className="w-3.5 h-3.5" /> LIVE
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Paused
                      </>
                    )}
                  </button>
                  <button
                    onClick={syncDevices}
                    disabled={isSyncing}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    title="Sync GPS devices"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-10">
          {/* Status Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-6">
            <StatusCard
              icon={Car}
              label="Total Devices"
              value={devices.length.toString()}
            />
            <StatusCard
              icon={Signal}
              label="Online"
              value={onlineCount.toString()}
            />
            <StatusCard
              icon={WifiOff}
              label="Offline"
              value={(devices.length - onlineCount).toString()}
            />
            <StatusCard
              icon={Satellite}
              label="Avg Satellites"
              value={
                devices.length > 0
                  ? Math.round(
                      devices.reduce((s, d) => s + d.satelliteCount, 0) / devices.length
                    ).toString()
                  : '0'
              }
            />
            <StatusCard
              icon={Gauge}
              label="Moving"
              value={devices.filter((d) => d.speed > 3 && d.status === 'online').length.toString()}
            />
            <StatusCard
              icon={HardDrive}
              label="GPS"
              value={gpsConnected ? 'Connected' : 'Offline'}
              compact
            />
          </div>

          {/* Map + Device List */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Map */}
            <div className="lg:flex-[2] min-h-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden h-full flex flex-col"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 shrink-0">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-brand-green" />
                    Live Map
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => locateVehicle()}
                      disabled={devices.length === 0}
                      title="Locate vehicle on map"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-brand-green/40 hover:text-brand-green disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <LocateFixed className="w-3.5 h-3.5" />
                      Locate
                    </button>
                    {/* Compact history dropdown on map */}
                    <div className="relative">
                      <select
                        value={
                          routePeriod?.startsWith('range:')
                            ? 'custom'
                            : routePeriod || ''
                        }
                        disabled={!selectedDevice || isLoadingRoute}
                        onChange={(e) => {
                          const v = e.target.value
                          if (!v) setRoutePeriod(null)
                          else if (v === 'custom') {
                            // Keep custom if already set; otherwise open sidebar selection
                            if (!routePeriod?.startsWith('range:')) setRoutePeriod(null)
                          } else setRoutePeriod(v)
                        }}
                        className={`appearance-none pl-2.5 pr-7 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-white ${
                          routePeriod
                            ? 'border-brand-green/40 text-brand-green'
                            : 'border-slate-200 text-slate-600'
                        } ${!selectedDevice ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} focus:outline-none focus:ring-1 focus:ring-brand-green`}
                        title="Trip history"
                      >
                        <option value="">History: Off</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">Last 7 days</option>
                        {routePeriod?.startsWith('range:') && (
                          <option value="custom">
                            Custom: {routePeriod.split(':').slice(1).join(' → ')}
                          </option>
                        )}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      {isLoadingRoute && routePeriod && (
                        <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-green animate-spin" />
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {devices.length} device{devices.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-h-[500px]">
                  <GpsLiveMap
                    devices={devices}
                    selectedDevice={selectedDevice}
                    onSelectDevice={setSelectedDevice}
                    routePositions={mapPositions.length > 0 ? mapPositions : undefined}
                    routeSegments={mapSegments.length > 0 ? mapSegments : undefined}
                    locateTick={locateTick}
                    selectedTrip={selectedTripInfo}
                    playTick={playTick}
                  />
                </div>
              </motion.div>
            </div>

            {/* Device List */}
            <div className="lg:flex-1 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <CarFront className="w-4 h-4 text-brand-green" />
                    Vehicles & Devices
                  </h2>
                </div>
                <div className="divide-y divide-slate-50 max-h-[468px] overflow-y-auto">
                  {devices.map((device) => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      isSelected={selectedDevice?.id === device.id}
                      onClick={() => setSelectedDevice(selectedDevice?.id === device.id ? null : device)}
                    />
                  ))}
                </div>
              </motion.div>

              {selectedDevice && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden"
                >
                  <DeviceTelemetry
                    key={selectedDevice.id}
                    device={selectedDevice}
                    routePeriod={routePeriod}
                    routeSegments={routeSegments}
                    isLoadingRoute={isLoadingRoute}
                    onSelectHistory={(period) => setRoutePeriod(period)}
                    tripHistory={tripHistory}
                    tripSummary={tripSummary}
                    selectedTripId={selectedTripId}
                    onSelectTrip={setSelectedTripId}
                    onPlayTrip={(id) => {
                      setSelectedTripId(id)
                      setPlayTick((n) => n + 1)
                    }}
                    canRename={canRenameGps}
                    onRename={(name) => renameDevice(selectedDevice, name)}
                  />
                </motion.div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Status Card sub-component
function StatusCard({
  icon: Icon,
  label,
  value,
  compact,
}: {
  icon: typeof Car
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-4 sm:p-5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-4" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={`leading-none font-black tracking-tight text-slate-900 mb-0.5 ${compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}>{value}</p>
        </div>
        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-brand-green/10 rounded-xl border border-brand-green/10 flex items-center justify-center shadow-sm flex-shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green" />
        </div>
      </div>
    </motion.div>
  )
}

// Device Card sub-component
function DeviceCard({
  device,
  isSelected,
  onClick,
}: {
  device: VehicleDevice
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
        isSelected ? 'bg-brand-green/5 border-l-2 border-brand-green' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-9 h-9 flex-shrink-0 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-white shadow-sm"
            style={{
              border: `2px solid ${
                device.status === 'online'
                  ? '#8CB63C'
                  : device.status === 'idle'
                    ? '#f59e0b'
                    : '#94a3b8'
              }`,
            }}
          />
          <img
            src="/vehicle-marker.png"
            alt=""
            className="relative z-[1] w-7 h-7 object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{device.vehicleName || 'Unnamed Vehicle'}</p>
          {device.location && (
            <p className="text-xs text-slate-600 truncate flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {device.location}
            </p>
          )}
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {device.vehiclePlate ? `${device.vehiclePlate} · ` : ''}{device.deviceId}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
              device.status === 'online'
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {device.status === 'online'
              ? device.speed > 3
                ? 'LIVE'
                : 'Online'
              : 'Offline'}
          </span>
          <span className="text-xs text-slate-400">
            {device.speed > 0 ? `${device.speed.toFixed(0)} mph` : ''}
          </span>
        </div>
      </div>
    </motion.button>
  )
}

function formatGsmSignal(dbm?: number | null): { label: string; detail: string } {
  if (dbm == null || !Number.isFinite(dbm)) return { label: '--', detail: '' }
  // Typical GSM RSSI bands (dBm)
  let quality = 'Poor'
  if (dbm >= -70) quality = 'Excellent'
  else if (dbm >= -85) quality = 'Good'
  else if (dbm >= -100) quality = 'Fair'
  return { label: quality, detail: `${dbm} dBm` }
}

// Device Telemetry sub-component
function DeviceTelemetry({
  device,
  routePeriod,
  routeSegments,
  isLoadingRoute,
  onSelectHistory,
  tripHistory,
  tripSummary,
  selectedTripId,
  onSelectTrip,
  onPlayTrip,
  canRename,
  onRename,
}: {
  device: VehicleDevice
  routePeriod: string | null
  routeSegments: RoutePoint[][]
  isLoadingRoute: boolean
  onSelectHistory: (period: string | null) => void
  tripHistory: TripHistoryRow[]
  tripSummary: { tripCount: number; parkingCount: number; totalMiles: number } | null
  selectedTripId: string | null
  onSelectTrip: (id: string | null) => void
  onPlayTrip?: (id: string) => void
  canRename?: boolean
  onRename?: (name: string) => Promise<boolean>
}) {
  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const [showCalendar, setShowCalendar] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(device.vehicleName || '')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [isSavingName, setIsSavingName] = useState(false)

  useEffect(() => {
    setNameDraft(device.vehicleName || '')
    setEditingName(false)
    setRenameError(null)
  }, [device.id, device.vehicleName])

  // When Trip History is opened, auto-load Today (date tabs + trips)
  useEffect(() => {
    if (!historyOpen) return
    if (!routePeriod) {
      onSelectTrip(null)
      onSelectHistory('today')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyOpen])

  useEffect(() => {
    if (routePeriod?.startsWith('range:')) {
      const [, f, t] = routePeriod.split(':')
      setCustomFrom(f || '')
      setCustomTo(t || '')
      if (f && t && f !== t) setShowCalendar(true)
    }
  }, [routePeriod])

  const items = [
    { icon: Gauge, label: 'Speed', value: device.speed.toFixed(0) + ' mph' },
    { icon: Navigation, label: 'Heading', value: device.heading.toFixed(0) + '\u00B0' },
    { icon: Satellite, label: 'Satellites', value: device.satelliteCount.toString() },
    { icon: Signal, label: 'Signal', value: device.signalStrength + '%' },
  ]

  const events = device.recentEvents || []
  const harshCount = events.filter(function(e) { return e.icon === 'harsh' }).length
  const crashCount = events.filter(function(e) { return e.icon === 'crash' }).length
  const speedCount = events.filter(function(e) { return e.icon === 'speed' }).length

  function applyCustomRange() {
    if (!customFrom || !customTo) {
      setRangeError('Pick a start and end date')
      return
    }
    if (customFrom > customTo) {
      setRangeError('Start date must be before end date')
      return
    }
    const fromMs = Date.parse(customFrom + 'T00:00:00')
    const toMs = Date.parse(customTo + 'T00:00:00')
    const days = Math.floor((toMs - fromMs) / 86_400_000) + 1
    if (days > 31) {
      setRangeError('Max range is 31 days')
      return
    }
    setRangeError(null)
    setShowCalendar(false)
    onSelectTrip(null)
    onSelectHistory(`range:${customFrom}:${customTo}`)
  }

  async function saveName() {
    if (!onRename) return
    setIsSavingName(true)
    setRenameError(null)
    try {
      await onRename(nameDraft)
      setEditingName(false)
    } catch (e: any) {
      setRenameError(e?.message || 'Failed to rename')
    }
    setIsSavingName(false)
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={'w-2 h-2 rounded-full ' + (
          device.status === 'online' ? 'bg-green-500' : 'bg-slate-300'
        )} />
        {editingName ? (
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <input
              autoFocus
              value={nameDraft}
              maxLength={80}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') {
                  setEditingName(false)
                  setNameDraft(device.vehicleName || '')
                  setRenameError(null)
                }
              }}
              className="flex-1 min-w-0 rounded-md border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-green"
              placeholder="GPS display name"
            />
            <button
              type="button"
              disabled={isSavingName || !nameDraft.trim()}
              onClick={saveName}
              className="p-1.5 rounded-md text-brand-green hover:bg-brand-green/10 disabled:opacity-40"
              title="Save name"
            >
              {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              disabled={isSavingName}
              onClick={() => {
                setEditingName(false)
                setNameDraft(device.vehicleName || '')
                setRenameError(null)
              }}
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-slate-900 text-sm flex-1 min-w-0 truncate">
              {device.vehicleName || 'Unnamed Vehicle'}
            </h3>
            {canRename && (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(device.vehicleName || '')
                  setEditingName(true)
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 hover:text-brand-green hover:border-brand-green/40 transition-colors shrink-0"
                title="Rename GPS device"
              >
                <Pencil className="w-3 h-3" />
                Rename
              </button>
            )}
          </>
        )}
      </div>
      {renameError && (
        <p className="mb-2 text-[10px] text-amber-600">{renameError}</p>
      )}

      {/* When Trip History is open, hide vehicle details so the feed has room */}
      {!historyOpen && device.location && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-slate-50 rounded-lg">
          <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
          <p className="text-xs text-slate-500 truncate">{device.location}</p>
        </div>
      )}

      {!historyOpen && (
      <>
      {/* Key Telemetry */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {items.map(function(item) {
          return (
            <div key={item.label} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
              <item.icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-sm font-semibold text-slate-900">{item.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Vehicle Vitals (includes former Diagnostics fields) */}
      <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Vehicle Vitals</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <div>
              <p className="text-[10px] text-slate-400">Ignition</p>
              <p className={`text-sm font-bold ${
                device.obdii?.ignitionOn == null
                  ? 'text-slate-300'
                  : device.obdii.ignitionOn
                    ? 'text-brand-green'
                    : 'text-slate-700'
              }`}>
                {device.obdii?.ignitionOn == null ? '--' : device.obdii.ignitionOn ? 'On' : 'Off'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <div>
              <p className="text-[10px] text-slate-400">Power</p>
              <p className={`text-sm font-bold ${
                device.obdii?.externalPowerConnected == null
                  ? 'text-slate-300'
                  : device.obdii.externalPowerConnected
                    ? 'text-brand-green'
                    : 'text-red-600'
              }`}>
                {device.obdii?.externalPowerConnected == null
                  ? '--'
                  : device.obdii.externalPowerConnected
                    ? 'Connected'
                    : 'Cut'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <Signal className="w-4 h-4 text-sky-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">GSM</p>
              {(() => {
                const gsm = formatGsmSignal(device.obdii?.gsmSignalDbm)
                return (
                  <>
                    <p className="text-sm font-bold text-slate-900 leading-tight">{gsm.label}</p>
                    {gsm.detail ? (
                      <p className="text-[10px] text-slate-400 tabular-nums">{gsm.detail}</p>
                    ) : null}
                  </>
                )
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <Fuel className="w-4 h-4 text-brand-green flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400">Fuel</p>
              <p className="text-sm font-bold text-slate-900">{device.fuelLevel != null ? device.fuelLevel.toFixed(0) + '%' : '--'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <Battery className="w-4 h-4 text-brand-green flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400">Battery</p>
              <p className="text-sm font-bold text-slate-900">{device.batteryVoltage != null ? device.batteryVoltage.toFixed(1) + 'V' : '--'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <Battery className={`w-4 h-4 flex-shrink-0 ${
              device.obdii?.backupBatteryVoltage != null && device.obdii.backupBatteryVoltage <= 0
                ? 'text-red-500'
                : 'text-amber-500'
            }`} />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">Backup Batt</p>
              <p className={`text-sm font-bold leading-tight ${
                device.obdii?.backupBatteryVoltage != null && device.obdii.backupBatteryVoltage <= 0
                  ? 'text-red-600'
                  : 'text-slate-900'
              }`}>
                {device.obdii?.backupBatteryVoltage != null
                  ? `${device.obdii.backupBatteryVoltage.toFixed(1)}V`
                  : '--'}
              </p>
              {device.obdii?.batteryCharging != null ? (
                <p className="text-[10px] text-slate-400">
                  {device.obdii.batteryCharging ? 'Charging' : 'Not charging'}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <Thermometer className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400">Temp</p>
              <p className="text-sm font-bold text-slate-900">{device.engineTemp != null ? device.engineTemp.toFixed(0) + '\u00B0F' : '--'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <RotateCcw className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400">Odometer</p>
              <p className="text-sm font-bold text-slate-900">
                {device.odometer != null && device.odometer > 0
                  ? device.odometer.toLocaleString() + ' mi'
                  : device.obdii?.totalDistance != null && device.obdii.totalDistance > 0
                    ? device.obdii.totalDistance.toLocaleString() + ' mi'
                    : '--'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <Gauge className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400">RPM</p>
              <p className="text-sm font-bold text-slate-900">{device.obdii?.rpm != null ? device.obdii.rpm.toLocaleString() : '--'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <Gauge className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400">OBD Speed</p>
              <p className="text-sm font-bold text-slate-900">{device.obdii?.obdSpeed != null ? device.obdii.obdSpeed + ' mph' : '--'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
              device.obdii?.milOn ? 'text-amber-500' : 'text-slate-300'
            }`} />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">Check Engine</p>
              <p className={`text-sm font-bold leading-tight ${
                device.obdii?.milOn == null
                  ? 'text-slate-300'
                  : device.obdii.milOn
                    ? 'text-amber-600'
                    : 'text-slate-700'
              }`}>
                {device.obdii?.milOn == null ? '--' : device.obdii.milOn ? 'On' : 'Off'}
              </p>
              {device.obdii?.milOn && device.obdii.milMileageMi != null ? (
                <p className="text-[10px] text-slate-400 tabular-nums">
                  {device.obdii.milMileageMi.toLocaleString()} mi since on
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <div>
              <p className="text-[10px] text-slate-400">OBD Link</p>
              <p className={`text-sm font-bold ${
                device.obdii?.obdConnected == null
                  ? 'text-slate-300'
                  : device.obdii.obdConnected
                    ? 'text-brand-green'
                    : 'text-red-600'
              }`}>
                {device.obdii?.obdConnected == null
                  ? '--'
                  : device.obdii.obdConnected
                    ? 'Connected'
                    : 'Disconnected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <div>
              <p className="text-[10px] text-slate-400">Throttle</p>
              <p className="text-sm font-bold text-slate-900">
                {device.obdii?.throttlePercent != null ? `${device.obdii.throttlePercent}%` : '--'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
            <div>
              <p className="text-[10px] text-slate-400">Engine Load</p>
              <p className="text-sm font-bold text-slate-900">
                {device.obdii?.engineLoadPercent != null ? `${device.obdii.engineLoadPercent}%` : '--'}
              </p>
            </div>
          </div>
          <div className="p-2 bg-white rounded-lg">
            <p className="text-[10px] text-slate-400">DTC</p>
            {device.obdii?.dtcCodes && device.obdii.dtcCodes.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {device.obdii.dtcCodes.map(function (code: string, idx: number) {
                  const label = typeof code === 'string' ? code : String((code as any)?.code || code || '')
                  if (!label || label === '[object Object]') return null
                  return (
                    <span key={`${label}-${idx}`} className="text-xs font-mono bg-red-50 text-red-600 border border-red-100 rounded px-1.5 py-0.5">
                      {label}
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-300">None</p>
            )}
            {device.obdii?.dtcClearedMileageMi != null ? (
              <p className="text-[10px] text-slate-400 tabular-nums mt-1 leading-snug">
                {device.obdii.dtcClearedMileageMi.toLocaleString()} mi since cleared
              </p>
            ) : null}
          </div>
          <div className="col-span-3 p-2 bg-white rounded-lg">
            <p className="text-[10px] text-slate-400">VIN</p>
            <p className="text-xs font-mono font-semibold text-slate-700 truncate">{device.obdii?.vin || '--'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200">
          <Clock className="w-3 h-3 text-slate-400" />
          <p className="text-xs text-slate-500">Last seen: {formatTimeAgo(device.lastSeen)}</p>
        </div>
      </div>

      {/* Today's Driving Summary — show if we have any distance data */}
      {device.todaySummary && device.todaySummary.distance > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-r from-brand-green/5 to-emerald-50 rounded-xl border border-brand-green/10">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-brand-green" />
            <p className="text-xs font-semibold text-slate-700">Today's Driving</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{device.todaySummary.distance}</p>
              <p className="text-[10px] text-slate-400">miles</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{device.todaySummary.drivingTime !== '0s' ? device.todaySummary.drivingTime : '--'}</p>
              <p className="text-[10px] text-slate-400">driving</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{device.todaySummary.maxSpeed > 0 ? device.todaySummary.maxSpeed : '--'}</p>
              <p className="text-[10px] text-slate-400">max mph</p>
            </div>
          </div>
        </div>
      )}

      {/* Driving Behavior — from Queclink GTCRA / GTHBM / GTSPD (last 7 days) */}
      <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs font-semibold text-slate-700">Driving Behavior</p>
          </div>
          <p className="text-[10px] text-slate-400">Last 7 days</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-1.5 rounded-lg bg-red-50">
            <p className="text-base font-bold text-red-600">{crashCount}</p>
            <p className="text-[10px] text-red-400">crashes</p>
          </div>
          <div className="text-center p-1.5 rounded-lg bg-amber-50">
            <p className="text-base font-bold text-amber-600">{harshCount}</p>
            <p className="text-[10px] text-amber-400">harsh</p>
          </div>
          <div className="text-center p-1.5 rounded-lg bg-orange-50">
            <p className="text-base font-bold text-orange-600">{speedCount}</p>
            <p className="text-[10px] text-orange-400">speeding</p>
          </div>
        </div>
      </div>

      </>
      )}

      <GpsTripHistory
        open={historyOpen}
        onToggle={() => setHistoryOpen((o) => !o)}
        routePeriod={routePeriod}
        isLoading={isLoadingRoute}
        tripHistory={tripHistory}
        tripSummary={tripSummary}
        selectedTripId={selectedTripId}
        onSelectTrip={onSelectTrip}
        onPlayTrip={onPlayTrip}
        onSelectPeriod={(period) => {
          setShowCalendar(false)
          onSelectHistory(period)
        }}
        routeSegments={routeSegments}
        showCalendar={showCalendar}
        onToggleCalendar={() => setShowCalendar((v) => !v)}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={(v) => {
          setCustomFrom(v)
          setRangeError(null)
        }}
        onCustomTo={(v) => {
          setCustomTo(v)
          setRangeError(null)
        }}
        onApplyCustom={applyCustomRange}
        rangeError={rangeError}
        todayStr={todayStr}
      />

      {/* Alerts — collapsed by default; expand on click */}
      {!historyOpen && (() => {
        const alerts = events.filter(function(e) { return e.severity === 'critical' || e.severity === 'warning' })
        if (alerts.length === 0) return null
        return (
          <div className="rounded-xl border border-red-100 bg-red-50/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setAlertsOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <p className="text-xs font-semibold text-red-700">Alerts ({alerts.length})</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-red-400 transition-transform ${alertsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {alertsOpen && (
              <div className="px-3 pb-3 space-y-1 border-t border-red-100 pt-2">
                {alerts.slice(0, 5).map(function(event) {
                  return (
                    <div key={event.id} className="flex items-center justify-between p-1.5 bg-white rounded-lg text-xs">
                      <span className="font-semibold text-slate-800">{event.label}</span>
                      <span className="text-[10px] text-slate-400">{formatTimeAgo(event.eventTime)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return seconds + 's ago'
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago'
  return Math.floor(seconds / 86400) + 'd ago'
}
