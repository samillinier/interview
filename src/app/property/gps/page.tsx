'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
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
  Pause,
  Activity,
  Shield,
  Milestone,
  MapPin,
  Cog,
  ChevronDown,
  LocateFixed,
  Pencil,
  Check,
  X,
  Search,
  RotateCcw,
} from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'
import { PropertySidebar } from '@/components/PropertySidebar'
import { PropertyPageHeader, PropertyMetricCards } from '@/components/PropertyPageHeader'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { propertyMobileSafeLeftPad } from '@/lib/propertyMobileLayout'
import { openDrivingDirections } from '@/lib/maps'
import type { VehicleDevice } from '@/components/GpsLiveMap'
import type { TripHistoryRow } from '@/components/GpsTripHistory'
import { findGpsDeviceForFleet } from '@/lib/gpsFleetMatch'

type RoutePoint = { latitude: number; longitude: number; speed?: number; time?: string }

const GpsLiveMap = dynamic(() => import('@/components/GpsLiveMap').then((mod) => mod.GpsLiveMap), {
  ssr: false,
  loading: () => <div className="h-full w-full min-h-[500px] bg-slate-100 animate-pulse flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>,
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

const POLL_INTERVAL_MS = 30000 // 30 seconds between GPS position polls

function GPSPageInner() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { sidebarOpen } = useSidebarOpen()
  const focusedFromFleetRef = useRef(false)

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
  const [tripSummary, setTripSummary] = useState<{
    tripCount: number
    parkingCount: number
    totalMiles: number
    crashCount?: number
  } | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [playTick, setPlayTick] = useState(0)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [locateTick, setLocateTick] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  // Prefer role — isAdmin was missing from session for some logins
  const sessionRole = String((session?.user as any)?.role || '').toUpperCase()
  const sessionUserType = String((session?.user as any)?.userType || '').toUpperCase()
  const canRenameGps =
    (session?.user as any)?.isAdmin === true ||
    sessionRole === 'ADMIN' ||
    sessionRole === 'SUPER_ADMIN' ||
    sessionUserType === 'ADMIN' ||
    sessionUserType === 'SUPER_ADMIN'

  function locateVehicle(device?: VehicleDevice | null, opts?: { drive?: boolean }) {
    const target = device || selectedDevice || devices[0]
    if (!target) return
    if (!selectedDevice || selectedDevice.id !== target.id) {
      setSelectedDevice(target)
    }
    // Exit history so the map focuses on the live car
    if (routePeriod) setRoutePeriod(null)
    setLocateTick((n) => n + 1)

    // Drive there: open Apple/Google Maps turn-by-turn to the vehicle
    if (opts?.drive) {
      openDrivingDirections(
        target.latitude,
        target.longitude,
        target.vehicleName || 'Vehicle'
      )
    }
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

  async function resetDeviceTelemetry(device: VehicleDevice) {
    const ok = window.confirm(
      'Reset motor hours and mileage for this GPS unit? Use this after moving the tracker to a new vehicle. Live readings (VIN, fuel, RPM) will still come from the truck currently plugged in.'
    )
    if (!ok) return false
    const res = await fetch('/api/gps/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.deviceId, action: 'resetTelemetry' }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to reset telemetry')
    }
    await fetchDevices()
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
      const role = String((session?.user as any)?.role || '').toUpperCase()
      if (role === 'ACCOUNTING') {
        router.push('/dashboard')
        return
      }
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
      const nextDevices: VehicleDevice[] = data.devices || []
      setDevices(nextDevices)
      setSelectedDevice((prev) => {
        if (!prev) return prev
        return nextDevices.find((d) => d.id === prev.id) || prev
      })
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
        icon: e.icon,
      })),
    }
  }, [selectedTripId, tripHistory])

  // Open the matching tracker when arriving from Fleet → Track this vehicle
  useEffect(() => {
    if (focusedFromFleetRef.current || devices.length === 0) return
    const vehicleId = searchParams.get('vehicle')
    const vin = searchParams.get('vin')
    const plate = searchParams.get('plate')
    const name = searchParams.get('name')
    if (!vehicleId && !vin && !plate && !name) return

    const match = findGpsDeviceForFleet(devices, { vehicleId, vin, plate, name })
    focusedFromFleetRef.current = true
    if (match) {
      setSelectedDevice(match)
      setLocateTick((n) => n + 1)
      return
    }
    setSearchQuery(plate || name || vin || '')
  }, [devices, searchParams])

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
    const interval = setInterval(() => {
      // Skip polling when the tab is hidden so an open map doesn't keep the DB warm.
      if (document.visibilityState === 'visible') fetchDevices()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isLive, fetchDevices])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unauthorized</h2>
          <p className="text-slate-500 mb-6">Please log in to access the GPS portal.</p>
          <button
            onClick={() => router.push('/property/login')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  const onlineCount = devices.filter((d) => d.status === 'online').length
  const movingCount = devices.filter((d) => d.speed > 3 && d.status === 'online').length
  const query = searchQuery.trim().toLowerCase()
  const filteredDevices = query
    ? devices.filter((d) =>
        [d.vehicleName, d.vehiclePlate, d.deviceId, d.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
    : devices

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
        <div className={`p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 ${propertyMobileSafeLeftPad}`}>
        <div className="max-w-[1550px] mx-auto space-y-8">
        <PropertyPageHeader
          variant="banner"
          title="GPS Fleet Tracking"
          subtitle="Live map, device status, and trip history."
          stats={[
            { icon: Car, text: `${devices.length} device${devices.length === 1 ? '' : 's'}` },
            { icon: Signal, text: `${onlineCount} online` },
            ...(devices.length - onlineCount > 0
              ? [{ icon: WifiOff, text: `${devices.length - onlineCount} offline` }]
              : []),
            ...(movingCount > 0 ? [{ icon: Gauge, text: `${movingCount} moving` }] : []),
            ...(gpsConnected ? [{ icon: Activity, text: 'GPS connected' }] : [{ icon: WifiOff, text: 'GPS offline' }]),
          ]}
          actions={
            <>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vehicles…"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-white/30 bg-white/15 text-sm font-medium text-white placeholder:text-white/60 focus:border-white focus:ring-2 focus:ring-white/30 outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setIsLive(!isLive)}
                className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20"
              >
                {isLive ? <Activity className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                {isLive ? 'LIVE' : 'Paused'}
              </button>
              <button
                type="button"
                onClick={syncDevices}
                disabled={isSyncing}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/30 bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-all disabled:opacity-50"
                title="Sync GPS devices"
              >
                {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                Sync
              </button>
            </>
          }
        />

        <main>
          <PropertyMetricCards
            cards={[
              { label: 'Devices', value: devices.length, desc: 'Tracked GPS units', icon: Car },
              { label: 'Online', value: onlineCount, desc: 'Reporting live', icon: Signal },
              { label: 'Offline', value: devices.length - onlineCount, desc: 'Not currently reporting', icon: WifiOff },
              { label: 'Moving', value: movingCount, desc: 'On the road now', icon: Gauge },
            ]}
          />

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Live Map</h2>
                  <p className="text-xs text-slate-400">
                    Last update {lastRefresh.toLocaleTimeString()} · {filteredDevices.length} vehicle{filteredDevices.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => locateVehicle(undefined, { drive: false })}
                  disabled={devices.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-brand-green/40 hover:text-brand-green disabled:opacity-40"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  Locate
                </button>
                <button
                  type="button"
                  onClick={() => locateVehicle(undefined, { drive: true })}
                  disabled={devices.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-brand-green text-white shadow-lg shadow-brand-green/20 hover:bg-brand-green-dark disabled:opacity-40"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Drive there
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 min-h-[520px] border-b border-slate-100 lg:border-b-0 lg:border-r">
                <GpsLiveMap
                  devices={filteredDevices}
                  selectedDevice={selectedDevice}
                  onSelectDevice={setSelectedDevice}
                  routePositions={mapPositions.length > 0 ? mapPositions : undefined}
                  routeSegments={mapSegments.length > 0 ? mapSegments : undefined}
                  locateTick={locateTick}
                  selectedTrip={selectedTripInfo}
                  playTick={playTick}
                />
              </div>

              <div className="flex flex-col min-h-0">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Vehicles & devices</h3>
                  <p className="text-xs text-slate-400">
                    {filteredDevices.length} shown{query ? ` for “${searchQuery}”` : ''}
                  </p>
                </div>
                <div className="divide-y divide-slate-100 max-h-[280px] lg:max-h-[360px] overflow-y-auto">
                  {filteredDevices.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-sm font-semibold text-slate-700">No matching vehicles</p>
                      <p className="mt-1 text-xs text-slate-400">Try another search.</p>
                    </div>
                  ) : (
                    filteredDevices.map((device) => (
                      <DeviceCard
                        key={device.id}
                        device={device}
                        isSelected={selectedDevice?.id === device.id}
                        onClick={() => setSelectedDevice(selectedDevice?.id === device.id ? null : device)}
                      />
                    ))
                  )}
                </div>
                {selectedDevice ? (
                  <div className="border-t border-slate-100">
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
                      canReset={canRenameGps}
                      onReset={() => resetDeviceTelemetry(selectedDevice)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.section>
        </main>
        </div>
        </div>
      </div>
    </div>
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
            {device.deviceId}
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
  canReset,
  onReset,
}: {
  device: VehicleDevice
  routePeriod: string | null
  routeSegments: RoutePoint[][]
  isLoadingRoute: boolean
  onSelectHistory: (period: string | null) => void
  tripHistory: TripHistoryRow[]
  tripSummary: { tripCount: number; parkingCount: number; totalMiles: number; crashCount?: number } | null
  selectedTripId: string | null
  onSelectTrip: (id: string | null) => void
  onPlayTrip?: (id: string) => void
  canRename?: boolean
  onRename?: (name: string) => Promise<boolean>
  canReset?: boolean
  onReset?: () => Promise<boolean>
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
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

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
      <div className="flex items-start gap-3 mb-3">
        {device.vehiclePhotoUrl ? (
          <div className="w-[5.75rem] h-[4.25rem] rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
            <img
              src={device.vehiclePhotoUrl}
              alt={device.vehicleName || 'Vehicle'}
              className="w-full h-full object-contain"
            />
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <div className={'w-2 h-2 rounded-full shrink-0 ' + (
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
            <div className="flex items-center gap-1.5 shrink-0">
              {canReset && onReset && (
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={async () => {
                    setResetError(null)
                    setIsResetting(true)
                    try {
                      await onReset()
                    } catch (e: any) {
                      setResetError(e?.message || 'Failed to reset')
                    } finally {
                      setIsResetting(false)
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 hover:text-brand-green hover:border-brand-green/40 transition-colors disabled:opacity-50"
                  title="Reset motor hours and mileage after moving this tracker to a new vehicle"
                >
                  {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  Reset
                </button>
              )}
              {canRename && (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(device.vehicleName || '')
                    setEditingName(true)
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 hover:text-brand-green hover:border-brand-green/40 transition-colors"
                  title="Rename GPS device"
                >
                  <Pencil className="w-3 h-3" />
                  Rename
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {renameError && (
        <p className="mt-1 text-[10px] text-amber-600">{renameError}</p>
      )}
      {resetError && (
        <p className="mt-1 text-[10px] text-amber-600">{resetError}</p>
      )}
        </div>
      </div>

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
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">Vehicle Vitals</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
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
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
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
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <Signal className="w-4 h-4 text-sky-500 mb-0.5" />
            <p className="text-[10px] text-slate-400">GSM</p>
            {(() => {
              const gsm = formatGsmSignal(device.obdii?.gsmSignalDbm)
              return (
                <>
                  <p className="text-sm font-bold text-slate-900 leading-tight">{gsm.label}</p>
                  {gsm.detail ? (
                    <p className="text-[8px] text-slate-400 tabular-nums leading-tight">{gsm.detail}</p>
                  ) : null}
                </>
              )
            })()}
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <Fuel className="w-4 h-4 text-brand-green mb-0.5" />
            <p className="text-[10px] text-slate-400">Fuel</p>
            <p className="text-sm font-bold text-slate-900">{device.fuelLevel != null ? device.fuelLevel.toFixed(0) + '%' : '--'}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <Battery className="w-4 h-4 text-brand-green mb-0.5" />
            <p className="text-[10px] text-slate-400">Battery</p>
            <p className="text-sm font-bold text-slate-900">{device.batteryVoltage != null ? device.batteryVoltage.toFixed(1) + 'V' : '--'}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <Clock className="w-4 h-4 text-violet-500 mb-0.5" />
            <p className="text-[10px] text-slate-400">Motor Hours</p>
            <p className="text-sm font-bold text-slate-900 leading-tight">
              {device.obdii?.motorHours != null
                ? (() => {
                    const h = device.obdii.motorHours
                    if (h < 1) return `${Math.round(h * 60)} min`
                    const hrs = Math.floor(h)
                    const mins = Math.round((h - hrs) * 60)
                    if (mins === 0) return `${hrs}h`
                    if (h < 100) return `${hrs}h ${mins}m`
                    return `${h.toFixed(1)} h`
                  })()
                : '--'}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <Thermometer className="w-4 h-4 text-red-400 mb-0.5" />
            <p className="text-[10px] text-slate-400">Temp</p>
            <p className="text-sm font-bold text-slate-900">{device.engineTemp != null ? device.engineTemp.toFixed(0) + '\u00B0F' : '--'}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <Milestone className="w-4 h-4 text-teal-500 mb-0.5" />
            <p className="text-[10px] text-slate-400">Mileage</p>
            <p className="text-sm font-bold text-slate-900">
              {device.odometer != null && device.odometer > 0
                ? device.odometer.toLocaleString() + ' mi'
                : device.obdii?.totalDistance != null && device.obdii.totalDistance > 0
                  ? device.obdii.totalDistance.toLocaleString() + ' mi'
                  : '--'}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <Gauge className="w-4 h-4 text-indigo-400 mb-0.5" />
            <p className="text-[10px] text-slate-400">RPM</p>
            <p className="text-sm font-bold text-slate-900">{device.obdii?.rpm != null ? device.obdii.rpm.toLocaleString() : '--'}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <Gauge className="w-4 h-4 text-indigo-400 mb-0.5" />
            <p className="text-[10px] text-slate-400">OBD Speed</p>
            <p className="text-sm font-bold text-slate-900">{device.obdii?.obdSpeed != null ? device.obdii.obdSpeed + ' mph' : '--'}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <Cog className={`w-4 h-4 mb-0.5 ${
              device.obdii?.milOn ? 'text-amber-500' : 'text-slate-300'
            }`} />
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
              <p className="text-[8px] text-slate-400 tabular-nums leading-tight">
                {device.obdii.milMileageMi.toLocaleString()} mi since on
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
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
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <p className="text-[10px] text-slate-400">Throttle</p>
            <p className="text-sm font-bold text-slate-900">
              {device.obdii?.throttlePercent != null ? `${device.obdii.throttlePercent}%` : '--'}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <p className="text-[10px] text-slate-400">Engine Load</p>
            <p className="text-sm font-bold text-slate-900">
              {device.obdii?.engineLoadPercent != null ? `${device.obdii.engineLoadPercent}%` : '--'}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
            <p className="text-[10px] text-slate-400">DTC</p>
            {device.obdii?.dtcCodes && device.obdii.dtcCodes.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1 mt-0.5">
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
              <p className="text-[8px] text-slate-400 tabular-nums mt-1 leading-snug">
                {device.obdii.dtcClearedMileageMi.toLocaleString()} mi since cleared
              </p>
            ) : null}
          </div>
          <div className="col-span-3 grid grid-cols-3 gap-2">
            <div className="col-span-2 flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg min-w-0">
              <p className="text-[10px] text-slate-400">VIN</p>
              <p className="text-xs font-mono font-semibold text-slate-700 truncate max-w-full">
                {device.obdii?.vin || '--'}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg">
              <p className="text-[10px] text-slate-400">Economy</p>
              {device.obdii?.fuelConsumptionLPer100km != null ? (
                <p className="text-sm font-bold text-slate-900 leading-tight">
                  {(235.215 / device.obdii.fuelConsumptionLPer100km).toFixed(1)}
                  <span className="text-[10px] font-semibold text-slate-500"> mpg</span>
                </p>
              ) : (
                <p className="text-sm font-bold text-slate-300">--</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-slate-200">
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
        const alerts = events.filter(function(e) {
          return e.severity === 'critical' || e.severity === 'warning'
        })
        if (alerts.length === 0) return null
        // Newest first list, but always keep crashes visible (they can be older)
        const byId = new Map<number | string, (typeof alerts)[number]>()
        for (const e of alerts.slice(0, 12)) byId.set(e.id, e)
        for (const e of alerts) {
          if (e.icon === 'crash') byId.set(e.id, e)
        }
        const shown = Array.from(byId.values()).sort(function(a, b) {
          return new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()
        })
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
                {shown.map(function(event) {
                  return (
                    <div key={event.id} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg text-xs">
                      <div className="min-w-0">
                        <span className={`font-semibold ${event.icon === 'crash' ? 'text-red-600' : 'text-slate-800'}`}>
                          {event.label}
                        </span>
                        {event.detail ? (
                          <p className="text-[10px] text-slate-400 truncate">{event.detail}</p>
                        ) : null}
                      </div>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{formatTimeAgo(event.eventTime)}</span>
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

export default function GPSPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <LogoHeartbeatLoader />
        </div>
      }
    >
      <GPSPageInner />
    </Suspense>
  )
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return seconds + 's ago'
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago'
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago'
  return Math.floor(seconds / 86400) + 'd ago'
}
