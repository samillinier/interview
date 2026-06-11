'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Activity, AlertCircle, BadgeDollarSign, BarChart3, Bell, Building2, Calendar,
  ClipboardList, FileCheck, FileText, Hash, LayoutDashboard, LogOut, MapPin,
  Megaphone, Menu, MessageSquare, Plus, Save, Settings, ShieldAlert, StickyNote,
  ToggleLeft, ToggleRight, Trash2, User, Users, X,
} from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type LicenceRow = {
  id: string; county: string; city: string; isActive: boolean; areas: string
  licenceType: string; licenceNumber: string; licenceExpirationDate: string
  lastPaymentDate: string; cost: string; bondRequired: boolean; notes: string
  competenceCardsNotes: string; businessTaxOccLicenceNumber: string
  taxOccExpirationDate: string; taxOccCost: string; businessTaxReceiptNotes: string
  createdAt?: string; updatedAt?: string
}

const emptyLicencePayload = (): Omit<LicenceRow, 'id'> => ({
  county: '', city: '', isActive: true, areas: '', licenceType: '', licenceNumber: '',
  licenceExpirationDate: '', lastPaymentDate: '', cost: '', bondRequired: false,
  notes: '', competenceCardsNotes: '', businessTaxOccLicenceNumber: '',
  taxOccExpirationDate: '', taxOccCost: '', businessTaxReceiptNotes: '',
})

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20'
const labelClass = 'text-xs font-bold uppercase tracking-wide text-slate-500'

function formatMoney(value: string) {
  const n = Number((value || '').replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(n)) return value ? `$${value}` : '-'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}
function formatMoneyNumber(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildSmoothSvgPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const c = points[i], n = points[i + 1], cx = (c.x + n.x) / 2
    path += ` C ${cx} ${c.y}, ${cx} ${n.y}, ${n.x} ${n.y}`
  }
  return path
}
function polarToCartesian(cx: number, cy: number, r: number, a: number) {
  const rad = ((a - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
function describeArc(cx: number, cy: number, r: number, sa: number, ea: number) {
  const s = polarToCartesian(cx, cy, r, ea), e = polarToCartesian(cx, cy, r, sa)
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${ea - sa <= 180 ? '0' : '1'} 0 ${e.x} ${e.y}`
}

type Props = { category: string; title: string; description: string; addLabel?: string; queuePlaceholder?: string }

export default function CorporateSectionPage({ category, title, description, addLabel, queuePlaceholder }: Props) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = String((session?.user as any)?.role || '').toUpperCase() as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN' | ''
  const isSuperAdmin = role === 'SUPER_ADMIN'
  const canAccess = role === 'ADMIN' || role === 'MANAGER' || role === 'MODERATOR' || isSuperAdmin

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const [selectedLicenceId, setSelectedLicenceId] = useState('')
  const [rows, setRows] = useState<LicenceRow[]>([])

  const labelForAdd = addLabel || title

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      if (role && !canAccess) { router.push('/dashboard'); return }
      void fetchLicences()
    }
  }, [status, router, canAccess, role])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    const hit = (v: unknown) => String(v || '').toLowerCase().includes(q)
    return rows.filter((r) => hit(r.county) || hit(r.city) || hit(r.areas) || hit(r.licenceType) || hit(r.licenceNumber) || hit(r.notes))
  }, [rows, query])

  const selectedLicence = useMemo(() => rows.find((r) => r.id === selectedLicenceId) || null, [rows, selectedLicenceId])

  const overview = useMemo(() => {
    let active = 0, inactive = 0, bond = 0, costTotal = 0, costCount = 0
    let taxTotal = 0, taxCount = 0, expiring = 0, withTax = 0
    const dayCounts = new Map<string, number>()
    const today = new Date(), days: string[] = []
    for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); const k = d.toISOString().slice(0, 10); days.push(k); dayCounts.set(k, 0) }
    const soonLimit = new Date(today); soonLimit.setDate(today.getDate() + 60)
    for (const row of rows) {
      if (row.isActive) active++; else inactive++
      if (row.bondRequired) bond++
      if (row.businessTaxOccLicenceNumber || row.taxOccExpirationDate || row.taxOccCost) withTax++
      const c = Number(String(row.cost || '').replace(/[^0-9.-]/g, '')); if (Number.isFinite(c)) { costTotal += c; costCount++ }
      const t = Number(String(row.taxOccCost || '').replace(/[^0-9.-]/g, '')); if (Number.isFinite(t)) { taxTotal += t; taxCount++ }
      if (row.licenceExpirationDate) { const e = new Date(`${row.licenceExpirationDate}T00:00:00.000Z`); if (!Number.isNaN(e.getTime()) && e >= today && e <= soonLimit) expiring++ }
      const w = row.updatedAt || row.createdAt; if (w) { const d = new Date(w); if (!Number.isNaN(d.getTime())) { const k = d.toISOString().slice(0, 10); if (dayCounts.has(k)) dayCounts.set(k, (dayCounts.get(k) || 0) + 1) } }
    }
    const maxDay = Math.max(1, ...days.map((k) => dayCounts.get(k) || 0))
    return { total: rows.length, active, inactive, bondRequired: bond, withTaxReceipt: withTax, expiringSoon: expiring, licenceCostTotal: costTotal, licenceCostAvg: costCount > 0 ? costTotal / costCount : 0, taxOccCostTotal: taxTotal, taxOccCostAvg: taxCount > 0 ? taxTotal / taxCount : 0, days: days.map((k) => ({ day: k, count: dayCounts.get(k) || 0, pct: ((dayCounts.get(k) || 0) / maxDay) * 100 })) }
  }, [rows])

  const updateRow = (id: string, patch: Partial<LicenceRow>) => setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const fetchLicences = async () => {
    try {
      setLoading(true); setError('')
      const url = `/api/admin/licences?category=${encodeURIComponent(category)}`
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data?.error || 'Failed to load records'); return }
      setRows(Array.isArray(data?.licences) ? data.licences : [])
      setSelectedLicenceId((prev) => prev || '')
    } catch (e) { console.error('fetch', e); setError('Failed to load records') } finally { setLoading(false) }
  }

  const addLicence = () => {
    const draftId = `draft-${Date.now()}`, nextRow: LicenceRow = { id: draftId, ...emptyLicencePayload() }
    setError(''); setSuccess(''); setRows((p) => [nextRow, ...p]); setSelectedLicenceId(draftId); setQuery('')
    setSuccess('Draft created. Click Save to save it.')
  }

  const saveLicence = async () => {
    if (!selectedLicence) return
    try {
      setIsSaving(true); setError(''); setSuccess('')
      const isDraft = selectedLicence.id.startsWith('draft-')
      const body = { ...selectedLicence, category: category || undefined, id: isDraft ? undefined : selectedLicence.id }
      const res = await fetch('/api/admin/licences', { method: isDraft ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data?.error || 'Failed to save'); return }
      const saved = data.licence as LicenceRow
      setRows((p) => p.map((r) => (r.id === selectedLicence.id ? saved : r)))
      setSelectedLicenceId(saved.id); setSuccess(isDraft ? 'Record created.' : 'Record saved.')
    } catch (e) { console.error('save', e); setError('Failed to save') } finally { setIsSaving(false) }
  }

  const requestDelete = () => {
    if (!selectedLicence) return
    if (selectedLicence.id.startsWith('draft-')) { setRows((p) => p.filter((r) => r.id !== selectedLicence.id)); setSelectedLicenceId(''); setSuccess('Draft discarded.'); return }
    setPendingDeleteId(selectedLicence.id); setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    const id = pendingDeleteId; if (!id) return
    try {
      setIsDeleting(true); setError(''); setSuccess('')
      const res = await fetch(`/api/admin/licences?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data?.error || 'Failed to delete'); return }
      setRows((p) => p.filter((r) => r.id !== id)); setSelectedLicenceId(''); setDeleteModalOpen(false); setSuccess('Record deleted.')
    } catch (e) { console.error('delete', e); setError('Failed to delete') } finally { setIsDeleting(false) }
  }

  if (status === 'loading' || loading) return <div className="min-h-screen flex items-center justify-center"><LogoHeartbeatLoader /></div>
  if (!session) return <div className="min-h-screen flex items-center justify-center p-4"><div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md"><AlertCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" /><h2 className="text-xl font-bold text-primary-900 mb-2">Unauthorized</h2><p className="text-primary-500 mb-6">Please log in to access this page.</p><button onClick={() => router.push('/login')} className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors">Go to Login</button></div></div>
  if (status === 'authenticated' && !canAccess) return null

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{title}</h1>
                <p className="text-sm text-slate-500">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={addLicence} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"><Plus className="w-4 h-4" />Add {labelForAdd}</button>
                <button type="button" onClick={saveLicence} disabled={!selectedLicence || isSaving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"><Save className="w-4 h-4" />{isSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
            {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-5">
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50 shadow-sm">
              <div className="border-b border-slate-200/70 bg-white/80 p-4 backdrop-blur">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div><h2 className="text-lg font-extrabold text-slate-900">Queue</h2><p className="mt-0.5 text-xs font-medium text-slate-500">Search and select an entry to review.</p></div>
                  <span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-xs font-extrabold text-brand-green">{filteredRows.length} active</span>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-green/70" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={queuePlaceholder || 'Search...'} className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 shadow-inner shadow-slate-100/70 placeholder:text-slate-400 focus:border-brand-green focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-green/10" />
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-slate-500">{filteredRows.length} record{filteredRows.length === 1 ? '' : 's'}</p>
                  <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-extrabold text-brand-green">Select to view details</span>
                </div>
              </div>
              <div className="max-h-[calc(100vh-275px)] space-y-3 overflow-y-auto p-3">
                {filteredRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No entries found</p>
                    <p className="text-sm text-slate-500 mt-1">Try another search term or add a new entry.</p>
                  </div>
                ) : filteredRows.map((row) => {
                  const sel = selectedLicence?.id === row.id
                  return (
                    <button key={row.id} type="button" onClick={() => setSelectedLicenceId(row.id)}
                      className={`group relative w-full overflow-hidden rounded-[1.35rem] border p-4 text-left transition-all ${sel ? 'border-brand-green/60 bg-gradient-to-br from-brand-green/10 via-white to-white shadow-lg shadow-brand-green/10' : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-brand-green/30 hover:shadow-lg hover:shadow-slate-200/70'}`}>
                      <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full transition-colors ${sel ? 'bg-brand-green' : 'bg-transparent group-hover:bg-brand-green/40'}`} />
                      <div className="flex items-start justify-between gap-3 pl-1">
                        <div className="min-w-0"><p className="truncate text-lg font-extrabold text-slate-900">{row.licenceNumber || 'Untitled'}</p><p className="mt-0.5 truncate text-sm font-medium text-slate-500">{(row.county || '-') + ' / ' + (row.city || '-')}</p></div>
                        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-extrabold shadow-sm ${row.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{row.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100"><p className="font-extrabold uppercase tracking-wide text-slate-400">Type</p><p className="mt-1 truncate font-bold text-slate-800">{row.licenceType || '-'}</p></div>
                        <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100"><p className="font-extrabold uppercase tracking-wide text-slate-400">Areas</p><p className="mt-1 truncate font-bold text-slate-800">{row.areas || '-'}</p></div>
                        <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100"><p className="font-extrabold uppercase tracking-wide text-slate-400">Expiry</p><p className="mt-1 truncate font-bold text-slate-800">{row.licenceExpirationDate || '-'}</p></div>
                        <div className="rounded-2xl bg-brand-green/5 p-3 ring-1 ring-brand-green/10"><p className="font-extrabold uppercase tracking-wide text-brand-green/70">Cost</p><p className="mt-1 truncate font-extrabold text-slate-900">{row.cost ? formatMoney(row.cost) : '-'}</p></div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              {!selectedLicence ? (
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div><h2 className="text-xl font-bold text-slate-900">Overview</h2><p className="text-sm text-slate-500 mt-1">Select an entry on the left to view/edit details.</p></div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">{overview.total} total</span>
                  </div>
                  <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total cost</p>
                      <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatMoneyNumber(overview.licenceCostTotal)}</p>
                      <p className="mt-1 text-sm text-slate-500">Avg: {formatMoneyNumber(overview.licenceCostAvg)}</p>
                      <div className="mt-6 grid grid-cols-1 gap-3">
                        <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm"><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Tax/Occ total</p><p className="mt-1 text-lg font-extrabold text-slate-900">{formatMoneyNumber(overview.taxOccCostTotal)}</p><p className="mt-0.5 text-xs font-semibold text-slate-500">Avg: {formatMoneyNumber(overview.taxOccCostAvg)}</p></div>
                        <div className="rounded-2xl border border-brand-green/10 bg-brand-green/5 p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-green/70">Expiring soon</p><p className="mt-1 text-lg font-extrabold text-slate-900">{overview.expiringSoon}</p></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-600">Bond required</p><p className="mt-1 text-base font-extrabold text-slate-900">{overview.bondRequired}</p></div>
                          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-600">Tax receipts</p><p className="mt-1 text-base font-extrabold text-slate-900">{overview.withTaxReceipt}</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
                      <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status breakdown</p><p className="text-xs font-semibold text-slate-500">By status</p></div>
                      {(() => {
                        const total = Math.max(0, overview.total || 0)
                        const segs = [{ id: 'active', label: 'Active', count: overview.active, color: '#84cc16' }, { id: 'inactive', label: 'Inactive', count: overview.inactive, color: '#94a3b8' }, { id: 'bond', label: 'Bond required', count: overview.bondRequired, color: '#f59e0b' }, { id: 'tax', label: 'Tax receipt', count: overview.withTaxReceipt, color: '#0ea5e9' }].map((s) => ({ ...s, pct: total > 0 ? (s.count / total) * 100 : 0 }))
                        const sz = 176, cx = sz / 2, cy = sz / 2, r = 68, sw = 14; let cur = -90
                        return (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                            <div className="relative mx-auto">
                              <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} className="block">
                                <defs><linearGradient id="srbg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#f1f5f9" /></linearGradient></defs>
                                <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#srbg)" strokeWidth={sw} />
                                {segs.slice(0, 2).map((s) => { const sweep = total > 0 ? (s.count / total) * 360 : 0; const start = cur, end = cur + sweep; cur = end; if (sweep <= 0.01) return null; return <path key={s.id} d={describeArc(cx, cy, r, start, end)} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="round" /> })}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</div><div className="mt-1 text-2xl font-extrabold text-slate-900">{total}</div><div className="mt-1 text-xs font-semibold text-slate-500">Total</div></div>
                            </div>
                            <div className="space-y-3">{segs.map((s) => (<div key={s.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} /><div className="min-w-0"><div className="font-bold text-slate-900 truncate text-sm">{s.label}</div><div className="text-xs text-slate-500">{total > 0 ? `${s.pct.toFixed(1)}%` : '0%'}</div></div></div><div className="text-right"><div className="text-base font-extrabold text-slate-900">{s.count}</div></div></div></div>))}</div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent activity (last 7 days)</p></div>
                    {(() => {
                      const cw = 720, ch = 220, px = 28, pt = 18, pb = 46, by = ch - pb, ih = by - pt, mc = Math.max(1, ...overview.days.map((d) => d.count))
                      const pts = overview.days.map((item, idx) => { const x = overview.days.length === 1 ? cw / 2 : px + (idx / (overview.days.length - 1)) * (cw - px * 2); const y = by - (item.count / mc) * ih; return { ...item, x, y } })
                      const lp = buildSmoothSvgPath(pts), ap = pts.length ? `${lp} L ${pts[pts.length - 1].x} ${by} L ${pts[0].x} ${by} Z` : ''
                      return <div className="mt-3 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-brand-green/5 p-4"><div className="relative overflow-hidden rounded-[1.5rem] border border-brand-green/10 bg-white/80 p-4"><svg viewBox={`0 0 ${cw} ${ch}`} className="h-56 w-full"><defs><linearGradient id="af" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#84cc16" stopOpacity="0.22" /><stop offset="100%" stopColor="#84cc16" stopOpacity="0.03" /></linearGradient><linearGradient id="al" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#a3e635" /><stop offset="100%" stopColor="#65a30d" /></linearGradient></defs>{ap ? <path d={ap} fill="url(#af)" /> : null}{lp ? <path d={lp} fill="none" stroke="url(#al)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /> : null}{pts.map((p, i) => { const isLast = i === pts.length - 1, isMax = p.count === mc && mc > 0, show = (isLast || isMax) && pts.length > 0; return <g key={`${p.day}-${i}`}>{show && <text x={p.x} y={Math.max(18, p.y - 16)} textAnchor="middle" className="fill-slate-900 text-[14px] font-bold">{p.count}</text>}<circle cx={p.x} cy={p.y} r={show ? 7 : 5} fill={show ? '#65a30d' : '#84cc16'} stroke="#fff" strokeWidth="3" />{show && <circle cx={p.x} cy={p.y} r={14} fill="#65a30d" fillOpacity="0.12" />}</g> })}</svg></div></div>
                    })()}
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${selectedLicence.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{selectedLicence.isActive ? 'Active' : 'Inactive'}</span>
                          {selectedLicence.licenceNumber && <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500">{selectedLicence.licenceNumber}</span>}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedLicence.county || selectedLicence.city || selectedLicence.licenceNumber || 'New entry'}</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={requestDelete} disabled={isDeleting || isSaving} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"><Trash2 className="w-4 h-4" />Delete</button>
                        <button type="button" onClick={saveLicence} disabled={isSaving || isDeleting} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"><Save className="w-4 h-4" />Save</button>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div><p className={labelClass}>County</p><div className="mt-2 relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={selectedLicence.county} onChange={(e) => updateRow(selectedLicence.id, { county: e.target.value })} placeholder="County" className={`${inputClass} pl-11`} /></div></div>
                      <div><p className={labelClass}>City</p><div className="mt-2 relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={selectedLicence.city} onChange={(e) => updateRow(selectedLicence.id, { city: e.target.value })} placeholder="City" className={`${inputClass} pl-11`} /></div></div>
                      <div className="lg:col-span-2"><p className={labelClass}>Active / Areas</p><div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]"><button type="button" onClick={() => updateRow(selectedLicence.id, { isActive: !selectedLicence.isActive })} className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"><span>{selectedLicence.isActive ? 'Active' : 'Inactive'}</span>{selectedLicence.isActive ? <ToggleRight className="h-5 w-5 text-brand-green" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}</button><input value={selectedLicence.areas} onChange={(e) => updateRow(selectedLicence.id, { areas: e.target.value })} placeholder="Areas served" className={inputClass} /></div></div>
                      <div><p className={labelClass}>Licence type</p><input value={selectedLicence.licenceType} onChange={(e) => updateRow(selectedLicence.id, { licenceType: e.target.value })} placeholder="Type" className={`mt-2 ${inputClass}`} /></div>
                      <div><p className={labelClass}>Licence number</p><div className="mt-2 relative"><Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={selectedLicence.licenceNumber} onChange={(e) => updateRow(selectedLicence.id, { licenceNumber: e.target.value })} placeholder="Licence #" className={`${inputClass} pl-11`} /></div></div>
                      <div><p className={labelClass}>Licence expiration date</p><div className="mt-2 relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="date" value={selectedLicence.licenceExpirationDate} onChange={(e) => updateRow(selectedLicence.id, { licenceExpirationDate: e.target.value })} className={`${inputClass} pl-11`} /></div></div>
                      <div><p className={labelClass}>Last payment date</p><div className="mt-2 relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="date" value={selectedLicence.lastPaymentDate} onChange={(e) => updateRow(selectedLicence.id, { lastPaymentDate: e.target.value })} className={`${inputClass} pl-11`} /></div></div>
                      <div><p className={labelClass}>Cost</p><div className="mt-2 relative"><BadgeDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={selectedLicence.cost} onChange={(e) => updateRow(selectedLicence.id, { cost: e.target.value })} placeholder="$" className={`${inputClass} pl-11`} /></div></div>
                      <div><p className={labelClass}>Bond required</p><button type="button" onClick={() => updateRow(selectedLicence.id, { bondRequired: !selectedLicence.bondRequired })} className="mt-2 inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"><span>{selectedLicence.bondRequired ? 'Yes' : 'No'}</span>{selectedLicence.bondRequired ? <ToggleRight className="h-5 w-5 text-brand-green" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}</button></div>
                    </div>
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tax / Occupational</p><p className="mt-1 text-lg font-bold text-slate-900">Business Tax Occupational</p></div><span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-xs font-bold text-brand-green">Track payments</span></div><div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-end"><div className="flex h-full flex-col justify-end"><p className={`${labelClass} min-h-[2.25rem] leading-5`}>Business tax occupational licence number</p><div className="mt-2 relative"><Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={selectedLicence.businessTaxOccLicenceNumber} onChange={(e) => updateRow(selectedLicence.id, { businessTaxOccLicenceNumber: e.target.value })} placeholder="Number" className={`${inputClass} pl-11`} /></div></div><div className="flex h-full flex-col justify-end"><p className={`${labelClass} min-h-[2.25rem] leading-5`}>Tax/Occ expiration date</p><div className="mt-2 relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="date" value={selectedLicence.taxOccExpirationDate} onChange={(e) => updateRow(selectedLicence.id, { taxOccExpirationDate: e.target.value })} className={`${inputClass} pl-11`} /></div></div><div className="flex h-full flex-col justify-end"><p className={`${labelClass} min-h-[2.25rem] leading-5`}>Tax/Occ cost</p><div className="mt-2 relative"><BadgeDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={selectedLicence.taxOccCost} onChange={(e) => updateRow(selectedLicence.id, { taxOccCost: e.target.value })} placeholder="$" className={`${inputClass} pl-11`} /></div></div></div></div>
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-slate-700"><StickyNote className="h-4 w-4 text-brand-green" /><p className="text-sm font-bold">Notes about competence cards</p></div><textarea value={selectedLicence.competenceCardsNotes} onChange={(e) => updateRow(selectedLicence.id, { competenceCardsNotes: e.target.value })} rows={6} placeholder="Competence card notes..." className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20" /></div>
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-slate-700"><StickyNote className="h-4 w-4 text-brand-green" /><p className="text-sm font-bold">Notes about the business tax receipt</p></div><textarea value={selectedLicence.businessTaxReceiptNotes} onChange={(e) => updateRow(selectedLicence.id, { businessTaxReceiptNotes: e.target.value })} rows={5} placeholder="Business tax receipt notes..." className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20" /></div>
                  </div>
                </>
              )}
            </motion.section>
          </div>
        </main>
      </div>
      {deleteModalOpen && (<><button type="button" className="fixed inset-0 z-40 bg-black/50" aria-label="Close" onClick={() => { if (isDeleting) return; setDeleteModalOpen(false); setPendingDeleteId(null) }} /><div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl"><div className="p-6"><div className="flex items-start gap-4"><div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div><div className="min-w-0"><h3 className="text-lg font-extrabold text-slate-900">Delete entry?</h3><p className="mt-1 text-sm text-slate-500">This will permanently delete the entry. This action cannot be undone.</p></div></div><div className="mt-6 flex items-center justify-end gap-2"><button type="button" disabled={isDeleting} onClick={() => { setDeleteModalOpen(false); setPendingDeleteId(null) }} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button><button type="button" disabled={isDeleting} onClick={confirmDelete} className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60">{isDeleting ? 'Deleting…' : 'Delete'}</button></div></div></div></div></>)}
    </div>
  )
}
