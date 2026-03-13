'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Settings,
  UserPlus,
  Users,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Mail,
  Calendar,
  User,
  Shield,
  ShieldAlert,
  ArrowLeft,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  MessageSquare,
  Bell,
  BarChart3,
  StickyNote,
  Building2,
  Activity
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'

interface Admin {
  id: string
  email: string
  name: string | null
  isActive: boolean
  role: 'ADMIN' | 'MODERATOR' | 'MANAGER'
  createdAt: string
  createdBy: string | null
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; adminId: string | null; adminEmail: string }>({
    show: false,
    adminId: null,
    adminEmail: '',
  })
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    name: '',
    role: 'ADMIN' as 'ADMIN' | 'MODERATOR' | 'MANAGER',
  })
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role as 'ADMIN' | 'MODERATOR' | 'MANAGER' | undefined
      if (role === 'MODERATOR') {
        router.push('/auth/access-denied')
        return
      }
      fetchAdmins()
      fetchPendingApprovalsCount()
      const interval = setInterval(fetchPendingApprovalsCount, 30000)
      return () => clearInterval(interval)
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

  const fetchAdmins = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await fetch('/api/admins', {
        credentials: 'include', // Include cookies for session
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        console.error('API Error:', { status: response.status, errorData })
        
        if (response.status === 401) {
          setError('Please sign in to access admin settings')
          router.push('/login')
          return
        }
        if (response.status === 403) {
          setError(errorData.error || 'You do not have permission to access admin settings')
          return
        }
        throw new Error(errorData.error || `Failed to fetch admins (${response.status})`)
      }

      const data = await response.json()
      console.log('Fetched admins data:', data)
      
      // Check if response contains an error
      if (data.error) {
        throw new Error(data.error + (data.details ? `: ${JSON.stringify(data.details)}` : ''))
      }
      
      setAdmins(data.admins || [])
      console.log('Set admins:', data.admins || [])
    } catch (err: any) {
      console.error('Error fetching admins:', err)
      // Show more detailed error message if available
      const errorMessage = err.message || 'Failed to load administrators. Please try refreshing the page.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newAdmin.email.trim()) {
      setError('Email is required')
      return
    }

    setIsAdding(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify(newAdmin),
      })

      let data
      try {
        data = await response.json()
      } catch {
        data = { error: `HTTP ${response.status}: ${response.statusText}` }
      }

      console.log('Add admin response:', { status: response.status, data })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to add administrators')
          router.push('/login')
          return
        }
        if (response.status === 403) {
          setError(data.error || 'You do not have permission to add administrators')
          return
        }
        throw new Error(data.error || `Failed to add admin (${response.status})`)
      }

      setSuccess('Admin added successfully!')
      setNewAdmin({ email: '', name: '', role: 'ADMIN' as 'ADMIN' | 'MODERATOR' | 'MANAGER' })
      setShowAddModal(false)
      await fetchAdmins()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error adding admin:', err)
      setError(err.message || 'Failed to add admin. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteClick = (adminId: string, adminEmail: string, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setDeleteConfirm({
      show: true,
      adminId,
      adminEmail,
    })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, adminId: null, adminEmail: '' })
    setError('')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.adminId) {
      setError('No admin selected for deletion')
      return
    }

    setIsDeleting({ ...isDeleting, [deleteConfirm.adminId]: true })
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admins/${deleteConfirm.adminId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete admin')
      }

      const result = await response.json()
      setSuccess(result.message || 'Admin removed successfully!')
      setDeleteConfirm({ show: false, adminId: null, adminEmail: '' })
      await fetchAdmins()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting admin:', err)
      setError(err.message || 'Failed to delete admin. Please try again.')
      // Keep modal open on error so user can try again
    } finally {
      setIsDeleting({ ...isDeleting, [deleteConfirm.adminId]: false })
    }
  }

  const handleModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleDeleteCancel()
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const currentRole = (session?.user as any)?.role as 'ADMIN' | 'MODERATOR' | 'MANAGER' | undefined
  if (currentRole === 'MODERATOR') {
    return null
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
              <div className="min-w-0">
                <h1 className="font-bold text-primary-900 text-sm truncate">PRM Dashboard</h1>
                <p className="text-xs text-primary-500 truncate">Admin Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
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
          {(session?.user as any)?.role !== 'MODERATOR' && (
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
          <Link
            href="/dashboard/remarks"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/remarks' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <StickyNote className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Remarks</span>}
          </Link>
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/settings' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </Link>
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

        {/* User Info & Logout */}
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
              <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-brand-green" />
              </div>
            )}
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
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="pr-4 pl-16 lg:px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-sm text-slate-500">Manage administrators and system settings</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-6xl mx-auto">
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-success-50 to-success-100 border border-success-200 rounded-xl text-success-700 text-sm font-medium flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {success}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-danger-50 to-danger-100 border border-danger-200 rounded-xl text-danger-700 text-sm font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Administrators Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 md:p-8 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Administrators</h2>
                <p className="text-sm text-slate-500">Manage admin users who can access the dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors shadow-lg shadow-brand-green/20"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Admin</span>
            </button>
          </div>

          {/* Admins List */}
          {admins.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium mb-2">No administrators found</p>
              <p className="text-sm text-slate-400">Add your first administrator to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <motion.div
                  key={admin.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      admin.isActive ? 'bg-brand-green/10' : 'bg-slate-200'
                    }`}>
                      <User className={`w-6 h-6 ${admin.isActive ? 'text-brand-green' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">
                          {admin.name || admin.email.split('@')[0]}
                        </p>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          admin.role === 'ADMIN' ? 'bg-brand-green/10 text-brand-green' : 
                          admin.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {admin.role === 'ADMIN' ? 'Admin' : admin.role === 'MANAGER' ? 'Manager' : 'Moderator'}
                        </span>
                        {admin.isActive ? (
                          <span className="px-2 py-0.5 bg-success-100 text-success-700 text-xs font-semibold rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-semibold rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{admin.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Added {new Date(admin.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <select
                      value={admin.role}
                      onChange={async (e) => {
                        const role = e.target.value as 'ADMIN' | 'MODERATOR' | 'MANAGER'
                        try {
                          const res = await fetch(`/api/admins/${admin.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role }),
                          })
                          if (!res.ok) {
                            const data = await res.json().catch(() => null)
                            throw new Error(data?.error || 'Failed to update role')
                          }
                          await fetchAdmins()
                        } catch (err: any) {
                          setError(err?.message || 'Failed to update role')
                        }
                      }}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50"
                      aria-label="Role"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(admin.id, admin.email, e)}
                    disabled={isDeleting[admin.id] || deleteConfirm.show}
                    className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove admin"
                    type="button"
                  >
                    {isDeleting[admin.id] ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        </main>
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-green to-brand-green-dark px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Add New Administrator</h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewAdmin({ email: '', name: '', role: 'ADMIN' })
                    setError('')
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  required
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  The admin will use this email to sign in via Azure AD
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Role *
                </label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white"
                >
                  <option value="ADMIN">Admin (full access)</option>
                  <option value="MODERATOR">Moderator (qualified-only)</option>
                  <option value="MANAGER">Manager (restricted access)</option>
                </select>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewAdmin({ email: '', name: '', role: 'ADMIN' })
                    setError('')
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 px-4 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add Admin
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleModalBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-5 border-b border-red-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Remove Administrator</h3>
                  <p className="text-sm text-slate-600 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-slate-700 mb-4">
                Are you sure you want to remove <span className="font-semibold text-slate-900">{deleteConfirm.adminEmail}</span> as an administrator?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Warning</p>
                  <p>This will immediately revoke their access to the admin dashboard. They will no longer be able to sign in.</p>
                </div>
              </div>
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">Error</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting[deleteConfirm.adminId || '']}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-white hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting[deleteConfirm.adminId || '']}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                type="button"
              >
                {isDeleting[deleteConfirm.adminId || ''] ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remove Admin
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
