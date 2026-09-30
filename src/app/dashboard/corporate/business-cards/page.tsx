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
  Clock,
  ArrowLeft,
  CreditCard,
  Building2,
  FileText,
  User,
  Phone,
  Mail,
  Briefcase,
} from 'lucide-react'
import { downloadExcel } from '@/lib/export-utils'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { WORKROOM_OPTIONS } from '@/lib/questions'

interface BusinessCardOrder {
  id: string
  createdAt: string
  orderDate: string
  workroom: string
  firstName: string
  lastName: string
  businessPhone: string | null
  jobTitle: string | null
  emailAddress: string | null
  quantity: number
  sendEmailReceipt: boolean
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdByEmail: string | null
  createdByName: string | null
}

const statusMeta: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-600 border-amber-200', icon: Clock },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
  denied: { label: 'Denied', className: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle },
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

export default function BusinessCardsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { sidebarOpen } = useSidebarOpen()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN', 'ACCOUNTING'].includes(normalizedRole)
  const canReview = normalizedRole === 'SUPER_ADMIN'

  const [showForm, setShowForm] = useState(false)
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0])
  const [workroom, setWorkroom] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [sendEmailReceipt, setSendEmailReceipt] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [orders, setOrders] = useState<BusinessCardOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && normalizedRole && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess, normalizedRole])

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (search) params.set('search', search)
      const res = await fetch('/api/business-cards?' + params.toString())
      const data = await res.json()
      if (data.success) setOrders(data.orders || [])
    } catch (err) {
      console.error('Error fetching business card orders:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, search])

  useEffect(() => {
    if (canAccess) fetchOrders()
  }, [canAccess, fetchOrders])

  const resetForm = () => {
    setOrderDate(new Date().toISOString().split('T')[0])
    setWorkroom('')
    setFirstName('')
    setLastName('')
    setBusinessPhone('')
    setJobTitle('')
    setEmailAddress('')
    setSendEmailReceipt(true)
    setSaveError(null)
  }

  const handleSubmit = async () => {
    setSaveError(null)
    if (!orderDate || !workroom || !firstName.trim() || !lastName.trim()) {
      setSaveError('Please enter the order date, location, first name, and last name.')
      return
    }
    if (businessPhone.trim() && !/^[0-9+\-().\s]+$/.test(businessPhone.trim())) {
      setSaveError('Business phone number must be a valid number.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/business-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderDate,
          workroom,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          businessPhone: businessPhone.trim() || null,
          jobTitle: jobTitle.trim() || null,
          emailAddress: emailAddress.trim() || null,
          sendEmailReceipt,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to submit order')
      }
      setShowForm(false)
      resetForm()
      fetchOrders()
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const setStatus = async (id: string, status: 'approved' | 'denied') => {
    try {
      const res = await fetch('/api/business-cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (data.success && data.order) {
        setOrders((prev) => prev.map((r) => (r.id === id ? data.order : r)))
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    try {
      const res = await fetch(`/api/business-cards?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setOrders((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const exportToExcel = () => {
    const rows = orders.map((o) => ({
      'Order Date': fmtDate(o.orderDate),
      'Location': o.workroom,
      'First Name': o.firstName,
      'Last Name': o.lastName,
      'Business Phone': o.businessPhone || '-',
      'Job Title': o.jobTitle || '-',
      'Email': o.emailAddress || '-',
      'Quantity': o.quantity,
      'Email Receipt': o.sendEmailReceipt ? 'Yes' : 'No',
      'Status': statusMeta[o.status]?.label || o.status,
      'Created By': o.createdByName || o.createdByEmail || '-',
    }))
    downloadExcel(rows, 'Business_Card_Orders')
  }

  const analytics = (() => {
    const total = orders.length
    const approved = orders.filter((o) => o.status === 'approved').length
    const denied = orders.filter((o) => o.status === 'denied').length
    const pending = orders.filter((o) => o.status === 'pending').length
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
                  <h1 className="text-3xl font-bold text-white mb-2">Business Cards</h1>
                  <p className="text-emerald-50/90">Order company business cards — information is copied directly to the vendor order form.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <ClipboardList className="w-3.5 h-3.5" />{analytics.total} orders
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <Clock className="w-3.5 h-3.5" />{analytics.pending} pending
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <CreditCard className="w-3.5 h-3.5" />500 per order
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20 flex-shrink-0">
                  <Plus className="w-5 h-5" />New Business Card Order
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Orders', value: analytics.total, desc: 'All business card orders', icon: ClipboardList },
                { label: 'Pending', value: analytics.pending, desc: 'Awaiting review', icon: Clock },
                { label: 'Approved', value: analytics.approved, desc: 'Ready for vendor', icon: CheckCircle2 },
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
                        className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors" aria-label="Back">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                      </button>
                      <div>
                        <h2 className="text-base font-bold text-slate-800">Business Card Order Form</h2>
                        <p className="text-xs text-slate-400">Fill out the information below — it will be copied and pasted directly to the vendor order form.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4">
                      <p className="text-sm font-semibold text-brand-green">Card Information</p>
                      <p className="text-xs text-slate-500 mt-1">Fill out the information below ensuring its accuracy. Information will be copied and pasted directly to the vendor order form. Business Cards are ordered in quantities of 500.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="1. Order Date" required>
                        <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
                      </Field>
                      <Field label="2. Location" required>
                        <select value={workroom} onChange={(e) => setWorkroom(e.target.value)} className={inputClass}>
                          <option value="">Select location</option>
                          {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="3. First Name" required>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputClass} />
                      </Field>
                      <Field label="4. Last Name" required>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inputClass} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="5. Business Phone Number" hint="The value must be a number.">
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={businessPhone}
                          onChange={(e) => setBusinessPhone(e.target.value)}
                          placeholder="e.g. 813-555-0123"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="6. Job Title">
                        <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Project Manager" className={inputClass} />
                      </Field>
                    </div>

                    <Field label="7. Email Address" hint="The email that will appear on the business card.">
                      <input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="name@floorinteriorservices.com" className={inputClass} />
                    </Field>

                    {/* Email receipt checkbox */}
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 cursor-pointer hover:bg-white transition-colors">
                      <input
                        type="checkbox"
                        checked={sendEmailReceipt}
                        onChange={(e) => setSendEmailReceipt(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-brand-green"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Send me an email receipt of my responses
                      </span>
                    </label>

                    {/* Review note */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Prior to submitting your order, please review your order for accuracy by using the Back button.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                      <button onClick={handleSubmit} disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed">
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit Order</>}
                      </button>
                      <button onClick={() => { setShowForm(false); resetForm() }}
                        className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                        Back
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
                      <CreditCard className="w-4 h-4 text-brand-green" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Business Card Orders</h2>
                      <p className="text-xs text-slate-400">{orders.length} order{orders.length !== 1 ? 's' : ''}{!canReview ? ' (your submissions)' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white" />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                    </select>
                    {canReview && (
                      <button onClick={exportToExcel} disabled={orders.length === 0}
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
                  <p className="text-sm text-slate-400">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CreditCard className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No business card orders yet</p>
                  <p className="text-xs text-slate-300 mt-1">Click "New Business Card Order" to submit your first order</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                        <th className="text-left py-3 px-5 font-semibold">Order</th>
                        <th className="text-left py-3 px-5 font-semibold">Name</th>
                        <th className="text-left py-3 px-5 font-semibold">Location</th>
                        <th className="text-left py-3 px-5 font-semibold">Job Title</th>
                        <th className="text-left py-3 px-5 font-semibold">Status</th>
                        {canReview && <th className="text-left py-3 px-4 font-semibold">Review</th>}
                        <th className="text-left py-3 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const meta = statusMeta[o.status] || statusMeta.pending
                        const StatusIcon = meta.icon
                        return (
                          <React.Fragment key={o.id}>
                            <tr className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                              onClick={() => setDetailOrderId(o.id)}>
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                    <CreditCard className="w-4 h-4 text-brand-green" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">{fmtDate(o.orderDate)}</p>
                                    <p className="text-[11px] text-slate-400">{o.createdByName || o.createdByEmail || '-'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-5 text-slate-700 font-medium">{o.firstName} {o.lastName}</td>
                              <td className="py-3.5 px-5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                                  <Building2 className="w-3 h-3" />{o.workroom}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-slate-600">{o.jobTitle || '-'}</td>
                              <td className="py-3.5 px-5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${meta.className}`}>
                                  <StatusIcon className="w-3 h-3 flex-shrink-0" />{meta.label}
                                </span>
                              </td>
                              {canReview && (
                                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2">
                                    {o.status !== 'approved' && (
                                      <button onClick={() => setStatus(o.id, 'approved')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors">
                                        <CheckCircle2 className="w-3 h-3" />Approve
                                      </button>
                                    )}
                                    {o.status !== 'denied' && (
                                      <button onClick={() => setStatus(o.id, 'denied')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                                        <X className="w-3 h-3" />Deny
                                      </button>
                                    )}
                                    <button onClick={() => setConfirmDeleteId(o.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
                                      <Trash2 className="w-3 h-3" />Delete
                                    </button>
                                  </div>
                                </td>
                              )}
                              <td className="py-3.5 px-2 w-8">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 group-hover:bg-white group-hover:text-brand-green transition-colors">
                                  <FileText className="w-3 h-3" />View
                                </span>
                              </td>
                            </tr>
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

        {/* Order detail modal */}
        <AnimatePresence>
          {detailOrderId && (() => {
            const o = orders.find((x) => x.id === detailOrderId)
            if (!o) return null
            const meta = statusMeta[o.status] || statusMeta.pending
            const StatusIcon = meta.icon
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[65] flex items-center justify-center p-4"
                onClick={() => setDetailOrderId(null)}
              >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <motion.div
                  initial={{ scale: 0.95, y: 12, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 12, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/90 backdrop-blur px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg shadow-brand-green/20">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Business Card Order</h3>
                        <p className="text-xs text-slate-500">{fmtDate(o.orderDate)} · {o.workroom}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailOrderId(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4 p-6">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${meta.className}`}>
                        <StatusIcon className="w-3 h-3 flex-shrink-0" />{meta.label}
                      </span>
                      {o.sendEmailReceipt && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                          <Mail className="w-3 h-3" />Receipt requested
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 flex-shrink-0">
                          <User className="h-4 w-4 text-brand-green" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Name</p>
                          <p className="text-sm font-semibold text-slate-800">{o.firstName} {o.lastName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 flex-shrink-0">
                          <Briefcase className="h-4 w-4 text-brand-green" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Job Title</p>
                          <p className="text-sm font-semibold text-slate-800">{o.jobTitle || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 flex-shrink-0">
                          <Phone className="h-4 w-4 text-brand-green" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Business Phone</p>
                          <p className="text-sm font-semibold text-slate-800">{o.businessPhone || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 flex-shrink-0">
                          <Mail className="h-4 w-4 text-brand-green" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Email</p>
                          <p className="text-sm font-semibold text-slate-800 break-all">{o.emailAddress || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 flex-shrink-0">
                          <Building2 className="h-4 w-4 text-brand-green" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Location</p>
                          <p className="text-sm font-semibold text-slate-800">{o.workroom}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 flex-shrink-0">
                          <CreditCard className="h-4 w-4 text-brand-green" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase">Quantity</p>
                          <p className="text-sm font-semibold text-slate-800">{o.quantity}</p>
                        </div>
                      </div>
                    </div>

                    {(o.reviewedBy || o.reviewNote) && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Review</p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                          {o.reviewedBy && <span className="text-slate-600"><span className="text-slate-400 font-semibold">Reviewed by:</span> {o.reviewedBy}</span>}
                          {o.reviewNote && <span className="text-slate-600"><span className="text-slate-400 font-semibold">Note:</span> {o.reviewNote}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )
          })()}
        </AnimatePresence>

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
                <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Order</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to delete this business card order? This action cannot be undone.</p>
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
