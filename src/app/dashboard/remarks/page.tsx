'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  Settings,
  Menu,
  X,
  StickyNote,
  ShieldAlert,
  Calendar,
  User,
  Mail,
  Phone,
  Search,
  Filter,
  ExternalLink,
  Clock,
  LogOut,
  ChevronRight,
  Building2,
  RefreshCw,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'

interface Remark {
  date: string | null
  note: string
  createdAt: string
}

interface InstallerWithRemarks {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  status: string
  companyName: string | null
  remarksCount: number
  remarks: Remark[]
  createdAt: string
  updatedAt: string
}

export default function RemarksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [installers, setInstallers] = useState<InstallerWithRemarks[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedInstallers, setExpandedInstallers] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchPendingApprovalsCount = async () => {
    try {
      const res = await fetch('/api/admin/change-requests/count')
      if (res.status === 401) {
        setPendingApprovalsCount(0)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setPendingApprovalsCount(data.count || 0)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPendingApprovalsCount()
      const interval = setInterval(fetchPendingApprovalsCount, 30000)
      return () => clearInterval(interval)
    }
  }, [status])

  useEffect(() => {
    fetchInstallersWithRemarks()
  }, [])

  // Refresh when pathname changes (user navigates back to this page)
  useEffect(() => {
    if (pathname === '/dashboard/remarks') {
      fetchInstallersWithRemarks()
    }
  }, [pathname])

  // Refresh data when page becomes visible (user comes back from another tab/page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchInstallersWithRemarks()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Refresh data when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchInstallersWithRemarks()
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const fetchInstallersWithRemarks = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`/api/installers/remarks?t=${Date.now()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch installers with remarks')
      }
      const data = await response.json()
      if (data.success) {
        setInstallers(data.installers)
      }
    } catch (error) {
      console.error('Error fetching installers with remarks:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchInstallersWithRemarks(true)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'inactive':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'deactive':
        return 'bg-slate-900 text-white border-slate-900'
      case 'rejected':
        return 'bg-rose-100 text-rose-700 border-rose-200'
      case 'qualified':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const filteredInstallers = installers.filter((installer) => {
    const matchesSearch =
      searchQuery === '' ||
      `${installer.firstName} ${installer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      installer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      installer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      installer.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      installer.remarks.some((r) => r.note.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || installer.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const toggleInstaller = (installerId: string) => {
    setExpandedInstallers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(installerId)) {
        newSet.delete(installerId)
      } else {
        newSet.add(installerId)
      }
      return newSet
    })
  }

  const isExpanded = (installerId: string) => expandedInstallers.has(installerId)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10">
              <Image
                src={logo}
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-bold text-primary-900 text-sm truncate">PRM Dashboard</h1>
                <p className="text-xs text-primary-500 truncate">Admin Dashboard</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
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
            href="/dashboard/approvals"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/approvals' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span>Approvals</span>
                {pendingApprovalsCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white text-brand-green text-xs font-bold">
                    {pendingApprovalsCount}
                  </span>
                )}
              </div>
            )}
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
              pathname === '/dashboard/notifications'
                ? 'bg-white/20 text-white font-medium'
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span>Notifications</span>
              </div>
            )}
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
          <Link
            href="/dashboard/remarks"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/remarks' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <StickyNote className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Remarks</span>}
          </Link>
          {(session?.user as any)?.role !== 'MODERATOR' && (
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                pathname === '/dashboard/settings' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Settings</span>}
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-900 truncate">
                  {session?.user?.name || session?.user?.email || 'Admin'}
                </p>
                <p className="text-xs text-primary-500 truncate">Admin User</p>
              </div>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`w-full flex items-center gap-3 px-4 py-2 text-primary-600 hover:bg-slate-100 rounded-lg transition-colors ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 flex-1 flex flex-col overflow-hidden">
        <AdminMobileMenu pathname={pathname} />
        <div className="bg-white border-b border-slate-200 pr-4 pl-16 lg:px-6 pt-16 lg:pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-green/10 rounded-xl">
                  <StickyNote className="w-6 h-6 text-brand-green" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Installer Remarks</h1>
              </div>
              <p className="text-slate-600 ml-14">Track and manage admin remarks for installers</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white hover:bg-brand-green-dark rounded-xl transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh remarks"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, company, email, phone, or remark content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                />
              </div>
              <div className="md:w-52">
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white appearance-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                    <option value="deactive">Deactive</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
              <p className="text-slate-600">Loading remarks...</p>
            </div>
          ) : filteredInstallers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <StickyNote className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Remarks Found</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'No installers match your search criteria. Try adjusting your filters.'
                  : 'No installers have remarks yet. Start adding remarks from installer profiles.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredInstallers.map((installer) => {
                const expanded = isExpanded(installer.id)
                return (
                  <motion.div
                    key={installer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      {/* Installer Header - Clickable to expand/collapse */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <button
                            onClick={() => toggleInstaller(installer.id)}
                            className="flex items-center gap-3 mb-3 flex-wrap group w-full text-left"
                          >
                            <div className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-green" />
                            </div>
                            {installer.companyName ? (
                              <>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                                  {installer.companyName}
                                </h3>
                                <span className="text-lg text-slate-600 font-medium">
                                  {installer.firstName} {installer.lastName}
                                </span>
                              </>
                            ) : (
                              <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                                {installer.firstName} {installer.lastName}
                              </h3>
                            )}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(installer.status)}`}
                            >
                              {installer.status.charAt(0).toUpperCase() + installer.status.slice(1)}
                            </span>
                            <span className="px-3 py-1 bg-brand-green/10 text-brand-green border border-brand-green/20 rounded-full text-xs font-semibold">
                              {installer.remarksCount} {installer.remarksCount === 1 ? 'Remark' : 'Remarks'}
                            </span>
                          </button>
                          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 ml-8">
                            {installer.companyName && (
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-100 rounded-lg">
                                  <Building2 className="w-4 h-4 text-slate-600" />
                                </div>
                                <span className="font-medium">{installer.companyName}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-slate-100 rounded-lg">
                                <User className="w-4 h-4 text-slate-600" />
                              </div>
                              <span className="font-medium">{installer.firstName} {installer.lastName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-slate-100 rounded-lg">
                                <Mail className="w-4 h-4 text-slate-600" />
                              </div>
                              <span className="font-medium">{installer.email}</span>
                            </div>
                            {installer.phone && (
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-100 rounded-lg">
                                  <Phone className="w-4 h-4 text-slate-600" />
                                </div>
                                <span className="font-medium">{installer.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/installers/${installer.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-brand-green text-white hover:bg-brand-green-dark rounded-xl transition-all font-medium shadow-sm hover:shadow-md ml-4"
                        >
                          <span className="text-sm">View Profile</span>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>

                      {/* Collapsible Remarks List */}
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-4 mt-6 pt-6 border-t border-slate-200">
                              {installer.remarks.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                  <StickyNote className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                  <p className="text-sm">No remarks available</p>
                                </div>
                              ) : (
                                installer.remarks.map((remark, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 border border-slate-200 hover:border-brand-green/40 hover:shadow-sm transition-all"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        {remark.date && (
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="p-1.5 bg-brand-green/10 rounded-lg">
                                              <Calendar className="w-4 h-4 text-brand-green" />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700">
                                              Date: {formatDate(remark.date)}
                                            </span>
                                          </div>
                                        )}
                                        <p className="text-slate-900 whitespace-pre-wrap leading-relaxed">{remark.note}</p>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="font-medium">{formatDateTime(remark.createdAt)}</span>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
