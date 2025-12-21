'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ArrowRight,
  RefreshCw,
  Plus,
  TrendingUp,
  Award,
  UserCheck,
  UserX,
  Sparkles,
  ChevronRight,
  Calendar,
  Shield,
  LogOut,
  Loader2,
  Download,
  Pencil,
  Trash2,
  X,
  Save,
  Car,
  FileCheck,
  Building2,
  Plane,
  Wrench,
  AlertCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { cn, formatDate } from '@/lib/utils'

interface Installer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  status: string
  yearsOfExperience?: number
  flooringSpecialties?: string
  flooringSkills?: string
  serviceAreas?: string
  hasOwnCrew: boolean
  crewSize?: number
  hasInsurance: boolean
  overallScore?: number
  createdAt: string
  // Insurance & Licensing
  hasGeneralLiability?: boolean
  hasCommercialAutoLiability?: boolean
  hasWorkersComp?: boolean
  hasWorkersCompExemption?: boolean
  isSunbizRegistered?: boolean
  isSunbizActive?: boolean
  hasBusinessLicense?: boolean
  // Background
  canPassBackgroundCheck?: boolean
  backgroundCheckDetails?: string
  // Vehicle
  vehicleDescription?: string
  hasVehicle?: boolean
  // Schedule
  mondayToFridayAvailability?: string
  saturdayAvailability?: string
  // Travel
  openToTravel?: boolean
  travelLocations?: string
  // Other
  notes?: string
  passFailReason?: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [installers, setInstallers] = useState<Installer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [experienceFilter, setExperienceFilter] = useState('all')
  const [selectedInstaller, setSelectedInstaller] = useState<Installer | null>(null)
  const [editingInstaller, setEditingInstaller] = useState<Installer | null>(null)
  const [deletingInstaller, setDeletingInstaller] = useState<Installer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Authentication disabled - allow access without sign-in
  // useEffect(() => {
  //   if (status === 'unauthenticated') {
  //     router.push('/auth/signin')
  //   }
  // }, [status, router])

  const fetchInstallers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      if (experienceFilter !== 'all') params.append('experience', experienceFilter)

      const response = await fetch(`/api/installers?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch installers: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      console.log('Fetched installers:', data.installers?.length || 0, 'installers')
      
      if (data.error) {
        console.error('API Error:', data.error)
        setInstallers([])
      } else {
        setInstallers(data.installers || [])
        setPagination(prev => ({ ...prev, ...data.pagination }))
      }
    } catch (error) {
      console.error('Error fetching installers:', error)
      setInstallers([])
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter, searchQuery, experienceFilter])

  useEffect(() => {
    fetchInstallers()
  }, [fetchInstallers])

  const getStatusConfig = (status: string) => {
    const configs = {
      passed: {
        bg: 'bg-emerald-500',
        bgLight: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: CheckCircle,
        label: 'Qualified'
      },
      failed: {
        bg: 'bg-red-500',
        bgLight: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: XCircle,
        label: 'Not Qualified'
      },
      pending: {
        bg: 'bg-amber-500',
        bgLight: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: Clock,
        label: 'Pending'
      },
    }
    return configs[status as keyof typeof configs] || configs.pending
  }

  const stats = {
    total: pagination.total,
    passed: installers.filter(i => i.status === 'passed').length,
    failed: installers.filter(i => i.status === 'failed').length,
    pending: installers.filter(i => i.status === 'pending').length,
  }

  // Export to Excel function
  const exportToExcel = () => {
    const exportData = installers.map(installer => ({
      'First Name': installer.firstName,
      'Last Name': installer.lastName,
      'Email': installer.email,
      'Phone': installer.phone || '',
      'Status': installer.status,
      'Score': installer.overallScore || '',
      'Years of Experience': installer.yearsOfExperience || '',
      'Flooring Skills': installer.flooringSkills ? (() => {
        try { return JSON.parse(installer.flooringSkills).join(', ') } catch { return installer.flooringSkills }
      })() : '',
      'Specialties': installer.flooringSpecialties ? (() => {
        try { return JSON.parse(installer.flooringSpecialties).join(', ') } catch { return '' }
      })() : '',
      'Has Own Crew': installer.hasOwnCrew ? 'Yes' : 'No',
      'Crew Size': installer.crewSize || '',
      'Vehicle': installer.vehicleDescription || '',
      // Insurance & Licensing
      'General Liability': installer.hasGeneralLiability ? 'Yes' : 'No',
      'Commercial Auto': installer.hasCommercialAutoLiability ? 'Yes' : 'No',
      'Workers Comp': installer.hasWorkersComp ? 'Yes' : 'No',
      'WC Exemption': installer.hasWorkersCompExemption ? 'Yes' : 'No',
      'Business License': installer.hasBusinessLicense ? 'Yes' : 'No',
      'Has Insurance': installer.hasInsurance ? 'Yes' : 'No',
      // SunBiz
      'SunBiz Registered': installer.isSunbizRegistered ? 'Yes' : 'No',
      'SunBiz Active': installer.isSunbizActive ? 'Yes' : 'No',
      // Background
      'Can Pass Background Check': installer.canPassBackgroundCheck === true ? 'Yes' : installer.canPassBackgroundCheck === false ? 'No' : '',
      'Background Details': installer.backgroundCheckDetails || '',
      // Schedule
      'Mon-Fri Availability': installer.mondayToFridayAvailability || '',
      'Saturday Availability': installer.saturdayAvailability || '',
      // Travel
      'Open to Travel': installer.openToTravel ? 'Yes' : 'No',
      'Travel Locations': installer.travelLocations ? (() => {
        try { return JSON.parse(installer.travelLocations).join(', ') } catch { return installer.travelLocations }
      })() : '',
      // Service Areas
      'Service Areas': installer.serviceAreas ? (() => {
        try { return JSON.parse(installer.serviceAreas).join(', ') } catch { return '' }
      })() : '',
      // Notes
      'Pass/Fail Reason': installer.passFailReason || '',
      'Notes': installer.notes || '',
      'Date Applied': new Date(installer.createdAt).toLocaleDateString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Installers')
    
    // Auto-size columns
    const maxWidth = 30
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, 10))
    }))
    worksheet['!cols'] = colWidths

    XLSX.writeFile(workbook, `FIS_Installers_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Delete installer
  const handleDelete = async (installer: Installer) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/installers/${installer.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setDeletingInstaller(null)
        fetchInstallers()
      }
    } catch (error) {
      console.error('Error deleting installer:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Update installer
  const handleUpdate = async (installer: Installer) => {
    setIsSaving(true)
    try {
      // Only send the fields that can be updated
      const updateData = {
        firstName: installer.firstName,
        lastName: installer.lastName,
        email: installer.email,
        phone: installer.phone || null,
        status: installer.status,
        yearsOfExperience: installer.yearsOfExperience || null,
      }
      
      const response = await fetch(`/api/installers/${installer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      if (response.ok) {
        setEditingInstaller(null)
        fetchInstallers()
      } else {
        console.error('Failed to update installer')
      }
    } catch (error) {
      console.error('Error updating installer:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Authentication disabled - no loading check needed
  // if (status === 'loading') {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
  //       <div className="text-center">
  //         <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
  //         <p className="text-slate-500 font-medium">Loading...</p>
  //       </div>
  //     </div>
  //   )
  // }

  // Authentication disabled - allow access without sign-in
  // if (!session) {
  //   return null
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-green/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-brand-yellow/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative border-b border-slate-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image
                src={logo}
                alt="Floor Interior Service"
                width={44}
                height={44}
                className="w-11 h-11 object-contain"
              />
            </Link>
            <div className="flex items-center gap-4">
              {/* User Profile Dropdown */}
              {session?.user && (
                <div className="relative group">
                  <button className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-medium text-slate-700">{session.user.name}</p>
                      <p className="text-xs text-slate-500">{session.user.email}</p>
                    </div>
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full ring-2 ring-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center text-white font-medium ring-2 ring-slate-200">
                        {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                      </div>
                    )}
                  </button>
                  
                  {/* Dropdown Menu */}
                  {/* Profile menu disabled when authentication is disabled */}
                  {session && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="p-3 border-b border-slate-100">
                        <p className="font-medium text-slate-900">{session.user?.name || 'User'}</p>
                        <p className="text-sm text-slate-500 truncate">{session.user?.email || ''}</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => signOut({ callbackUrl: '/' })}
                          className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-brand-green mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">Recruitment Hub</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Installer Dashboard
          </h1>
          <p className="text-slate-500 text-lg">
            Track and manage your prescreened flooring installers
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.total}</p>
              <p className="text-slate-500 font-medium">Total Applicants</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-4xl font-bold text-emerald-600 mb-1">{stats.passed}</p>
              <p className="text-slate-500 font-medium">Qualified</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-4xl font-bold text-red-600 mb-1">{stats.failed}</p>
              <p className="text-slate-500 font-medium">Not Qualified</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group relative bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-4xl font-bold text-amber-600 mb-1">{stats.pending}</p>
              <p className="text-slate-500 font-medium">Pending Review</p>
            </div>
          </motion.div>
        </div>

        {/* Search & Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search installers by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 outline-none transition-all bg-slate-50/50"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3.5 rounded-xl border border-slate-200 focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 outline-none transition-all bg-slate-50/50 font-medium text-slate-700"
              >
                <option value="all">All Status</option>
                <option value="passed">✓ Qualified</option>
                <option value="failed">✗ Not Qualified</option>
                <option value="pending">◐ Pending</option>
              </select>

              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="px-4 py-3.5 rounded-xl border border-slate-200 focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 outline-none transition-all bg-slate-50/50 font-medium text-slate-700"
              >
                <option value="all">All Experience</option>
                <option value="0-2">0-2 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10">10+ years</option>
              </select>

              <button
                onClick={fetchInstallers}
                className="px-4 py-3.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
              </button>

              <button
                onClick={exportToExcel}
                disabled={installers.length === 0}
                className="px-4 py-3.5 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to Excel"
              >
                <Download className="w-5 h-5" />
                <span className="hidden md:inline">Export</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Installers List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
        >
          {isLoading ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-brand-green rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Loading installers...</p>
            </div>
          ) : installers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No installers found
              </h3>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                Start prescreening candidates to see them appear here
              </p>
              <Link
                href="/interview"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/25"
              >
                <Plus className="w-5 h-5" />
                Start First Interview
              </Link>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200/60">
                <div className="col-span-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Installer</div>
                <div className="col-span-2 text-sm font-semibold text-slate-600 uppercase tracking-wider">Experience</div>
                <div className="col-span-2 text-sm font-semibold text-slate-600 uppercase tracking-wider">Flooring Skills</div>
                <div className="col-span-2 text-sm font-semibold text-slate-600 uppercase tracking-wider">Status</div>
                <div className="col-span-2 text-sm font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100">
                {installers.map((installer, index) => {
                  const statusConfig = getStatusConfig(installer.status)
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <motion.div
                      key={installer.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedInstaller(installer)}
                      className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* Installer Info */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center text-white font-semibold text-sm">
                            {installer.firstName.charAt(0)}{installer.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-brand-green transition-colors">
                              {installer.firstName} {installer.lastName}
                            </p>
                            <p className="text-sm text-slate-500">{installer.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Experience */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 font-medium">
                            {installer.yearsOfExperience ? `${installer.yearsOfExperience} yrs` : '—'}
                          </span>
                        </div>
                        {installer.hasOwnCrew && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Crew of {installer.crewSize || '?'}
                          </p>
                        )}
                      </div>

                      {/* Specialties */}
                      <div className="col-span-2">
                        {installer.flooringSkills ? (
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              try {
                                const skills = typeof installer.flooringSkills === 'string' 
                                  ? JSON.parse(installer.flooringSkills)
                                  : installer.flooringSkills
                                return Array.isArray(skills) 
                                  ? skills.slice(0, 2).map((skill: string) => (
                                      <span
                                        key={skill}
                                        className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium"
                                      >
                                        {skill}
                                      </span>
                                    ))
                                  : <span className="text-slate-400">—</span>
                              } catch {
                                // If parsing fails, try to display as string
                                const skillsStr = typeof installer.flooringSkills === 'string' 
                                  ? installer.flooringSkills 
                                  : ''
                                return skillsStr ? (
                                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                                    {skillsStr.split(',').slice(0, 2).join(', ')}
                                  </span>
                                ) : <span className="text-slate-400">—</span>
                              }
                            })()}
                          </div>
                        ) : installer.flooringSpecialties ? (
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              try {
                                return JSON.parse(installer.flooringSpecialties)
                                  .slice(0, 2)
                                  .map((specialty: string) => (
                                    <span
                                      key={specialty}
                                      className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium"
                                    >
                                      {specialty}
                                    </span>
                                  ))
                              } catch {
                                return <span className="text-slate-400">—</span>
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
                            statusConfig.bgLight,
                            statusConfig.text
                          )}
                        >
                          <StatusIcon className="w-4 h-4" />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingInstaller({...installer})
                          }}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingInstaller(installer)
                          }}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200/60 flex items-center justify-between bg-slate-50/50">
                  <p className="text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-semibold text-slate-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-semibold text-slate-700">{pagination.total}</span> installers
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Installer Detail Modal */}
      <AnimatePresence>
        {selectedInstaller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedInstaller(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative p-8 pb-6 bg-gradient-to-br from-brand-green to-brand-green-dark text-white rounded-t-3xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNHMxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
                      {selectedInstaller.firstName.charAt(0)}{selectedInstaller.lastName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedInstaller.firstName} {selectedInstaller.lastName}
                      </h2>
                      <p className="text-white/80">{selectedInstaller.email}</p>
                    </div>
                  </div>
                  {(() => {
                    const statusConfig = getStatusConfig(selectedInstaller.status)
                    const StatusIcon = statusConfig.icon
                    return (
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-white',
                        statusConfig.text
                      )}>
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig.label}
                      </span>
                    )
                  })()}
                </div>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Score Section */}
                {selectedInstaller.overallScore !== null && selectedInstaller.overallScore !== undefined && (
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Award className="w-5 h-5 text-brand-green" />
                        </div>
                        <span className="font-semibold text-slate-700">Interview Score</span>
                      </div>
                      <span className="text-3xl font-bold text-slate-900">
                        {selectedInstaller.overallScore}<span className="text-lg text-slate-400">/100</span>
                      </span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedInstaller.overallScore}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={cn(
                          'h-full rounded-full',
                          selectedInstaller.overallScore >= 70 ? 'bg-emerald-500' :
                          selectedInstaller.overallScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Basic Info Grid */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Basic Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Briefcase className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-500">Experience</span>
                      </div>
                      <p className="font-semibold text-slate-900 text-lg">
                        {selectedInstaller.yearsOfExperience ? `${selectedInstaller.yearsOfExperience} years` : 'Not specified'}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-500">Crew</span>
                      </div>
                      <p className="font-semibold text-slate-900 text-lg">
                        {selectedInstaller.hasOwnCrew ? `Yes, ${selectedInstaller.crewSize || '?'} members` : 'No crew'}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-500">Phone</span>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {selectedInstaller.phone || 'Not provided'}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Car className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-500">Vehicle</span>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {selectedInstaller.vehicleDescription || (selectedInstaller.hasVehicle ? 'Yes' : 'Not specified')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Skills & Specialties */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Flooring Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedInstaller.flooringSkills ? (
                      (() => {
                        try {
                          return JSON.parse(selectedInstaller.flooringSkills).map((skill: string) => (
                            <span
                              key={skill}
                              className="px-4 py-2 bg-brand-green/10 text-brand-green rounded-lg font-medium"
                            >
                              {skill}
                            </span>
                          ))
                        } catch {
                          return <span className="text-slate-500">{selectedInstaller.flooringSkills}</span>
                        }
                      })()
                    ) : selectedInstaller.flooringSpecialties ? (
                      (() => {
                        try {
                          return JSON.parse(selectedInstaller.flooringSpecialties).map((specialty: string) => (
                            <span
                              key={specialty}
                              className="px-4 py-2 bg-brand-green/10 text-brand-green rounded-lg font-medium"
                            >
                              {specialty}
                            </span>
                          ))
                        } catch {
                          return null
                        }
                      })()
                    ) : (
                      <span className="text-slate-500">Not specified</span>
                    )}
                  </div>
                </div>

                {/* Insurance & Licensing */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Insurance & Licensing</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedInstaller.hasGeneralLiability ? "bg-emerald-100" : "bg-slate-200"
                      )}>
                        {selectedInstaller.hasGeneralLiability ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">General Liability</span>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedInstaller.hasCommercialAutoLiability ? "bg-emerald-100" : "bg-slate-200"
                      )}>
                        {selectedInstaller.hasCommercialAutoLiability ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">Commercial Auto</span>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedInstaller.hasWorkersComp ? "bg-emerald-100" : "bg-slate-200"
                      )}>
                        {selectedInstaller.hasWorkersComp ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">Worker's Comp</span>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedInstaller.hasWorkersCompExemption ? "bg-emerald-100" : "bg-slate-200"
                      )}>
                        {selectedInstaller.hasWorkersCompExemption ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">WC Exemption</span>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedInstaller.hasBusinessLicense ? "bg-emerald-100" : "bg-slate-200"
                      )}>
                        {selectedInstaller.hasBusinessLicense ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">Business License</span>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedInstaller.hasInsurance ? "bg-emerald-100" : "bg-slate-200"
                      )}>
                        {selectedInstaller.hasInsurance ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">Insurance</span>
                    </div>
                  </div>
                </div>

                {/* SunBiz Registration */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">SunBiz Registration</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedInstaller.isSunbizRegistered ? "bg-emerald-100" : "bg-slate-200"
                      )}>
                        {selectedInstaller.isSunbizRegistered ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">SunBiz Registered</span>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedInstaller.isSunbizActive ? "bg-emerald-100" : "bg-slate-200"
                      )}>
                        {selectedInstaller.isSunbizActive ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">SunBiz Active</span>
                    </div>
                  </div>
                </div>

                {/* Background Check */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Background Check</p>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        selectedInstaller.canPassBackgroundCheck ? "bg-emerald-100" : 
                        selectedInstaller.canPassBackgroundCheck === false ? "bg-red-100" : "bg-slate-200"
                      )}>
                        {selectedInstaller.canPassBackgroundCheck ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : selectedInstaller.canPassBackgroundCheck === false ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className={cn(
                          "font-semibold",
                          selectedInstaller.canPassBackgroundCheck ? "text-emerald-600" : 
                          selectedInstaller.canPassBackgroundCheck === false ? "text-red-600" : "text-slate-600"
                        )}>
                          {selectedInstaller.canPassBackgroundCheck ? 'Can Pass' : 
                           selectedInstaller.canPassBackgroundCheck === false ? 'May Have Issues' : 'Not Specified'}
                        </p>
                        {selectedInstaller.backgroundCheckDetails && (
                          <p className="text-sm text-slate-500 mt-1">{selectedInstaller.backgroundCheckDetails}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Availability */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Schedule Availability</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-500">Monday - Friday</span>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {selectedInstaller.mondayToFridayAvailability || 'Not specified'}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-500">Saturday</span>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {selectedInstaller.saturdayAvailability || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Travel Availability */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Travel</p>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        selectedInstaller.openToTravel ? "bg-emerald-100" : "bg-slate-200"
                      )}>
                        <Plane className={cn(
                          "w-5 h-5",
                          selectedInstaller.openToTravel ? "text-emerald-600" : "text-slate-400"
                        )} />
                      </div>
                      <p className="font-semibold text-slate-900">
                        {selectedInstaller.openToTravel ? 'Open to Travel' : 'Not Open to Travel'}
                      </p>
                    </div>
                    {selectedInstaller.openToTravel && selectedInstaller.travelLocations && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">Willing to travel to:</p>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            try {
                              return JSON.parse(selectedInstaller.travelLocations).map((location: string) => (
                                <span
                                  key={location}
                                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                                >
                                  {location}
                                </span>
                              ))
                            } catch {
                              return <span className="text-slate-500">{selectedInstaller.travelLocations}</span>
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Areas */}
                {selectedInstaller.serviceAreas && (
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Service Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        try {
                          return JSON.parse(selectedInstaller.serviceAreas).map((area: string) => (
                            <span
                              key={area}
                              className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium"
                            >
                              {area}
                            </span>
                          ))
                        } catch {
                          return <span className="text-slate-500">{selectedInstaller.serviceAreas}</span>
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {(selectedInstaller.notes || selectedInstaller.passFailReason) && (
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Notes</p>
                    <div className="bg-slate-50 rounded-xl p-4">
                      {selectedInstaller.passFailReason && (
                        <p className="text-slate-700 mb-2"><strong>Result:</strong> {selectedInstaller.passFailReason}</p>
                      )}
                      {selectedInstaller.notes && (
                        <p className="text-slate-700">{selectedInstaller.notes}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 sticky bottom-0 bg-white">
                  {selectedInstaller.email && (
                    <a
                      href={`mailto:${selectedInstaller.email}`}
                      className="flex-1 px-6 py-4 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/25 flex items-center justify-center gap-2"
                    >
                      <Mail className="w-5 h-5" />
                      Send Email
                    </a>
                  )}
                  {selectedInstaller.phone && (
                    <a
                      href={`tel:${selectedInstaller.phone}`}
                      className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Phone className="w-5 h-5" />
                      Call Now
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Installer Modal */}
      <AnimatePresence>
        {editingInstaller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setEditingInstaller(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Edit Installer</h2>
                <button
                  onClick={() => setEditingInstaller(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editingInstaller.firstName}
                      onChange={(e) => setEditingInstaller({...editingInstaller, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editingInstaller.lastName}
                      onChange={(e) => setEditingInstaller({...editingInstaller, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingInstaller.email}
                    onChange={(e) => setEditingInstaller({...editingInstaller, email: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingInstaller.phone || ''}
                    onChange={(e) => setEditingInstaller({...editingInstaller, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={editingInstaller.status}
                      onChange={(e) => setEditingInstaller({...editingInstaller, status: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="passed">Qualified</option>
                      <option value="failed">Not Qualified</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Experience (years)</label>
                    <input
                      type="number"
                      value={editingInstaller.yearsOfExperience || ''}
                      onChange={(e) => setEditingInstaller({...editingInstaller, yearsOfExperience: parseInt(e.target.value) || undefined})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingInstaller(null)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdate(editingInstaller)}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingInstaller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeletingInstaller(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Installer?</h2>
                <p className="text-slate-500 mb-6">
                  Are you sure you want to delete <span className="font-semibold text-slate-700">{deletingInstaller.firstName} {deletingInstaller.lastName}</span>? This action cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingInstaller(null)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deletingInstaller)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
