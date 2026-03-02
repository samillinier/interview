'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Bell, 
  Send, 
  Users, 
  LayoutDashboard,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  MessageSquare,
  ShieldAlert,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  Plus,
  BarChart3,
  Briefcase,
  StickyNote
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'

interface Installer {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
}

interface Notification {
  id: string
  installerId: string
  type: string
  title: string
  content: string
  priority: string
  link?: string
  isRead: boolean
  createdAt: string
  installer: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [installers, setInstallers] = useState<Installer[]>([])
  const [selectedInstallers, setSelectedInstallers] = useState<string[]>([])
  const [allInstallersSelected, setAllInstallersSelected] = useState(false)
  const [isSelectingAll, setIsSelectingAll] = useState(false)
  const [showSendForm, setShowSendForm] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Notification form fields
  const [notificationType, setNotificationType] = useState('notification')
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationContent, setNotificationContent] = useState('')
  const [notificationPriority, setNotificationPriority] = useState('normal')
  const [notificationLink, setNotificationLink] = useState('')
  
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [notificationCount, setNotificationCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchInstallers()
      fetchNotificationCount()
      fetchPendingApprovalsCount()
      // Refresh count every 30 seconds
      const interval = setInterval(() => {
        fetchNotificationCount()
        fetchPendingApprovalsCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [status, router])

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch('/api/notifications/count')
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }

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

  const fetchInstallers = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const response = await fetch(`/api/installers?${params.toString()}`)
      const data = await response.json()
      setInstallers(data.installers || [])
    } catch (error) {
      console.error('Error fetching installers:', error)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      // Selection should match the currently filtered installer set.
      setSelectedInstallers([])
      setAllInstallersSelected(false)
      fetchInstallers()
    }
  }, [searchQuery, filterStatus])

  const handleSelectInstaller = (installerId: string) => {
    // Manual selection means we are no longer in "all installers selected" mode.
    if (allInstallersSelected) setAllInstallersSelected(false)
    const newSelection = selectedInstallers.includes(installerId)
      ? selectedInstallers.filter(id => id !== installerId)
      : [...selectedInstallers, installerId]
    
    setSelectedInstallers(newSelection)
    
    // Auto-show form when installers are selected
    if (newSelection.length > 0 && !showSendForm) {
      setShowSendForm(true)
    }
  }

  const fetchAllInstallerIds = async (): Promise<string[]> => {
    const params = new URLSearchParams()
    if (searchQuery) params.append('search', searchQuery)
    if (filterStatus !== 'all') params.append('status', filterStatus)
    params.append('limit', '1000')

    let page = 1
    let totalPages = 1
    const ids: string[] = []

    while (page <= totalPages) {
      params.set('page', String(page))
      const res = await fetch(`/api/installers?${params.toString()}`)
      const data = await res.json()
      const batch = (data.installers || []).map((i: Installer) => i.id)
      ids.push(...batch)
      totalPages = data?.pagination?.totalPages || 1
      page += 1
    }

    return Array.from(new Set(ids))
  }

  const handleSelectAll = async () => {
    if (allInstallersSelected) {
      setSelectedInstallers([])
      setAllInstallersSelected(false)
      return
    }

    try {
      setIsSelectingAll(true)
      const ids = await fetchAllInstallerIds()
      setSelectedInstallers(ids)
      setAllInstallersSelected(true)
      if (ids.length > 0 && !showSendForm) setShowSendForm(true)
    } catch (e) {
      console.error('Select all installers error:', e)
      setError('Failed to select all installers. Please try again.')
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsSelectingAll(false)
    }
  }

  const handleSendNotification = async () => {
    if (selectedInstallers.length === 0) {
      setError('Please select at least one installer')
      return
    }

    if (!notificationTitle.trim() || !notificationContent.trim()) {
      setError('Title and content are required')
      return
    }

    setIsSending(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          installerIds: selectedInstallers,
          type: notificationType,
          title: notificationTitle.trim(),
          content: notificationContent.trim(),
          priority: notificationPriority,
          link: notificationLink.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification')
      }

      setSuccess(`Notification sent to ${selectedInstallers.length} installer(s) successfully!`)
      setNotificationTitle('')
      setNotificationContent('')
      setNotificationLink('')
      setSelectedInstallers([])
      setShowSendForm(false)
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to send notification')
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsSending(false)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
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
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {session?.user?.name || 'Admin'}
                </p>
                <p className="text-xs text-primary-500 truncate">{session?.user?.email}</p>
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

      <AdminMobileMenu pathname={pathname} />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <main className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Send Notifications</h1>
            <p className="text-slate-600">Send notifications, messages, or news to installers</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-800">{success}</p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </motion.div>
          )}

          {/* Prompt to create notification when installers are selected but form is hidden */}
          {selectedInstallers.length > 0 && !showSendForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-brand-green/10 border-2 border-brand-green/30 rounded-2xl max-w-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setShowSendForm(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-colors shadow-lg flex-shrink-0 w-full sm:w-auto text-sm sm:text-base order-2 sm:order-1"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Create Notification</span>
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0 order-1 sm:order-2">
                  <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">
                      {selectedInstallers.length} installer{selectedInstallers.length !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600">Click button to compose and send your message</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Send Notification Form */}
          {showSendForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Create Notification</h2>
                  <p className="text-sm text-slate-600">
                    Sending to <span className="font-semibold text-brand-green">{selectedInstallers.length}</span> installer{selectedInstallers.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowSendForm(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notification Type
                  </label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                  >
                    <option value="notification">Notification</option>
                    <option value="message">Message</option>
                    <option value="news">News</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Enter notification title"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={notificationContent}
                    onChange={(e) => setNotificationContent(e.target.value)}
                    placeholder="Enter notification content"
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={notificationPriority}
                      onChange={(e) => setNotificationPriority(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Link (Optional)
                    </label>
                    <input
                      type="text"
                      value={notificationLink}
                      onChange={(e) => setNotificationLink(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-3">
                    Selected: <span className="font-semibold text-brand-green">{selectedInstallers.length}</span> installer(s)
                  </p>
                  <button
                    onClick={handleSendNotification}
                    disabled={isSending || selectedInstallers.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send Notification</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Installers List */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-900">Select Installers</h2>
                  {selectedInstallers.length > 0 && (
                    <span className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-full text-sm font-medium">
                      {selectedInstallers.length} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAll}
                    disabled={isSelectingAll}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSelectingAll ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Selecting…
                      </span>
                    ) : allInstallersSelected ? (
                      'Deselect All'
                    ) : (
                      'Select All'
                    )}
                  </button>
                  <button
                    onClick={() => setShowSendForm(!showSendForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Notification</span>
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="mt-4 flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search installers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green appearance-none bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="passed">Passed</option>
                    <option value="qualified">Qualified</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {installers.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No installers found</p>
                </div>
              ) : (
                installers.map((installer) => (
                  <div
                    key={installer.id}
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                      selectedInstallers.includes(installer.id) ? 'bg-brand-green/5' : ''
                    }`}
                    onClick={() => handleSelectInstaller(installer.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedInstallers.includes(installer.id)
                          ? 'bg-brand-green border-brand-green'
                          : 'border-slate-300'
                      }`}>
                        {selectedInstallers.includes(installer.id) && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">
                          {installer.firstName} {installer.lastName}
                        </p>
                        <p className="text-sm text-slate-500">{installer.email}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        installer.status === 'passed' || installer.status === 'qualified'
                          ? 'bg-blue-100 text-blue-700'
                          : installer.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : installer.status === 'active'
                          ? 'bg-brand-green/10 text-brand-green-dark'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {installer.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
