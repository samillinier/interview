'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Tag,
  Layers,
  BarChart3,
  Car,
  MapPin,
  CheckCircle2,
  Signal,
  Satellite,
  WifiOff,
  Gauge,
  Package,
  Home,
  PieChart,
  Activity,
  Warehouse,
  PackageOpen,
  Ruler,
  Users,
  Hash,
  Navigation,
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'
import { PropertySidebar } from '@/components/PropertySidebar'
import { PropertyPageHeader } from '@/components/PropertyPageHeader'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface PropertyProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  username?: string
  status: string
  createdAt: string
  photoUrl?: string
  companyName?: string
  companyAddress?: string
}

type Dist = { label: string; value: number }
type DistColor = { label: string; value: number; color: string }

const PIE_COLORS = [
  '#65a30d',
  '#84cc16',
  '#a3e635',
  '#4d7c0f',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#8b5cf6',
]

function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function aggregateBy<T>(items: T[], key: (item: T) => string | null | undefined): Dist[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    if (!k) continue
    const clean = String(k).trim()
    if (!clean) continue
    counts.set(clean, (counts.get(clean) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function aggregateSum<T>(
  items: T[],
  key: (item: T) => string | null | undefined,
  valueKey: (item: T) => number,
): Dist[] {
  const sums = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    if (!k) continue
    const clean = String(k).trim()
    if (!clean) continue
    sums.set(clean, (sums.get(clean) || 0) + (valueKey(item) || 0))
  }
  return Array.from(sums.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function topN(data: Dist[], n: number, otherLabel = 'Other'): Dist[] {
  if (data.length <= n) return data
  const head = data.slice(0, n)
  const rest = data.slice(n).reduce((s, d) => s + d.value, 0)
  return [...head, { label: otherLabel, value: rest }]
}

function withColors(data: Dist[]): DistColor[] {
  return data.map((d, i) => ({ ...d, color: PIE_COLORS[i % PIE_COLORS.length] }))
}

function MiniBar({ value, max, colorClass = 'bg-brand-green' }: { value: number; max: number; colorClass?: string }) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-200">
      <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function DonutChart({ data, centerLabel, centerValue }: { data: DistColor[]; centerLabel: string; centerValue: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  let cumulative = 0
  const fill =
    total > 0
      ? `conic-gradient(${data
          .map((d) => {
            const start = (cumulative / total) * 100
            cumulative += d.value
            const end = (cumulative / total) * 100
            return `${d.color} ${start}% ${end}%`
          })
          .join(', ')})`
      : 'conic-gradient(#e2e8f0 0% 100%)'
  return (
    <div className="relative h-44 w-44 shrink-0 rounded-full" style={{ background: fill }}>
      <div className="absolute inset-[22%] rounded-full bg-white shadow-inner" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{centerLabel}</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{centerValue}</div>
        </div>
      </div>
    </div>
  )
}

function BarChart({ data, formatValue }: { data: Dist[]; formatValue?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const fmt = formatValue || ((v: number) => v.toLocaleString())
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
  }
  return (
    <div className="relative h-64">
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
        {[1, 2, 3, 4].map((line) => (
          <div key={line} className="border-t border-dashed border-slate-200" />
        ))}
      </div>
      <div className="absolute inset-0 flex items-end gap-3">
        {data.map((item, index) => {
          const barHeight = item.value === 0 ? 6 : Math.max((item.value / max) * 100, 8)
          return (
            <div key={`${item.label}-${index}`} className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-xl px-1 text-center">
              <div className="mb-2 text-sm font-semibold text-slate-900">{fmt(item.value)}</div>
              <div
                className="relative rounded-t-2xl bg-brand-green/80 transition-all duration-300 group-hover:opacity-90"
                style={{ height: `${barHeight}%` }}
              >
                <div className="absolute inset-x-0 top-0 h-8 rounded-t-2xl bg-white/15" />
              </div>
              <div className="mt-3 truncate text-xs font-medium leading-tight text-slate-700" title={item.label}>
                {item.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HorizontalBarList({
  data,
  formatValue,
  colorClass = 'bg-brand-green',
}: {
  data: Dist[]
  formatValue?: (v: number) => string
  colorClass?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const fmt = formatValue || ((v: number) => v.toLocaleString())
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
  }
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={`${item.label}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold text-slate-800">{item.label}</span>
            <span className="shrink-0 text-sm font-bold text-brand-green">{fmt(item.value)}</span>
          </div>
          <div className="mt-2">
            <MiniBar value={item.value} max={max} colorClass={colorClass} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DonutWithLegend({ data, centerLabel, unit = 'items' }: { data: Dist[]; centerLabel: string; unit?: string }) {
  const colored = withColors(data)
  const total = data.reduce((s, d) => s + d.value, 0)
  const unitLabel = (n: number) => (n === 1 ? unit.replace(/s$/, '') : unit)
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center">
        <DonutChart data={colored} centerLabel={centerLabel} centerValue={String(total)} />
      </div>
      {total > 0 ? (
        <div className="space-y-3">
          {colored.map((item, i) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0
            return (
              <div key={`${item.label}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="truncate text-sm font-semibold text-slate-800">{item.label}</span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-900">{item.value}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{pct.toFixed(1)}% of total</span>
                  <span>
                    {item.value} {unitLabel(item.value)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-4">No data yet</p>
      )}
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string
  subtitle: string
  icon: typeof Building2
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      {children}
    </motion.div>
  )
}

export default function PropertyDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [property, setProperty] = useState<PropertyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { sidebarOpen } = useSidebarOpen()
  const [analytics, setAnalytics] = useState({
    facilities: {
      total: 0,
      active: 0,
      totalRent: 0,
      totalDeposits: 0,
      upcomingRenewals: 0,
      averageRent: 0,
      totalSqFeet: 0,
      statusDistribution: [] as Dist[],
      rentByLocation: [] as Dist[],
      renewalsByMonth: [] as Dist[],
    },
    fleet: {
      total: 0,
      totalMileage: 0,
      expiringTags: 0,
      averageMileage: 0,
      assignedDrivers: 0,
      unassigned: 0,
      withGps: 0,
      withoutGps: 0,
      missingVin: 0,
      missingPlate: 0,
      avgVehicleYear: 0,
      categoryDistribution: [] as Dist[],
      makeDistribution: [] as Dist[],
      mileageByVehicle: [] as Dist[],
      gpsCoverage: [] as Dist[],
    },
    gps: {
      total: 0,
      online: 0,
      offline: 0,
      idle: 0,
      moving: 0,
      avgSatellites: 0,
      connected: false,
      statusDistribution: [] as Dist[],
    },
    inventory: {
      total: 0,
      totalValue: 0,
      lowStock: 0,
      active: 0,
      totalQuantity: 0,
      categories: 0,
      inStorage: 0,
      checkedOut: 0,
      categoryDistribution: [] as Dist[],
      valueByCategory: [] as Dist[],
      usagePlacement: [] as Dist[],
    },
  })
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const hasLoadedProfile = useRef(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/property/login')
      return
    }

    if (status === 'authenticated') {
      const userType = ((session?.user as any)?.userType || '').toUpperCase()
      const role = String((session?.user as any)?.role || '').toUpperCase()

      const userEmail = session?.user?.email

      // Prevent duplicate loads
      if (hasLoadedProfile.current && property) {
        return
      }

      console.log('🔍 Property Dashboard - User Type:', userType, 'Email:', userEmail)

      if (role === 'ACCOUNTING') {
        router.push('/dashboard')
        return
      }

      // If userType is not set, try to load profile anyway (it will auto-create if needed)
      // This handles the case where userType hasn't been set yet in the session
      if (!userType) {
        console.log('⏳ userType not set, attempting to load profile (will auto-create if needed)...')
        hasLoadedProfile.current = true
        loadPropertyProfile()
        return
      }

      const allowedTypes = ['PROPERTY', 'SUPER_ADMIN', 'ADMIN', 'MANAGER']
      if (!allowedTypes.includes(userType)) {
        if (userType === 'ADMIN') {
          console.log('🔄 Redirecting admin user to admin dashboard')
          router.push('/dashboard')
        } else {
          console.log('🔄 Unknown userType, redirecting to property login')
          router.push('/property/login')
        }
        return
      }

      // User is a property user or admin, load their profile
      hasLoadedProfile.current = true
      loadPropertyProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, (session?.user as any)?.userType, session?.user?.email])

  useEffect(() => {
    if (property?.id) {
      loadAnalytics()
    }
  }, [property?.id])

  const loadPropertyProfile = async () => {
    try {
      setIsLoading(true)
      const email = session?.user?.email
      console.log('📧 Loading property profile for email:', email)

      if (!email) {
        console.error('❌ No email found in session')
        setError('No email found in session')
        setIsLoading(false)
        return
      }

      console.log('🌐 Fetching property data from API...')
      const response = await fetch(`/api/properties/by-email?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
      })

      console.log('📡 API Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          const text = await response.text()
          console.error('❌ API Error (non-JSON):', text)
          errorData = { error: `Server error: ${response.status} ${response.statusText}` }
        }
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.error || `Failed to load profile: ${response.status}`)
      }

      const profileData = await response.json()
      console.log('✅ Property profile loaded:', profileData)

      if (profileData) {
        setProperty(profileData)
        setError('')
        hasLoadedProfile.current = true
      } else {
        console.error('❌ Profile data is null or undefined')
        setError('Profile data not found')
        hasLoadedProfile.current = false
      }
    } catch (err: any) {
      console.error('❌ Error loading profile:', err)
      setError(err.message || 'Failed to load profile.')
    } finally {
      console.log('🏁 Finished loading profile, setting isLoading to false')
      setIsLoading(false)
    }
  }

  const loadAnalytics = async () => {
    if (!property?.id) return

    try {
      setAnalyticsLoading(true)

      // Fetch facilities
      const facilitiesRes = await fetch(`/api/properties/${property.id}/locations`)
      const facilitiesData = facilitiesRes.ok ? await facilitiesRes.json() : { locations: [] }

      // Fetch fleet
      const fleetRes = await fetch(`/api/properties/${property.id}/vehicles`)
      const fleetData = fleetRes.ok ? await fleetRes.json() : { vehicles: [] }

      // Fetch inventory
      const inventoryRes = await fetch(`/api/properties/${property.id}/inventory`)
      const inventoryData = inventoryRes.ok ? await inventoryRes.json() : { inventory: [] }

      // Fetch GPS devices
      let gpsDevices: any[] = []
      let gpsConnected = false
      try {
        const gpsRes = await fetch(`/api/gps/devices?_t=${Date.now()}`, { cache: 'no-store' })
        if (gpsRes.ok) {
          const gpsData = await gpsRes.json()
          gpsDevices = gpsData.devices || []
          gpsConnected = !!gpsData.gpsConnected
        }
      } catch (e) {
        console.error('Error fetching GPS devices:', e)
      }

      const locations = facilitiesData.locations || []
      const vehicles = fleetData.vehicles || []
      const inventory = inventoryData.inventory || []

      const now = new Date()

      // ---------- Facilities ----------
      const activeFacilities = locations.filter((l: any) => l.status === 'active').length
      const totalRent = locations.reduce((sum: number, l: any) => sum + (l.rentAmount || 0), 0)
      const totalDeposits = locations.reduce((sum: number, l: any) => sum + (l.depositAmt || 0), 0)
      const totalSqFeet = locations.reduce((sum: number, l: any) => sum + (l.sqFeet || 0), 0)
      const averageRent = activeFacilities > 0 ? totalRent / activeFacilities : 0

      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      const upcomingRenewals = locations.filter((l: any) => {
        if (!l.leaseRenewal) return false
        const renewalDate = new Date(l.leaseRenewal)
        return renewalDate >= now && renewalDate <= ninetyDaysFromNow
      }).length

      const facilityStatus = aggregateBy(locations, (l: any) =>
        l.status ? capitalize(String(l.status)) : null,
      )

      const rentByLocation = locations
        .map((l: any, i: number) => ({
          label: l.location || l.aliasLocation || l.propertyAddress || `Location ${i + 1}`,
          value: l.rentAmount || 0,
        }))
        .filter((x: Dist) => x.value > 0)
        .sort((a: Dist, b: Dist) => b.value - a.value)
        .slice(0, 8)

      const renewalsByMonth: Dist[] = []
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
        renewalsByMonth.push({ label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), value: 0 })
      }
      for (const l of locations) {
        if (!l.leaseRenewal) continue
        const d = new Date(l.leaseRenewal)
        const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth())
        if (idx >= 0 && idx < 6) renewalsByMonth[idx].value += 1
      }

      // ---------- Fleet ----------
      const totalMileage = vehicles.reduce((sum: number, v: any) => sum + (v.mileageAsOfAugust2025 || 0), 0)
      const averageMileage = vehicles.length > 0 ? totalMileage / vehicles.length : 0

      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      const expiringTags = vehicles.filter((v: any) => {
        if (!v.tagRenewal) return false
        const tagDate = new Date(v.tagRenewal)
        return tagDate >= now && tagDate <= sixtyDaysFromNow
      }).length

      const fleetCategory = aggregateBy(vehicles, (v: any) => {
        const c = String(v.category || '').toLowerCase()
        if (c === 'car') return 'Cars'
        if (c === 'forklift') return 'Forklifts'
        return c ? capitalize(c) : null
      })

      const makeDistribution = aggregateBy(vehicles, (v: any) => v.vehicleMake || null).slice(0, 8)

      const mileageByVehicle = vehicles
        .map((v: any, i: number) => ({
          label: v.plate || (v.vehicleMake || v.vehicleModel ? `${v.vehicleMake || ''} ${v.vehicleModel || ''}`.trim() : `Vehicle ${i + 1}`),
          value: v.mileageAsOfAugust2025 || 0,
        }))
        .filter((x: Dist) => x.value > 0)
        .sort((a: Dist, b: Dist) => b.value - a.value)
        .slice(0, 8)

      const assignedDrivers = vehicles.filter((v: any) => v.assignedDriver && String(v.assignedDriver).trim()).length
      const unassigned = vehicles.length - assignedDrivers
      const missingVin = vehicles.filter((v: any) => !v.vin || !String(v.vin).trim()).length
      const missingPlate = vehicles.filter((v: any) => !v.plate || !String(v.plate).trim()).length

      // GPS coverage: match fleet vehicles to GPS devices by plate
      const gpsPlates = new Set(
        gpsDevices
          .map((d: any) => (d.vehiclePlate ? String(d.vehiclePlate).trim().toUpperCase() : null))
          .filter(Boolean),
      )
      const withGps = vehicles.filter((v: any) => v.plate && gpsPlates.has(String(v.plate).trim().toUpperCase())).length
      const withoutGps = vehicles.length - withGps

      const vehicleYears = vehicles
        .map((v: any) => (v.vehicleYear ? Number(v.vehicleYear) : null))
        .filter((y: number | null): y is number => y !== null && !Number.isNaN(y))
      const avgVehicleYear =
        vehicleYears.length > 0 ? Math.round(vehicleYears.reduce((s: number, y: number) => s + y, 0) / vehicleYears.length) : 0

      const gpsCoverage: Dist[] = [
        { label: 'GPS Tracked', value: withGps },
        { label: 'Not Tracked', value: withoutGps },
      ]

      // ---------- Inventory ----------
      const activeInventory = inventory.filter((i: any) => i.status === 'active').length
      const totalValue = inventory.reduce((sum: number, i: any) => sum + ((i.cost || 0) * (i.quantity || 0)), 0)
      const totalQuantity = inventory.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
      const inStorage = inventory.filter((i: any) => i.usagePlacement === 'in_storage').length
      const checkedOut = inventory.filter((i: any) => i.usagePlacement === 'checked_out').length
      const lowStock = inventory.filter((i: any) => {
        if (i.reorderLevel && i.quantity <= i.reorderLevel) return true
        if (i.minimumStock && i.quantity <= i.minimumStock) return true
        return false
      }).length

      const categories = new Set(inventory.map((i: any) => i.category).filter(Boolean))

      const categoryDistribution = topN(aggregateBy(inventory, (i: any) => i.category || null), 6)
      const valueByCategory = aggregateSum(inventory, (i: any) => i.category || null, (i: any) => (i.cost || 0) * (i.quantity || 0)).slice(0, 8)

      const usageLabel = (p: string) =>
        p === 'in_use' ? 'In Use' : p === 'in_storage' ? 'In Storage' : p === 'checked_out' ? 'Checked Out' : capitalize(p)
      const usagePlacement = aggregateBy(inventory, (i: any) => (i.usagePlacement ? usageLabel(i.usagePlacement) : null))

      // ---------- GPS ----------
      const gpsOnline = gpsDevices.filter((d: any) => d.status === 'online').length
      const gpsIdle = gpsDevices.filter((d: any) => d.status === 'idle').length
      const gpsOffline = gpsDevices.length - gpsOnline - gpsIdle
      const gpsMoving = gpsDevices.filter((d: any) => d.speed > 3 && d.status === 'online').length
      const gpsAvgSatellites =
        gpsDevices.length > 0
          ? gpsDevices.reduce((s: number, d: any) => s + (d.satelliteCount || 0), 0) / gpsDevices.length
          : 0

      const gpsStatus: Dist[] = [
        { label: 'Online', value: gpsOnline },
        { label: 'Idle', value: gpsIdle },
        { label: 'Offline', value: gpsOffline },
      ]

      setAnalytics({
        facilities: {
          total: locations.length,
          active: activeFacilities,
          totalRent,
          totalDeposits,
          upcomingRenewals,
          averageRent,
          totalSqFeet,
          statusDistribution: facilityStatus,
          rentByLocation,
          renewalsByMonth,
        },
        fleet: {
          total: vehicles.length,
          totalMileage,
          expiringTags,
          averageMileage,
          assignedDrivers,
          unassigned,
          withGps,
          withoutGps,
          missingVin,
          missingPlate,
          avgVehicleYear,
          categoryDistribution: fleetCategory,
          makeDistribution,
          mileageByVehicle,
          gpsCoverage,
        },
        gps: {
          total: gpsDevices.length,
          online: gpsOnline,
          offline: gpsOffline,
          idle: gpsIdle,
          moving: gpsMoving,
          avgSatellites: gpsAvgSatellites,
          connected: gpsConnected,
          statusDistribution: gpsStatus,
        },
        inventory: {
          total: inventory.length,
          totalValue,
          lowStock,
          active: activeInventory,
          totalQuantity,
          categories: categories.size,
          inStorage,
          checkedOut,
          categoryDistribution,
          valueByCategory,
          usagePlacement,
        },
      })
    } catch (err) {
      console.error('Error loading analytics:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/property/login' })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader messageClassName="text-primary-600" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <div className="w-16 h-16 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-danger-600" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Profile Not Found</h2>
          <p className="text-primary-500 mb-6">
            {error || 'Unable to load your profile. Please contact support.'}
          </p>
          <button
            onClick={handleLogout}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  const money = (n: number) =>
    n > 0
      ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null

  const moneyWhole = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
  const mileageFmt = (n: number) => `${Math.round(n).toLocaleString('en-US')} mi`

  const metricCards: { label: string; value: string; desc: string; icon: typeof Building2 }[] = [
    // Facilities
    { label: 'Locations', value: String(analytics.facilities.total), desc: 'Total facilities', icon: Building2 },
    { label: 'Active', value: String(analytics.facilities.active), desc: 'Currently active', icon: CheckCircle2 },
    { label: 'Total Rent', value: money(analytics.facilities.totalRent) ?? '—', desc: 'Monthly rent on file', icon: DollarSign },
    { label: 'Total Deposits', value: money(analytics.facilities.totalDeposits) ?? '—', desc: 'Security deposits on file', icon: Layers },
    { label: 'Upcoming Renewals', value: String(analytics.facilities.upcomingRenewals), desc: 'Leases in the next 90 days', icon: Calendar },
    { label: 'Avg Rent', value: money(analytics.facilities.averageRent) ?? '—', desc: 'Average per facility', icon: BarChart3 },
    analytics.facilities.totalSqFeet > 0
      ? { label: 'Total Sq Ft', value: analytics.facilities.totalSqFeet.toLocaleString(), desc: 'Combined floor space', icon: Ruler }
      : null,
    // Fleet
    { label: 'Vehicles', value: String(analytics.fleet.total), desc: 'Total fleet vehicles', icon: Car },
    { label: 'Assigned Drivers', value: String(analytics.fleet.assignedDrivers), desc: analytics.fleet.unassigned > 0 ? `${analytics.fleet.unassigned} unassigned` : 'All vehicles covered', icon: Users },
    { label: 'GPS Tracked', value: String(analytics.fleet.withGps), desc: analytics.fleet.withoutGps > 0 ? `${analytics.fleet.withoutGps} not tracked` : 'Full tracking coverage', icon: Navigation },
    { label: 'Total Mileage', value: analytics.fleet.totalMileage.toLocaleString(), desc: 'Fleet-wide odometer', icon: TrendingUp },
    { label: 'Avg Mileage', value: `${Math.round(analytics.fleet.averageMileage).toLocaleString()} mi`, desc: 'Average per vehicle', icon: BarChart3 },
    { label: 'Expiring Tags', value: String(analytics.fleet.expiringTags), desc: 'Plates in the next 60 days', icon: Tag },
    analytics.fleet.missingVin > 0
      ? { label: 'Missing VIN', value: String(analytics.fleet.missingVin), desc: 'VIN not on file', icon: Hash }
      : null,
    analytics.fleet.avgVehicleYear > 0
      ? { label: 'Avg Vehicle Year', value: String(analytics.fleet.avgVehicleYear), desc: 'Fleet age', icon: Calendar }
      : null,
    // GPS Tracking
    { label: 'Devices', value: String(analytics.gps.total), desc: 'Tracked units', icon: MapPin },
    { label: 'Online', value: String(analytics.gps.online), desc: 'Reporting now', icon: Signal },
    { label: 'Offline', value: String(analytics.gps.offline), desc: 'No signal', icon: WifiOff },
    { label: 'Moving', value: String(analytics.gps.moving), desc: 'Active on the road', icon: Gauge },
    { label: 'Avg Satellites', value: String(Math.round(analytics.gps.avgSatellites)), desc: 'GPS lock quality', icon: Satellite },
    { label: 'Connection', value: analytics.gps.connected ? 'Connected' : 'Offline', desc: 'Provider status', icon: Signal },
    // Office Equipment
    { label: 'Line Items', value: String(analytics.inventory.total), desc: 'Asset records', icon: Package },
    { label: 'Units on Hand', value: analytics.inventory.totalQuantity.toLocaleString(), desc: 'Total quantity', icon: Layers },
    { label: 'In Use', value: String(analytics.inventory.active), desc: 'Active assets', icon: CheckCircle2 },
    analytics.inventory.inStorage > 0
      ? { label: 'In Storage', value: String(analytics.inventory.inStorage), desc: 'Stored / warehoused', icon: Warehouse }
      : null,
    analytics.inventory.checkedOut > 0
      ? { label: 'Checked Out', value: String(analytics.inventory.checkedOut), desc: 'Currently out', icon: PackageOpen }
      : null,
    { label: 'Equipment Types', value: String(analytics.inventory.categories), desc: 'Unique categories', icon: Home },
    { label: 'Est. Book Value', value: money(analytics.inventory.totalValue) ?? '—', desc: 'Total inventory value', icon: DollarSign },
    { label: 'Needs Reorder', value: String(analytics.inventory.lowStock), desc: analytics.inventory.lowStock > 0 ? 'Action needed' : 'Stock levels are current', icon: AlertTriangle },
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <PropertySidebar
        pathname={pathname}
        subtitle="Dashboard"
        userName={
          property.firstName || property.lastName
            ? `${property.firstName || ''} ${property.lastName || ''}`.trim()
            : session?.user?.name || property.email.split('@')[0]
        }
        userEmail={property.email}
        userImage={session?.user?.image}
        onLogout={handleLogout}
      />
      <PropertyMobileMenu pathname={pathname} onLogout={handleLogout} />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <PropertyPageHeader
          eyebrow="Property Portal"
          title="Dashboard"
          subtitle="Facilities, fleet, equipment, and communications."
        />

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-10">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="animate-pulse">
                    <div className="h-1.5 w-full rounded-full bg-slate-100 mb-6" />
                    <div className="h-6 w-2/3 bg-slate-100 rounded mb-3" />
                    <div className="h-9 w-1/2 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Overview metric cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metricCards.map((card, i) => {
                  const Icon = card.icon
                  return (
                    <motion.div
                      key={card.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (i % 4) * 0.05 }}
                      className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-6" />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">{card.label}</p>
                          <h3 className="text-4xl leading-none font-black tracking-tight text-slate-900 mb-2">{card.value}</h3>
                          <p className="text-sm text-slate-500">{card.desc}</p>
                        </div>
                        <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/10 flex items-center justify-center shadow-sm flex-shrink-0">
                          <Icon className="w-6 h-6 text-brand-green" />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Charts grid */}
              <div className="mt-6 columns-1 lg:columns-2 lg:gap-6 [column-fill:_balance]">
                <ChartCard title="Facility Status" subtitle="Distribution of locations by status" icon={PieChart}>
                  <DonutWithLegend data={analytics.facilities.statusDistribution} centerLabel="Locations" unit="locations" />
                </ChartCard>

                <ChartCard title="Monthly Rent by Location" subtitle="Top locations by monthly rent" icon={DollarSign}>
                  <HorizontalBarList data={analytics.facilities.rentByLocation} formatValue={moneyWhole} />
                </ChartCard>

                <ChartCard title="Lease Renewals Timeline" subtitle="Lease renewals due over the next 6 months" icon={Calendar}>
                  <BarChart data={analytics.facilities.renewalsByMonth} />
                </ChartCard>

                <ChartCard title="Fleet Breakdown" subtitle="Vehicles by category" icon={PieChart}>
                  <DonutWithLegend data={analytics.fleet.categoryDistribution} centerLabel="Vehicles" unit="vehicles" />
                </ChartCard>

                <ChartCard title="Vehicles by Make" subtitle="Fleet composition by manufacturer" icon={Activity}>
                  <BarChart data={analytics.fleet.makeDistribution} />
                </ChartCard>

                <ChartCard title="Fleet Mileage" subtitle="Odometer by vehicle" icon={TrendingUp}>
                  <HorizontalBarList data={analytics.fleet.mileageByVehicle} formatValue={mileageFmt} />
                </ChartCard>

                <ChartCard title="Fleet GPS Coverage" subtitle="Vehicles with active tracking vs untracked" icon={Navigation}>
                  <DonutWithLegend data={analytics.fleet.gpsCoverage} centerLabel="Vehicles" unit="vehicles" />
                </ChartCard>

                <ChartCard title="GPS Device Status" subtitle="Live tracking device states" icon={PieChart}>
                  <DonutWithLegend data={analytics.gps.statusDistribution} centerLabel="Devices" unit="devices" />
                </ChartCard>

                <ChartCard title="Equipment by Category" subtitle="Top equipment categories by line items" icon={PieChart}>
                  <DonutWithLegend data={analytics.inventory.categoryDistribution} centerLabel="Items" unit="items" />
                </ChartCard>

                <ChartCard title="Equipment Value by Category" subtitle="Estimated book value per category" icon={DollarSign}>
                  <HorizontalBarList data={analytics.inventory.valueByCategory} formatValue={moneyWhole} />
                </ChartCard>

                <ChartCard title="Equipment Usage" subtitle="Units by current placement" icon={Warehouse}>
                  <DonutWithLegend data={analytics.inventory.usagePlacement} centerLabel="Units" unit="units" />
                </ChartCard>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
