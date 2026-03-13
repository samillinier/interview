'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Loader2,
  AlertCircle,
  HelpCircle,
  Building2,
  Car,
  Package,
  DollarSign,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Tag,
  Layers,
  BarChart3,
  Settings,
  Shield
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
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
      const userType = (session?.user as any)?.userType
      const userEmail = session?.user?.email
      
      // Prevent duplicate loads
      if (hasLoadedProfile.current && property) {
        return
      }
      
      console.log('🔍 Property Dashboard - User Type:', userType, 'Email:', userEmail)
      
      // If userType is not set, try to load profile anyway (it will auto-create if needed)
      // This handles the case where userType hasn't been set yet in the session
      if (!userType) {
        console.log('⏳ userType not set, attempting to load profile (will auto-create if needed)...')
        hasLoadedProfile.current = true
        loadPropertyProfile()
        return
      }
      
      if (userType !== 'property') {
        // Redirect to admin dashboard if they're an admin
        if (userType === 'admin') {
          console.log('🔄 Redirecting admin user to admin dashboard')
          router.push('/dashboard')
        } else {
          console.log('🔄 Unknown userType, redirecting to property login')
          router.push('/property/login')
        }
        return
      }
      
      // User is a property user, load their profile
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
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading dashboard...</p>
        </div>
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10 flex-shrink-0">
              <Image
                src={logo}
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-primary-900 text-sm">Property Portal</h1>
                <p className="text-xs text-primary-500">Dashboard</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/property/dashboard"
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/property/facilities"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Building2 className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Facilities</span>}
          </Link>
          <Link
            href="/property/fleet"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Car className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Fleet</span>}
          </Link>
          <Link
            href="/property/inventory"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Package className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Inventory</span>}
          </Link>
          <Link
            href="/property/help"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Help</span>}
          </Link>
          <Link
            href="/property/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/property/settings' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors border-t border-white/10 mt-2 pt-2"
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Admin Portal</span>}
          </Link>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            {session?.user?.image ? (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-brand-green" />
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {property.firstName || property.lastName 
                    ? `${property.firstName || ''} ${property.lastName || ''}`.trim()
                    : session?.user?.name || property.email.split('@')[0]
                  }
                </p>
                <p className="text-xs text-primary-500 truncate">{property.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
      <PropertyMobileMenu pathname={pathname} onLogout={handleLogout} />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-4 lg:px-6 py-4">
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 lg:p-6 pt-16 lg:pt-6">
          {/* Analytics Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h2 className="text-xl font-bold text-primary-900 mb-4">Analytics Overview</h2>
            {analyticsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                      <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Facilities Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border-2 border-blue-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <Link
                      href="/property/facilities"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View All →
                    </Link>
                  </div>
                  <h3 className="text-3xl font-bold text-blue-900 mb-1">{analytics.facilities.total}</h3>
                  <p className="text-sm text-blue-700 mb-4">Total Facilities</p>
                  <div className="space-y-2 pt-4 border-t border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600">Active</span>
                      <span className="text-sm font-semibold text-blue-900">{analytics.facilities.active}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600">Total Rent</span>
                      <span className="text-sm font-semibold text-blue-900">
                        ${analytics.facilities.totalRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Fleet Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border-2 border-green-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <Car className="w-6 h-6 text-white" />
                    </div>
                    <Link
                      href="/property/fleet"
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      View All →
                    </Link>
                  </div>
                  <h3 className="text-3xl font-bold text-green-900 mb-1">{analytics.fleet.total}</h3>
                  <p className="text-sm text-green-700 mb-4">Total Vehicles</p>
                  <div className="space-y-2 pt-4 border-t border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600">Total Mileage</span>
                      <span className="text-sm font-semibold text-green-900">
                        {analytics.fleet.totalMileage.toLocaleString()} mi
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600">Avg per Vehicle</span>
                      <span className="text-sm font-semibold text-green-900">
                        {analytics.fleet.total > 0 
                          ? Math.round(analytics.fleet.totalMileage / analytics.fleet.total).toLocaleString()
                          : '0'} mi
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Inventory Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg border-2 border-purple-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <Link
                      href="/property/inventory"
                      className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                    >
                      View All →
                    </Link>
                  </div>
                  <h3 className="text-3xl font-bold text-purple-900 mb-1">{analytics.inventory.total}</h3>
                  <p className="text-sm text-purple-700 mb-4">Total Items</p>
                  <div className="space-y-2 pt-4 border-t border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-600">Total Value</span>
                      <span className="text-sm font-semibold text-purple-900">
                        ${analytics.inventory.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-600">Low Stock</span>
                      <span className={`text-sm font-semibold ${analytics.inventory.lowStock > 0 ? 'text-red-600' : 'text-purple-900'}`}>
                        {analytics.inventory.lowStock}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-600">Active Items</span>
                      <span className="text-sm font-semibold text-purple-900">{analytics.inventory.active}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
          >
            <Link
              href="/property/facilities"
              className="bg-white rounded-2xl shadow-lg p-6 flex items-center space-x-4 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-brand-green/20"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-primary-900 text-lg">Manage Facilities</h3>
                <p className="text-sm text-primary-500">View and update your property locations.</p>
              </div>
            </Link>
            <Link
              href="/property/fleet"
              className="bg-white rounded-2xl shadow-lg p-6 flex items-center space-x-4 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-brand-green/20"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Car className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-primary-900 text-lg">Manage Fleet</h3>
                <p className="text-sm text-primary-500">Track and manage your vehicles.</p>
              </div>
            </Link>
            <Link
              href="/property/inventory"
              className="bg-white rounded-2xl shadow-lg p-6 flex items-center space-x-4 hover:shadow-xl transition-shadow border-2 border-transparent hover:border-brand-green/20"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-primary-900 text-lg">Manage Inventory</h3>
                <p className="text-sm text-primary-500">Track stock levels and items.</p>
              </div>
            </Link>
          </motion.div>

          {/* Additional Analytics */}
          {!analyticsLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6"
            >
              <h2 className="text-xl font-bold text-primary-900 mb-4">Additional Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Facilities - Deposits */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Total Deposits</p>
                      <p className="text-xl font-bold text-slate-900">
                        ${analytics.facilities.totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Facilities - Upcoming Renewals */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${analytics.facilities.upcomingRenewals > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
                      <Calendar className={`w-5 h-5 ${analytics.facilities.upcomingRenewals > 0 ? 'text-orange-600' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Upcoming Renewals</p>
                      <p className={`text-xl font-bold ${analytics.facilities.upcomingRenewals > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                        {analytics.facilities.upcomingRenewals}
                      </p>
                      <p className="text-xs text-slate-400">Next 90 days</p>
                    </div>
                  </div>
                </motion.div>

                {/* Fleet - Expiring Tags */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${analytics.fleet.expiringTags > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                      <Tag className={`w-5 h-5 ${analytics.fleet.expiringTags > 0 ? 'text-red-600' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Expiring Tags</p>
                      <p className={`text-xl font-bold ${analytics.fleet.expiringTags > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {analytics.fleet.expiringTags}
                      </p>
                      <p className="text-xs text-slate-400">Next 60 days</p>
                    </div>
                  </div>
                </motion.div>

                {/* Inventory - Total Quantity */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Layers className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Total Quantity</p>
                      <p className="text-xl font-bold text-slate-900">
                        {analytics.inventory.totalQuantity.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">{analytics.inventory.categories} categories</p>
                    </div>
                  </div>
                </motion.div>

                {/* Facilities - Average Rent */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Rent/Facility</p>
                      <p className="text-xl font-bold text-slate-900">
                        ${analytics.facilities.averageRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Fleet - Average Mileage */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Mileage</p>
                      <p className="text-xl font-bold text-slate-900">
                        {Math.round(analytics.fleet.averageMileage).toLocaleString()} mi
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Inventory - Low Stock Alert */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 }}
                  className={`rounded-2xl shadow-lg border-2 p-6 hover:shadow-xl transition-all ${analytics.inventory.lowStock > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${analytics.inventory.lowStock > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                      <AlertTriangle className={`w-5 h-5 ${analytics.inventory.lowStock > 0 ? 'text-red-600' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Low Stock Items</p>
                      <p className={`text-xl font-bold ${analytics.inventory.lowStock > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {analytics.inventory.lowStock}
                      </p>
                      {analytics.inventory.lowStock > 0 && (
                        <p className="text-xs text-red-500">Action needed</p>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Inventory - Average Value */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Value/Item</p>
                      <p className="text-xl font-bold text-slate-900">
                        ${analytics.inventory.total > 0 
                          ? (analytics.inventory.totalValue / analytics.inventory.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '0.00'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
