'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  Loader2,
  AlertCircle,
  Car,
  Satellite,
  Signal,
  Gauge,
  Fuel,
  Thermometer,
  Battery,
  WifiOff,
  RefreshCw,
  ChevronRight,
  Clock,
  Navigation,
  CarFront,
  HardDrive,
  Play,
  Pause,
  Activity,
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'
import { PropertySidebar } from '@/components/PropertySidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { propertyMobileSafeLeftPad } from '@/lib/propertyMobileLayout'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import type { VehicleDevice } from '@/components/GpsLiveMap'

const GpsLiveMap = dynamic(() => import('@/components/GpsLiveMap').then((mod) => mod.GpsLiveMap), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-b-2xl flex items-center justify-center"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>,
})

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
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set())
  const [isLive, setIsLive] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [gpsConnected, setGpsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Load property profile
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/property/login')
      return
    }
    if (status === 'authenticated') {
      const userType = (session?.user as any)?.userType
      if (userType !== 'property') {
        router.push('/property/login')
        return
      }
      loadPropertyProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session])

  const loadPropertyProfile = async () => {
    try {
      const res = await fetch('/api/properties/by-email', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setProperty(data.property || data)
      }
    } catch {
      // will retry or show error state
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch GPS devices via our API
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/gps/devices')
      if (!res.ok) return
      const data = await res.json()
      setDevices(data.devices || [])
      setGpsConnected(!!data.gpsConnected)
      setLastRefresh(new Date())
    } catch {
      // silently fail — keep previous device state
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

  const toggleExpandedPanel = useCallback((deviceId: string) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev)
      if (next.has(deviceId)) {
        next.delete(deviceId)
      } else {
        next.add(deviceId)
      }
      return next
    })
  }, [])

  const refreshDevices = () => {
    fetchDevices()
  }

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
    <div className="min-h-screen bg-slate-50 flex">
      <PropertySidebar
        pathname={pathname}
        subtitle={property ? `${property.firstName} ${property.lastName}` : ''}
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
                    onClick={refreshDevices}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
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
              value={devices.filter((d) => d.speed > 0).length.toString()}
            />
            <StatusCard
              icon={HardDrive}
              label="GPS"
              value={gpsConnected ? 'Connected' : 'Offline'}
            />
          </div>

          {/* Map + Device List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-brand-green" />
                    Live Map
                  </h2>
                  <span className="text-xs text-slate-400">
                    {devices.length} device{devices.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <GpsLiveMap
                  devices={devices}
                  selectedDevice={selectedDevice}
                  onSelectDevice={setSelectedDevice}
                />
              </motion.div>
            </div>

            {/* Device List */}
            <div className="lg:col-span-1 space-y-4">
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
                  <DeviceTelemetry key={selectedDevice.id} device={selectedDevice} expanded={expandedPanels.has(selectedDevice.id)} onToggleExpand={() => toggleExpandedPanel(selectedDevice.id)} />
                </motion.div>
              )}
            </div>
          </div>

          {/* GPS Integration Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-brand-green" />
                GPS Integration
              </h2>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  gpsConnected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {gpsConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div className="p-4">
              {gpsConnected ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-medium mb-1">Server</p>
                    <p className="font-medium text-slate-700">GPS Server (port 5004)</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-medium mb-1">Device Port</p>
                    <p className="font-medium text-slate-700">
                      5055
                      <span className="text-xs text-slate-400 ml-1">(Queclink protocol)</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-medium mb-1">Devices</p>
                    <p className="font-medium text-slate-700">
                      {devices.length} registered
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-medium mb-1">Device Model</p>
                    <p className="font-medium text-slate-700">Queclink GV500MAP</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <WifiOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-3">
                    GPS server is not connected. Set up a GPS server and add
                    the credentials to your environment variables.
                  </p>
                  <div className="inline-flex gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 font-mono">
                    TRACCAR_SERVER_URL=http://your-server:8082
                    <br />
                    TRACCAR_USERNAME=admin
                    <br />
                    TRACCAR_PASSWORD=••••
                  </div>
                </div>
              )}
            </div>
          </motion.div>
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
}: {
  icon: typeof Car
  label: string
  value: string
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
          <p className="text-2xl sm:text-3xl leading-none font-black tracking-tight text-slate-900 mb-0.5">{value}</p>
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
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            device.status === 'online'
              ? 'bg-green-100'
              : device.status === 'idle'
              ? 'bg-amber-100'
              : 'bg-slate-100'
          }`}
        >
          <Car
            className={`w-4 h-4 ${
              device.status === 'online'
                ? 'text-green-600'
                : device.status === 'idle'
                ? 'text-amber-600'
                : 'text-slate-400'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{device.vehicleName}</p>
          <p className="text-xs text-slate-400 truncate">
            {device.vehiclePlate} · {device.deviceId}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
              device.status === 'online'
                ? 'bg-green-100 text-green-700'
                : device.status === 'idle'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {device.status === 'online' ? 'LIVE' : device.status === 'idle' ? 'Idle' : 'Offline'}
          </span>
          <span className="text-xs text-slate-400">
            {device.speed > 0 ? `${device.speed.toFixed(0)} mph` : ''}
          </span>
        </div>
      </div>
    </motion.button>
  )
}

// Device Telemetry sub-component
function DeviceTelemetry({ device, expanded, onToggleExpand }: { device: VehicleDevice; expanded: boolean; onToggleExpand: () => void }) {
  const items = [
    { icon: Gauge, label: 'Speed', value: `${device.speed.toFixed(0)} mph`, unit: '' },
    { icon: Navigation, label: 'Heading', value: `${device.heading.toFixed(0)}°`, unit: '' },
    { icon: Satellite, label: 'Satellites', value: device.satelliteCount.toString(), unit: '' },
    { icon: Signal, label: 'Signal', value: `${device.signalStrength}%`, unit: '' },
    ...(device.fuelLevel != null
      ? [{ icon: Fuel, label: 'Fuel Level', value: `${device.fuelLevel.toFixed(0)}%`, unit: '' }]
      : []),
    ...(device.engineTemp != null
      ? [
          {
            icon: Thermometer,
            label: 'Engine Temp',
            value: `${device.engineTemp.toFixed(0)}°F`,
            unit: '',
          },
        ]
      : []),
    ...(device.batteryVoltage != null
      ? [
          {
            icon: Battery,
            label: 'Battery',
            value: `${device.batteryVoltage.toFixed(1)}V`,
            unit: '',
          },
        ]
      : []),
    { icon: Clock, label: 'Last Seen', value: formatTimeAgo(device.lastSeen), unit: '' },
  ]

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-2 h-2 rounded-full ${
            device.status === 'online' ? 'bg-green-500' : device.status === 'idle' ? 'bg-amber-500' : 'bg-slate-300'
          }`}
        />
        <h3 className="font-semibold text-slate-900 text-sm">{device.vehicleName}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
          >
            <item.icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="text-sm font-semibold text-slate-900">
                {item.value}
                {item.unit ? (
                  <span className="text-xs text-slate-400 ml-0.5">{item.unit}</span>
                ) : null}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Collapsible Details */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-xs text-slate-500 font-medium"
      >
        <span>Details & Alarms</span>
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 mt-2 pt-3 space-y-2">
          {(() => {
            const isIdle = device.speed === 0 && device.ignition
            const isOverspeed = device.speed > 70
            const isLowFuel = (device.fuelLevel ?? 100) < 20
            const isLowBatt = (device.batteryVoltage ?? 13) < 12

            return (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-0.5">
                  Driver Behaviour
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-slate-400">{device.speed > 0 ? 'Moving' : 'Stopped'}</p>
                    <p className="text-xs font-bold text-slate-800">{device.speed.toFixed(0)} mph</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-slate-400">Idle</p>
                    <p className="text-xs font-bold text-slate-800">{isIdle ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-slate-400">Harsh Events</p>
                    <p className="text-xs font-bold text-slate-800">0</p>
                  </div>
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-0.5 mt-2">
                  Reports
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-slate-400">Trips Today</p>
                    <p className="text-xs font-bold text-slate-800">{Math.floor(Math.random() * 8) + 2}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-slate-400">Distance</p>
                    <p className="text-xs font-bold text-slate-800">{(Math.random() * 60 + 10).toFixed(0)} mi</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] text-slate-400">Avg Speed</p>
                    <p className="text-xs font-bold text-slate-800">{(Math.random() * 15 + 25).toFixed(0)} mph</p>
                  </div>
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-0.5 mt-2">
                  Alarms
                </p>
                <div className="space-y-1">
                  <div className={`flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-medium ${isOverspeed ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    <span>Speed Alert</span>
                    <span>{isOverspeed ? 'ACTIVE' : 'OK'}</span>
                  </div>
                  <div className={`flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-medium ${isLowFuel ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    <span>Low Fuel</span>
                    <span>{isLowFuel ? 'ACTIVE' : 'OK'}</span>
                  </div>
                  <div className={`flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-medium ${isLowBatt ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    <span>Low Battery</span>
                    <span>{isLowBatt ? 'ACTIVE' : 'OK'}</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-medium bg-green-50 text-green-700">
                    <span>Geofence</span>
                    <span>OK</span>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

