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
  ArrowRight,
  MapPin,
  PhoneCall,
  Settings,
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
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

  const hubCards = [
    {
      title: 'Facilities',
      description: 'View and update property locations, leases, and landlord details.',
      href: '/property/facilities',
      icon: Building2,
      cta: 'Open Facilities',
      highlights: [
        `${analytics.facilities.total} location${analytics.facilities.total === 1 ? '' : 's'}`,
        `${analytics.facilities.active} active`,
        analytics.facilities.upcomingRenewals > 0
          ? `${analytics.facilities.upcomingRenewals} renewal${analytics.facilities.upcomingRenewals === 1 ? '' : 's'} due`
          : null,
        money(analytics.facilities.totalRent) ? `${money(analytics.facilities.totalRent)} rent` : null,
      ].filter((item): item is string => Boolean(item)),
    },
    {
      title: 'Fleet',
      description: 'Track vehicles, plates, mileage, and tag renewals.',
      href: '/property/fleet',
      icon: Car,
      cta: 'Open Fleet',
      highlights: [
        `${analytics.fleet.total} vehicle${analytics.fleet.total === 1 ? '' : 's'}`,
        analytics.fleet.totalMileage > 0
          ? `${analytics.fleet.totalMileage.toLocaleString()} mi`
          : null,
        analytics.fleet.expiringTags > 0
          ? `${analytics.fleet.expiringTags} tag${analytics.fleet.expiringTags === 1 ? '' : 's'} expiring`
          : null,
      ].filter((item): item is string => Boolean(item)),
    },
    {
      title: 'GPS Tracking',
      description: 'Live fleet map, device status, and trip history.',
      href: '/property/gps',
      icon: MapPin,
      cta: 'Open GPS',
      highlights: ['Live tracking', 'Fleet map', 'Trip history'],
    },
    {
      title: 'Office Equipment',
      description: 'Furniture, IT, supplies, and asset tags by workroom.',
      href: '/property/inventory',
      icon: Armchair,
      cta: 'Open Equipment',
      highlights: [
        `${analytics.inventory.total} line${analytics.inventory.total === 1 ? '' : 's'}`,
        analytics.inventory.active > 0 ? `${analytics.inventory.active} in use` : null,
        analytics.inventory.lowStock > 0
          ? `${analytics.inventory.lowStock} need reorder`
          : null,
        money(analytics.inventory.totalValue) || null,
      ].filter((item): item is string => Boolean(item)),
    },
    {
      title: 'RingCentral',
      description: 'Call logs, recordings, and communication analytics.',
      href: '/property/ring-central',
      icon: PhoneCall,
      cta: 'Open RingCentral',
      highlights: ['Call logs', 'Recordings', 'Missed calls'],
    },
    {
      title: 'Settings',
      description: 'Manage property portal users and account access.',
      href: '/property/settings',
      icon: Settings,
      cta: 'Open Settings',
      highlights: ['Users', 'Portal access'],
    },
  ]

  const metricCards = [
    analytics.facilities.totalDeposits > 0
      ? { label: 'Total Deposits', value: money(analytics.facilities.totalDeposits)!, desc: 'Security deposits on file', icon: DollarSign }
      : null,
    {
      label: 'Upcoming Renewals',
      value: String(analytics.facilities.upcomingRenewals),
      desc: 'Leases in the next 90 days',
      icon: Calendar,
    },
    {
      label: 'Expiring Tags',
      value: String(analytics.fleet.expiringTags),
      desc: 'Plates in the next 60 days',
      icon: Tag,
    },
    analytics.inventory.totalQuantity > 0
      ? {
          label: 'Units on Hand',
          value: analytics.inventory.totalQuantity.toLocaleString(),
          desc: `${analytics.inventory.categories} equipment type${analytics.inventory.categories === 1 ? '' : 's'}`,
          icon: Layers,
        }
      : null,
    money(analytics.facilities.averageRent)
      ? { label: 'Avg Rent / Facility', value: money(analytics.facilities.averageRent)!, desc: 'Average monthly rent', icon: BarChart3 }
      : null,
    analytics.fleet.averageMileage > 0
      ? {
          label: 'Avg Mileage',
          value: `${Math.round(analytics.fleet.averageMileage).toLocaleString()} mi`,
          desc: 'Average per vehicle',
          icon: TrendingUp,
        }
      : null,
    {
      label: 'Lines Needing Reorder',
      value: String(analytics.inventory.lowStock),
      desc: analytics.inventory.lowStock > 0 ? 'Action needed' : 'Stock levels are current',
      icon: AlertTriangle,
    },
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
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60"
              >
                <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-brand-green/10 via-lime-50/80 to-white p-5 sm:p-7">
                  <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-green/10 blur-3xl" />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative">
                      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-green">Property Portal</p>
                      <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Overview</h2>
                      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                        Manage facilities, fleet, equipment, and communications from one place.
                      </p>
                    </div>
                    <span className="relative inline-flex w-fit items-center rounded-full border border-brand-green/20 bg-white px-4 py-2 text-xs font-extrabold text-brand-green shadow-sm">
                      {hubCards.length} pages
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 sm:p-7">
                  {hubCards.map((card) => {
                    const Icon = card.icon
                    return (
                      <Link
                        key={card.title}
                        href={card.href}
                        className="group relative min-h-[260px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-white to-brand-green/5 p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-green/40 hover:shadow-2xl hover:shadow-brand-green/10"
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-green via-lime-300 to-transparent opacity-80" />
                        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-green/10 blur-2xl transition-transform group-hover:scale-125" />
                        <div className="relative flex h-full flex-col">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-3xl border border-brand-green/15 bg-white shadow-lg shadow-slate-200/70 ring-8 ring-brand-green/5">
                              <Icon className="h-8 w-8 text-brand-green" />
                            </div>
                            <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-extrabold text-slate-500 shadow-sm transition-colors group-hover:border-brand-green/30 group-hover:text-brand-green">
                              Open
                            </span>
                          </div>
                          <div className="mt-5 flex-1">
                            <h3 className="text-2xl font-black text-slate-900">{card.title}</h3>
                            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{card.description}</p>
                            {card.highlights.length > 0 ? (
                              <div className="mt-5 flex flex-wrap gap-2">
                                {card.highlights.map((highlight) => (
                                  <span key={highlight} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600 shadow-sm">
                                    {highlight}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand-green/20 transition-all group-hover:bg-brand-green-dark group-hover:shadow-xl group-hover:shadow-brand-green/30">
                            {card.cta}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </motion.section>

              {metricCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {metricCards.map((card) => {
                    const Icon = card.icon
                    return (
                      <div
                        key={card.label}
                        className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-1.5 w-full rounded-full bg-brand-green" />
                          <Icon className="w-5 h-5 text-brand-green ml-3 flex-shrink-0" />
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">{card.label}</p>
                        <h3 className="text-3xl leading-none font-black tracking-tight text-slate-900 mb-1">{card.value}</h3>
                        <p className="text-sm text-slate-500">{card.desc}</p>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
