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
  FileCheck,
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
  Activity,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Megaphone,
  KeyRound,
  Search
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface Admin {
  id: string
  email: string
  name: string | null
  isActive: boolean
  role: 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN'
  createdAt: string
  createdBy: string | null
}

interface InstallerCredentialResult {
  id: string
  firstName: string
  lastName: string
  email: string
  username: string | null
  companyName: string | null
  hasPassword: boolean
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const { sidebarOpen } = useSidebarOpen()
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
    role: 'ADMIN' as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN',
  })
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditQuery, setAuditQuery] = useState('')
  const [auditAction, setAuditAction] = useState<
    | 'all'
    | 'installer.status_change'
    | 'installer.delete'
    | 'installer.contract_generated'
    | 'installer.credentials_update'
    | 'admin.role_change'
    | 'admin.create'
  >('all')
  const [auditRange, setAuditRange] = useState<'day' | 'week' | 'month' | 'year'>('week')
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')
  const [credentialSearch, setCredentialSearch] = useState('')
  const [credentialResults, setCredentialResults] = useState<InstallerCredentialResult[]>([])
  const [credentialSearchLoading, setCredentialSearchLoading] = useState(false)
  const [selectedCredentialInstaller, setSelectedCredentialInstaller] = useState<InstallerCredentialResult | null>(null)
  const [credentialForm, setCredentialForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [credentialSaving, setCredentialSaving] = useState(false)

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN' | undefined
      if (role === 'MODERATOR') {
        router.push('/auth/access-denied')
        return
      }
      fetchAdmins()
      fetchPendingApprovalsCount()
      fetchSignatureNotSignedCount()
      fetchAuditLogs()
      const interval = setInterval(() => {
        fetchPendingApprovalsCount()
        fetchSignatureNotSignedCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [status, router])

  const fetchAuditLogs = async (opts?: { q?: string; action?: string; range?: 'day' | 'week' | 'month' | 'year' }) => {
    try {
      setAuditLoading(true)
      setAuditError('')
      const params = new URLSearchParams()
      const q = (opts?.q ?? auditQuery).trim()
      const action = (opts?.action ?? (auditAction === 'all' ? '' : auditAction)).trim()
      const range = opts?.range ?? auditRange
      if (q) params.set('q', q)
      if (action) params.set('action', action)
      params.set('range', range)
      params.set('take', '120')
      const res = await fetch(`/api/admin/audit?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setAuditLogs([])
        setAuditError(data?.error || `Failed to load audit log (HTTP ${res.status})`)
        return
      }
      const data = await res.json()
      setAuditLogs(Array.isArray(data?.logs) ? data.logs : [])
    } catch {
      setAuditLogs([])
      setAuditError('Failed to load audit log')
    } finally {
      setAuditLoading(false)
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

  const fetchSignatureNotSignedCount = async () => {
    try {
      const res = await fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' })
      if (res.status === 401) {
        setSignatureNotSignedCount(0)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setSignatureNotSignedCount(data?.count || 0)
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

  const handleCredentialSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = credentialSearch.trim()
    if (q.length < 2) {
      setCredentialResults([])
      setError('Type at least 2 characters to search installers')
      return
    }

    setCredentialSearchLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/installers/credentials?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to search installers')
      setCredentialResults(Array.isArray(data?.installers) ? data.installers : [])
    } catch (err: any) {
      setCredentialResults([])
      setError(err?.message || 'Failed to search installers')
    } finally {
      setCredentialSearchLoading(false)
    }
  }

  const handleSelectCredentialInstaller = (installer: InstallerCredentialResult) => {
    setSelectedCredentialInstaller(installer)
    setCredentialForm({
      email: installer.email || '',
      username: installer.username || '',
      password: '',
      confirmPassword: '',
    })
    setError('')
    setSuccess('')
  }

  const handleCredentialSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCredentialInstaller) {
      setError('Select an installer first')
      return
    }
    if (credentialForm.password && credentialForm.password !== credentialForm.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setCredentialSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/installers/credentials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installerId: selectedCredentialInstaller.id,
          email: credentialForm.email,
          username: credentialForm.username,
          password: credentialForm.password,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to update installer credentials')

      const updated = data.installer as InstallerCredentialResult
      setSelectedCredentialInstaller(updated)
      setCredentialResults((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setCredentialForm({
        email: updated.email || '',
        username: updated.username || '',
        password: '',
        confirmPassword: '',
      })
      setSuccess('Installer login credentials updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err?.message || 'Failed to update installer credentials')
    } finally {
      setCredentialSaving(false)
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
      setNewAdmin({ email: '', name: '', role: 'ADMIN' as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN' })
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
        <LogoHeartbeatLoader messageClassName="text-primary-600" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const currentRole = (session?.user as any)?.role as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN' | undefined
  if (currentRole === 'MODERATOR') {
    return null
  }
  const canManageInstallerCredentials = currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN'

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar pathname={pathname} />

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

        {canManageInstallerCredentials && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 md:p-8 mb-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Installer Login Access</h2>
                  <p className="text-sm text-slate-500">Search an installer and update their login email, username, or password</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCredentialSearch} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={credentialSearch}
                  onChange={(e) => setCredentialSearch(e.target.value)}
                  placeholder="Search by installer name, email, username, or company..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                />
              </div>
              <button
                type="submit"
                disabled={credentialSearchLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {credentialSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
            </form>

            {credentialResults.length > 0 && (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {credentialResults.map((installer) => {
                  const isSelected = selectedCredentialInstaller?.id === installer.id
                  return (
                    <button
                      key={installer.id}
                      type="button"
                      onClick={() => handleSelectCredentialInstaller(installer)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-brand-green bg-brand-green/10'
                          : 'border-slate-200 bg-slate-50 hover:border-brand-green/50 hover:bg-white'
                      }`}
                    >
                      <div className="font-bold text-slate-900">
                        {installer.firstName} {installer.lastName}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{installer.email}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-white px-2 py-1 text-slate-600">
                          Username: {installer.username || 'not set'}
                        </span>
                        <span className={`rounded-full px-2 py-1 ${installer.hasPassword ? 'bg-success-100 text-success-700' : 'bg-amber-100 text-amber-700'}`}>
                          {installer.hasPassword ? 'Password set' : 'No password'}
                        </span>
                        {installer.companyName ? (
                          <span className="rounded-full bg-white px-2 py-1 text-slate-600">{installer.companyName}</span>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedCredentialInstaller && (
              <form onSubmit={handleCredentialSave} className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    Update login for {selectedCredentialInstaller.firstName} {selectedCredentialInstaller.lastName}
                  </h3>
                  <p className="text-sm text-slate-500">Leave password fields blank to keep the current password.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Login email</label>
                    <input
                      type="email"
                      value={credentialForm.email}
                      onChange={(e) => setCredentialForm((current) => ({ ...current, email: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Username</label>
                    <input
                      value={credentialForm.username}
                      onChange={(e) => setCredentialForm((current) => ({ ...current, username: e.target.value }))}
                      placeholder="Optional username"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">New password</label>
                    <input
                      type="password"
                      value={credentialForm.password}
                      onChange={(e) => setCredentialForm((current) => ({ ...current, password: e.target.value }))}
                      placeholder="At least 8 chars, upper/lower/number"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm password</label>
                    <input
                      type="password"
                      value={credentialForm.confirmPassword}
                      onChange={(e) => setCredentialForm((current) => ({ ...current, confirmPassword: e.target.value }))}
                      placeholder="Repeat new password"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={credentialSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 font-semibold text-white shadow-lg shadow-brand-green/20 transition-colors hover:bg-brand-green-dark disabled:opacity-50"
                  >
                    {credentialSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save installer login
                  </button>
                </div>
              </form>
            )}
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

          {/* Super Admins */}
          {admins.some((a) => a.role === 'SUPER_ADMIN') && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border border-purple-200 bg-purple-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Super Admins</h3>
                    <p className="text-sm text-slate-500">Only Super Admins can access Claims.</p>
                  </div>
                </div>
                <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-extrabold text-purple-700">
                  {admins.filter((a) => a.role === 'SUPER_ADMIN').length}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {admins
                  .filter((a) => a.role === 'SUPER_ADMIN')
                  .map((a) => (
                    <div key={a.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="font-bold text-slate-900 truncate">{a.name || a.email}</div>
                      <div className="text-sm text-slate-500 truncate">{a.email}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

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
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : (String((admin as any).role || '').toUpperCase() === 'ADMIN' || String((admin as any).role || '').toUpperCase() === 'SUPER_ADMIN')
                                ? 'bg-brand-green/10 text-brand-green'
                                : admin.role === 'MANAGER'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {admin.role === 'SUPER_ADMIN'
                            ? 'Super Admin'
                            : (String((admin as any).role || '').toUpperCase() === 'ADMIN' || String((admin as any).role || '').toUpperCase() === 'SUPER_ADMIN')
                              ? 'Admin'
                              : admin.role === 'MANAGER'
                                ? 'Manager'
                                : 'Moderator'}
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
                        const role = e.target.value as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN'
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
                      {currentRole === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
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

        {/* Audit Log Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 md:p-8"
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Audit log</h2>
                <p className="text-sm text-slate-500">Tracks admin activity by period. Default view is this week.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchAuditLogs()}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="flex-1">
              <input
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchAuditLogs({ q: (e.target as HTMLInputElement).value })
                }}
                placeholder="Search: installer name/email/id or admin email…"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
              />
            </div>
            <select
              value={auditAction}
              onChange={(e) => {
                const v = e.target.value as any
                setAuditAction(v)
                fetchAuditLogs({ action: v === 'all' ? '' : v })
              }}
              className="px-4 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50"
              aria-label="Audit action"
            >
              <option value="all">All actions</option>
              <option value="installer.status_change">Installer status changed</option>
              <option value="installer.delete">Installer deleted</option>
              <option value="installer.contract_generated">Contract generated</option>
              <option value="installer.credentials_update">Installer login updated</option>
              <option value="admin.role_change">Admin role changed</option>
              <option value="admin.create">Admin created</option>
            </select>
            <select
              value={auditRange}
              onChange={(e) => {
                const v = e.target.value as 'day' | 'week' | 'month' | 'year'
                setAuditRange(v)
                fetchAuditLogs({ range: v })
              }}
              className="px-4 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50"
              aria-label="Audit period"
            >
              <option value="day">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
            <button
              type="button"
              onClick={() => fetchAuditLogs()}
              className="px-4 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors shadow-lg shadow-brand-green/20"
            >
              Search
            </button>
          </div>

          {auditError && (
            <div className="mb-4 p-3 rounded-xl border border-danger-200 bg-danger-50 text-danger-700 text-sm font-medium">
              {auditError}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="py-3 px-4 font-semibold">When</th>
                  <th className="py-3 px-4 font-semibold">Admin</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Installer</th>
                  <th className="py-3 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {auditLoading ? (
                  <tr>
                    <td className="py-5 px-4 text-slate-500" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td className="py-5 px-4 text-slate-500" colSpan={5}>
                      No audit events yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const actionLabel =
                      log.action === 'installer.delete'
                        ? 'Installer deleted'
                        : log.action === 'installer.status_change'
                        ? 'Installer status changed'
                        : log.action === 'installer.contract_generated'
                          ? 'Contract generated'
                        : log.action === 'installer.credentials_update'
                          ? 'Installer login updated'
                          : log.action === 'admin.role_change'
                            ? 'Admin role changed'
                            : log.action === 'admin.create'
                              ? 'Admin created'
                              : String(log.action || '')
                    const details =
                      log.action === 'installer.status_change' && log.before?.status !== undefined
                        ? `${String(log.before.status)} → ${String(log.after?.status)}`
                        : log.action === 'installer.credentials_update'
                          ? `Email: ${String(log.before?.email || '')} → ${String(log.after?.email || '')}${
                              log.after?.passwordChanged ? ' · Password changed' : ''
                            }`
                        : log.action === 'admin.role_change' && log.before?.role !== undefined
                          ? `${String(log.before.role)} → ${String(log.after?.role)}`
                          : log.action === 'admin.create' && log.after?.role
                            ? `Role: ${String(log.after.role)}`
                            : ''
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{log.adminEmail}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-green/10 text-brand-green">
                            {actionLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <div className="font-medium text-slate-900">{log.targetLabel || log.targetId}</div>
                          <div className="text-xs text-slate-500">{log.targetId}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{details}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
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
                  {currentRole === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin (claims-only)</option>}
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
