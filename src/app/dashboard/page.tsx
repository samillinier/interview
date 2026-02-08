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
      // Fetch stats separately to get accurate counts
      const [allResponse, qualifiedResponse, failedResponse, pendingResponse] = await Promise.all([
        fetch('/api/installers?limit=1'),
        fetch('/api/installers?status=passed&limit=1'),
        fetch('/api/installers?status=failed&limit=1'),
        fetch('/api/installers?status=pending&limit=1'),
      ])
      
      const [allData, qualifiedData, failedData, pendingData] = await Promise.all([
        allResponse.json(),
        qualifiedResponse.json(),
        failedResponse.json(),
        pendingResponse.json(),
      ])

      setStats({
        total: allData.pagination?.total || 0,
        qualified: qualifiedData.pagination?.total || 0,
        notQualified: failedData.pagination?.total || 0,
        pending: pendingData.pagination?.total || 0,
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
            href="/dashboard/analytics"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${
              pathname === '/dashboard/analytics' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
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
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Applicants</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Qualified</p>
                <p className="text-3xl font-bold text-brand-green">{stats.qualified}</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-brand-green" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Not Qualified</p>
                <p className="text-3xl font-bold text-red-600">{stats.notQualified}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search installers by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
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
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
            <button className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Installer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Flooring Skills</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {installers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No installers found
                    </td>
                  </tr>
                ) : (
                  installers.map((installer) => (
                    <tr 
                      key={installer.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/installers/${installer.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-brand-green/20 bg-brand-green">
                            {/* Fallback initials - always present */}
                            <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(installer.firstName, installer.lastName)}
                            </div>
                            {/* Photo overlay - shows if available and loads successfully */}
                            {installer.photoUrl && (
                              <Image
                                src={installer.photoUrl}
                                alt={`${installer.firstName} ${installer.lastName}`}
                                width={40}
                                height={40}
                                className="relative w-full h-full object-cover z-10"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {installer.firstName} {installer.lastName}
                            </p>
                            <p className="text-sm text-slate-500">{installer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {installer.yearsOfExperience ? (
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-900">{installer.yearsOfExperience} yrs</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {installer.flooringSkills ? (
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              try {
                                const skills = JSON.parse(installer.flooringSkills || '[]')
                                return Array.isArray(skills) ? skills.slice(0, 2).map((skill: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                                    {skill}
                                  </span>
                                )) : null
                              } catch {
                                return <span className="text-slate-400">-</span>
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(installer.status)}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => router.push(`/dashboard/installers/${installer.id}`)}
                            className="p-2 text-slate-400 hover:text-brand-green transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-red-600 transition-colors">
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
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalCount)}
                </span>{' '}
                of <span className="font-medium">{totalCount}</span> installers
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-brand-green text-white'
                            : 'text-slate-700 hover:bg-slate-100'
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
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
