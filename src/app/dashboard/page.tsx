'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  RefreshCw,
  Download,
  Edit,
  Trash2,
  Briefcase,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  User,
  FileText,
  MessageSquare,
  Bell,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

interface Installer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  yearsOfExperience?: number
  flooringSkills?: string
  flooringSpecialties?: string
  status: string
  photoUrl?: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [installers, setInstallers] = useState<Installer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    qualified: 0,
    notQualified: 0,
    pending: 0,
  })
  const itemsPerPage = 20

  const fetchStats = async () => {
    try {
      // Fetch all installers to calculate stats accurately
      const allResponse = await fetch('/api/installers?limit=1000')
      const allData = await allResponse.json()
      const allInstallers = allData.installers || []
      
      setStats({
        total: allData.pagination?.total || allInstallers.length,
        qualified: allInstallers.filter((i: Installer) => i.status === 'passed' || i.status === 'qualified').length,
        notQualified: allInstallers.filter((i: Installer) => i.status === 'failed').length,
        pending: allInstallers.filter((i: Installer) => i.status === 'pending').length,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchInstallers = async (page: number = currentPage) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('page', page.toString())
      params.append('limit', itemsPerPage.toString())

      const response = await fetch(`/api/installers?${params.toString()}`)
      const data = await response.json()
      setInstallers(data.installers || [])
      
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1)
        setTotalCount(data.pagination.total || 0)
        setCurrentPage(data.pagination.page || 1)
      }
    } catch (error) {
      console.error('Error fetching installers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      fetchInstallers(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchStats()
      fetchInstallers(1)
      setCurrentPage(1)
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats()
      fetchInstallers(1)
      setCurrentPage(1)
    }
  }, [searchQuery, statusFilter])


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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Installers</span>}
          </Link>
          <Link
            href="/dashboard/jobs"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/jobs' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
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
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
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

        {/* User Info & Logout */}
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
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Users className="w-5 h-5" />
            <span>Installers</span>
          </Link>
          <Link href="/dashboard/notifications" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </Link>
          <Link href="/dashboard/messages" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            pathname === '/dashboard/messages' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}>
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Applicants</p>
                <p className="text-4xl font-bold text-slate-900 mb-1">{stats.total}</p>
                <p className="text-xs text-slate-400">All registered installers</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Users className="w-7 h-7 text-slate-700" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-md border border-brand-green/20 p-6 hover:shadow-lg hover:border-brand-green/30 transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-brand-green uppercase tracking-wide mb-2">Qualified</p>
                <p className="text-4xl font-bold text-brand-green mb-1">{stats.qualified}</p>
                <p className="text-xs text-brand-green/70">{stats.total > 0 ? Math.round((stats.qualified / stats.total) * 100) : 0}% of total</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-brand-green to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-brand-green/30">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Not Qualified</p>
                <p className="text-4xl font-bold text-red-600 mb-1">{stats.notQualified}</p>
                <p className="text-xs text-red-500">{stats.total > 0 ? Math.round((stats.notQualified / stats.total) * 100) : 0}% of total</p>
              </div>
              <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pending Review</p>
                <p className="text-4xl font-bold text-yellow-600 mb-1">{stats.pending}</p>
                <p className="text-xs text-yellow-500">{stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% of total</p>
              </div>
              <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Clock className="w-7 h-7 text-yellow-600" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search installers by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="passed">Qualified</option>
              <option value="failed">Not Qualified</option>
            </select>
            <button
              onClick={() => {
                fetchStats()
                fetchInstallers(1)
                setCurrentPage(1)
              }}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all hover:border-brand-green/30 flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-brand-green to-emerald-600 text-white rounded-xl hover:from-brand-green-dark hover:to-emerald-700 transition-all flex items-center gap-2 font-semibold shadow-lg shadow-brand-green/30 hover:shadow-xl">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Installer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Flooring Skills</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="w-12 h-12 text-slate-300" />
                        <p className="text-slate-500 font-medium">No installers found</p>
                        <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  installers.map((installer) => (
                    <tr 
                      key={installer.id} 
                      className="hover:bg-gradient-to-r hover:from-brand-green/5 hover:to-emerald-50/30 transition-all duration-200 cursor-pointer group"
                      onClick={() => router.push(`/dashboard/installers/${installer.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-brand-green/20 bg-gradient-to-br from-brand-green to-emerald-600 shadow-md group-hover:ring-brand-green/40 transition-all">
                            {/* Fallback initials - always present */}
                            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                              {getInitials(installer.firstName, installer.lastName)}
                            </div>
                            {/* Photo overlay - shows if available and loads successfully */}
                            {installer.photoUrl && (
                              <Image
                                src={installer.photoUrl}
                                alt={`${installer.firstName} ${installer.lastName}`}
                                width={48}
                                height={48}
                                className="relative w-full h-full object-cover z-10"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                              {installer.firstName} {installer.lastName}
                            </p>
                            <p className="text-sm text-slate-500">{installer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {installer.yearsOfExperience != null && installer.yearsOfExperience !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Briefcase className="w-4 h-4 text-slate-600" />
                            </div>
                            <span className="font-semibold text-slate-900">{installer.yearsOfExperience} yrs</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          // Try to get skills from flooringSkills or flooringSpecialties
                          const skillsData = installer.flooringSkills || installer.flooringSpecialties
                          
                          if (!skillsData) {
                            return <span className="text-slate-400">-</span>
                          }

                          try {
                            // Try parsing as JSON first
                            let skills: string[] = []
                            
                            if (typeof skillsData === 'string') {
                              // Try JSON parse
                              try {
                                const parsed = JSON.parse(skillsData)
                                skills = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean)
                              } catch {
                                // If JSON parse fails, try comma-separated
                                if (skillsData.includes(',')) {
                                  skills = skillsData.split(',').map(s => s.trim()).filter(Boolean)
                                } else {
                                  skills = [skillsData].filter(Boolean)
                                }
                              }
                            } else if (Array.isArray(skillsData)) {
                              skills = skillsData
                            } else {
                              skills = [String(skillsData)].filter(Boolean)
                            }

                            if (skills.length === 0) {
                              return <span className="text-slate-400">-</span>
                            }

                            return (
                              <div className="flex flex-wrap gap-2">
                                {skills.slice(0, 2).map((skill: string, idx: number) => (
                                  <span key={idx} className="px-3 py-1 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )
                          } catch (error) {
                            console.error('Error parsing skills:', error)
                            return <span className="text-slate-400">-</span>
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(installer.status)}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => router.push(`/dashboard/installers/${installer.id}`)}
                            className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(currentPage * itemsPerPage, totalCount)}
                </span>{' '}
                of <span className="font-semibold text-slate-900">{totalCount}</span> installers
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border-2 border-slate-200 rounded-xl hover:bg-brand-green/10 hover:border-brand-green/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-brand-green to-emerald-600 text-white shadow-lg shadow-brand-green/30'
                            : 'text-slate-700 hover:bg-brand-green/10 hover:text-brand-green border-2 border-transparent hover:border-brand-green/20'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border-2 border-slate-200 rounded-xl hover:bg-brand-green/10 hover:border-brand-green/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>
        </main>
      </div>
    </div>
  )
}
