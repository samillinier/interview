'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  LogOut,
  ArrowLeft,
  LayoutDashboard,
  FileText,
  Menu,
  X,
  Building2,
  Car,
  Calendar,
  Clock,
  Wrench,
  MapPin,
  Plane,
  Square,
  MessageSquare,
  Users as UsersIcon,
  Paperclip,
  CreditCard,
  Download,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Bell,
  BarChart3
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

interface InstallerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  username?: string
  status: string
  yearsOfExperience?: number
  flooringSpecialties?: string
  flooringSkills?: string
  hasOwnCrew: boolean
  crewSize?: number
  hasInsurance: boolean
  overallScore?: number
  createdAt: string
  hasGeneralLiability?: boolean
  hasCommercialAutoLiability?: boolean
  hasWorkersComp?: boolean
  hasWorkersCompExemption?: boolean
  isSunbizRegistered?: boolean
  isSunbizActive?: boolean
  hasBusinessLicense?: boolean
  canPassBackgroundCheck?: boolean
  backgroundCheckDetails?: string
  insuranceType?: string
  hasLicense?: boolean
  licenseNumber?: string
  licenseExpiry?: string
  mondayToFridayAvailability?: string
  saturdayAvailability?: string
  vehicleDescription?: string
  hasVehicle?: boolean
  willingToTravel?: boolean
  maxTravelDistance?: number
  travelLocations?: string
  previousEmployers?: string
  hasOwnTools?: boolean
  toolsDescription?: string
  serviceAreas?: string
  availability?: string
  canStartImmediately?: boolean
  preferredStartDate?: string
  notes?: string
  followUpDate?: string
  followUpReason?: string
  passFailReason?: string
  photoUrl?: string
  companyName?: string
  companyTitle?: string
  companyStreetAddress?: string
  companyCity?: string
  companyState?: string
  companyZipCode?: string
  // Carpet Installation
  wantsToAddCarpet?: boolean
  installsStretchInCarpet?: boolean
  dailyStretchInCarpetSqft?: number
  installsGlueDownCarpet?: boolean
  // Hardwood Installation
  wantsToAddHardwood?: boolean
  installsNailDownSolidHardwood?: boolean
  dailyNailDownSolidHardwoodSqft?: number
  installsStapleDownEngineeredHardwood?: boolean
  // Laminate Installation
  wantsToAddLaminate?: boolean
  dailyLaminateSqft?: number
  installsLaminateOnStairs?: boolean
  // Vinyl Installation
  wantsToAddVinyl?: boolean
  installsSheetVinyl?: boolean
  installsLuxuryVinylPlank?: boolean
  dailyLuxuryVinylPlankSqft?: number
  installsLuxuryVinylTile?: boolean
  installsVinylCompositionTile?: boolean
  dailyVinylCompositionTileSqft?: number
  // Tile Installation
  wantsToAddTile?: boolean
  installsCeramicTile?: boolean
  dailyCeramicTileSqft?: number
  installsPorcelainTile?: boolean
  dailyPorcelainTileSqft?: number
  installsStoneTile?: boolean
  dailyStoneTileSqft?: number
  offersTileRemoval?: boolean
  installsTileBacksplash?: boolean
  dailyTileBacksplashSqft?: number
  // Additional Work
  movesFurniture?: boolean
  installsTrim?: boolean
  // Payment Information
  paymentCompanyName?: string
  paymentContactPerson?: string
  paymentPhoneNumber?: string
  paymentBusinessAddress?: string
  paymentEmailAddress?: string
  paymentBankName?: string
  paymentAccountName?: string
  paymentAccountNumber?: string
  paymentRoutingNumber?: string
  paymentAccountType?: string
  paymentAuthorizationName?: string
  paymentAuthorizationSignature?: string
  paymentAuthorizationDate?: string
}

export default function InstallerProfileViewPage() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()
  const installerId = params?.id as string

  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [documents, setDocuments] = useState<any[]>([])
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
    } else if (sessionStatus === 'authenticated' && installerId) {
      fetchInstallerProfile()
    }
  }, [sessionStatus, installerId, router])

  const fetchInstallerProfile = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await fetch(`/api/installers/${installerId}`)
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an error. Please try again.')
      }
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load installer profile')
      }
      const data = await response.json()
      setInstaller(data.installer)

      // Load documents
      const docsResponse = await fetch(`/api/installers/${installerId}/documents`)
      if (docsResponse.ok) {
        const docsContentType = docsResponse.headers.get('content-type')
        if (docsContentType && docsContentType.includes('application/json')) {
          const docsData = await docsResponse.json()
          setDocuments(docsData.documents || [])
        }
      }
    } catch (err: any) {
      console.error('Error fetching installer profile:', err)
      setError(err.message || 'Failed to load installer profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
      case 'qualified':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-green">
            <CheckCircle2 className="w-4 h-4" />
            Qualified
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
            <XCircle className="w-4 h-4" />
            Not Qualified
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600">
            <Clock className="w-4 h-4" />
            Pending
          </span>
        )
      default:
        return <span className="text-sm text-slate-500 capitalize">{status}</span>
    }
  }

  // Calculate profile completion percentage
  const calculateProfileCompletion = (): number => {
    if (!installer) return 0
    
    const fields = [
      // Basic Info
      installer.firstName,
      installer.lastName,
      installer.phone,
      installer.email,
      installer.photoUrl,
      // Company Info
      installer.companyName,
      installer.companyTitle,
      installer.companyStreetAddress,
      installer.companyCity,
      installer.companyState,
      installer.companyZipCode,
      // Experience & Skills
      installer.yearsOfExperience,
      installer.flooringSpecialties,
      installer.flooringSkills,
      installer.hasOwnCrew !== undefined,
      installer.crewSize,
      // Insurance & Registration
      installer.hasInsurance !== undefined,
      installer.insuranceType,
      installer.hasLicense !== undefined,
      installer.licenseNumber,
      installer.hasGeneralLiability !== undefined,
      installer.hasCommercialAutoLiability !== undefined,
      installer.hasWorkersComp !== undefined,
      installer.isSunbizRegistered !== undefined,
      installer.hasBusinessLicense !== undefined,
      // Tools & Equipment
      installer.hasOwnTools !== undefined,
      installer.toolsDescription,
      installer.hasVehicle !== undefined,
      installer.vehicleDescription,
      // Travel & Availability
      installer.willingToTravel !== undefined,
      installer.maxTravelDistance,
      installer.canStartImmediately !== undefined,
      installer.preferredStartDate,
      installer.mondayToFridayAvailability,
      installer.saturdayAvailability,
      // Carpet Installation
      installer.wantsToAddCarpet !== undefined,
      installer.installsStretchInCarpet !== undefined,
      installer.dailyStretchInCarpetSqft,
      installer.installsGlueDownCarpet !== undefined,
      // Hardwood Installation
      installer.wantsToAddHardwood !== undefined,
      installer.installsNailDownSolidHardwood !== undefined,
      installer.dailyNailDownSolidHardwoodSqft,
      installer.installsStapleDownEngineeredHardwood !== undefined,
      // Laminate Installation
      installer.wantsToAddLaminate !== undefined,
      installer.dailyLaminateSqft,
      installer.installsLaminateOnStairs !== undefined,
      // Vinyl Installation
      installer.wantsToAddVinyl !== undefined,
      installer.installsSheetVinyl !== undefined,
      installer.installsLuxuryVinylPlank !== undefined,
      installer.dailyLuxuryVinylPlankSqft,
      installer.installsLuxuryVinylTile !== undefined,
      installer.installsVinylCompositionTile !== undefined,
      installer.dailyVinylCompositionTileSqft,
      // Tile Installation
      installer.wantsToAddTile !== undefined,
      installer.installsCeramicTile !== undefined,
      installer.dailyCeramicTileSqft,
      installer.installsPorcelainTile !== undefined,
      installer.dailyPorcelainTileSqft,
      installer.installsStoneTile !== undefined,
      installer.dailyStoneTileSqft,
      installer.offersTileRemoval !== undefined,
      installer.installsTileBacksplash !== undefined,
      installer.dailyTileBacksplashSqft,
      // Additional Work
      installer.movesFurniture !== undefined,
      installer.installsTrim !== undefined,
    ]
    
    const filledFields = fields.filter(field => {
      if (field === undefined || field === null) return false
      if (typeof field === 'string' && field.trim() === '') return false
      if (typeof field === 'number' && field === 0) return false
      return true
    }).length
    
    const totalFields = fields.length
    const percentage = Math.round((filledFields / totalFields) * 100)
    
    return Math.min(percentage, 100)
  }

  const profileCompletion = installer ? calculateProfileCompletion() : 0
  const isProfileUnfinished = installer ? (profileCompletion < 100 || !installer.overallScore) : false

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading installer profile...</p>
        </div>
      </div>
    )
  }

  if (!session || !installer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <XCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Profile Not Found</h2>
          <p className="text-primary-500 mb-6">
            {error || 'Unable to load installer profile.'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
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
                <h1 className="font-bold text-primary-900 text-sm">Recruitment Hub</h1>
                <p className="text-xs text-primary-500">Admin Dashboard</p>
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

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname.startsWith('/dashboard/installers') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <UsersIcon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Installers</span>}
          </Link>
          <Link
            href="/dashboard/jobs"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/jobs' || pathname?.startsWith('/dashboard/jobs') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Briefcase className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Jobs</span>}
          </Link>
          <Link
            href="/dashboard/analytics"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/analytics' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Analytics</span>}
          </Link>
          <Link
            href="/dashboard/notifications"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/notifications' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Notifications</span>}
          </Link>
          <Link
            href="/dashboard/messages"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/messages' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Messages</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {session.user?.name || 'Admin'}
                </p>
                <p className="text-xs text-primary-500 truncate">{session.user?.email}</p>
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

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white rounded-lg shadow-lg border border-slate-200"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full bg-brand-green border-r border-brand-green-dark transition-transform duration-300 z-40 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10">
              <Image
                src={logo}
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-primary-900 text-sm">Recruitment Hub</h1>
              <p className="text-xs text-primary-500">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium">
            <UsersIcon className="w-5 h-5" />
            <span>Installers</span>
          </Link>
          <Link href="/dashboard/jobs" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            pathname === '/dashboard/jobs' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}>
            <Briefcase className="w-5 h-5" />
            <span>Jobs</span>
          </Link>
          <Link href="/dashboard/analytics" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            pathname === '/dashboard/analytics' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}>
            <BarChart3 className="w-5 h-5" />
            <span>Analytics</span>
          </Link>
          <Link href="/dashboard/notifications" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </Link>
          <Link href="/dashboard/messages" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <MessageSquare className="w-5 h-5" />
            <span>Messages</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-900 text-sm truncate">
                {session.user?.name || 'Admin'}
              </p>
              <p className="text-xs text-primary-500 truncate">{session.user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-1">Installer Profile</h1>
                  <p className="text-sm text-slate-500">View installer details and information</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {/* Unfinished Profile Loading Banner */}
          {isProfileUnfinished && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-900 font-medium">Profile Completion</h3>
                <span className="text-brand-green font-semibold">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-brand-green rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white via-white to-slate-50/50 rounded-3xl shadow-xl border border-slate-200/60 p-8 md:p-10 mb-6 backdrop-blur-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
              <div className="flex items-center gap-5 flex-1">
                {installer.status === 'passed' || installer.status === 'qualified' ? (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 bg-gradient-to-br from-brand-green/20 to-brand-green/10 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-green/30 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-10 h-10 text-brand-green" />
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 bg-gradient-to-br from-danger-100 to-danger-200 rounded-2xl flex items-center justify-center shadow-lg shadow-danger-200/50 flex-shrink-0"
                  >
                    <XCircle className="w-10 h-10 text-danger-600" />
                  </motion.div>
                )}
                <div className="flex-1 min-w-0">
                  <motion.h2 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-5xl font-bold text-slate-900 mb-2 leading-tight"
                  >
                    {installer.firstName} {installer.lastName}
                  </motion.h2>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {installer.overallScore !== null && installer.overallScore !== undefined && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-4 flex-shrink-0"
                  >
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-2 font-medium uppercase tracking-wide">Overall Score</p>
                      <div className="flex items-baseline gap-2 justify-end">
                        <span className="text-5xl font-bold bg-gradient-to-br from-brand-green to-brand-green-dark bg-clip-text text-transparent">
                          {installer.overallScore}
                        </span>
                        <span className="text-xl text-slate-400 font-medium">/100</span>
                      </div>
                    </div>
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand-green/30 shadow-lg flex-shrink-0 bg-brand-green/10 flex items-center justify-center">
                      {installer.photoUrl ? (
                        <Image
                          src={installer.photoUrl}
                          alt={`${installer.firstName} ${installer.lastName}`}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Error loading image:', installer.photoUrl)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <User className="w-10 h-10 text-brand-green" />
                      )}
                    </div>
                  </motion.div>
                )}
                {(!installer.overallScore || installer.overallScore === null || installer.overallScore === undefined) && (
                  installer.photoUrl ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex-shrink-0 ml-auto"
                    >
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl ring-2 ring-brand-green/20">
                        <Image
                          src={installer.photoUrl}
                          alt={`${installer.firstName} ${installer.lastName}`}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Error loading image:', installer.photoUrl)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex-shrink-0 ml-auto"
                    >
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-green/20 to-brand-green/10 border-4 border-white shadow-xl ring-2 ring-brand-green/20 flex items-center justify-center">
                        <User className="w-12 h-12 text-brand-green" />
                      </div>
                    </motion.div>
                  )
                )}
              </div>
            </div>
          </motion.div>

          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Profile Information</h2>
                <p className="text-sm text-slate-500">Personal and contact details</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">First Name</p>
                    <p className="font-semibold text-slate-900 text-lg">{installer.firstName || <span className="text-slate-400 italic">Not provided</span>}</p>
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Last Name</p>
                    <p className="font-semibold text-slate-900 text-lg">{installer.lastName || <span className="text-slate-400 italic">Not provided</span>}</p>
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email</p>
                    <p className="font-semibold text-slate-900 text-lg break-all">{installer.email}</p>
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Phone</p>
                    <p className="font-semibold text-slate-900 text-lg">{installer.phone || <span className="text-slate-400 italic">Not provided</span>}</p>
                  </div>
                </div>
              </div>

              {installer.username && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Username</p>
                      <p className="font-semibold text-slate-900 text-lg">{installer.username}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Experience</p>
                    <p className="font-semibold text-slate-900 text-lg">
                      {installer.yearsOfExperience ? `${installer.yearsOfExperience} years` : <span className="text-slate-400 italic">Not specified</span>}
                    </p>
                  </div>
                </div>
              </div>

              {installer.flooringSpecialties && (() => {
                try {
                  const specialties = typeof installer.flooringSpecialties === 'string' 
                    ? JSON.parse(installer.flooringSpecialties)
                    : installer.flooringSpecialties
                  const specialtiesList = Array.isArray(specialties) ? specialties : [specialties]
                  return (
                    <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-5 h-5 text-brand-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Flooring Specialties</p>
                          <div className="flex flex-wrap gap-2">
                            {specialtiesList.map((specialty: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                } catch {
                  return null
                }
              })()}

              {installer.flooringSkills && (() => {
                try {
                  const skills = typeof installer.flooringSkills === 'string' 
                    ? JSON.parse(installer.flooringSkills)
                    : installer.flooringSkills
                  const skillsList = Array.isArray(skills) ? skills : [skills]
                  return (
                    <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-5 h-5 text-brand-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Flooring Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {skillsList.map((skill: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                } catch {
                  return null
                }
              })()}

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Own Crew</p>
                    <p className="font-semibold text-slate-900 text-lg">
                      {installer.hasOwnCrew ? (
                        `Yes${installer.crewSize ? ` (${installer.crewSize} members)` : ''}`
                      ) : (
                        <span className="text-slate-400 italic">No</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {installer.companyName && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Name</p>
                      <p className="font-semibold text-slate-900 text-lg">{installer.companyName}</p>
                    </div>
                  </div>
                </div>
              )}

              {installer.companyTitle && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Title</p>
                      <p className="font-semibold text-slate-900 text-lg">{installer.companyTitle}</p>
                    </div>
                  </div>
                </div>
              )}

              {installer.companyStreetAddress && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Address</p>
                      <p className="font-semibold text-slate-900 text-lg">
                        {installer.companyStreetAddress}
                        {installer.companyCity && `, ${installer.companyCity}`}
                        {installer.companyState && `, ${installer.companyState}`}
                        {installer.companyZipCode && ` ${installer.companyZipCode}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Insurance & Registration Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Insurance & Registration</h2>
                <p className="text-sm text-slate-500">Business insurance, licensing, and registration details</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {installer.hasInsurance !== undefined && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Has Insurance</p>
                        <p className="font-semibold text-slate-900">
                          {installer.hasInsurance ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {installer.hasGeneralLiability !== undefined && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">General Liability</p>
                        <p className="font-semibold text-slate-900">
                          {installer.hasGeneralLiability ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {installer.hasCommercialAutoLiability !== undefined && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Car className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Commercial Auto Liability</p>
                        <p className="font-semibold text-slate-900">
                          {installer.hasCommercialAutoLiability ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {installer.hasWorkersComp !== undefined && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Workers Compensation</p>
                        <p className="font-semibold text-slate-900">
                          {installer.hasWorkersComp ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {installer.isSunbizRegistered !== undefined && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sunbiz Registered</p>
                        <p className="font-semibold text-slate-900">
                          {installer.isSunbizRegistered ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {installer.hasBusinessLicense !== undefined && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Business License</p>
                        <p className="font-semibold text-slate-900">
                          {installer.hasBusinessLicense ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {installer.hasLicense && installer.licenseNumber && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">License Number</p>
                      <p className="font-semibold text-slate-900 text-lg">{installer.licenseNumber}</p>
                      {installer.licenseExpiry && (
                        <p className="text-xs text-slate-500 mt-1">
                          Expires: {new Date(installer.licenseExpiry).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Availability Information */}
          {(installer.mondayToFridayAvailability || installer.saturdayAvailability) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Availability</h2>
                  <p className="text-sm text-slate-500">Work schedule and availability information</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.mondayToFridayAvailability && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Monday - Friday</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.mondayToFridayAvailability}</p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.saturdayAvailability && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Saturday</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.saturdayAvailability}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tools & Equipment */}
          {(installer.hasOwnTools !== undefined || installer.toolsDescription || installer.hasVehicle !== undefined || installer.vehicleDescription) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Tools & Equipment</h2>
                  <p className="text-sm text-slate-500">Tools and equipment information</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.hasOwnTools !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-5 h-5 text-brand-green" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Own Tools</p>
                          <p className="font-semibold text-slate-900">
                            {installer.hasOwnTools ? (
                              <span className="text-success-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Yes
                              </span>
                            ) : (
                              <span className="text-slate-400">No</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {installer.toolsDescription && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tools Description</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.toolsDescription}</p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.hasVehicle !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Car className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Has Vehicle</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.hasVehicle ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.vehicleDescription && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Car className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Vehicle Description</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.vehicleDescription}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Work History & Service Areas */}
          {(installer.previousEmployers || installer.serviceAreas) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Work History & Service Areas</h2>
                  <p className="text-sm text-slate-500">Previous employers and service areas</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.previousEmployers && (() => {
                  try {
                    const employers = typeof installer.previousEmployers === 'string' 
                      ? JSON.parse(installer.previousEmployers)
                      : installer.previousEmployers
                    const employersList = Array.isArray(employers) ? employers : [employers]
                    return (
                      <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Previous Employers</p>
                            <div className="flex flex-wrap gap-2">
                              {employersList.map((employer: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                                  {employer}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  } catch {
                    return (
                      <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Previous Employers</p>
                            <p className="font-semibold text-slate-900 text-lg">{installer.previousEmployers}</p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })()}

                {installer.serviceAreas && (() => {
                  try {
                    const areas = typeof installer.serviceAreas === 'string' 
                      ? JSON.parse(installer.serviceAreas)
                      : installer.serviceAreas
                    const areasList = Array.isArray(areas) ? areas : [areas]
                    return (
                      <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Service Areas</p>
                            <div className="flex flex-wrap gap-2">
                              {areasList.map((area: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  } catch {
                    return (
                      <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Service Areas</p>
                            <p className="font-semibold text-slate-900 text-lg">{installer.serviceAreas}</p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })()}
              </div>
            </motion.div>
          )}

          {/* Travel & Start Date Information */}
          {(installer.willingToTravel !== undefined || installer.maxTravelDistance || installer.canStartImmediately !== undefined || installer.preferredStartDate || installer.travelLocations) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Travel & Start Date</h2>
                  <p className="text-sm text-slate-500">Travel preferences and start date information</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Plane className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.willingToTravel !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Plane className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Willing to Travel</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.willingToTravel ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.maxTravelDistance && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Max Travel Distance (miles)</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.maxTravelDistance} miles</p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.travelLocations && (() => {
                  try {
                    const locations = typeof installer.travelLocations === 'string' 
                      ? JSON.parse(installer.travelLocations)
                      : installer.travelLocations
                    const locationsList = Array.isArray(locations) ? locations : [locations]
                    return (
                      <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <Plane className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Travel Locations</p>
                            <div className="flex flex-wrap gap-2">
                              {locationsList.map((location: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                                  {location}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  } catch {
                    return null
                  }
                })()}

                {installer.canStartImmediately !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Can Start Immediately</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.canStartImmediately ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.preferredStartDate && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Preferred Start Date</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {new Date(installer.preferredStartDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Carpet Installation Information */}
          {(installer.wantsToAddCarpet !== undefined || installer.installsStretchInCarpet !== undefined || installer.dailyStretchInCarpetSqft || installer.installsGlueDownCarpet !== undefined) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Carpet Installation</h2>
                  <p className="text-sm text-slate-500">Carpet installation capabilities and capacity</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Square className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.wantsToAddCarpet !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Carpet as Category</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.wantsToAddCarpet ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsStretchInCarpet !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Stretch-in Carpet</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsStretchInCarpet ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.dailyStretchInCarpetSqft && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Stretch-in Carpet Average</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.dailyStretchInCarpetSqft.toLocaleString()} sq ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsGlueDownCarpet !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Glue Down Carpet</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsGlueDownCarpet ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Hardwood Installation Information */}
          {(installer.wantsToAddHardwood !== undefined || installer.installsNailDownSolidHardwood !== undefined || installer.dailyNailDownSolidHardwoodSqft || installer.installsStapleDownEngineeredHardwood !== undefined) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Hardwood Installation</h2>
                  <p className="text-sm text-slate-500">Hardwood installation capabilities and capacity</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Square className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.wantsToAddHardwood !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Hardwood as Category</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.wantsToAddHardwood ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsNailDownSolidHardwood !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Nail Down Solid Hardwood</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsNailDownSolidHardwood ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.dailyNailDownSolidHardwoodSqft && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Nail Down Solid Hardwood Average</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.dailyNailDownSolidHardwoodSqft.toLocaleString()} sq ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsStapleDownEngineeredHardwood !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Staple-down Engineered Hardwood</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsStapleDownEngineeredHardwood ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Laminate Installation Information */}
          {(installer.wantsToAddLaminate !== undefined || installer.dailyLaminateSqft || installer.installsLaminateOnStairs !== undefined) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Laminate Installation</h2>
                  <p className="text-sm text-slate-500">Laminate installation capabilities and capacity</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Square className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.wantsToAddLaminate !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Laminate as Category</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.wantsToAddLaminate ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.dailyLaminateSqft && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Laminate Average</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.dailyLaminateSqft.toLocaleString()} sq ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsLaminateOnStairs !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Laminate on Stairs</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsLaminateOnStairs ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Vinyl Installation Information */}
          {(installer.wantsToAddVinyl !== undefined || installer.installsSheetVinyl !== undefined || installer.installsLuxuryVinylPlank !== undefined || installer.dailyLuxuryVinylPlankSqft || installer.installsLuxuryVinylTile !== undefined || installer.installsVinylCompositionTile !== undefined || installer.dailyVinylCompositionTileSqft) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Vinyl Installation</h2>
                  <p className="text-sm text-slate-500">Vinyl installation capabilities and capacity</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Square className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.wantsToAddVinyl !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Vinyl as Category</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.wantsToAddVinyl ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsSheetVinyl !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Sheet Vinyl</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsSheetVinyl ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsLuxuryVinylPlank !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Luxury Vinyl Plank (LVP)</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsLuxuryVinylPlank ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.dailyLuxuryVinylPlankSqft && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily LVP Average</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.dailyLuxuryVinylPlankSqft.toLocaleString()} sq ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsLuxuryVinylTile !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Luxury Vinyl Tile (LVT)</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsLuxuryVinylTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsVinylCompositionTile !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Vinyl Composition Tile (VCT)</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsVinylCompositionTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.dailyVinylCompositionTileSqft && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily VCT Average</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.dailyVinylCompositionTileSqft.toLocaleString()} sq ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tile Installation Information */}
          {(installer.wantsToAddTile !== undefined || installer.installsCeramicTile !== undefined || installer.dailyCeramicTileSqft || installer.installsPorcelainTile !== undefined || installer.dailyPorcelainTileSqft || installer.installsStoneTile !== undefined || installer.dailyStoneTileSqft || installer.offersTileRemoval !== undefined || installer.installsTileBacksplash !== undefined || installer.dailyTileBacksplashSqft) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Tile Installation</h2>
                  <p className="text-sm text-slate-500">Tile installation capabilities and capacity</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Square className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.wantsToAddTile !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Tile as Category</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.wantsToAddTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsCeramicTile !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Ceramic Tile</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsCeramicTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.dailyCeramicTileSqft && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Ceramic Tile Average</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.dailyCeramicTileSqft.toLocaleString()} sq ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsPorcelainTile !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Porcelain Tile</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsPorcelainTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.dailyPorcelainTileSqft && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Porcelain Tile Average</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.dailyPorcelainTileSqft.toLocaleString()} sq ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsStoneTile !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Stone Tile</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsStoneTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.dailyStoneTileSqft && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Stone Tile Average</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.dailyStoneTileSqft.toLocaleString()} sq ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.offersTileRemoval !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Offers Tile Removal</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.offersTileRemoval ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsTileBacksplash !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Tile Backsplash</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsTileBacksplash ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.dailyTileBacksplashSqft && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Tile Backsplash Average</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.dailyTileBacksplashSqft.toLocaleString()} sq ft
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Additional Work Information */}
          {(installer.movesFurniture !== undefined || installer.installsTrim !== undefined) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Additional Work</h2>
                  <p className="text-sm text-slate-500">Additional services and capabilities</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer.movesFurniture !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Moves Furniture</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.movesFurniture ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer.installsTrim !== undefined && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Trim</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.installsTrim ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Attachments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Attachments</h2>
                <p className="text-sm text-slate-500">Uploaded documents and files</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Paperclip className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12">
                <Paperclip className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{doc.type}</p>
                        <p className="font-semibold text-slate-900 text-sm truncate">{doc.fileName}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-green hover:underline mt-2"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Payment Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Payment Information</h2>
                  <p className="text-sm text-slate-500">Banking and payment details</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                {showPaymentDetails ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Hide Details</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View Details</span>
                  </>
                )}
              </button>
            </div>

            {!showPaymentDetails ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium mb-2">Payment information is hidden</p>
                <p className="text-sm text-slate-400">Click "View Details" to see banking information</p>
              </div>
            ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {installer.paymentCompanyName ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Name</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentCompanyName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Name</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentContactPerson ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact Person</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentContactPerson}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact Person</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentPhoneNumber ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Phone Number</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentPhoneNumber}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Phone Number</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentEmailAddress ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email Address</p>
                        <p className="font-semibold text-slate-900 text-lg break-all">{installer.paymentEmailAddress}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email Address</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentBusinessAddress ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Business Address</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentBusinessAddress}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Business Address</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentBankName ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bank Name</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentBankName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bank Name</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAccountName ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Name</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentAccountName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Name</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAccountNumber ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Number</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.paymentAccountNumber ? installer.paymentAccountNumber : <span className="text-slate-400 italic">Not provided</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Number</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentRoutingNumber ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Routing Number</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.paymentRoutingNumber ? installer.paymentRoutingNumber : <span className="text-slate-400 italic">Not provided</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Routing Number</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAccountType ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Type</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentAccountType}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Type</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAuthorizationName ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Name</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentAuthorizationName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Name</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAuthorizationSignature ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Signature</p>
                        <p className="font-semibold text-slate-900 text-lg italic">{installer.paymentAuthorizationSignature}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Signature</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAuthorizationDate ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Date</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {new Date(installer.paymentAuthorizationDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Date</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
