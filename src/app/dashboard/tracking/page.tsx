'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
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
  User,
  LogOut,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  RefreshCw,
  Building2,
  Activity,
  AlertCircle,
  Clock,
  FileText,
  Mail,
  Edit,
  Trash2,
  Filter,
  Search,
  ChevronDown,
  Plus,
  X as XIcon,
  Loader2,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'

type TrackingItem = {
  id: string
  createdAt: string
  updatedAt: string
  installerId: string
  type: string
  title: string
  description: string | null
  status: 'pending' | 'ongoing' | 'resolved' | 'solved'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: string | null
  metadata: any
  resolvedAt: string | null
  resolvedBy: string | null
  notes: string | null
  Installer: {
    id: string
    firstName: string
    lastName: string
    email: string
    companyName: string | null
    photoUrl: string | null
    status: string
    trackerStage: string
  } | null
}

export default function TrackingPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [trackingItems, setTrackingItems] = useState<TrackingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState<string>('pending')
  const [editType, setEditType] = useState<string>('issue')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; itemId: string | null; itemTitle: string }>({
    show: false,
    itemId: null,
    itemTitle: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [newItem, setNewItem] = useState({
    installerId: '',
    type: 'issue',
    title: '',
    description: '',
    status: 'pending' as 'pending' | 'ongoing' | 'resolved' | 'solved',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    category: '',
    notes: '',
    metadata: {} as any,
  })
  const [installers, setInstallers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; companyName: string | null }>>([])
  const [installerSearchQuery, setInstallerSearchQuery] = useState('')
  const [showInstallerDropdown, setShowInstallerDropdown] = useState(false)
  const [showManualInstallerInput, setShowManualInstallerInput] = useState(false)
  const [manualInstallerName, setManualInstallerName] = useState('')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
    } else if (sessionStatus === 'authenticated') {
      // Check if user is admin
      const role = (session?.user as any)?.role
      if (role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        fetchTrackingItems()
        fetchInstallers()
        fetchPendingApprovalsCount()
        // Refresh count every 30 seconds
        const interval = setInterval(() => {
          fetchPendingApprovalsCount()
        }, 30000)
        return () => clearInterval(interval)
      }
    }
  }, [sessionStatus, router, session, statusFilter, typeFilter, priorityFilter])

  const fetchInstallers = async () => {
    try {
      const response = await fetch('/api/installers?limit=1000')
      const data = await response.json()
      setInstallers(data.installers || [])
    } catch (err) {
      console.error('Error fetching installers:', err)
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

  const filteredInstallers = useMemo(() => {
    if (!installerSearchQuery.trim()) {
      return installers.slice(0, 10) // Show first 10 if no search query
    }
    const query = installerSearchQuery.toLowerCase()
    return installers.filter(installer => {
      const fullName = `${installer.firstName} ${installer.lastName}`.toLowerCase()
      const company = installer.companyName?.toLowerCase() || ''
      const email = installer.email.toLowerCase()
      return fullName.includes(query) || company.includes(query) || email.includes(query)
    }).slice(0, 10) // Limit to 10 results
  }, [installers, installerSearchQuery])

  const fetchTrackingItems = async () => {
    try {
      setIsRefreshing(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)

      const response = await fetch(`/api/tracking?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch tracking items' }))
        throw new Error(errorData.error || errorData.details || 'Failed to fetch tracking items')
      }
      const data = await response.json()
      if (data.success && data.tracking) {
        setTrackingItems(data.tracking || [])
      } else {
        throw new Error(data.error || 'Failed to load tracking items')
      }
    } catch (err: any) {
      console.error('Error fetching tracking items:', err)
      setError(err.message || 'Failed to load tracking items')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleUpdateStatus = async (itemId: string, newStatus: string, newType?: string, notes?: string) => {
    try {
      const response = await fetch(`/api/tracking/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          type: newType || editType,
          notes: notes || editNotes,
          resolvedBy: (session?.user as any)?.email,
        }),
      })

      if (!response.ok) throw new Error('Failed to update tracking item')

      setSuccess('Tracking item updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      setEditingItem(null)
      setEditNotes('')
      setEditStatus('pending')
      setEditType('issue')
      fetchTrackingItems()
    } catch (err: any) {
      setError(err.message || 'Failed to update tracking item')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleDeleteClick = (itemId: string, itemTitle: string) => {
    setDeleteConfirm({
      show: true,
      itemId,
      itemTitle,
    })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({
      show: false,
      itemId: null,
      itemTitle: '',
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.itemId) return

    setIsDeleting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/tracking/${deleteConfirm.itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || data.details || 'Failed to delete item')
      }

      setSuccess('Tracking item deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      setDeleteConfirm({
        show: false,
        itemId: null,
        itemTitle: '',
      })
      fetchTrackingItems()
    } catch (err: any) {
      setError(err.message || 'Failed to delete tracking item')
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateItem = async () => {
    // Check if it's a manual entry
    const isManualEntry = newItem.installerId?.startsWith('manual_') || (showManualInstallerInput && manualInstallerName.trim())
    
    if (!isManualEntry && !newItem.installerId) {
      setError('Please select an installer or enter a manual installer name')
      setTimeout(() => setError(''), 5000)
      return
    }
    if (!newItem.title) {
      setError('Title is required')
      setTimeout(() => setError(''), 5000)
      return
    }
    if (isManualEntry && !manualInstallerName.trim()) {
      setError('Installer name is required for manual entry')
      setTimeout(() => setError(''), 5000)
      return
    }

    try {
      setIsCreating(true)
      const payload = {
        ...newItem,
        installerId: isManualEntry ? null : newItem.installerId,
        metadata: isManualEntry ? { manualInstallerName: manualInstallerName.trim() } : (newItem.metadata || {}),
      }
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to create tracking item')

      setSuccess('Tracking item created successfully')
      setTimeout(() => setSuccess(''), 3000)
      setShowAddModal(false)
      setNewItem({
        installerId: '',
        type: 'issue',
        title: '',
        description: '',
        status: 'pending',
        priority: 'normal',
        category: '',
        notes: '',
        metadata: {},
      })
      setInstallerSearchQuery('')
      setShowManualInstallerInput(false)
      setManualInstallerName('')
      fetchTrackingItems()
    } catch (err: any) {
      setError(err.message || 'Failed to create tracking item')
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
      pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
      ongoing: { label: 'Ongoing', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: RefreshCw },
      resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
      solved: { label: 'Solved', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
    }
    return statusMap[status] || statusMap.pending
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-slate-100 text-slate-700 border-slate-200',
      normal: 'bg-blue-100 text-blue-700 border-blue-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      urgent: 'bg-red-100 text-red-700 border-red-200',
    }
    return styles[priority as keyof typeof styles] || styles.normal
  }

  const getPipelineBadge = (type: string) => {
    const pipelineMap: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
      issue: { label: 'Issue', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertCircle },
      activity: { label: 'Activity', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Activity },
      status_change: { label: 'Status Change', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: RefreshCw },
      document: { label: 'Waiting Docs', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: FileText },
      communication: { label: 'Awaiting Reply', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: Mail },
    }
    return pipelineMap[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: Activity }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const getInitialsFromName = (name: string) => {
    if (!name || !name.trim()) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      // First letter of first name and first letter of last name
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    } else if (parts.length === 1) {
      // Single word: take first two letters
      const word = parts[0]
      return word.length >= 2 ? word.substring(0, 2).toUpperCase() : word[0].toUpperCase()
    }
    return '?'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'issue':
        return <AlertCircle className="w-4 h-4" />
      case 'activity':
        return <Activity className="w-4 h-4" />
      case 'status_change':
        return <RefreshCw className="w-4 h-4" />
      case 'document':
        return <FileText className="w-4 h-4" />
      case 'communication':
        return <Mail className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const filteredItems = trackingItems.filter((item) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        (item.Installer && (
          `${item.Installer.firstName} ${item.Installer.lastName}`.toLowerCase().includes(searchLower) ||
          item.Installer.companyName?.toLowerCase().includes(searchLower) ||
          item.Installer.email.toLowerCase().includes(searchLower)
        )) ||
        (item.metadata && typeof item.metadata === 'object' && 'manualInstallerName' in item.metadata && 
          String((item.metadata as any).manualInstallerName).toLowerCase().includes(searchLower))
      )
    }
    return true
  })

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-slate-600">Loading tracking data...</p>
        </div>
      </div>
    )
  }

  const role = (session?.user as any)?.role
  if (role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}
      >
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10">
              <Image src={logo} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-bold text-primary-900 text-sm truncate">PRM Dashboard</h1>
                <p className="text-xs text-primary-500 truncate">Admin Dashboard</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors ${
                pathname === '/dashboard' ? 'bg-white/20 text-white font-medium' : ''
              }`}
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
            {(session?.user as any)?.role !== 'MANAGER' && (session?.user as any)?.role !== 'MODERATOR' && (
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
            )}
            {(session?.user as any)?.role !== 'MANAGER' && (session?.user as any)?.role !== 'MODERATOR' && (
              <Link
                href="/dashboard/tracking"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === '/dashboard/tracking' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <Activity className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Tracking</span>}
              </Link>
            )}
            {(session?.user as any)?.role !== 'MANAGER' && (
              <Link
                href="/dashboard/analytics"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === '/dashboard/analytics' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Analytics</span>}
              </Link>
            )}
            <Link
              href="/dashboard/notifications"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                pathname === '/dashboard/notifications' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Bell className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Notifications</span>}
            </Link>
            {(session?.user as any)?.role !== 'MANAGER' && (
              <Link
                href="/dashboard/messages"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === '/dashboard/messages' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Messages</span>}
              </Link>
            )}
            {(session?.user as any)?.role !== 'MANAGER' && (
              <Link
                href="/dashboard/remarks"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === '/dashboard/remarks' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <StickyNote className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Remarks</span>}
              </Link>
            )}
            {(session?.user as any)?.role !== 'MODERATOR' && (session?.user as any)?.role !== 'MANAGER' && (
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
            {(session?.user as any)?.role !== 'MANAGER' && (session?.user as any)?.role !== 'MODERATOR' && (
              <Link
                href="/property/dashboard"
                className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors border-t border-white/10 mt-2 pt-2"
              >
                <Building2 className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Property Portal</span>}
              </Link>
            )}
          </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            {session?.user?.image ? (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-brand-green/30">
                <Image
                  src={session.user.image}
                  alt={session.user?.name || session.user?.email || 'Admin'}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
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

      <AdminMobileMenu pathname={pathname} />

      {/* Main */}
      <main className="lg:ml-64 flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 pr-4 pl-16 lg:px-6 pt-16 lg:pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-green/10 rounded-xl">
                  <Activity className="w-6 h-6 text-brand-green" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Installer Tracking</h1>
              </div>
              <p className="text-slate-600 ml-14">Track installer activities and monitor issue resolution</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white hover:bg-brand-green-dark rounded-xl transition-all font-medium shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add Tracking Item</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">

          {/* Filters and Search */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by installer name, company, or issue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="resolved">Resolved</option>
                  <option value="solved">Solved</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="all">All Types</option>
                  <option value="issue">Issue</option>
                  <option value="activity">Activity</option>
                  <option value="status_change">Status Change</option>
                  <option value="document">Document</option>
                  <option value="communication">Communication</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <button
                  onClick={fetchTrackingItems}
                  disabled={isRefreshing}
                  className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
              {success}
            </div>
          )}

          {/* Tracking Items Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">INSTALLER</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">STATUS</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">PIPELINE</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">CONTACT</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">LAST UPDATE</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Activity className="w-12 h-12 text-slate-300" />
                          <p className="text-slate-500 font-medium">No tracking items found</p>
                          <p className="text-sm text-slate-400">
                            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'
                              ? 'Try adjusting your filters'
                              : 'Tracking items will appear here once created'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const pipeline = getPipelineBadge(item.type)
                      const PipelineIcon = pipeline.icon
                      const installerName = item.Installer 
                        ? `${item.Installer.firstName} ${item.Installer.lastName}`
                        : (item.metadata && typeof item.metadata === 'object' && 'manualInstallerName' in item.metadata
                            ? String((item.metadata as any).manualInstallerName)
                            : 'Manual Entry')
                      const installerCompany = item.Installer?.companyName || null
                      const installerEmail = item.Installer?.email || '-'
                      const contactName = item.Installer 
                        ? `${item.Installer.firstName} ${item.Installer.lastName}`
                        : '-'
                      
                      return (
                        <>
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="hover:bg-gradient-to-r hover:from-brand-green/5 hover:to-emerald-50/30 transition-all duration-200 group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-md bg-slate-200 flex items-center justify-center">
                                    {item.Installer ? (
                                      <>
                                        {item.Installer.photoUrl ? (
                                          <Image
                                            src={item.Installer.photoUrl}
                                            alt={installerName}
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-brand-green text-white font-bold text-sm">
                                            {getInitials(item.Installer.firstName, item.Installer.lastName)}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-brand-green text-white font-bold text-sm">
                                        {item.metadata && typeof item.metadata === 'object' && 'manualInstallerName' in item.metadata
                                          ? getInitialsFromName(String((item.metadata as any).manualInstallerName))
                                          : '?'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                                    {installerName}
                                  </p>
                                  {installerCompany && (
                                    <p className="text-sm text-slate-500">{installerCompany}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const statusBadge = getStatusBadge(item.status)
                                const StatusIcon = statusBadge.icon
                                return (
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusBadge.label}
                                  </span>
                                )
                              })()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${pipeline.bg} ${pipeline.text} ${pipeline.border}`}>
                                <PipelineIcon className="w-3 h-3" />
                                {pipeline.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {contactName !== '-' ? (
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{contactName}</p>
                                  <p className="text-xs text-slate-500">{installerEmail}</p>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">{new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <button
                                  onClick={() => {
                                    setEditingItem(item.id)
                                    setEditNotes(item.notes || '')
                                    setEditStatus(item.status)
                                    setEditType(item.type)
                                  }}
                                  className="p-1 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                {editingItem === item.id ? (
                                  <div className="flex flex-col gap-2">
                                    <select
                                      value={editStatus}
                                      onChange={(e) => setEditStatus(e.target.value)}
                                      className="px-3 py-1 text-sm border border-slate-300 rounded-lg"
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="ongoing">Ongoing</option>
                                      <option value="resolved">Resolved</option>
                                      <option value="solved">Solved</option>
                                    </select>
                                    <select
                                      value={editType}
                                      onChange={(e) => setEditType(e.target.value)}
                                      className="px-3 py-1 text-sm border border-slate-300 rounded-lg"
                                    >
                                      <option value="issue">Issue</option>
                                      <option value="activity">Activity</option>
                                      <option value="status_change">Status Change</option>
                                      <option value="document">Document</option>
                                      <option value="communication">Communication</option>
                                    </select>
                                    <textarea
                                      value={editNotes}
                                      onChange={(e) => setEditNotes(e.target.value)}
                                      placeholder="Add notes..."
                                      className="px-3 py-1 text-sm border border-slate-300 rounded-lg w-48"
                                      rows={2}
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleUpdateStatus(item.id, editStatus, editType, editNotes)}
                                        className="px-3 py-1 text-xs bg-brand-green text-white rounded-lg hover:bg-brand-green-dark"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingItem(null)
                                          setEditNotes('')
                                          setEditStatus('pending')
                                          setEditType('issue')
                                        }}
                                        className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setExpanded({ ...expanded, [item.id]: !expanded[item.id] })}
                                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                      title={expanded[item.id] ? 'Collapse' : 'Expand'}
                                    >
                                      <ChevronDown className={`w-4 h-4 transition-transform ${expanded[item.id] ? 'rotate-180' : ''}`} />
                                    </button>
                                    {((session?.user as any)?.role !== 'MANAGER' && (session?.user as any)?.role !== 'MODERATOR') && (
                                      <button
                                        onClick={() => handleDeleteClick(item.id, item.title)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                          {expanded[item.id] && item.description && (
                            <motion.tr
                              key={`${item.id}-description`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="bg-slate-50/50 hover:bg-slate-50 transition-colors"
                            >
                              <td colSpan={6} className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-shrink-0 whitespace-nowrap">DESCRIPTION:</span>
                                  <span className="text-sm text-slate-700">{item.description}</span>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      </main>

      {/* Add Tracking Item Modal */}
      {showAddModal && (
        <div className={`fixed top-0 right-0 bottom-0 z-40 bg-white overflow-y-auto ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}`}>
          <div className="min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
              <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-slate-900">Add Tracking Item</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setNewItem({
                        installerId: '',
                        type: 'issue',
                        title: '',
                        description: '',
                        status: 'pending',
                        priority: 'normal',
                        category: '',
                        notes: '',
                        metadata: {},
                      })
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <XIcon className="w-6 h-6 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Installer <span className="text-red-500">*</span>
                  </label>
                  
                  {!showManualInstallerInput ? (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={installerSearchQuery}
                          onChange={(e) => {
                            setInstallerSearchQuery(e.target.value)
                            setShowInstallerDropdown(true)
                          }}
                          onFocus={() => setShowInstallerDropdown(true)}
                          placeholder="Search installer by name, email, or company..."
                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                        />
                        {newItem.installerId && !newItem.installerId.startsWith('manual_') && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewItem({ ...newItem, installerId: '' })
                              setInstallerSearchQuery('')
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <XIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      
                      {showInstallerDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setShowInstallerDropdown(false)}
                          />
                          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {filteredInstallers.length > 0 ? (
                              <>
                                {filteredInstallers.map((installer) => (
                                  <button
                                    key={installer.id}
                                    type="button"
                                    onClick={() => {
                                      setNewItem({ ...newItem, installerId: installer.id })
                                      setInstallerSearchQuery(`${installer.firstName} ${installer.lastName}${installer.companyName ? ` - ${installer.companyName}` : ''}`)
                                      setShowInstallerDropdown(false)
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-slate-900">
                                      {installer.firstName} {installer.lastName}
                                    </div>
                                    {installer.companyName && (
                                      <div className="text-sm text-slate-500">{installer.companyName}</div>
                                    )}
                                    <div className="text-xs text-slate-400">{installer.email}</div>
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowManualInstallerInput(true)
                                    setShowInstallerDropdown(false)
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-brand-green/10 transition-colors border-t border-slate-200 text-brand-green font-medium"
                                >
                                  + Add manually (not in list)
                                </button>
                              </>
                            ) : (
                              <div className="px-4 py-3">
                                <p className="text-sm text-slate-500 mb-2">No installer found</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowManualInstallerInput(true)
                                    setShowInstallerDropdown(false)
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-brand-green/10 transition-colors border border-brand-green rounded-lg text-brand-green font-medium"
                                >
                                  + Add manually (not in list)
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      {newItem.installerId && !newItem.installerId.startsWith('manual_') && (
                        <div className="mt-2 p-3 bg-brand-green/10 border border-brand-green/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900">
                                {installers.find(i => i.id === newItem.installerId)?.firstName} {installers.find(i => i.id === newItem.installerId)?.lastName}
                              </div>
                              {installers.find(i => i.id === newItem.installerId)?.companyName && (
                                <div className="text-sm text-slate-600">{installers.find(i => i.id === newItem.installerId)?.companyName}</div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewItem({ ...newItem, installerId: '' })
                                setInstallerSearchQuery('')
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Installer Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={manualInstallerName}
                          onChange={(e) => setManualInstallerName(e.target.value)}
                          placeholder="Enter installer name..."
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (manualInstallerName.trim()) {
                              setNewItem({ ...newItem, installerId: `manual_${Date.now()}` })
                            }
                          }}
                          className="px-4 py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors font-medium"
                        >
                          Use Manual Entry
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowManualInstallerInput(false)
                            setManualInstallerName('')
                            setNewItem({ ...newItem, installerId: '' })
                          }}
                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                        >
                          Search Instead
                        </button>
                      </div>
                      {newItem.installerId && newItem.installerId.startsWith('manual_') && (
                        <div className="p-3 bg-brand-green/10 border border-brand-green/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900">{manualInstallerName}</div>
                              <div className="text-sm text-slate-500">Manual entry</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewItem({ ...newItem, installerId: '' })
                                setManualInstallerName('')
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    required
                  >
                    <option value="issue">Issue</option>
                    <option value="activity">Activity</option>
                    <option value="status_change">Status Change</option>
                    <option value="document">Document</option>
                    <option value="communication">Communication</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    placeholder="Enter tracking item title..."
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    placeholder="Enter description..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                  >
                    <option value="pending">Pending</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="resolved">Resolved</option>
                    <option value="solved">Solved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    placeholder="e.g., document_expiry, compliance"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newItem.notes}
                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    placeholder="Add any additional notes..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border-t border-slate-200 sticky bottom-0">
              <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewItem({
                      installerId: '',
                      type: 'issue',
                      title: '',
                      description: '',
                      status: 'pending',
                      priority: 'normal',
                      category: '',
                      notes: '',
                      metadata: {},
                    })
                  }}
                  className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateItem}
                  disabled={isCreating || !newItem.installerId || !newItem.title}
                  className="px-6 py-3 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {isCreating ? 'Creating...' : 'Create Tracking Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete Tracking Item</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-700 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{deleteConfirm.itemTitle}"</span>? 
              All associated data will be permanently removed.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
