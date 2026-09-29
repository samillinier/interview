'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Plus,
  Send,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  X,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowLeft,
  ShoppingBag,
  CalendarDays,
  Tag,
  FileText,
  DollarSign,
  User,
  Store,
  Building2,
} from 'lucide-react'
import { downloadExcel } from '@/lib/export-utils'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { WORKROOM_OPTIONS } from '@/lib/questions'

interface PurchaseRequest {
  id: string
  createdAt: string
  dateRequested: string
  priority: string | null
  itemName: string
  itemDescription: string | null
  reason: string | null
  priceRange: string | null
  productUrl: string | null
  neededByDate: string | null
  purchaseMethod: string
  purchaseMethodNote: string | null
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdByEmail: string | null
  createdByName: string | null
}

const PRIORITY_OPTIONS = ['Standard', 'High', 'Urgent'] as const

const PURCHASE_METHOD_OPTIONS = [
  { value: 'local', label: 'I will purchase the item locally' },
  { value: 'corporate', label: 'FIS corporate office will source & order' },
  { value: 'other', label: 'Other' },
] as const

const statusMeta: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-600 border-amber-200', icon: Clock },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
  denied: { label: 'Denied', className: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle },
}

function purchaseMethodLabel(method: string, note: string | null) {
  const found = PURCHASE_METHOD_OPTIONS.find((m) => m.value === method)
  const base = found?.label || method || '-'
  if (method === 'other' && note) return `Other — ${note}`
  return base
}

function fmtDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const inputClass =
  'w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium'

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{hint}</p>}
    </div>
  )
}

export default function PurchaseRequestPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { sidebarOpen } = useSidebarOpen()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN', 'ACCOUNTING'].includes(normalizedRole)
  const canReview = normalizedRole === 'SUPER_ADMIN'

  const [showForm, setShowForm] = useState(false)
  const [dateRequested, setDateRequested] = useState(() => new Date().toISOString().split('T')[0])
  const [priority, setPriority] = useState<string>('Standard')
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [reason, setReason] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [neededByDate, setNeededByDate] = useState('')
  const [purchaseMethod, setPurchaseMethod] = useState<string>('corporate')
  const [purchaseMethodNote, setPurchaseMethodNote] = useState('')
  const [workroom, setWorkroom] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (id) setExpandedId(id)
  }, [])

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && normalizedRole && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess, normalizedRole])

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (search) params.set('search', search)
      const res = await fetch('/api/purchase-requests?' + params.toString())
      const data = await res.json()
      if (data.success) setRequests(data.requests || [])
    } catch (err) {
      console.error('Error fetching purchase requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, search])

  useEffect(() => {
    if (canAccess) fetchRequests()
  }, [canAccess, fetchRequests])

  const resetForm = () => {
    setDateRequested(new Date().toISOString().split('T')[0])
    setPriority('Standard')
    setItemName('')
    setItemDescription('')
    setReason('')
    setPriceRange('')
    setProductUrl('')
    setNeededByDate('')
    setPurchaseMethod('corporate')
    setPurchaseMethodNote('')
    setWorkroom('')
    setSaveError(null)
  }

  const handleSubmit = async () => {
    setSaveError(null)
    if (!dateRequested || !itemName.trim()) {
      setSaveError('Please enter a date of request and the item name.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRequested,
          priority,
          itemName,
          itemDescription: itemDescription.trim() || null,
          reason: reason.trim() || null,
          priceRange: priceRange.trim() || null,
          productUrl: productUrl.trim() || null,
          neededByDate: neededByDate || null,
          purchaseMethod,
          purchaseMethodNote: purchaseMethod === 'other' ? purchaseMethodNote.trim() || null : null,
          workroom: workroom || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to submit request')
      }
      setShowForm(false)
      resetForm()
      fetchRequests()
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const setStatus = async (id: string, status: 'approved' | 'denied') => {
    try {
      const res = await fetch('/api/purchase-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (data.success && data.purchaseRequest) {
        setRequests((prev) => prev.map((r) => (r.id === id ? data.purchaseRequest : r)))
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    try {
      const res = await fetch(`/api/purchase-requests?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const exportToExcel = () => {
    const rows = requests.map((r) => ({
      'Date Requested': fmtDate(r.dateRequested),
      'Priority': r.priority || '-',
      'Item': r.itemName,
      'Description': r.itemDescription || '-',
      'Reason': r.reason || '-',
      'Price Range': r.priceRange || '-',
      'Product Link': r.productUrl || '-',
      'Needed By': fmtDate(r.neededByDate),
      'Purchase Method': purchaseMethodLabel(r.purchaseMethod, r.purchaseMethodNote),
      'Status': statusMeta[r.status]?.label || r.status,
      'Created By': r.createdByName || r.createdByEmail || '-',
    }))
    downloadExcel(rows, 'Purchase_Requests')
  }

  const analytics = (() => {
    const total = requests.length
    const approved = requests.filter((r) => r.status === 'approved').length
    const denied = requests.filter((r) => r.status === 'denied').length
    const pending = requests.filter((r) => r.status === 'pending').length
    return { total, approved, denied, pending }
  })()

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    )
  }

  if (!session || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unauthorized</h2>
          <p className="text-slate-500 mb-6">Please log in with an authorized account.</p>
          <button onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors">
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-[1550px] mx-auto space-y-8">

            {/* Header */}
            <div className="rounded-2xl border border-brand-green-dark/20 bg-brand-green shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Purchase Request</h1>
                  <p className="text-emerald-50/90">Request the purchase of an item or equipment for your workroom.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <ClipboardList className="w-3.5 h-3.5" />{analytics.total} requests
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <Clock className="w-3.5 h-3.5" />{analytics.pending} pending
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <CheckCircle2 className="w-3.5 h-3.5" />{analytics.approved} approved
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20 flex-shrink-0">
                  <Plus className="w-5 h-5" />New Purchase Request
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Requests', value: analytics.total, desc: 'All purchase requests', icon: ClipboardList },
                { label: 'Pending', value: analytics.pending, desc: 'Awaiting review', icon: Clock },
                { label: 'Approved', value: analytics.approved, desc: 'Ready to purchase', icon: CheckCircle2 },
                { label: 'Denied', value: analytics.denied, desc: 'Not approved', icon: AlertCircle },
              ].map((card) => {
                const Icon = card.icon
                return (
                  <div key={card.label} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-1.5 w-full rounded-full bg-brand-green" />
                      <Icon className="w-5 h-5 text-brand-green ml-3 flex-shrink-0" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">{card.label}</p>
                      <h3 className="text-4xl leading-none font-black tracking-tight text-slate-900 mb-1">{card.value}</h3>
                      <p className="text-sm text-slate-500">{card.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Form */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden"
                >
                  <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setShowForm(false); resetForm() }}
                        className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                      </button>
                      <div>
                        <h2 className="text-base font-bold text-slate-800">Purchase Request Form</h2>
                        <p className="text-xs text-slate-400">Complete the details below to request an item or equipment.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="1. Date of Request" required>
                        <input type="date" value={dateRequested} onChange={(e) => setDateRequested(e.target.value)} className={inputClass} />
                      </Field>
                      <Field label="2. Priority">
                        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </Field>
                    </div>

                    <Field label="3. Name and description of item requested" required hint="Be specific, if applicable.">
                      <input
                        type="text"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="e.g. DeWalt cordless drill, 20V MAX"
                        className={inputClass}
                      />
                      <textarea
                        value={itemDescription}
                        onChange={(e) => setItemDescription(e.target.value)}
                        rows={2}
                        placeholder="Detailed description of the item (model, quantity, specs)…"
                        className={`${inputClass} resize-none mt-3`}
                      />
                    </Field>

                    <Field label="4. Reason item is needed and its return on investment">
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        placeholder="Why is this item needed, and what is the expected return on investment?"
                        className={`${inputClass} resize-none`}
                      />
                    </Field>

                    <Field label="5. Price (range) of item">
                      <input
                        type="text"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                        placeholder="e.g. $120 – $180"
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Product link" hint="Optional — paste a link to the item you'd like to purchase.">
                      <input
                        type="url"
                        value={productUrl}
                        onChange={(e) => setProductUrl(e.target.value)}
                        placeholder="https://…"
                        className={inputClass}
                      />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="6. When is item needed?" hint="Expected time or deadline.">
                        <input type="date" value={neededByDate} onChange={(e) => setNeededByDate(e.target.value)} className={inputClass} />
                      </Field>
                      <Field label="Location / Workroom">
                        <select value={workroom} onChange={(e) => setWorkroom(e.target.value)} className={inputClass}>
                          <option value="">Select location</option>
                          {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </Field>
                    </div>

                    <Field label="7. Who will purchase the item?">
                      <div className="space-y-2">
                        {PURCHASE_METHOD_OPTIONS.map((m) => (
                          <label key={m.value} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 cursor-pointer hover:bg-white transition-colors">
                            <input
                              type="radio"
                              name="purchaseMethod"
                              value={m.value}
                              checked={purchaseMethod === m.value}
                              onChange={() => setPurchaseMethod(m.value)}
                              className="mt-1 h-4 w-4 accent-black"
                            />
                            <span className="text-sm font-medium text-slate-700">{m.label}</span>
                          </label>
                        ))}
                      </div>
                      {purchaseMethod === 'other' && (
                        <input
                          type="text"
                          value={purchaseMethodNote}
                          onChange={(e) => setPurchaseMethodNote(e.target.value)}
                          placeholder="Please specify"
                          className={`${inputClass} mt-3`}
                        />
                      )}
                    </Field>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                      <button onClick={handleSubmit} disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed">
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit Request</>}
                      </button>
                      <button onClick={() => { setShowForm(false); resetForm() }}
                        className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                    </div>

                    {saveError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Records */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-brand-green" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Purchase Requests</h2>
                      <p className="text-xs text-slate-400">{requests.length} request{requests.length !== 1 ? 's' : ''}{!canReview ? ' (your submissions)' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item..." className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white" />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                    </select>
                    {canReview && (
                      <button onClick={exportToExcel} disabled={requests.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 border-2 border-brand-green/20 rounded-xl bg-brand-green/5 hover:bg-brand-green/10 text-brand-green text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        <Download className="w-3.5 h-3.5" />Export
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-brand-green animate-spin mb-3" />
                  <p className="text-sm text-slate-400">Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <ShoppingBag className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No purchase requests yet</p>
                  <p className="text-xs text-slate-300 mt-1">Click "New Purchase Request" to submit your first request</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                        <th className="text-left py-3 px-5 font-semibold">Request</th>
                        <th className="text-left py-3 px-5 font-semibold">Item</th>
                        <th className="text-left py-3 px-5 font-semibold">Priority</th>
                        <th className="text-left py-3 px-5 font-semibold">Needed By</th>
                        <th className="text-left py-3 px-5 font-semibold">Status</th>
                        {canReview && <th className="text-left py-3 px-4 font-semibold">Review</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => {
                        const meta = statusMeta[r.status] || statusMeta.pending
                        const StatusIcon = meta.icon
                        const expanded = expandedId === r.id
                        return (
                          <React.Fragment key={r.id}>
                            <tr className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${expanded ? 'bg-amber-50/70' : ''}`}
                              onClick={() => setExpandedId(expanded ? null : r.id)}>
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                    <ShoppingBag className="w-4 h-4 text-brand-green" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">{fmtDate(r.dateRequested)}</p>
                                    <p className="text-[11px] text-slate-400">{r.createdByName || r.createdByEmail || '-'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-5 text-slate-700">{r.itemName}</td>
                              <td className="py-3.5 px-5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${r.priority === 'Urgent' ? 'bg-red-50 text-red-600 border-red-200' : r.priority === 'High' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                  {r.priority || 'Standard'}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-slate-600">{fmtDate(r.neededByDate)}</td>
                              <td className="py-3.5 px-5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${meta.className}`}>
                                  <StatusIcon className="w-3 h-3 flex-shrink-0" />{meta.label}
                                </span>
                              </td>
                              {canReview && (
                                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2">
                                    {r.status !== 'approved' && (
                                      <button onClick={() => setStatus(r.id, 'approved')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors">
                                        <CheckCircle2 className="w-3 h-3" />Approve
                                      </button>
                                    )}
                                    {r.status !== 'denied' && (
                                      <button onClick={() => setStatus(r.id, 'denied')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                                        <X className="w-3 h-3" />Deny
                                      </button>
                                    )}
                                    <button onClick={() => setConfirmDeleteId(r.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
                                      <Trash2 className="w-3 h-3" />Delete
                                    </button>
                                  </div>
                                </td>
                              )}
                              <td className="py-3.5 px-2 w-8">
                                {expanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                              </td>
                            </tr>

                            {expanded && (
                              <tr>
                                <td colSpan={canReview ? 7 : 6} className="px-5 py-4 bg-slate-50/40">
                                  <div className="space-y-4">
                                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-brand-green" />Request Details</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        <Card label="Date Requested" value={fmtDate(r.dateRequested)} />
                                        <Card label="Priority" value={r.priority || '-'} />
                                        <Card label="Needed By" value={fmtDate(r.neededByDate)} />
                                        <Card label="Price Range" value={r.priceRange || '-'} />
                                        <Card label="Purchase Method" value={purchaseMethodLabel(r.purchaseMethod, r.purchaseMethodNote)} />
                                        <Card label="Created By" value={r.createdByName || r.createdByEmail || '-'} />
                                      </div>
                                      {r.productUrl && (
                                        <div className="mt-3">
                                          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Product Link</p>
                                          <a
                                            href={r.productUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green underline-offset-2 hover:underline break-all"
                                          >
                                            {r.productUrl}
                                          </a>
                                        </div>
                                      )}
                                      {r.itemDescription && (
                                        <div className="mt-3">
                                          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Description</p>
                                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.itemDescription}</p>
                                        </div>
                                      )}
                                      {r.reason && (
                                        <div className="mt-3">
                                          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Reason & ROI</p>
                                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.reason}</p>
                                        </div>
                                      )}
                                    </div>

                                    {(r.reviewedBy || r.reviewNote) && (
                                      <div className="mt-3 bg-white rounded-xl p-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Review</p>
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                                          {r.reviewedBy && <span className="text-slate-600"><span className="text-slate-400 font-semibold">Reviewed by:</span> {r.reviewedBy}</span>}
                                          {r.reviewNote && <span className="text-slate-600"><span className="text-slate-400 font-semibold">Note:</span> {r.reviewNote}</span>}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Delete confirmation */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Request</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to delete this purchase request? This action cannot be undone.</p>
                <div className="flex items-center gap-3 w-full">
                  <button onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-100">
      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
    </div>
  )
}
