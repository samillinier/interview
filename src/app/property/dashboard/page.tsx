'use client'

import { useState, useEffect, useRef } from 'react'
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
  Armchair,
  MapPin,
  CheckCircle2,
  Signal,
  Satellite,
  WifiOff,
  Gauge,
  Package,
  Home,
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
    },
    fleet: {
      total: 0,
      totalMileage: 0,
      expiringTags: 0,
      averageMileage: 0,
    },
    gps: {
      total: 0,
      online: 0,
      offline: 0,
      moving: 0,
      avgSatellites: 0,
      connected: false,
    },
    inventory: {
      total: 0,
      totalValue: 0,
      lowStock: 0,
      active: 0,
      totalQuantity: 0,
      categories: 0,
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
      console.log('🔍 Fetching facilities for property:', property.id)
      const facilitiesRes = await fetch(`/api/properties/${property.id}/locations`)
      console.log('📡 Facilities API response status:', facilitiesRes.status)
      if (!facilitiesRes.ok) {
        const errorText = await facilitiesRes.text()
        console.error('❌ Error fetching facilities:', facilitiesRes.status, errorText)
      }
      const facilitiesData = facilitiesRes.ok ? await facilitiesRes.json() : { locations: [] }
      console.log('📊 Facilities data:', facilitiesData.locations?.length || 0, 'facilities found')
      console.log('📊 Full facilities data:', facilitiesData)
      
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
      
      // Calculate facilities stats
      const activeFacilities = locations.filter((l: any) => l.status === 'active').length
      const totalRent = locations.reduce((sum: number, l: any) => sum + (l.rentAmount || 0), 0)
      const totalDeposits = locations.reduce((sum: number, l: any) => sum + (l.depositAmt || 0), 0)
      const averageRent = activeFacilities > 0 ? totalRent / activeFacilities : 0
      
      // Count upcoming renewals (within next 90 days)
      const now = new Date()
      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      const upcomingRenewals = locations.filter((l: any) => {
        if (!l.leaseRenewal) return false
        const renewalDate = new Date(l.leaseRenewal)
        return renewalDate >= now && renewalDate <= ninetyDaysFromNow
      }).length
      
      // Calculate fleet stats
      const totalMileage = vehicles.reduce((sum: number, v: any) => sum + (v.mileageAsOfAugust2025 || 0), 0)
      const averageMileage = vehicles.length > 0 ? totalMileage / vehicles.length : 0
      
      // Count expiring tags (within next 60 days)
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      const expiringTags = vehicles.filter((v: any) => {
        if (!v.tagRenewal) return false
        const tagDate = new Date(v.tagRenewal)
        return tagDate >= now && tagDate <= sixtyDaysFromNow
      }).length
      
      // Calculate inventory stats
      const activeInventory = inventory.filter((i: any) => i.status === 'active').length
      const totalValue = inventory.reduce((sum: number, i: any) => sum + ((i.cost || 0) * (i.quantity || 0)), 0)
      const totalQuantity = inventory.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
      const lowStock = inventory.filter((i: any) => {
        if (i.reorderLevel && i.quantity <= i.reorderLevel) return true
        if (i.minimumStock && i.quantity <= i.minimumStock) return true
        return false
      }).length
      
      // Count unique categories
      const categories = new Set(inventory.map((i: any) => i.category).filter(Boolean))

      // Calculate GPS stats
      const gpsOnline = gpsDevices.filter((d: any) => d.status === 'online').length
      const gpsMoving = gpsDevices.filter((d: any) => d.speed > 3 && d.status === 'online').length
      const gpsAvgSatellites =
        gpsDevices.length > 0
          ? gpsDevices.reduce((s: number, d: any) => s + (d.satelliteCount || 0), 0) / gpsDevices.length
          : 0
      
      setAnalytics({
        facilities: {
          total: locations.length,
          active: activeFacilities,
          totalRent,
          totalDeposits,
          upcomingRenewals,
          averageRent,
        },
        fleet: {
          total: vehicles.length,
          totalMileage,
          expiringTags,
          averageMileage,
        },
        gps: {
          total: gpsDevices.length,
          online: gpsOnline,
          offline: gpsDevices.length - gpsOnline,
          moving: gpsMoving,
          avgSatellites: gpsAvgSatellites,
          connected: gpsConnected,
        },
        inventory: {
          total: inventory.length,
          totalValue,
          lowStock,
          active: activeInventory,
          totalQuantity,
          categories: categories.size,
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

  const metricGroups: {
    title: string
    icon: typeof Building2
    cards: { label: string; value: string; desc: string; icon: typeof Building2 }[]
  }[] = [
    {
      title: 'Facilities',
      icon: Building2,
      cards: [
        { label: 'Locations', value: String(analytics.facilities.total), desc: 'Total facilities', icon: Building2 },
        { label: 'Active', value: String(analytics.facilities.active), desc: 'Currently active', icon: CheckCircle2 },
        { label: 'Total Rent', value: money(analytics.facilities.totalRent) ?? '—', desc: 'Monthly rent on file', icon: DollarSign },
        { label: 'Total Deposits', value: money(analytics.facilities.totalDeposits) ?? '—', desc: 'Security deposits on file', icon: Layers },
        { label: 'Upcoming Renewals', value: String(analytics.facilities.upcomingRenewals), desc: 'Leases in the next 90 days', icon: Calendar },
        { label: 'Avg Rent', value: money(analytics.facilities.averageRent) ?? '—', desc: 'Average per facility', icon: BarChart3 },
      ],
    },
    {
      title: 'Fleet',
      icon: Car,
      cards: [
        { label: 'Vehicles', value: String(analytics.fleet.total), desc: 'Total fleet vehicles', icon: Car },
        { label: 'Total Mileage', value: analytics.fleet.totalMileage.toLocaleString(), desc: 'Fleet-wide odometer', icon: TrendingUp },
        { label: 'Avg Mileage', value: `${Math.round(analytics.fleet.averageMileage).toLocaleString()} mi`, desc: 'Average per vehicle', icon: BarChart3 },
        { label: 'Expiring Tags', value: String(analytics.fleet.expiringTags), desc: 'Plates in the next 60 days', icon: Tag },
      ],
    },
    {
      title: 'GPS Tracking',
      icon: MapPin,
      cards: [
        { label: 'Devices', value: String(analytics.gps.total), desc: 'Tracked units', icon: MapPin },
        { label: 'Online', value: String(analytics.gps.online), desc: 'Reporting now', icon: Signal },
        { label: 'Offline', value: String(analytics.gps.offline), desc: 'No signal', icon: WifiOff },
        { label: 'Moving', value: String(analytics.gps.moving), desc: 'Active on the road', icon: Gauge },
        { label: 'Avg Satellites', value: String(Math.round(analytics.gps.avgSatellites)), desc: 'GPS lock quality', icon: Satellite },
        { label: 'Connection', value: analytics.gps.connected ? 'Connected' : 'Offline', desc: 'Provider status', icon: Signal },
      ],
    },
    {
      title: 'Office Equipment',
      icon: Armchair,
      cards: [
        { label: 'Line Items', value: String(analytics.inventory.total), desc: 'Asset records', icon: Package },
        { label: 'Units on Hand', value: analytics.inventory.totalQuantity.toLocaleString(), desc: 'Total quantity', icon: Layers },
        { label: 'In Use', value: String(analytics.inventory.active), desc: 'Active assets', icon: CheckCircle2 },
        { label: 'Equipment Types', value: String(analytics.inventory.categories), desc: 'Unique categories', icon: Home },
        { label: 'Est. Book Value', value: money(analytics.inventory.totalValue) ?? '—', desc: 'Total inventory value', icon: DollarSign },
        { label: 'Needs Reorder', value: String(analytics.inventory.lowStock), desc: analytics.inventory.lowStock > 0 ? 'Action needed' : 'Stock levels are current', icon: AlertTriangle },
      ],
    },
  ]

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-h-[260px] rounded-[1.75rem] border border-slate-200 bg-white p-6">
                  <div className="animate-pulse">
                    <div className="h-16 w-16 rounded-3xl bg-slate-100 mb-5" />
                    <div className="h-7 bg-slate-100 rounded w-1/2 mb-3" />
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {metricGroups.map((group) => {
                const GroupIcon = group.icon
                return (
                  <motion.section
                    key={group.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-brand-green/10 via-lime-50/60 to-white px-5 py-4 sm:px-7">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-brand-green/15 bg-white shadow-sm">
                        <GroupIcon className="h-5 w-5 text-brand-green" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900">{group.title}</h3>
                        <p className="text-xs font-semibold text-slate-500">{group.cards.length} metrics</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-5 sm:p-7">
                      {group.cards.map((card) => {
                        const Icon = card.icon
                        return (
                          <div
                            key={card.label}
                            className="bg-white rounded-2xl shadow-[0_6px_18px_rgba(15,23,42,0.05)] border border-slate-200/80 p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="h-1.5 w-full rounded-full bg-brand-green" />
                              <Icon className="w-5 h-5 text-brand-green ml-3 flex-shrink-0" />
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1.5">{card.label}</p>
                            <h3 className="text-2xl leading-none font-black tracking-tight text-slate-900 mb-1">{card.value}</h3>
                            <p className="text-xs text-slate-500">{card.desc}</p>
                          </div>
                        )
                      })}
                    </div>
                  </motion.section>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
