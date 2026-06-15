'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  DollarSign,
  ExternalLink,
  FileText,
  Hammer,
  Loader2,
  MapPin,
  Search,
  Store,
  User,
} from 'lucide-react'

import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type CilioJobRecord = {
  id: string
  orderNumber: number
  orderStatusDescription: string | null
  jobType: string
  storeNumber: string | null
  storeName: string | null
  laborCategoryDescription: string | null
  workroom: string | null
  scheduledInstallDate: string | null
  measureDate: string | null
  bookingDate: string | null
  installerName: string | null
  installerId: string | null
  createdAt: string
  updatedAt: string
  cilioPayload: any
}

const formatDate = (d: string | null) => {
  if (!d) return null
  const date = new Date(d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

const formatCurrency = (n: number | null | undefined) => {
  if (n == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const getStatusPill = (status: string | null) => {
  const s = (status || '').toLowerCase()
  if (s.includes('chargeback')) return 'bg-red-100 text-red-700 border-red-200'
  if (s.includes('complete')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (s.includes('dispatched')) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (s.includes('cancel')) return 'bg-slate-100 text-slate-500 border-slate-200'
  if (s.includes('tentative')) return 'bg-purple-100 text-purple-700 border-purple-200'
  return 'bg-amber-100 text-amber-700 border-amber-200'
}

export default function JobsReportsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(normalizedRole)

  const [records, setRecords] = useState<CilioJobRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [jobTypeFilter, setJobTypeFilter] = useState('all')
  const [workroomFilter, setWorkroomFilter] = useState('all')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && normalizedRole && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess, normalizedRole])

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/cilio/jobs/saved')
      if (res.ok) {
        const data = await res.json()
        setRecords(data.records || [])
      }
    } catch { /* ignore */ }
    setIsLoading(false)
  }

  useEffect(() => {
    if (sessionStatus === 'authenticated' && canAccess) {
      fetchReports()
    }
  }, [sessionStatus, canAccess])

  const workrooms = useMemo(() => {
    const set = new Set<string>()
    records.forEach(r => { if (r.workroom) set.add(r.workroom) })
    return Array.from(set).sort()
  }, [records])

  const filtered = useMemo(() => {
    let list = records
    if (jobTypeFilter !== 'all') list = list.filter(r => r.jobType === jobTypeFilter)
    if (workroomFilter !== 'all') list = list.filter(r => r.workroom === workroomFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        String(r.orderNumber).includes(q) ||
        (r.storeName || '').toLowerCase().includes(q) ||
        (r.storeNumber || '').toLowerCase().includes(q) ||
        (r.installerName || '').toLowerCase().includes(q) ||
        (r.laborCategoryDescription || '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.orderNumber - a.orderNumber)
  }, [records, search, jobTypeFilter, workroomFilter])

  if (sessionStatus === 'loading') return <div className="min-h-screen flex items-center justify-center"><LogoHeartbeatLoader /></div>
  if (!session) return null
  if (!canAccess) return null

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/dashboard/jobs" className="text-xs font-medium text-slate-400 hover:text-brand-green transition-colors">
                    Job Hub
                  </Link>
                  <span className="text-slate-300">/</span>
                  <span className="text-xs font-medium text-brand-green">Reports</span>
                </div>
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-brand-green mb-2">Reports</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Saved Job Reports</h1>
                <p className="text-sm text-slate-500">
                  {records.length} jobs saved · Click a row to view report links
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchReports}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                </button>
                <Link
                  href="/dashboard/jobs/cilio"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white text-sm font-semibold hover:bg-brand-green-dark transition-colors"
                >
                  <Hammer className="w-4 h-4" />
                  <span className="hidden sm:inline">Cilio Jobs</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-10">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by order #, store, installer..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
              />
            </div>
            <select
              value={jobTypeFilter}
              onChange={e => setJobTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
            >
              <option value="all">All Types</option>
              <option value="scheduled">Scheduled</option>
              <option value="chargeback">Chargeback</option>
            </select>
            <select
              value={workroomFilter}
              onChange={e => setWorkroomFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
            >
              <option value="all">All Workrooms</option>
              {workrooms.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-semibold">No saved job reports</p>
              <p className="text-sm text-slate-400 mt-1">Save jobs from Cilio Jobs to see them here.</p>
              <Link href="/dashboard/jobs/cilio" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-brand-green text-white font-semibold text-sm hover:bg-brand-green-dark transition-colors">
                <Hammer className="w-4 h-4" /> Go to Cilio Jobs
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3 w-[30px]"></th>
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Job Name / Order #</th>
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((record) => {
                      const isExpanded = expandedId === record.id
                      const poAmount = record.cilioPayload?.poAmount ?? null
                      const statusClass = getStatusPill(record.orderStatusDescription)

                      return (
                        <Fragment key={record.id}>
                          {/* Main Row */}
                          <tr
                            onClick={() => setExpandedId(isExpanded ? null : record.id)}
                            className={`border-b border-slate-100 cursor-pointer transition-colors ${
                              isExpanded ? 'bg-brand-green/5' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-green/10 flex items-center justify-center">
                                  <Building2 className="w-4 h-4 text-brand-green" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {record.storeName || `Order #${record.orderNumber}`}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    #{record.orderNumber}
                                    {record.installerName && <> · {record.installerName}</>}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                record.jobType === 'chargeback'
                                  ? 'bg-red-50 text-red-600 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}>
                                {record.jobType}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusClass}`}>
                                {record.orderStatusDescription || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-slate-900">
                                {formatCurrency(poAmount) ?? <span className="text-slate-300">—</span>}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Detail Row */}
                          <AnimatePresence>
                            {isExpanded && (
                              <tr key={`detail-${record.id}`} className="border-b border-slate-100">
                                <td colSpan={5} className="p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-6 py-4 bg-gradient-to-b from-brand-green/5 to-white border-t border-brand-green/10">
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                        {/* Detail fields */}
                                        {record.storeName && (
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Store</p>
                                            <p className="text-sm font-semibold text-slate-800">{record.storeName}</p>
                                            {record.storeNumber && <p className="text-xs text-slate-500">#{record.storeNumber}</p>}
                                          </div>
                                        )}
                                        {record.workroom && (
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workroom</p>
                                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                              {record.workroom}
                                            </p>
                                          </div>
                                        )}
                                        {record.laborCategoryDescription && (
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Labor Category</p>
                                            <p className="text-sm font-semibold text-slate-800">{record.laborCategoryDescription}</p>
                                          </div>
                                        )}
                                        {record.scheduledInstallDate && (
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Install Date</p>
                                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                              {formatDate(record.scheduledInstallDate)}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</p>
                                      <div className="flex flex-wrap gap-2">
                                        <Link
                                          href={`/dashboard/jobs/cilio?search=${record.orderNumber}`}
                                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-green/20 bg-brand-green/5 text-sm font-semibold text-brand-green hover:bg-brand-green/10 transition-colors"
                                        >
                                          <Search className="w-4 h-4" />
                                          Find in Jobs
                                        </Link>
                                        <a
                                          href={`https://app.cilio.com/Job/Detail/${record.orderNumber}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                          Open in Cilio
                                        </a>
                                        {record.storeNumber && (
                                          <a
                                            href={`https://app.cilio.com/Store/Detail/${record.storeNumber}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                                          >
                                            <Store className="w-4 h-4" />
                                            Store: {record.storeNumber}
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
