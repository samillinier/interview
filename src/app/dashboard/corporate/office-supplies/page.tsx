'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Plus,
  Send,
  Building2,
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
  ShoppingCart,
  Package,
  Coffee,
  Bath,
  FileText,
  StickyNote,
} from 'lucide-react'
import { downloadExcel } from '@/lib/export-utils'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { WORKROOM_OPTIONS } from '@/lib/questions'
import {
  OFFICE_SUPPLY_SECTIONS,
  OFFICE_SUPPLY_PRIORITIES,
  OFFICE_SUPPLY_ITEM_INDEX,
  formatCurrency,
  type OfficeSupplyLineItem,
} from '@/lib/office-supplies'

interface OfficeSupplyOrder {
  id: string
  createdAt: string
  orderDate: string
  workroom: string
  priority: string | null
  items: OfficeSupplyLineItem[]
  additionalItems: string | null
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdByEmail: string | null
  createdByName: string | null
}

const SECTION_ICONS: Record<string, typeof Package> = {
  office: FileText,
  'break-room': Coffee,
  bath: Bath,
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

function ItemThumb({ src, icon: Icon, alt, size = 'md', href }: { src?: string; icon: typeof Package; alt?: string; size?: 'sm' | 'md'; href?: string }) {
  const [error, setError] = useState(false)
  const dim = size === 'sm' ? 'h-10 w-10 rounded-lg' : 'h-14 w-14 rounded-xl'
  const iconDim = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'

  const inner = !src || error ? (
    <div className={`${dim} flex flex-shrink-0 items-center justify-center bg-brand-green/10 text-brand-green`}>
      <Icon className={iconDim} />
    </div>
  ) : (
    <div className={`${dim} flex-shrink-0 overflow-hidden bg-slate-100 ring-1 ring-slate-200`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        onError={() => setError(true)}
        className="h-full w-full object-cover"
      />
    </div>
  )

  if (!href) return inner

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="View product"
      onClick={(e) => e.stopPropagation()}
      className="block flex-shrink-0 rounded-xl transition-opacity hover:opacity-80"
    >
      {inner}
    </a>
  )
}

export default function OfficeSuppliesPage() {
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
  const [priority, setPriority] = useState<string>('Standard')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [additionalItems, setAdditionalItems] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [orders, setOrders] = useState<OfficeSupplyOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterWorkroom, setFilterWorkroom] = useState('')
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

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (filterWorkroom) params.set('workroom', filterWorkroom)
      if (search) params.set('search', search)
      const res = await fetch('/api/office-supplies?' + params.toString())
      const data = await res.json()
      if (data.success) setOrders(data.orders || [])
    } catch (err) {
      console.error('Error fetching office supply orders:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, filterWorkroom, search])

  useEffect(() => {
    if (canAccess) fetchOrders()
  }, [canAccess, fetchOrders])

  const setQuantity = (key: string, value: number) => {
    const item = OFFICE_SUPPLY_ITEM_INDEX[key]
    if (!item) return
    const clamped = Math.max(0, Math.min(item.max, value))
    setQuantities((prev) => ({ ...prev, [key]: clamped }))
  }

  const selectedLineItems = OFFICE_SUPPLY_SECTIONS.flatMap((section) =>
    section.items
      .filter((item) => (quantities[item.key] || 0) > 0)
      .map((item) => ({
        key: item.key,
        name: item.name,
        price: item.price,
        quantity: quantities[item.key] || 0,
        section: section.title,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
      })),
  )

  const selectedCount = selectedLineItems.reduce((sum, i) => sum + i.quantity, 0)
  const total = selectedLineItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const resetForm = () => {
    setOrderDate(new Date().toISOString().split('T')[0])
    setWorkroom('')
    setPriority('Standard')
    setQuantities({})
    setAdditionalItems('')
    setSaveError(null)
  }

  const handleSubmit = async () => {
    setSaveError(null)
    if (!orderDate || !workroom || selectedLineItems.length === 0) {
      setSaveError('Please select a date, workroom, and at least one item to order.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/office-supplies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderDate,
          workroom,
          priority,
          items: selectedLineItems,
          additionalItems: additionalItems.trim() || null,
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
      const res = await fetch('/api/office-supplies', {
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
      const res = await fetch(`/api/office-supplies?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setOrders((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const exportToExcel = () => {
    const rows = orders.map((o) => {
      const base: Record<string, string | number> = {
        'Order Date': fmtDate(o.orderDate),
        'Workroom': o.workroom,
        'Priority': o.priority || '-',
        'Items': o.items.map((i) => `${i.name} ×${i.quantity}`).join('; '),
        'Quantity': o.items.reduce((sum, i) => sum + i.quantity, 0),
        'Total': o.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        'Additional Items': o.additionalItems || '-',
        'Status': statusMeta[o.status]?.label || o.status,
        'Created By': o.createdByName || o.createdByEmail || '-',
      }
      return base
    })
    downloadExcel(rows, 'Office_Supplies_Orders')
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
                  <h1 className="text-3xl font-bold text-white mb-2">Office Supplies</h1>
                  <p className="text-emerald-50/90">Order office, break room, and bath replenishable supplies for your workroom.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <ClipboardList className="w-3.5 h-3.5" />{analytics.total} orders
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
                  <Plus className="w-5 h-5" />New Supplies Order
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Orders', value: analytics.total, desc: 'All supply orders', icon: ClipboardList },
                { label: 'Pending', value: analytics.pending, desc: 'Awaiting review', icon: Clock },
                { label: 'Approved', value: analytics.approved, desc: 'Ready to fulfill', icon: CheckCircle2 },
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
                        <h2 className="text-base font-bold text-slate-800">Office Supplies Order Form</h2>
                        <p className="text-xs text-slate-400">Order replenishable supplies. For electronics, appliances or equipment, use the Purchase Request form.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* General */}
                    <section>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg shadow-brand-green/20">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-green">Order Information</p>
                          <h3 className="text-lg font-bold text-slate-900">Details</h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field label="Order Date" required>
                          <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Location" required hint="Which workroom is this order for?">
                          <select value={workroom} onChange={(e) => setWorkroom(e.target.value)} className={inputClass}>
                            <option value="">Select location</option>
                            {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </Field>
                        <Field label="Priority">
                          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                            {OFFICE_SUPPLY_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </Field>
                      </div>
                    </section>

                    {/* Catalog sections */}
                    {OFFICE_SUPPLY_SECTIONS.map((section) => {
                      const SectionIcon = SECTION_ICONS[section.key] || Package
                      return (
                        <section key={section.key} className="pt-6 border-t border-slate-100">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                              <SectionIcon className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.items.map((item) => {
                              const qty = quantities[item.key] || 0
                              return (
                                <div key={item.key} className={`rounded-xl border p-4 transition-colors ${qty > 0 ? 'border-brand-green/40 bg-brand-green/5' : 'border-slate-200 bg-slate-50/40'}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 gap-3">
                                      <ItemThumb src={item.imageUrl} icon={SECTION_ICONS[section.key] || Package} alt={item.name} />
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 leading-snug">{item.name}</p>
                                        <p className="mt-1 text-sm font-bold text-brand-green">{formatCurrency(item.price)} <span className="text-slate-400 font-normal">each</span></p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">On Hand Min {item.min} · Max {item.max}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button onClick={() => setQuantity(item.key, qty - 1)}
                                        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" disabled={qty === 0}>−</button>
                                      <input
                                        type="number"
                                        min={0}
                                        max={item.max}
                                        value={qty || ''}
                                        onChange={(e) => setQuantity(item.key, parseInt(e.target.value || '0', 10))}
                                        className="w-14 h-8 text-center border-2 border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none"
                                      />
                                      <button onClick={() => setQuantity(item.key, qty + 1)}
                                        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" disabled={qty >= item.max}>+</button>
                                    </div>
                                  </div>
                                  {item.description && (
                                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{item.description}</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </section>
                      )
                    })}

                    {/* Additional */}
                    <section className="pt-6 border-t border-slate-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                          <StickyNote className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Additional items</h3>
                          <p className="text-xs text-slate-400">Replenishable items only. For electronics, appliances, or equipment, use the Purchase Request form.</p>
                        </div>
                      </div>
                      <textarea value={additionalItems} onChange={(e) => setAdditionalItems(e.target.value)} rows={3}
                        placeholder="List any additional replenishable requests here..."
                        className={`${inputClass} resize-none`} />
                    </section>

                    {/* Summary & actions */}
                    <section className="pt-6 border-t border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div>
                          <p className="text-sm text-slate-500">{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected</p>
                          <p className="text-3xl font-black tracking-tight text-slate-900">{formatCurrency(total)}</p>
                        </div>
                        {saveError && (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={handleSubmit} disabled={isSaving}
                          className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed">
                          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit Order</>}
                        </button>
                        <button onClick={() => { setShowForm(false); resetForm() }}
                          className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </section>
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
                      <ShoppingCart className="w-4 h-4 text-brand-green" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Office Supplies Orders</h2>
                      <p className="text-xs text-slate-400">{orders.length} order{orders.length !== 1 ? 's' : ''}{!canReview ? ' (your submissions)' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by requester..." className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white" />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                    </select>
                    <select value={filterWorkroom} onChange={(e) => setFilterWorkroom(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="">All Workrooms</option>
                      {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
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
                  <ShoppingCart className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No office supply orders yet</p>
                  <p className="text-xs text-slate-300 mt-1">Click "New Supplies Order" to submit your first order</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                        <th className="text-left py-3 px-5 font-semibold">Order</th>
                        <th className="text-left py-3 px-5 font-semibold">Workroom</th>
                        <th className="text-left py-3 px-5 font-semibold">Items</th>
                        <th className="text-left py-3 px-5 font-semibold">Total</th>
                        <th className="text-left py-3 px-5 font-semibold">Status</th>
                        {canReview && <th className="text-left py-3 px-4 font-semibold">Review</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const meta = statusMeta[o.status] || statusMeta.pending
                        const StatusIcon = meta.icon
                        const expanded = expandedId === o.id
                        const orderTotal = o.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
                        const orderQty = o.items.reduce((sum, i) => sum + i.quantity, 0)
                        return (
                          <React.Fragment key={o.id}>
                            <tr className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${expanded ? 'bg-amber-50/70' : ''}`}
                              onClick={() => setExpandedId(expanded ? null : o.id)}>
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                    <ShoppingCart className="w-4 h-4 text-brand-green" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">{fmtDate(o.orderDate)}</p>
                                    <p className="text-[11px] text-slate-400">{o.createdByName || o.createdByEmail || '-'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-5"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold"><Building2 className="w-3 h-3" />{o.workroom}</span></td>
                              <td className="py-3.5 px-5 text-xs text-slate-600">{orderQty} item{orderQty !== 1 ? 's' : ''}{o.priority && o.priority !== 'Standard' ? <span className="ml-2 text-amber-600 font-semibold">· {o.priority}</span> : null}</td>
                              <td className="py-3.5 px-5 font-semibold text-slate-800">{formatCurrency(orderTotal)}</td>
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
                                {expanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                              </td>
                            </tr>

                            {expanded && (
                              <tr>
                                <td colSpan={canReview ? 7 : 6} className="px-5 py-4 bg-slate-50/40">
                                  <div className="space-y-4">
                                    {/* Order details */}
                                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-brand-green" />Order Details</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <Card label="Order Date" value={fmtDate(o.orderDate)} />
                                        <Card label="Workroom" value={o.workroom} />
                                        <Card label="Priority" value={o.priority || '-'} />
                                        <Card label="Created By" value={o.createdByName || o.createdByEmail || '-'} />
                                      </div>
                                    </div>

                                    {/* Line items */}
                                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5 text-brand-green" />Items</p>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="text-xs text-slate-400 uppercase">
                                              <th className="text-left py-2 font-semibold">Item</th>
                                              <th className="text-left py-2 font-semibold">Section</th>
                                              <th className="text-right py-2 font-semibold">Qty</th>
                                              <th className="text-right py-2 font-semibold">Price</th>
                                              <th className="text-right py-2 font-semibold">Subtotal</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {o.items.map((i) => (
                                              <tr key={i.key} className="border-t border-slate-50">
                                                <td className="py-2">
                                                  <div className="flex items-center gap-2.5">
                                                    <ItemThumb src={i.imageUrl} icon={Package} alt={i.name} size="sm" />
                                                    <span className="text-slate-700">{i.name}</span>
                                                  </div>
                                                </td>
                                                <td className="py-2 text-slate-400">{i.section}</td>
                                                <td className="py-2 text-right text-slate-600">{i.quantity}</td>
                                                <td className="py-2 text-right text-slate-600">{formatCurrency(i.price)}</td>
                                                <td className="py-2 text-right font-semibold text-slate-800">{formatCurrency(i.price * i.quantity)}</td>
                                              </tr>
                                            ))}
                                            <tr className="border-t border-slate-100">
                                              <td colSpan={4} className="py-2 text-right font-bold text-slate-500">Total</td>
                                              <td className="py-2 text-right font-bold text-slate-900">{formatCurrency(orderTotal)}</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                      {o.additionalItems && <Card label="Additional Items" value={o.additionalItems} />}
                                    </div>

                                    {(o.reviewedBy || o.reviewNote) && (
                                      <div className="mt-3 bg-white rounded-xl p-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Review</p>
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                                          {o.reviewedBy && <span className="text-slate-600"><span className="text-slate-400 font-semibold">Reviewed by:</span> {o.reviewedBy}</span>}
                                          {o.reviewNote && <span className="text-slate-600"><span className="text-slate-400 font-semibold">Note:</span> {o.reviewNote}</span>}
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
                <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Order</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to delete this office supplies order? This action cannot be undone.</p>
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
