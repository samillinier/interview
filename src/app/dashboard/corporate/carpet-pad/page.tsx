'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  ArrowLeft,
  Layers,
  Building2,
  Package,
  ExternalLink,
  Eye,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { downloadExcel } from '@/lib/export-utils'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { WORKROOM_OPTIONS } from '@/lib/questions'

const PAD_TYPES = [
  {
    key: 'superSixLbRolls',
    name: 'SUPER 6 LB',
    price: 47.6,
    specs: ['7/16" thick, 6 lb. bonded foam', "6'x45' (30 SQ YDS)"],
  },
  {
    key: 'stainmasterSelectRolls',
    name: 'STAINMASTER SELECT',
    price: 86.75,
    specs: ['7/16" thick, 8 lb. bonded foam pad', "6'x45' (30 SQ YDS)"],
    imageUrl: 'https://hive.forms.usercontent.microsoft/images/ae3785db-0c05-48a6-a4b8-18e964211398/71b66c8e-6e2d-4e08-990a-2c78cfe13248/T6MU6LL4L4OWRLRZMO55TQA840/d6bc255c-86f0-44d6-8dda-f8d7af0baa9c',
  },
  {
    key: 'odorBanRolls',
    name: 'ODOR BAN',
    price: 76.85,
    specs: ['7/16" thick, 7 lb. bonded foam pad w/moisture barrier', "6'x45' (30 SQ YDS)"],
    imageUrl: 'https://hive.forms.usercontent.microsoft/images/ae3785db-0c05-48a6-a4b8-18e964211398/71b66c8e-6e2d-4e08-990a-2c78cfe13248/T6MU6LL4L4OWRLRZMO55TQA840/d5b4fe35-d282-4f41-8a1c-d94726a9458b',
  },
  {
    key: 'stainmasterEliteRolls',
    name: 'STAINMASTER ELITE',
    price: 129.15,
    specs: ['1/2" thick bonded foam pad', "6'x45' (30 SQ YDS)"],
    imageUrl: 'https://hive.forms.usercontent.microsoft/images/ae3785db-0c05-48a6-a4b8-18e964211398/71b66c8e-6e2d-4e08-990a-2c78cfe13248/T6MU6LL4L4OWRLRZMO55TQA840/5a91f2f9-fe6a-4364-8c52-0c7bba918f86',
  },
  {
    key: 'stainmasterMemoryFoamRolls',
    name: 'STAINMASTER MEMORY FOAM',
    price: 59.9,
    specs: ['7/16" thick, 7 lb. bonded foam pad'],
    imageUrl: 'https://hive.forms.usercontent.microsoft/images/ae3785db-0c05-48a6-a4b8-18e964211398/71b66c8e-6e2d-4e08-990a-2c78cfe13248/T6MU6LL4L4OWRLRZMO55TQA840/0a3ffd1f-28d0-40e0-8540-703333520e1f',
  },
] as const

type PadTypeKey = (typeof PAD_TYPES)[number]['key']

const ORDER_CLASSIFICATIONS = ['Regular Order', 'Emergency Order', 'Pad Recycle'] as const

const PREVIOUS_ORDERS_URL =
  'https://floorinteriorservices-my.sharepoint.com/:x:/g/personal/s_richards_fiscorponline_com/EXUo237Z7HhMuNRRHXP0JEcB2uuFb5UPD23_oer0JAfOgg?e=9gTAmA'

const YES_NO_OPTIONS = ['Yes', 'No'] as const

interface CarpetPadOrder {
  id: string
  createdAt: string
  location: string
  orderClassification: string
  recycledBalesPickup: string
  recycledBalesCount: number | null
  reviewedPreviousOrders: string
  superSixLbRolls: number | null
  stainmasterSelectRolls: number | null
  odorBanRolls: number | null
  stainmasterEliteRolls: number | null
  stainmasterMemoryFoamRolls: number | null
  createdByEmail: string | null
  createdByName: string | null
}

interface FormState {
  location: string
  orderClassification: string
  recycledBalesPickup: string
  recycledBalesCount: string
  reviewedPreviousOrders: string
  superSixLbRolls: string
  stainmasterSelectRolls: string
  odorBanRolls: string
  stainmasterEliteRolls: string
  stainmasterMemoryFoamRolls: string
}

const emptyForm = (): FormState => ({
  location: '',
  orderClassification: '',
  recycledBalesPickup: '',
  recycledBalesCount: '',
  reviewedPreviousOrders: '',
  superSixLbRolls: '',
  stainmasterSelectRolls: '',
  odorBanRolls: '',
  stainmasterEliteRolls: '',
  stainmasterMemoryFoamRolls: '',
})

function fmtDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function rollCount(order: CarpetPadOrder, key: PadTypeKey): number {
  return order[key] || 0
}

function orderTotalRolls(order: CarpetPadOrder): number {
  return PAD_TYPES.reduce((sum, p) => sum + rollCount(order, p.key), 0)
}

function orderTotalCost(order: CarpetPadOrder): number {
  return PAD_TYPES.reduce((sum, p) => sum + rollCount(order, p.key) * p.price, 0)
}

const inputClass =
  'w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium'

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: React.ReactNode; children: React.ReactNode }) {
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

function YesNoSelect({ value, onChange, placeholder = 'Select your answer' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">{placeholder}</option>
      {YES_NO_OPTIONS.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function SectionHeader({ icon: Icon, step, title, subtitle }: { icon: typeof Layers; step: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg shadow-brand-green/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-green">{step}</p>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function CarpetPadPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { sidebarOpen } = useSidebarOpen()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN', 'ACCOUNTING'].includes(normalizedRole)
  const canDelete = normalizedRole === 'SUPER_ADMIN'

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [orders, setOrders] = useState<CarpetPadOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [filterLocation, setFilterLocation] = useState('')
  const [filterClassification, setFilterClassification] = useState('')
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
      if (filterLocation) params.set('location', filterLocation)
      if (filterClassification) params.set('classification', filterClassification)
      if (search) params.set('search', search)
      const res = await fetch('/api/carpet-pad-orders?' + params.toString())
      const data = await res.json()
      if (data.success) setOrders(data.orders || [])
    } catch (err) {
      console.error('Error fetching carpet pad orders:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterLocation, filterClassification, search])

  useEffect(() => {
    if (canAccess) fetchOrders()
  }, [canAccess, fetchOrders])

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const formRolls = PAD_TYPES.reduce((sum, p) => sum + (Number(form[p.key]) || 0), 0)
  const formCost = PAD_TYPES.reduce((sum, p) => sum + (Number(form[p.key]) || 0) * p.price, 0)

  const resetForm = () => {
    setForm(emptyForm())
    setSaveError(null)
  }

  const handleSubmit = async () => {
    setSaveError(null)

    const missing: string[] = []
    if (!form.location) missing.push('Location')
    if (!form.orderClassification) missing.push('Order Classification')
    if (!form.recycledBalesPickup) missing.push('Recycled Bales Pickup')
    if (form.recycledBalesPickup === 'Yes' && !form.recycledBalesCount) missing.push('Bales Count')
    if (!form.reviewedPreviousOrders) missing.push('Prior Order Review')

    const totalRolls = PAD_TYPES.reduce((sum, p) => sum + (Number(form[p.key]) || 0), 0)
    if (totalRolls === 0) missing.push('Roll Quantity')

    if (missing.length > 0) {
      setSaveError(`Please complete the required fields: ${missing.join(', ')}.`)
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/carpet-pad-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          recycledBalesCount: form.recycledBalesCount || null,
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

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    try {
      const res = await fetch(`/api/carpet-pad-orders?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setOrders((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const exportToExcel = () => {
    const rows = orders.map((r) => {
      const row: Record<string, string | number> = {
        'Date': fmtDate(r.createdAt),
        'Location': r.location,
        'Classification': r.orderClassification,
        'Recycled Bales Pickup': r.recycledBalesPickup,
        'Bales Count': r.recycledBalesCount ?? '',
        'Reviewed Previous Orders': r.reviewedPreviousOrders,
      }
      for (const p of PAD_TYPES) {
        row[`${p.name} (Rolls)`] = rollCount(r, p.key)
      }
      row['Total Rolls'] = orderTotalRolls(r)
      row['Total Cost'] = orderTotalCost(r).toFixed(2)
      row['Created By'] = r.createdByName || r.createdByEmail || '-'
      return row
    })
    downloadExcel(rows, 'Carpet_Pad_Orders')
  }

  const analytics = useMemo(() => {
    const total = orders.length
    const totalRolls = orders.reduce((sum, o) => sum + orderTotalRolls(o), 0)
    const totalCost = orders.reduce((sum, o) => sum + orderTotalCost(o), 0)
    const locations = new Set(orders.map((o) => o.location)).size
    const emergency = orders.filter((o) => o.orderClassification === 'Emergency Order').length
    return { total, totalRolls, totalCost, locations, emergency }
  }, [orders])

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

  const detail = orders.find((r) => r.id === detailId) || null

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
                  <h1 className="text-3xl font-bold text-white mb-2">Carpet Pad</h1>
                  <p className="text-emerald-50/90">Order carpet pad rolls by workroom. Minimum 50 rolls (any combination of styles) per order.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <ClipboardList className="w-3.5 h-3.5" />{analytics.total} orders
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <Package className="w-3.5 h-3.5" />{analytics.totalRolls} rolls
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <DollarSign className="w-3.5 h-3.5" />${analytics.totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20 flex-shrink-0">
                  <Plus className="w-5 h-5" />New Order
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Orders', value: analytics.total, desc: 'All carpet pad orders', icon: ClipboardList },
                { label: 'Total Rolls', value: analytics.totalRolls, desc: 'Combined roll quantity', icon: Package },
                { label: 'Total Cost', value: `$${analytics.totalCost.toFixed(2)}`, desc: 'Estimated order value', icon: DollarSign },
                { label: 'Locations', value: analytics.locations, desc: 'Distinct workrooms', icon: Building2 },
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
                      <h3 className="text-3xl leading-none font-black tracking-tight text-slate-900 mb-1">{card.value}</h3>
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
                        <h2 className="text-base font-bold text-slate-800">Carpet Pad Order</h2>
                        <p className="text-xs text-slate-400">Fields marked <span className="text-red-500">*</span> are required</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* Order Information */}
                    <section>
                      <SectionHeader icon={Layers} step="Order Information" title="Order Information" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        <Field label="1. Location" required>
                          <select value={form.location} onChange={(e) => update('location', e.target.value)} className={inputClass}>
                            <option value="">Select your answer</option>
                            {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </Field>
                        <Field label="2. Order Classification" required>
                          <select value={form.orderClassification} onChange={(e) => update('orderClassification', e.target.value)} className={inputClass}>
                            <option value="">Select your answer</option>
                            {ORDER_CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </Field>
                        <div className="space-y-4">
                          <Field label="3. Do you need recycled pad bales picked up?" required>
                            <YesNoSelect value={form.recycledBalesPickup} onChange={(v) => update('recycledBalesPickup', v)} />
                          </Field>
                          {form.recycledBalesPickup === 'Yes' && (
                            <Field label="How many?" required hint="The value must be a number.">
                              <input type="number" inputMode="numeric" value={form.recycledBalesCount} onChange={(e) => update('recycledBalesCount', e.target.value)} placeholder="0" className={inputClass} />
                            </Field>
                          )}
                        </div>
                        <Field
                          label="4. Prior to placing this order have you reviewed and/or taken into consideration any/all previous orders not yet received?"
                          required
                          hint={
                            <span>
                              Review past orders here:{' '}
                              <a href={PREVIOUS_ORDERS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-green font-semibold hover:underline">
                                SharePoint spreadsheet <ExternalLink className="w-3 h-3" />
                              </a>
                            </span>
                          }
                        >
                          <YesNoSelect value={form.reviewedPreviousOrders} onChange={(v) => update('reviewedPreviousOrders', v)} />
                        </Field>
                      </div>
                    </section>

                    {/* Order Quantity */}
                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader
                        icon={Package}
                        step="Order Quantity"
                        title="Order Quantity"
                        subtitle="A minimum of 50 rolls (any combination of styles) per order."
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        {PAD_TYPES.map((p, i) => (
                          <div key={p.key} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                            {'imageUrl' in p && p.imageUrl && (
                              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <img src={p.imageUrl} alt={p.name} className="w-full h-36 object-contain p-2" />
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{i + 5}. {p.name}</p>
                                <p className="text-xs font-semibold text-brand-green">Price: ${p.price.toFixed(2)} per roll</p>
                              </div>
                            </div>
                            <div className="mt-2 space-y-0.5">
                              {p.specs.map((s) => (
                                <p key={s} className="text-[11px] text-slate-500">{s}</p>
                              ))}
                            </div>
                            <div className="mt-3">
                              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Enter Roll Quantity</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={form[p.key]}
                                onChange={(e) => update(p.key, e.target.value)}
                                placeholder="0"
                                className={inputClass}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Live total */}
                      <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-500 uppercase">Order total</p>
                          <p className="text-lg font-black text-slate-900">
                            {formRolls} rolls · ${formCost.toFixed(2)}
                          </p>
                        </div>
                        {formRolls > 0 && formRolls < 50 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Below 50 roll minimum
                          </span>
                        )}
                      </div>
                    </section>

                    {/* Actions */}
                    {saveError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <button onClick={handleSubmit} disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed">
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit Order</>}
                      </button>
                      <button onClick={() => { setShowForm(false); resetForm() }}
                        className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                        Back
                      </button>
                    </div>
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
                      <Layers className="w-4 h-4 text-brand-green" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Order Records</h2>
                      <p className="text-xs text-slate-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white" />
                    <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="">All Locations</option>
                      {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <select value={filterClassification} onChange={(e) => setFilterClassification(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="">All Classifications</option>
                      {ORDER_CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {canDelete && (
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
                  <Layers className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No carpet pad orders yet</p>
                  <p className="text-xs text-slate-300 mt-1">Click "New Order" to submit your first order</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                        <th className="text-left py-3 px-5 font-semibold">Date</th>
                        <th className="text-left py-3 px-5 font-semibold">Location</th>
                        <th className="text-left py-3 px-5 font-semibold">Classification</th>
                        <th className="text-left py-3 px-5 font-semibold">Rolls</th>
                        <th className="text-left py-3 px-5 font-semibold">Cost</th>
                        {canDelete && <th className="text-left py-3 px-4 font-semibold">Actions</th>}
                        <th className="text-left py-3 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((r) => {
                        const isEmergency = r.orderClassification === 'Emergency Order'
                        const isRecycle = r.orderClassification === 'Pad Recycle'
                        return (
                          <tr key={r.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => setDetailId(r.id)}>
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                  <Calendar className="w-4 h-4 text-brand-green" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-700">{fmtDate(r.createdAt)}</p>
                                  <p className="text-[11px] text-slate-400">{r.createdByName || r.createdByEmail || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                                <Building2 className="w-3 h-3" />{r.location}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${isEmergency ? 'bg-red-50 text-red-600 border-red-200' : isRecycle ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                {r.orderClassification}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                                <Package className="w-3.5 h-3.5 text-brand-green" />{orderTotalRolls(r)}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                                <DollarSign className="w-3.5 h-3.5 text-brand-green" />{orderTotalCost(r).toFixed(2)}
                              </span>
                            </td>
                            {canDelete && (
                              <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setConfirmDeleteId(r.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
                                  <Trash2 className="w-3 h-3" />Delete
                                </button>
                              </td>
                            )}
                            <td className="py-3.5 px-2 w-8">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 group-hover:bg-white group-hover:text-brand-green transition-colors">
                                <Eye className="w-3 h-3" />View
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Detail modal */}
        <AnimatePresence>
          {detail && (() => {
            const isEmergency = detail.orderClassification === 'Emergency Order'
            const isRecycle = detail.orderClassification === 'Pad Recycle'
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[65] flex items-center justify-center p-4"
                onClick={() => setDetailId(null)}
              >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <motion.div
                  initial={{ scale: 0.95, y: 12, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 12, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/90 backdrop-blur px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg shadow-brand-green/20">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Carpet Pad Order</h3>
                        <p className="text-xs text-slate-500">{fmtDate(detail.createdAt)} · {detail.location}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailId(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4 p-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${isEmergency ? 'bg-red-50 text-red-600 border-red-200' : isRecycle ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {detail.orderClassification}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                        <Building2 className="w-3 h-3" />{detail.location}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Recycled Bales Pickup</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {detail.recycledBalesPickup}
                          {detail.recycledBalesPickup === 'Yes' && detail.recycledBalesCount != null ? ` (${detail.recycledBalesCount})` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Reviewed Previous Orders</p>
                        <p className="text-sm font-semibold text-slate-800">{detail.reviewedPreviousOrders}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Total Rolls</p>
                        <p className="text-sm font-semibold text-slate-800">{orderTotalRolls(detail)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Total Cost</p>
                        <p className="text-sm font-semibold text-slate-800">${orderTotalCost(detail).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">Order Quantities</div>
                      <div className="divide-y divide-slate-100">
                        {PAD_TYPES.map((p) => {
                          const qty = rollCount(detail, p.key)
                          return (
                            <div key={p.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <div className="flex items-center gap-3 min-w-0">
                                {'imageUrl' in p && p.imageUrl && (
                                  <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-contain rounded-md border border-slate-200 bg-white shrink-0" />
                                )}
                                <div>
                                  <span className="text-sm font-medium text-slate-700">{p.name}</span>
                                  <span className="ml-2 text-xs text-slate-400">${p.price.toFixed(2)}/roll</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm text-slate-500">Rolls: <span className="font-semibold text-slate-800">{qty}</span></span>
                                <span className="text-sm font-semibold text-brand-green">${(qty * p.price).toFixed(2)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
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
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to delete this carpet pad order? This action cannot be undone.</p>
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
