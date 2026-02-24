'use client'

import { useEffect, useMemo, useState } from 'react'
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
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

type ChangeRequest = {
  id: string
  createdAt: string
  status: string
  source: string | null
  submittedBy: string | null
  payload: Record<string, any>
  Installer: {
    id: string
    firstName: string
    lastName: string
    email: string
    companyName: string | null
  }
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [approving, setApproving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/admin/change-requests/count')
      if (res.status === 401) {
        // Session missing/expired on this domain
        setPendingCount(0)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setPendingCount(data.count || 0)
      }
    } catch (e) {
      // ignore
    }
  }

  const fetchRequests = async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true)
      else setLoading(true)
      setError('')

      const res = await fetch('/api/admin/change-requests?status=pending&take=100')
      if (res.status === 401) {
        setError('Your admin session expired. Please sign in again.')
        router.push('/login')
        return
      }
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Admin access required.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || data.details || `Failed to fetch change requests (HTTP ${res.status})`)
      }
      const data = await res.json()
      setRequests(data.requests || [])
      await fetchPendingCount()
    } catch (e: any) {
      setError(e.message || 'Failed to fetch approvals')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRequests()
      fetchPendingCount()
      const interval = setInterval(fetchPendingCount, 30000)
      return () => clearInterval(interval)
    }
  }, [status])

  const handleApprove = async (id: string) => {
    setApproving((p) => ({ ...p, [id]: true }))
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to approve')

      setSuccess('Approved and applied changes.')
      setRequests((prev) => prev.filter((r) => r.id !== id))
      await fetchPendingCount()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to approve')
    } finally {
      setApproving((p) => ({ ...p, [id]: false }))
    }
  }

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reason for rejection? (optional)') || ''
    setApproving((p) => ({ ...p, [id]: true }))
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to reject')

      setSuccess('Rejected change request.')
      setRequests((prev) => prev.filter((r) => r.id !== id))
      await fetchPendingCount()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to reject')
    } finally {
      setApproving((p) => ({ ...p, [id]: false }))
    }
  }

  const rows = useMemo(() => {
    return requests.map((r) => {
      const keys = Object.keys(r.payload || {})
      return { ...r, changedKeys: keys }
    })
  }, [requests])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-slate-600">Loading approvals...</p>
        </div>
      </div>
    )
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
              <div>
                <h1 className="font-bold text-primary-900 text-sm">PRM Dashboard</h1>
                <p className="text-xs text-primary-500">Admin Dashboard</p>
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
                {pendingCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white text-brand-green text-xs font-bold">
                    {pendingCount}
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

      {/* Main */}
      <main className="lg:ml-64 flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-green/10 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-brand-green" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Approvals</h1>
              </div>
              <p className="text-slate-600 ml-14">Review installer-submitted changes and approve or reject them</p>
            </div>
            <button
              onClick={() => fetchRequests(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white hover:bg-brand-green-dark rounded-xl transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-start gap-3">
              <XCircle className="w-5 h-5 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5" />
              <div className="text-sm">{success}</div>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-600">
              No pending approvals.
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="font-bold text-slate-900">
                          {r.Installer.companyName ? `${r.Installer.companyName} — ` : ''}
                          {r.Installer.firstName} {r.Installer.lastName}
                        </div>
                        <div className="text-sm text-slate-600">{r.Installer.email}</div>
                        {r.source && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {r.source}
                          </span>
                        )}
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      </div>

                      <div className="mt-3 text-sm text-slate-700">
                        <span className="font-semibold">Changed fields:</span>{' '}
                        {r.changedKeys.length ? r.changedKeys.join(', ') : '(none)'}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Submitted: {new Date(r.createdAt).toLocaleString()} {r.submittedBy ? `• by ${r.submittedBy}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/installers/${r.Installer.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-medium">View Profile</span>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={!!approving[r.id]}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Reject</span>
                      </button>
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={!!approving[r.id]}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Approve</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

