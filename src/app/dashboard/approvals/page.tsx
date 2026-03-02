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
import { AdminMobileMenu } from '@/components/AdminMobileMenu'

type ChangeRequest = {
  id: string
  createdAt: string
  status: string
  source: string | null
  sections: string[] | null
  submittedBy: string | null
  payload: Record<string, any>
  diffs?: Array<{ field: string; from: any; to: any }>
  Installer: {
    id: string
    firstName: string
    lastName: string
    email: string
    companyName: string | null
  }
}

type ApprovalGroup = {
  key: string
  installerId: string
  source: string | null
  Installer: ChangeRequest['Installer']
  requestIds: string[]
  createdAt: string // newest
  submittedBy: string | null
  sections: string[]
  changedKeys: string[]
  actions: string[] // e.g. create_staff
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [rejectModal, setRejectModal] = useState<{
    open: boolean
    ids: string[]
    label: string
    reason: string
  }>({ open: false, ids: [], label: '', reason: '' })

  const [agreementModal, setAgreementModal] = useState<{
    open: boolean
    id: string
    label: string
    signature: string
    signedDate: string
  }>({
    open: false,
    id: '',
    label: '',
    signature: '',
    signedDate: new Date().toISOString().slice(0, 10),
  })

  const requestsById = useMemo(() => {
    const m = new Map<string, ChangeRequest>()
    for (const r of requests) m.set(r.id, r)
    return m
  }, [requests])

  const humanizeField = (field: string): string => {
    const parts = String(field).split('.').filter(Boolean)
    const pretty = parts.map((p) =>
      p
        .replace(/_/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .trim()
    )
    return pretty.join(' › ')
  }

  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (typeof val === 'number') return String(val)
    if (typeof val === 'string') {
      const s = val.trim()
      if (!s) return '—'
      // ISO date-ish strings
      if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        const d = new Date(s)
        if (!Number.isNaN(d.getTime())) return d.toLocaleString()
      }
      // JSON arrays/objects stored as strings
      if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
        try {
          const parsed = JSON.parse(s)
          if (Array.isArray(parsed)) return parsed.map(formatValue).join(', ')
          return JSON.stringify(parsed)
        } catch {
          // fall through
        }
      }
      return s
    }
    if (Array.isArray(val)) return val.map(formatValue).join(', ')
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val)
      } catch {
        return String(val)
      }
    }
    return String(val)
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (!rejectModal.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRejectModal({ open: false, ids: [], label: '', reason: '' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rejectModal.open])

  useEffect(() => {
    if (!agreementModal.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAgreementModal((p) => ({ ...p, open: false }))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [agreementModal.open])

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
      // Ensure sections are parsed correctly (Prisma returns JSON as object/array)
      const requestsWithParsedSections = (data.requests || []).map((r: any) => ({
        ...r,
        sections: r.sections ? (Array.isArray(r.sections) ? r.sections : JSON.parse(r.sections || '[]')) : null,
      }))
      setRequests(requestsWithParsedSections)
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
      if (!res.ok) throw new Error(data.details ? `${data.error || 'Failed to approve'}: ${data.details}` : data.error || 'Failed to approve')

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

  const handleApproveAgreement = async (id: string, adminSignature: string, adminSignedDate: string) => {
    setApproving((p) => ({ ...p, [id]: true }))
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', adminSignature, adminSignedDate }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(
          data.details ? `${data.error || 'Failed to approve agreement'}: ${data.details}` : data.error || 'Failed to approve agreement'
        )

      setSuccess('Agreement approved and signed.')
      setRequests((prev) => prev.filter((r) => r.id !== id))
      await fetchPendingCount()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to approve agreement')
    } finally {
      setApproving((p) => ({ ...p, [id]: false }))
    }
  }

  const handleApproveMany = async (ids: string[]) => {
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await handleApprove(id)
    }
  }

  const handleReject = async (id: string, reason = '') => {
    setApproving((p) => ({ ...p, [id]: true }))
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason || '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.details ? `${data.error || 'Failed to reject'}: ${data.details}` : data.error || 'Failed to reject')

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

  const handleRejectMany = async (ids: string[], reason = '') => {
    for (const id of ids) {
      setApproving((p) => ({ ...p, [id]: true }))
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`/api/admin/change-requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', rejectionReason: reason || '' }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.details ? `${data.error || 'Failed to reject'}: ${data.details}` : data.error || 'Failed to reject')
        setRequests((prev) => prev.filter((r) => r.id !== id))
      } catch (e: any) {
        setError(e.message || 'Failed to reject')
      } finally {
        setApproving((p) => ({ ...p, [id]: false }))
      }
    }
    await fetchPendingCount()
    setSuccess('Rejected change request(s).')
    setTimeout(() => setSuccess(''), 3000)
  }

  const openRejectModal = (ids: string[], label: string) => {
    setRejectModal({
      open: true,
      ids,
      label,
      reason: '',
    })
  }

  const confirmRejectFromModal = async () => {
    const ids = rejectModal.ids || []
    if (!ids.length) {
      setRejectModal({ open: false, ids: [], label: '', reason: '' })
      return
    }
    const reason = (rejectModal.reason || '').trim()
    setRejectModal({ open: false, ids: [], label: '', reason: '' })
    if (ids.length === 1) await handleReject(ids[0], reason)
    else await handleRejectMany(ids, reason)
  }

  const openAgreementModal = (id: string, label: string) => {
    setAgreementModal({
      open: true,
      id,
      label,
      signature: '',
      signedDate: new Date().toISOString().slice(0, 10),
    })
  }

  const confirmAgreementFromModal = async () => {
    const id = agreementModal.id
    const sig = (agreementModal.signature || '').trim()
    const date = (agreementModal.signedDate || '').trim()
    if (!id || !sig) {
      setAgreementModal((p) => ({ ...p, open: false }))
      setError('Admin signature is required to approve the agreement.')
      return
    }
    setAgreementModal((p) => ({ ...p, open: false }))
    await handleApproveAgreement(id, sig, date)
  }

  const groups = useMemo((): ApprovalGroup[] => {
    const map = new Map<string, ApprovalGroup>()
    for (const r of requests) {
      const key = `${r.Installer.id}::${r.source || ''}`
      const existing = map.get(key)
      const keys = Object.keys(r.payload || {})
      const sections = Array.isArray(r.sections) ? r.sections : []
      const action = typeof (r.payload as any)?.action === 'string' ? String((r.payload as any).action) : ''

      const createdAt = r.createdAt
      if (!existing) {
        map.set(key, {
          key,
          installerId: r.Installer.id,
          source: r.source,
          Installer: r.Installer,
          requestIds: [r.id],
          createdAt,
          submittedBy: r.submittedBy,
          sections: [...sections],
          changedKeys: [...keys],
          actions: action ? [action] : [],
        })
      } else {
        existing.requestIds.push(r.id)
        // newest timestamp (for display)
        if (new Date(createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          existing.createdAt = createdAt
          existing.submittedBy = r.submittedBy
        }
        existing.sections = Array.from(new Set([...(existing.sections || []), ...sections])).filter(Boolean)
        existing.changedKeys = Array.from(new Set([...(existing.changedKeys || []), ...keys])).filter(Boolean)
        if (action) existing.actions = Array.from(new Set([...(existing.actions || []), action])).filter(Boolean)
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/40"
            onClick={() => setRejectModal({ open: false, ids: [], label: '', reason: '' })}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {rejectModal.ids.length > 1 ? 'Reject changes' : 'Reject change'}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Add a reason (optional). This message will be sent to the installer.
                  </div>
                  {rejectModal.label && (
                    <div className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="font-semibold">For:</span> {rejectModal.label}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, ids: [], label: '', reason: '' })}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-800 mb-2">Reason for rejection (optional)</label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
                rows={4}
                placeholder="e.g., Please upload the updated insurance certificate with the correct expiry date."
                className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, ids: [], label: '', reason: '' })}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRejectFromModal}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                >
                  {rejectModal.ids.length > 1 ? 'Reject All' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Approve / Sign Modal */}
      {agreementModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAgreementModal((p) => ({ ...p, open: false }))}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">Sign &amp; approve agreement</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Add your signature to approve the installer&rsquo;s submitted agreement.
                  </div>
                  {agreementModal.label && (
                    <div className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="font-semibold">For:</span> {agreementModal.label}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAgreementModal((p) => ({ ...p, open: false }))}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Admin signature</label>
                <input
                  value={agreementModal.signature}
                  onChange={(e) => setAgreementModal((p) => ({ ...p, signature: e.target.value }))}
                  placeholder="Type your full name"
                  className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Date</label>
                <input
                  type="date"
                  value={agreementModal.signedDate}
                  onChange={(e) => setAgreementModal((p) => ({ ...p, signedDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAgreementModal((p) => ({ ...p, open: false }))}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAgreementFromModal}
                  className="px-4 py-2 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors font-medium"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <AdminMobileMenu pathname={pathname} />

      {/* Main */}
      <main className="lg:ml-64 flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 pr-4 pl-16 lg:px-6 pt-16 lg:pt-6 pb-6">
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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

          {groups.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center text-slate-600">
              No pending approvals.
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <motion.div
                  key={g.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
                >
                  {(() => {
                    const rawDiffs =
                      g.requestIds
                        .flatMap((id) => requestsById.get(id)?.diffs || [])
                        .filter(Boolean) || []
                    const deduped = new Map<string, { field: string; from: any; to: any }>()
                    for (const d of rawDiffs) deduped.set(String(d.field), d)
                    const diffs = Array.from(deduped.values())
                    const isExpanded = !!expanded[g.key]
                    const visibleDiffs = isExpanded ? diffs : diffs.slice(0, 4)

                    return (
                      <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="font-bold text-slate-900">
                          {g.Installer.companyName ? `${g.Installer.companyName} — ` : ''}
                          {g.Installer.firstName} {g.Installer.lastName}
                        </div>
                        <div className="text-sm text-slate-600">{g.Installer.email}</div>
                        {g.source && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {g.source}
                          </span>
                        )}
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                        {g.requestIds.length > 1 && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                            {g.requestIds.length} requests
                          </span>
                        )}
                      </div>

                      {g.sections.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="text-sm font-semibold text-slate-700">Sections:</span>
                          {g.sections.map((section) => (
                            <span
                              key={section}
                              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {section}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 text-sm text-slate-700">
                        <span className="font-semibold">Changed fields:</span>{' '}
                        {(() => {
                          const changed = diffs.map((d) => humanizeField(String(d.field)))
                          if (!changed.length) return '(none)'
                          const shown = isExpanded ? changed : changed.slice(0, 10)
                          const more = Math.max(0, changed.length - shown.length)
                          return (
                            <>
                              {shown.join(', ')}
                              {more > 0 ? ` +${more} more` : ''}
                            </>
                          )
                        })()}
                      </div>
                      {g.actions.length > 0 && (
                        <div className="mt-2 text-sm text-slate-600">
                          <span className="font-semibold">Action:</span>{' '}
                          {g.actions
                            .map((a) => {
                              if (a === 'create_staff') return 'Add Team Member'
                              if (a === 'update_staff') return 'Update Team Member'
                              if (a === 'delete_staff') return 'Delete Team Member'
                              if (a === 'approve_agreement') return 'Agreement Approval'
                              return a
                            })
                            .join(', ')}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-slate-500">
                        Submitted: {new Date(g.createdAt).toLocaleString()} {g.submittedBy ? `• by ${g.submittedBy}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/installers/${g.Installer.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-medium">View Profile</span>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          openRejectModal(
                            g.requestIds,
                            `${g.Installer.companyName ? `${g.Installer.companyName} — ` : ''}${g.Installer.firstName} ${
                              g.Installer.lastName
                            }`
                          )
                        }
                        disabled={g.requestIds.some((id) => !!approving[id])}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{g.requestIds.length > 1 ? 'Reject All' : 'Reject'}</span>
                      </button>
                      <button
                        onClick={() => {
                          const firstId = g.requestIds[0]
                          const first = firstId ? requestsById.get(firstId) : null
                          const action = typeof (first?.payload as any)?.action === 'string' ? String((first?.payload as any).action) : ''
                          const isAgreement = action === 'approve_agreement' && g.requestIds.length === 1
                          const label = `${g.Installer.companyName ? `${g.Installer.companyName} — ` : ''}${g.Installer.firstName} ${g.Installer.lastName}`
                          if (isAgreement && firstId) openAgreementModal(firstId, label)
                          else g.requestIds.length > 1 ? handleApproveMany(g.requestIds) : handleApprove(g.requestIds[0])
                        }}
                        disabled={g.requestIds.some((id) => !!approving[id])}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {(() => {
                            const firstId = g.requestIds[0]
                            const first = firstId ? requestsById.get(firstId) : null
                            const action = typeof (first?.payload as any)?.action === 'string' ? String((first?.payload as any).action) : ''
                            const isAgreement = action === 'approve_agreement' && g.requestIds.length === 1
                            return isAgreement ? 'Sign & Approve' : g.requestIds.length > 1 ? 'Approve All' : 'Approve'
                          })()}
                        </span>
                      </button>
                    </div>
                  </div>

                  {diffs.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-800">Changes (from → to)</div>
                        {diffs.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setExpanded((p) => ({ ...p, [g.key]: !p[g.key] }))}
                            className="text-sm text-brand-green hover:underline"
                          >
                            {isExpanded ? 'Show less' : `Show all (${diffs.length})`}
                          </button>
                        )}
                      </div>
                      {/* Mobile Card View */}
                      <div className="lg:hidden mt-2 space-y-2">
                        {visibleDiffs.map((d) => (
                          <div key={d.field} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="font-semibold text-slate-800 text-sm mb-2">{humanizeField(d.field)}</div>
                            <div className="space-y-1.5">
                              <div>
                                <div className="text-xs text-slate-500 mb-0.5">From:</div>
                                <div className="text-sm text-slate-600 break-words">{formatValue(d.from)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-0.5">To:</div>
                                <div className="text-sm text-slate-900 font-medium break-words">{formatValue(d.to)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Desktop Table View */}
                      <div className="hidden lg:block mt-2 overflow-x-auto">
                        <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">Field</th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">From</th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">To</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleDiffs.map((d) => (
                              <tr key={d.field} className="align-top">
                                <td className="px-3 py-2 border-b border-slate-100 text-slate-800 whitespace-nowrap">
                                  {humanizeField(d.field)}
                                </td>
                                <td className="px-3 py-2 border-b border-slate-100 text-slate-600 max-w-[360px]">
                                  <div className="break-words">{formatValue(d.from)}</div>
                                </td>
                                <td className="px-3 py-2 border-b border-slate-100 text-slate-900 max-w-[360px]">
                                  <div className="break-words font-medium">{formatValue(d.to)}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                      </>
                    )
                  })()}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

