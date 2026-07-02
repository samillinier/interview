'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  ClipboardList,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Clock,
  Calendar,
  ArrowUpRight,
} from 'lucide-react'

import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface AuditLog {
  id: string
  createdAt: string
  adminEmail: string
  action: string
  targetLabel: string | null
  targetId: string
  before: any
  after: any
}

interface RecentAction {
  action: string
  count: number
}

interface SecurityMeasure {
  id: string
  category: string
  label: string
  status: 'secured' | 'warning' | 'pending'
  description: string
}

interface SecurityStatus {
  auditStats: {
    totalLogs: number
    changesToday: number
    changesThisWeek: number
    recentActions: RecentAction[]
  }
  securityMeasures: SecurityMeasure[]
  securedCount: number
  warningCount: number
  totalCount: number
}

const actionLabels: Record<string, string> = {
  'installer.status_change': 'Installer status changed',
  'installer.delete': 'Installer deleted',
  'installer.contract_generated': 'Contract generated',
  'installer.credentials_update': 'Installer login updated',
  'admin.role_change': 'Admin role changed',
  'admin.create': 'Admin created',
}

export default function AuditPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(
    String((session?.user as any)?.role || '').toUpperCase()
  )

  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditQuery, setAuditQuery] = useState('')
  const [auditAction, setAuditAction] = useState('')
  const [auditRange, setAuditRange] = useState('week')
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')

  const fetchSecurityStatus = useCallback(async () => {
    try {
      setStatusLoading(true)
      const res = await fetch('/api/admin/audit/security-status', { cache: 'no-store' })
      if (res.ok) {
        setSecurityStatus(await res.json())
      }
    } catch {
      /* silently ignore */
    }
    setStatusLoading(false)
  }, [])

  const fetchAuditLogs = useCallback(
    async (opts?: { q?: string; action?: string; range?: string }) => {
      try {
        setAuditLoading(true)
        setAuditError('')
        const params = new URLSearchParams()
        const q = (opts?.q ?? auditQuery).trim()
        const action = opts?.action ?? auditAction
        const range = opts?.range ?? auditRange
        if (q) params.set('q', q)
        if (action) params.set('action', action)
        params.set('range', range)
        params.set('take', '120')
        const res = await fetch(`/api/admin/audit?${params.toString()}`, { cache: 'no-store' })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setAuditError(data?.error || 'Failed to fetch audit logs')
          setAuditLogs([])
        } else {
          const data = await res.json()
          setAuditLogs(data.logs || [])
        }
      } catch {
        setAuditError('Network error')
      }
      setAuditLoading(false)
    },
    [auditQuery, auditAction, auditRange]
  )

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess])

  useEffect(() => {
    if (sessionStatus === 'authenticated' && canAccess) {
      fetchSecurityStatus()
      fetchAuditLogs()
    }
  }, [sessionStatus, canAccess, fetchSecurityStatus, fetchAuditLogs])

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!session || !canAccess) return null

  const securedPct =
    securityStatus ? Math.round((securityStatus.securedCount / securityStatus.totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />

      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        } w-full`}
      >
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="max-w-[1400px] mx-auto">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-brand-green mb-2">
                Jobs / Audit
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                Security Audit
              </h1>
              <p className="text-sm text-slate-500">
                Monitor suspicious activity, admin actions, and security measures.
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-10 space-y-6">
          {/* Stats Cards */}
          {securityStatus && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-brand-green" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {securityStatus.auditStats.totalLogs.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">Total audit events</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {securityStatus.auditStats.changesToday}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">Changes today</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {securityStatus.auditStats.changesThisWeek}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">Changes this week</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`rounded-2xl border p-5 shadow-sm ${
                  securityStatus.warningCount === 0
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      securityStatus.warningCount === 0
                        ? 'bg-green-100'
                        : 'bg-amber-100'
                    }`}
                  >
                    {securityStatus.warningCount === 0 ? (
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {securedPct}%
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {securityStatus.securedCount}/{securityStatus.totalCount} measures secured
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Security Measures Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Security Measures</h2>
                  <p className="text-sm text-slate-500">
                    Status of all security hardening applied to the system.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchSecurityStatus}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {statusLoading && !securityStatus ? (
              <p className="text-slate-500 text-sm">Loading security status...</p>
            ) : securityStatus ? (
              <div className="space-y-3">
                {securityStatus.securityMeasures.map((measure) => (
                  <div
                    key={measure.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border ${
                      measure.status === 'secured'
                        ? 'border-green-200 bg-green-50/50'
                        : measure.status === 'warning'
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {measure.status === 'secured' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : measure.status === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      ) : (
                        <ShieldX className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                          {measure.category}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            measure.status === 'secured'
                              ? 'bg-green-100 text-green-700'
                              : measure.status === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {measure.status === 'secured'
                            ? 'SECURED'
                            : measure.status === 'warning'
                              ? 'PENDING'
                              : measure.status}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-900">{measure.label}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{measure.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Unable to load security status.</p>
            )}
          </motion.div>

          {/* Recent Actions Breakdown */}
          {securityStatus && securityStatus.auditStats.recentActions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Recent Actions (30 days)</h2>
                  <p className="text-sm text-slate-500">Most frequent admin actions in the last month.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {securityStatus.auditStats.recentActions.map((ra) => (
                  <div
                    key={ra.action}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50"
                  >
                    <span className="text-sm font-semibold text-slate-700">
                      {actionLabels[ra.action] || ra.action}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-brand-green/10 text-brand-green">
                      {ra.count}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Audit Log Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
                  <p className="text-sm text-slate-500">
                    Tracks admin activity by period. Default view is this week.
                  </p>
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
                    if (e.key === 'Enter')
                      fetchAuditLogs({ q: (e.target as HTMLInputElement).value })
                  }}
                  placeholder="Search: installer name/email/id or admin email..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
                />
              </div>
              <select
                value={auditAction}
                onChange={(e) => {
                  const v = e.target.value
                  setAuditAction(v)
                  fetchAuditLogs({ action: v })
                }}
                className="px-4 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50"
                aria-label="Audit action"
              >
                <option value="">All actions</option>
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
                  const v = e.target.value
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
                        Loading...
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
                      const label =
                        actionLabels[log.action] || String(log.action || '')
                      const details =
                        log.action === 'installer.status_change' &&
                        log.before?.status !== undefined
                          ? `${String(log.before.status)} \u2192 ${String(log.after?.status)}`
                          : log.action === 'installer.credentials_update'
                            ? `Email: ${String(log.before?.email || '')} \u2192 ${String(log.after?.email || '')}${
                                log.after?.passwordChanged ? ' \u00b7 Password changed' : ''
                              }`
                            : log.action === 'admin.role_change' &&
                              log.before?.role !== undefined
                              ? `${String(log.before.role)} \u2192 ${String(log.after?.role)}`
                              : log.action === 'admin.create' && log.after?.role
                                ? `Role: ${String(log.after.role)}`
                                : ''
                      return (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString()
                              : ''}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{log.adminEmail}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-green/10 text-brand-green">
                              {label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <div className="font-medium text-slate-900">
                              {log.targetLabel || log.targetId}
                            </div>
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
    </div>
  )
}

