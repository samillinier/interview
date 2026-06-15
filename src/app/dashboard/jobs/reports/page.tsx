'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  Hammer,
  Loader2,
  MapPin,
  Paperclip,
  Phone,
  Receipt,
  Search,
  StickyNote,
  Store,
  User,
  Wrench,
  X,
} from 'lucide-react'

import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

// ── Types ──────────────────────────────────────────────────
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
  statusChangedAt: string | null
  cilioPayload: any
}

type CilioJobFullDetail = Record<string, any>

interface JobAttachment {
  orderAttachmentNumber: number
  filename: string
  orderAttachmentTypeDescription: string
  lastModifiedDate: string
}

interface JobNote {
  orderNoteNumber: number
  note: string
  createdOn: string
  noteSource: string | null
  orderNoteTypeDescription: string
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '')
}

// ── Helpers ────────────────────────────────────────────────
const formatDate = (d: string | null | undefined) => {
  if (!d) return null
  const date = new Date(d)
  if (isNaN(date.getTime())) return 'Invalid date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatCurrency = (n: number | string | null | undefined) => {
  if (n == null || n === '' || Number(n) === 0) return null
  const val = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(val)) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
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

function Field({ label, value, icon: Icon, accent, noTruncate }: { label: string; value?: any; icon?: any; accent?: boolean; noTruncate?: boolean }) {
  if (value == null || value === '') return null
  const display = typeof value === 'number' ? String(value) : value
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${accent ? 'border-brand-green/20 bg-brand-green/5' : 'border-slate-100 bg-white'}`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-semibold flex items-center gap-1.5 ${noTruncate ? '' : 'truncate'} ${accent ? 'text-brand-green' : 'text-slate-800'}`}>
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
        {display}
      </p>
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-brand-green/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-green" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────
export default function JobsReportsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(
    String((session?.user as any)?.role || '').toUpperCase()
  )

  const [records, setRecords] = useState<CilioJobRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [detailRecord, setDetailRecord] = useState<CilioJobRecord | null>(null)
  const [fullDetail, setFullDetail] = useState<CilioJobFullDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailNotes, setDetailNotes] = useState<JobNote[]>([])
  const [jobAttachments, setJobAttachments] = useState<JobAttachment[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [laborFilter, setLaborFilter] = useState('')
  const [workroomFilter, setWorkroomFilter] = useState('all')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess])

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/cilio/jobs/saved')
      if (res.ok) setRecords((await res.json()).records || [])
    } catch { /* ignore */ }
    setIsLoading(false)
  }

  useEffect(() => {
    if (sessionStatus === 'authenticated' && canAccess) fetchReports()
  }, [sessionStatus, canAccess])

  const workrooms = useMemo(() => {
    const set = new Set<string>()
    records.forEach(r => { if (r.workroom) set.add(r.workroom) })
    return Array.from(set).sort()
  }, [records])

  const statuses = useMemo(() => {
    const set = new Set<string>()
    records.forEach(r => { if (r.orderStatusDescription) set.add(r.orderStatusDescription) })
    return Array.from(set).sort()
  }, [records])

  const laborCategories = useMemo(() => {
    const set = new Set<string>()
    records.forEach(r => { if (r.laborCategoryDescription) set.add(r.laborCategoryDescription) })
    return Array.from(set).sort()
  }, [records])

  const filtered = useMemo(() => {
    let list = records
    if (statusFilter) list = list.filter(r => r.orderStatusDescription === statusFilter)
    if (laborFilter) list = list.filter(r => r.laborCategoryDescription === laborFilter)
    if (workroomFilter !== 'all') list = list.filter(r => r.workroom === workroomFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        String(r.orderNumber).includes(q) ||
        (r.storeName || '').toLowerCase().includes(q) ||
        (r.storeNumber || '').toLowerCase().includes(q) ||
        (r.installerName || '').toLowerCase().includes(q) ||
        (r.laborCategoryDescription || '').toLowerCase().includes(q) ||
        (r.cilioPayload?.customerFirstName || '').toLowerCase().includes(q) ||
        (r.cilioPayload?.customerLastName || '').toLowerCase().includes(q) ||
        (r.cilioPayload?.customerFirstLast || '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.orderNumber - a.orderNumber)
  }, [records, search, statusFilter, laborFilter, workroomFilter])

  const openDetail = async (record: CilioJobRecord) => {
    setDetailRecord(record)
    setFullDetail(null)
    setDetailError(null)
    setDetailNotes([])
    setJobAttachments([])
    setLoadingDetail(true)
    setLoadingAttachments(true)
    try {
      const [detailRes, notesRes, attRes] = await Promise.all([
        fetch(`/api/cilio/jobs/${record.orderNumber}`),
        fetch(`/api/cilio/jobs/${record.orderNumber}/notes`),
        fetch(`/api/cilio/jobs/${record.orderNumber}/attachments`),
      ])
      const [detailData, notesData, attData] = await Promise.all([
        detailRes.json(),
        notesRes.json().catch(() => ({ notes: [] })),
        attRes.json().catch(() => ({ attachments: [] })),
      ])
      if (detailRes.ok && detailData.detail) {
        setFullDetail(detailData.detail)
        setDetailNotes(notesData.notes || [])
        setJobAttachments(attData.attachments || [])
      } else {
        setDetailError(detailData.error || 'Failed to load detail')
      }
    } catch {
      setDetailError('Network error loading detail')
    }
    setLoadingDetail(false)
    setLoadingAttachments(false)
  }

  const closeDetail = () => {
    setDetailRecord(null)
    setFullDetail(null)
    setDetailError(null)
  }

  const getCustomerName = (record: CilioJobRecord) => {
    const p = record.cilioPayload
    return [p?.customerFirstName, p?.customerLastName].filter(Boolean).join(' ') || null
  }

  if (sessionStatus === 'loading') return <div className="min-h-screen flex items-center justify-center"><LogoHeartbeatLoader /></div>
  if (!session || !canAccess) return null

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
                  <Link href="/dashboard/jobs" className="text-xs font-medium text-slate-400 hover:text-brand-green transition-colors">Job Hub</Link>
                  <span className="text-slate-300">/</span>
                  <span className="text-xs font-medium text-brand-green">Reports</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Saved Job Reports</h1>
                <p className="text-sm text-slate-500">{records.length} jobs saved · Click any row for full detail</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-10">
          {/* Search + Filters Card */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search by customer name, store, project number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-shrink-0 px-3 sm:px-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium min-w-[140px]"
                >
                  <option value="">All Statuses</option>
                  {statuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={laborFilter}
                  onChange={(e) => setLaborFilter(e.target.value)}
                  className="flex-shrink-0 px-3 sm:px-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium min-w-[160px]"
                >
                  <option value="">All Labor Categories</option>
                  {laborCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={workroomFilter}
                  onChange={(e) => setWorkroomFilter(e.target.value)}
                  className="flex-shrink-0 px-3 sm:px-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium min-w-[155px]"
                >
                  <option value="all">All Workrooms</option>
                  {workrooms.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-semibold">No saved job reports</p>
              <p className="text-sm text-slate-400 mt-1">Save jobs from Cilio Jobs to see them here.</p>
              <Link href="/dashboard/jobs/cilio" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-brand-green text-white font-semibold text-sm hover:bg-brand-green-dark transition-colors"><Hammer className="w-4 h-4" /> Go to Cilio Jobs</Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Job Name / Order #</th>
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Labor</th>
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Workroom</th>
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(record => {
                      const poAmount = record.cilioPayload?.poAmount ?? null
                      const statusClass = getStatusPill(record.orderStatusDescription)
                      const customerName = getCustomerName(record)
                      const p = record.cilioPayload
                      const di = p?.dateInformation || {}
                      const si = p?.schedulingInformation || {}
                      const schedDate = record.scheduledInstallDate
                        || di?.desiredInstallDate
                        || si?.scheduleDate
                        || p?.currentOrderStatusDate
                        || null
                      const measureDate = record.measureDate || di?.currentDate || null
                      const bookingDate = record.bookingDate || di?.leadCreationDate || null
                      return (
                        <tr key={record.id} onClick={() => openDetail(record)} className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-green/10 flex items-center justify-center"><Building2 className="w-4 h-4 text-brand-green" /></div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{customerName || record.storeName || `Order #${record.orderNumber}`}</p>
                                <p className="text-xs text-slate-400">#{record.orderNumber}{record.storeName && <> · {record.storeName}</>}{record.installerName && record.installerId && <> · <Link href={`/dashboard/installers/${record.installerId}`} onClick={e => e.stopPropagation()} className="text-brand-green underline underline-offset-2 decoration-brand-green/30 hover:decoration-brand-green/60 font-medium transition-colors">{record.installerName}</Link></>}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                  {schedDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(schedDate)}</span>}
                                  {measureDate && <span className="flex items-center gap-1">· Measure {formatDate(measureDate)}</span>}
                                  {bookingDate && <span className="flex items-center gap-1">· Booked {formatDate(bookingDate)}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {record.laborCategoryDescription ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                                <Wrench className="w-3 h-3" />
                                {record.laborCategoryDescription}
                              </span>
                            ) : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {record.workroom ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-600 border border-purple-200">
                                <MapPin className="w-3 h-3" />
                                {record.workroom}
                              </span>
                            ) : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusClass}`}>{record.orderStatusDescription || 'Unknown'}</span>
                              {record.statusChangedAt && (() => {
                                const changed = new Date(record.statusChangedAt)
                                const daysAgo = Math.floor((Date.now() - changed.getTime()) / 86400000)
                                if (daysAgo <= 7) return (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title={`Status changed ${daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`}`}>
                                    <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                    {daysAgo === 0 ? 'Today' : `${daysAgo}d`}
                                  </span>
                                )
                                return null
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right"><span className="text-sm font-semibold text-slate-900">{formatCurrency(poAmount) ?? <span className="text-slate-300">—</span>}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDetail} />
            <div className="relative min-h-screen flex items-start justify-center px-2 sm:px-4 py-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden my-4 pointer-events-auto"
              >
                {loadingDetail ? (
                  <div className="flex flex-col items-center py-24">
                    <Loader2 className="w-10 h-10 text-brand-green animate-spin mb-4" />
                    <p className="text-brand-green/70 font-medium">Loading full job detail...</p>
                  </div>
                ) : detailError ? (
                  <div className="flex flex-col items-center py-24 text-slate-400">
                    <AlertCircle className="w-14 h-14 mb-4 opacity-40" />
                    <p className="font-medium text-lg text-slate-500">{detailError}</p>
                    <button onClick={() => openDetail(detailRecord)} className="mt-4 px-6 py-2.5 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20">Retry</button>
                  </div>
                ) : !fullDetail ? (
                  <div className="flex flex-col items-center py-24 text-slate-400">
                    <AlertCircle className="w-14 h-14 mb-4 opacity-40" />
                    <p className="font-medium text-lg text-slate-500">Failed to load job detail</p>
                    <button onClick={() => openDetail(detailRecord)} className="mt-4 px-6 py-2.5 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20">Retry</button>
                  </div>
                ) : (() => {
                  const d = fullDetail
                  const gi = d.generalInformation || {}
                  const ci = d.customerInformation || {}
                  const di = d.dateInformation || {}
                  const si = d.schedulingInformation || {}
                  const st = d.storeInformation || {}

                  return <>
                    {/* Hero Header */}
                    <div className="bg-gradient-to-br from-brand-green to-emerald-700 px-4 sm:px-8 py-5 sm:py-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                      <div className="absolute bottom-0 left-1/2 w-96 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                      <div className="relative">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-xs font-semibold tracking-wide">#{d.orderNumber}</span>
                              {gi.orderStatusEnum && <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-xs font-semibold">{gi.orderStatusEnum}</span>}
                              {gi.orderTypeEnum && <span className="px-2.5 py-1 bg-white/10 rounded-full text-white/70 text-xs">{gi.orderTypeEnum}</span>}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                              {ci.customerFirstLast || [ci.customerFirstName, ci.customerLastName].filter(Boolean).join(' ') || `Order #${d.orderNumber}`}
                            </h1>
                            {ci.customerAddress?.fullAddress && (
                              <p className="text-white/70 text-sm flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{ci.customerAddress.fullAddress}</span></p>
                            )}
                          </div>
                          <button onClick={closeDetail} className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm flex-shrink-0 ml-2"><X className="w-5 h-5 text-white" /></button>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-5">
                          {gi.poAmount != null && (
                            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2">
                              <DollarSign className="w-4 h-4 text-white/60" />
                              <div><p className="text-white/50 text-xs">PO Amount</p><p className="text-white font-bold text-sm">{formatCurrency(gi.poAmount)}</p></div>
                            </div>
                          )}
                          {gi.invoiceNumber && (
                            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2">
                              <Receipt className="w-4 h-4 text-white/60" />
                              <div><p className="text-white/50 text-xs">Invoice</p><p className="text-white font-bold text-sm">{gi.invoiceNumber}</p></div>
                            </div>
                          )}
                          {gi.jobNumber && (
                            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2">
                              <Wrench className="w-4 h-4 text-white/60" />
                              <div><p className="text-white/50 text-xs">Job #</p><p className="text-white font-bold text-sm">{gi.jobNumber}</p></div>
                            </div>
                          )}
                          {gi.projectNumber && (
                            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2">
                              <Briefcase className="w-4 h-4 text-white/60" />
                              <div><p className="text-white/50 text-xs">Project</p><p className="text-white font-bold text-sm">{gi.projectNumber}</p></div>
                            </div>
                          )}
                          {detailRecord.installerName && (
                            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2">
                              <User className="w-4 h-4 text-white/60" />
                              <div><p className="text-white/50 text-xs">Installer</p>{detailRecord.installerId ? <Link href={`/dashboard/installers/${detailRecord.installerId}`} className="text-white font-bold text-sm underline underline-offset-2 decoration-white/30 hover:decoration-white/60 transition-colors">{detailRecord.installerName}</Link> : <p className="text-white font-bold text-sm">{detailRecord.installerName}</p>}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section Content */}
                    <div className="p-4 sm:p-6 space-y-4 bg-slate-50/50 max-h-[70vh] overflow-y-auto">
                      {/* Customer */}
                      {ci && (ci.customerFirstLast || ci.customerFirstName || ci.customerEmail || ci.customerPhone) && (
                        <SectionCard icon={User} title="Customer">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Field label="Name" value={ci.customerFirstLast} />
                            <Field label="First Name" value={ci.customerFirstName} />
                            <Field label="Last Name" value={ci.customerLastName} />
                            <Field label="Customer #" value={ci.customerNumber} />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                            <div className="col-span-2"><Field label="Email" value={ci.customerEmail} noTruncate /></div>
                            <Field label="Phone" value={ci.customerPhone} icon={Phone} />
                            <Field label="Alt Contact" value={ci.customerAltContact} />
                          </div>
                          {ci.customerAddress?.fullAddress && (
                            <div className="mt-3 bg-brand-green/5 rounded-xl p-3 border border-brand-green/20">
                              <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider mb-1">Service Address</p>
                              <p className="text-sm font-semibold text-slate-800">{ci.customerAddress.fullAddress}</p>
                              {ci.customerAddress.city && <p className="text-xs text-slate-500">{ci.customerAddress.city}{ci.customerAddress.state ? `, ${ci.customerAddress.state}` : ''} {ci.customerAddress.zip}</p>}
                            </div>
                          )}
                        </SectionCard>
                      )}

                      {/* General */}
                      {gi && Object.keys(gi).length > 1 && (
                        <SectionCard icon={Briefcase} title="General">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            <Field label="Job #" value={gi.jobNumber} />
                            <Field label="Project #" value={gi.projectNumber} />
                            <Field label="PO Amount" value={gi.poAmount != null ? formatCurrency(gi.poAmount) : null} accent />
                            <Field label="Invoice #" value={gi.invoiceNumber} />
                            <Field label="Sales Order" value={gi.salesOrderNumber} />
                            <Field label="Order Type" value={gi.orderTypeEnum} />
                            <Field label="Status" value={gi.orderStatusEnum} />
                            <Field label="Status Date" value={formatDate(gi.currentOrderStatusDate)} />
                            <Field label="Construction" value={gi.constructionTypeEnum} />
                            <Field label="Labor Amount" value={gi.laborAmount} />
                            <Field label="Budgeted Amt" value={gi.budgetedAmount} />
                            <Field label="Budgeted Year" value={gi.budgetedYear} />
                            <Field label="Job Duration" value={gi.jobDuration} />
                            <Field label="Total Duration" value={gi.totalJobDuration} />
                            <Field label="Est. Time" value={gi.estTimeToComplete} />
                            <Field label="Distance" value={gi.siteDetailsDistanceToSeller != null ? gi.siteDetailsDistanceToSeller + ' mi' : null} />
                            <Field label="Store District" value={gi.storeDistrict} />
                            <Field label="Project Umbrella" value={gi.projectUmbrella} />
                            <Field label="Store PO" value={gi.orderStorePO} />
                            <Field label="PO Daily Total" value={gi.poAmountDailyTotal != null ? formatCurrency(gi.poAmountDailyTotal) : null} />
                            <Field label="Product Amt" value={gi.productAmount} />
                            <Field label="Permit #" value={gi.permitNumber} />
                            <Field label="Year Built" value={gi.yearBuilt} />
                            <Field label="Lead-Safe" value={gi.leadSafeJob === 'True' ? 'Yes' : gi.leadSafeJob} />
                          </div>
                          {/* Payment */}
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Field label="Paid in Full" value={gi.paidInFull} />
                            <Field label="Total Paid" value={gi.paymentsTotalPaid} accent />
                            <Field label="Remaining Due" value={gi.paymentsRemainingDue} />
                            <Field label="Pending" value={gi.paymentsPendingAmount} />
                            <Field label="Last Trans Status" value={gi.paymentsLastTransStatus} />
                            <Field label="COD" value={gi.cod} />
                          </div>
                          {/* Sales */}
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                            <Field label="Sales Associate" value={gi.salesAssociate} />
                            <div className="col-span-2"><Field label="SA Email" value={gi.salesAssociateEmail} noTruncate /></div>
                            <Field label="SA Phone" value={gi.salesAssociatePhone} />
                            <Field label="Invoice Comment" value={gi.invoiceComment} />
                            <Field label="Reason Changed" value={gi.reasonChanged} />
                          </div>
                          {/* Notes */}
                          {(gi.scopeOfWorkNotes || gi.deliveryInfoSchedulingNotes) && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {gi.scopeOfWorkNotes && (
                                <div className="bg-slate-100/60 rounded-xl p-3">
                                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Scope of Work</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{String(gi.scopeOfWorkNotes).replace(/<[^>]+>/g, '')}</p>
                                </div>
                              )}
                              {gi.deliveryInfoSchedulingNotes && (
                                <div className="bg-slate-100/60 rounded-xl p-3">
                                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Scheduling Notes</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{String(gi.deliveryInfoSchedulingNotes).replace(/<[^>]+>/g, '')}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </SectionCard>
                      )}

                      {/* Dates */}
                      {di && (di.currentDate || di.desiredInstallDate || di.scheduledInstallDate || di.measureDate) && (
                        <SectionCard icon={Calendar} title="Dates">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <Field label="Current Date" value={formatDate(di.currentDate)} />
                            <Field label="Desired Install" value={formatDate(di.desiredInstallDate)} />
                            <Field label="Scheduled Install" value={formatDate(di.scheduledInstallDate)} icon={Clock} />
                            <Field label="Measure Date" value={formatDate(di.measureDate)} />
                            <Field label="Booking Date" value={formatDate(di.bookingDate)} />
                            <Field label="Status Date" value={formatDate(di.statusDate)} />
                            <Field label="ETA Date" value={formatDate(di.etaDate)} />
                            <Field label="Current Promise" value={formatDate(di.currentPromiseDate)} />
                            <Field label="Original Promise" value={formatDate(di.originalPromiseDate)} />
                            <Field label="Invoice Date" value={formatDate(di.invoiceDate)} />
                            <Field label="Follow-Up" value={formatDate(di.followUpDate)} />
                            <Field label="Import Date" value={formatDate(di.importDate)} />
                          </div>
                        </SectionCard>
                      )}

                      {/* Scheduling */}
                      {si && (si.scheduledUserFirmName || si.scheduleDate || si.taskOneResource || si.taskTwoResource || si.taskThreeResource) && (
                        <SectionCard icon={Briefcase} title="Scheduling">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {si.scheduledUserFirmName && <div className="col-span-2"><Field label="Firm Name" value={si.scheduledUserFirmName} noTruncate /></div>}
                            <Field label="Schedule Date" value={formatDate(si.scheduleDate)} />
                            <Field label="Lead Cert#" value={si.scheduledUserLeadCertificationNumber} />
                            <Field label="Firm Cert#" value={si.scheduledUserFirmCertificationNumber} />
                            <Field label="Renovator" value={si.scheduledUserRenovatorName} />
                            <Field label="Avg Time to Seller" value={si.siteDetailsAvgTimeToSeller} />
                          </div>
                          {/* Tasks */}
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[1, 2, 3].map(n => {
                              const res = (si as any)[`task${['One', 'Two', 'Three'][n - 1]}Resource`]
                              const start = (si as any)[`task${['One', 'Two', 'Three'][n - 1]}StartDate`]
                              const end = (si as any)[`task${['One', 'Two', 'Three'][n - 1]}EndDate`]
                              if (!res && !start && !end) return null
                              return (
                                <div key={n} className="bg-brand-green/5 rounded-xl p-3 border border-brand-green/20">
                                  <p className="text-xs font-bold text-brand-green mb-2">Task #{n}</p>
                                  <div className="space-y-1.5">
                                    {res && <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">Resource:</span> {res}</p>}
                                    {start && <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">Start:</span> {formatDate(start)}</p>}
                                    {end && <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">End:</span> {formatDate(end)}</p>}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </SectionCard>
                      )}

                      {/* Store */}
                      {st && (st.storeName || st.storeNumber) && (
                        <SectionCard icon={Store} title="Store">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="col-span-2"><Field label="Store Name" value={st.storeName} noTruncate /></div>
                            <Field label="Store #" value={st.storeNumber} />
                            <Field label="Region" value={st.region} />
                            <Field label="Phone" value={st.phone} />
                            <div className="col-span-2"><Field label="Email" value={st.email} noTruncate /></div>
                          </div>
                          {st.address?.fullAddress && (
                            <div className="mt-3 bg-brand-green/5 rounded-xl p-3 border border-brand-green/20">
                              <p className="text-sm font-medium text-slate-700"><MapPin className="w-4 h-4 inline-block mr-1 text-brand-green" /> {st.address.fullAddress}</p>
                            </div>
                          )}
                        </SectionCard>
                      )}

                      {/* Notes */}
                      {detailNotes.length > 0 && (
                        <SectionCard icon={StickyNote} title="Notes">
                          <div className="space-y-3">
                            {detailNotes.map((note) => (
                              <div key={note.orderNoteNumber} className="bg-white rounded-lg border border-brand-green/10 p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    note.noteSource === 'System' ? 'bg-brand-green/10 text-brand-green' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    {note.noteSource || 'Note'}
                                  </span>
                                  <span className="text-xs text-slate-400">{new Date(note.createdOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  {note.orderNoteTypeDescription && (
                                    <span className="text-xs text-slate-400 border-l border-slate-200 pl-2">{note.orderNoteTypeDescription}</span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{stripHtml(note.note)}</p>
                              </div>
                            ))}
                          </div>
                        </SectionCard>
                      )}

                      {/* Attachments */}
                      {loadingAttachments ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-brand-green/10 flex items-center justify-center">
                              <Paperclip className="w-4 h-4 text-brand-green" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">Attachments</h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading attachments...
                          </div>
                        </div>
                      ) : jobAttachments.length > 0 ? (
                        <SectionCard icon={Paperclip} title="Attachments">
                          <div className="space-y-2">
                            {jobAttachments.map(att => (
                              <div
                                key={att.orderAttachmentNumber}
                                className="flex items-center justify-between bg-white rounded-lg border border-slate-200 hover:border-brand-green/30 hover:bg-brand-green/[0.02] transition-all p-3 group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                    <Paperclip className="w-3.5 h-3.5 text-brand-green" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{att.filename}</p>
                                    <p className="text-xs text-slate-400">{att.orderAttachmentTypeDescription}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                  <span className="text-xs text-slate-400">{formatDate(att.lastModifiedDate)}</span>
                                  <a
                                    href={`/api/cilio/jobs/${detailRecord.orderNumber}/attachment/${att.orderAttachmentNumber}/file`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-brand-green bg-brand-green/10 rounded-lg hover:bg-brand-green/20 transition-colors opacity-0 group-hover:opacity-100"
                                    title={`Download ${att.filename}`}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </SectionCard>
                      ) : null}
                    </div>
                  </>
                })()}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
