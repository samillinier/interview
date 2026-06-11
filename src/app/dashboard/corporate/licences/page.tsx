'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  FileCheck,
  FileText,
  Hash,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  MessageSquare,
  Plus,
  Save,
  Settings,
  ShieldAlert,
  StickyNote,
  ToggleLeft,
  ToggleRight,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react'

import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type LicenceRow = {
  id: string
  county: string
  city: string
  isActive: boolean
  areas: string
  licenceType: string
  licenceNumber: string
  licenceExpirationDate: string
  lastPaymentDate: string
  cost: string
  bondRequired: boolean
  notes: string
  competenceCardsNotes: string
  businessTaxOccLicenceNumber: string
  taxOccExpirationDate: string
  taxOccCost: string
  businessTaxReceiptNotes: string
  createdAt?: string
  updatedAt?: string
}

const emptyLicencePayload = (): Omit<LicenceRow, 'id'> => ({
  county: '',
  city: '',
  isActive: true,
  areas: '',
  licenceType: '',
  licenceNumber: '',
  licenceExpirationDate: '',
  lastPaymentDate: '',
  cost: '',
  bondRequired: false,
  notes: '',
  competenceCardsNotes: '',
  businessTaxOccLicenceNumber: '',
  taxOccExpirationDate: '',
  taxOccCost: '',
  businessTaxReceiptNotes: '',
})

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20'

const labelClass = 'text-xs font-bold uppercase tracking-wide text-slate-500'

function formatMoney(value: string) {
  const normalized = value.replace(/[^0-9.-]/g, '')
  const n = normalized ? Number(normalized) : NaN
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

  for (let index = 0; index < points.length - 1; index++) {
    const current = points[index]
    const next = points[index + 1]
    const controlX = (current.x + next.x) / 2

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
  }

  return path
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

export default function LicencesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase() as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN' | ''
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN'
  const canAccess = normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'MODERATOR' || isSuperAdmin

  const { sidebarOpen } = useSidebarOpen()
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
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

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      if (normalizedRole && !canAccess) {
        router.push('/dashboard')
        return
      }
      void fetchLicences()
    }
  }, [status, router, canAccess, normalizedRole])

  useEffect(() => {
    if (status !== 'authenticated' || !canAccess) return

    const fetchPendingApprovalsCount = async () => {
      try {
        const res = await fetch('/api/admin/change-requests/count')
        if (res.status === 401) {
          setPendingApprovalsCount(0)
          return
        }
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          setPendingApprovalsCount(Number(data?.count || 0) || 0)
        }
      } catch {
        // ignore
      }
    }

    const fetchSignatureNotSignedCount = async () => {
      try {
        const res = await fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' })
        if (res.status === 401) {
          setSignatureNotSignedCount(0)
          return
        }
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          setSignatureNotSignedCount(Number(data?.count || 0) || 0)
        }
      } catch {
        // ignore
      }
    }

    const fetchUnreadMessagesCount = async () => {
      try {
        const response = await fetch('/api/notifications?type=message', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json().catch(() => ({}))
        const notifications = Array.isArray(data?.notifications) ? data.notifications : []
        const unread = notifications.filter((n: any) => {
          const isRead = Boolean(n?.isRead)
          const senderType = String(n?.senderType || '').toLowerCase()
          const senderId = String(n?.senderId || '')
          const fromAdmin = senderType === 'admin' || senderId === 'admin'
          return !isRead && !fromAdmin
        }).length
        setUnreadMessagesCount(unread)
      } catch {
        // ignore
      }
    }

    fetchPendingApprovalsCount()
    fetchSignatureNotSignedCount()
    fetchUnreadMessagesCount()

    const interval = setInterval(() => {
      fetchPendingApprovalsCount()
      fetchSignatureNotSignedCount()
      fetchUnreadMessagesCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [status, canAccess])

  const navItems = useMemo(() => {
    const base = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard', label: 'Installers', icon: Users, match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/installers') },
      { href: '/dashboard/approvals', label: 'Approvals', icon: ShieldAlert },
      { href: '/dashboard/signature', label: 'Signature', icon: FileCheck },
      { href: '/dashboard/tracking', label: 'Tracking', icon: Activity, match: (p: string) => p.startsWith('/dashboard/tracking') },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
      { href: '/dashboard/remarks', label: 'Remarks', icon: StickyNote },
      { href: '/dashboard/ltr', label: 'Survey', icon: ClipboardList },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
      { href: '/dashboard/updates', label: 'Updates', icon: Megaphone },
    ]
    const corporateItem =
      normalizedRole === 'SUPER_ADMIN'
        ? [{ href: '/dashboard/corporate', label: 'Corporate', icon: FileText, match: (p: string) => p.startsWith('/dashboard/corporate') }]
        : []

    return [
      ...base,
      {
        href: '/property/dashboard',
        label: 'Property Portal',
        icon: Building2,
        match: (p: string) => p.startsWith('/property'),
      },
      ...corporateItem,
    ]
  }, [normalizedRole])

  const isActive = (href: string, match?: (p: string) => boolean) => (match ? match(pathname) : pathname === href)

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    const hit = (v: unknown) => String(v || '').toLowerCase().includes(q)
    return rows.filter((r) => hit(r.county) || hit(r.city) || hit(r.areas) || hit(r.licenceType) || hit(r.licenceNumber) || hit(r.notes))
  }, [rows, query])

  const selectedLicence = useMemo(() => rows.find((r) => r.id === selectedLicenceId) || null, [rows, selectedLicenceId])

  const overview = useMemo(() => {
    let active = 0
    let inactive = 0
    let bondRequired = 0
    let licenceCostTotal = 0
    let licenceCostCount = 0
    let taxOccCostTotal = 0
    let taxOccCostCount = 0
    let expiringSoon = 0
    let withTaxReceipt = 0

    const dayCounts = new Map<string, number>()
    const today = new Date()
    const days: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push(key)
      dayCounts.set(key, 0)
    }

    const soonLimit = new Date(today)
    soonLimit.setDate(today.getDate() + 60)

    for (const row of rows) {
      if (row.isActive) active += 1
      else inactive += 1
      if (row.bondRequired) bondRequired += 1
      if (row.businessTaxOccLicenceNumber || row.taxOccExpirationDate || row.taxOccCost) withTaxReceipt += 1

      const licenceCost = Number(String(row.cost || '').replace(/[^0-9.-]/g, ''))
      if (Number.isFinite(licenceCost)) {
        licenceCostTotal += licenceCost
        licenceCostCount += 1
      }

      const taxCost = Number(String(row.taxOccCost || '').replace(/[^0-9.-]/g, ''))
      if (Number.isFinite(taxCost)) {
        taxOccCostTotal += taxCost
        taxOccCostCount += 1
      }

      if (row.licenceExpirationDate) {
        const expiry = new Date(`${row.licenceExpirationDate}T00:00:00.000Z`)
        if (!Number.isNaN(expiry.getTime()) && expiry >= today && expiry <= soonLimit) expiringSoon += 1
      }

      const whenRaw = row.updatedAt || row.createdAt
      if (whenRaw) {
        const d = new Date(whenRaw)
        if (!Number.isNaN(d.getTime())) {
          const key = d.toISOString().slice(0, 10)
          if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) || 0) + 1)
        }
      }
    }

    const maxDay = Math.max(1, ...days.map((k) => dayCounts.get(k) || 0))
    const total = rows.length

    return {
      total,
      active,
      inactive,
      bondRequired,
      withTaxReceipt,
      expiringSoon,
      licenceCostTotal,
      licenceCostAvg: licenceCostCount > 0 ? licenceCostTotal / licenceCostCount : 0,
      taxOccCostTotal,
      taxOccCostAvg: taxOccCostCount > 0 ? taxOccCostTotal / taxOccCostCount : 0,
      days: days.map((k) => ({ day: k, count: dayCounts.get(k) || 0, pct: ((dayCounts.get(k) || 0) / maxDay) * 100 })),
    }
  }, [rows])

  const updateRow = (id: string, patch: Partial<LicenceRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const fetchLicences = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/admin/licences', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to load licences')
        return
      }
      const licences = Array.isArray(data?.licences) ? (data.licences as LicenceRow[]) : []
      setRows(licences)
      setSelectedLicenceId((prev) => prev || '')
    } catch (e) {
      console.error('fetch licences', e)
      setError('Failed to load licences')
    } finally {
      setLoading(false)
    }
  }

  const addLicence = () => {
    const draftId = `draft-${Date.now()}`
    const nextRow: LicenceRow = { id: draftId, ...emptyLicencePayload() }
    setError('')
    setSuccess('')
    setRows((prev) => [nextRow, ...prev])
    setSelectedLicenceId(draftId)
    setQuery('')
    setSuccess('Draft licence created. Click Save to create it.')
  }

  const saveLicence = async () => {
    if (!selectedLicence) return
    try {
      setIsSaving(true)
      setError('')
      setSuccess('')
      const isDraft = selectedLicence.id.startsWith('draft-')
      const res = await fetch('/api/admin/licences', {
        method: isDraft ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isDraft ? { ...selectedLicence, id: undefined } : selectedLicence),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to save licence')
        return
      }
      const saved = data.licence as LicenceRow
      setRows((prev) => prev.map((r) => (r.id === selectedLicence.id ? saved : r)))
      setSelectedLicenceId(saved.id)
      setSuccess(isDraft ? 'Licence created.' : 'Licence saved.')
    } catch (e) {
      console.error('save licence', e)
      setError('Failed to save licence')
    } finally {
      setIsSaving(false)
    }
  }

  const requestDelete = () => {
    if (!selectedLicence) return
    if (selectedLicence.id.startsWith('draft-')) {
      setRows((prev) => prev.filter((r) => r.id !== selectedLicence.id))
      setSelectedLicenceId('')
      setSuccess('Draft discarded.')
      return
    }
    setPendingDeleteId(selectedLicence.id)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    const id = pendingDeleteId
    if (!id) return
    try {
      setIsDeleting(true)
      setError('')
      setSuccess('')
      const res = await fetch(`/api/admin/licences?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to delete licence')
        return
      }
      setRows((prev) => prev.filter((r) => r.id !== id))
      setSelectedLicenceId('')
      setDeleteModalOpen(false)
      setSuccess('Licence deleted.')
    } catch (e) {
      console.error('delete licence', e)
      setError('Failed to delete licence')
    } finally {
      setIsDeleting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Unauthorized</h2>
          <p className="text-primary-500 mb-6">Please log in to access this page.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

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
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Licences</h1>
                <p className="text-sm text-slate-500">Track county/city licences, payments, bonds, and tax/occupational records</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addLicence}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Licence
                </button>
                <button
                  type="button"
                  onClick={saveLicence}
                  disabled={!selectedLicence || isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
            )}
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-5">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50 shadow-sm"
            >
              <div className="border-b border-slate-200/70 bg-white/80 p-4 backdrop-blur">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Licence queue</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">Search and select a licence to review.</p>
                  </div>
                  <span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-xs font-extrabold text-brand-green">
                    {filteredRows.length} active
                  </span>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-green/70" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search county, city, licence number..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 shadow-inner shadow-slate-100/70 placeholder:text-slate-400 focus:border-brand-green focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-green/10"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-slate-500">
                    {filteredRows.length} licence{filteredRows.length === 1 ? '' : 's'}
                  </p>
                  <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-extrabold text-brand-green">Select to view details</span>
                </div>
              </div>

              <div className="max-h-[calc(100vh-275px)] space-y-3 overflow-y-auto p-3">
                {filteredRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No licences found</p>
                    <p className="text-sm text-slate-500 mt-1">Try another search term.</p>
                  </div>
                ) : (
                  filteredRows.map((row) => {
                    const selected = selectedLicence?.id === row.id
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedLicenceId(row.id)}
                        className={`group relative w-full overflow-hidden rounded-[1.35rem] border p-4 text-left transition-all ${
                          selected
                            ? 'border-brand-green/60 bg-gradient-to-br from-brand-green/10 via-white to-white shadow-lg shadow-brand-green/10'
                            : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-brand-green/30 hover:shadow-lg hover:shadow-slate-200/70'
                        }`}
                      >
                        <div
                          className={`absolute inset-y-4 left-0 w-1 rounded-r-full transition-colors ${
                            selected ? 'bg-brand-green' : 'bg-transparent group-hover:bg-brand-green/40'
                          }`}
                        />
                        <div className="flex items-start justify-between gap-3 pl-1">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-extrabold text-slate-900">{row.licenceNumber || 'Untitled licence'}</p>
                            <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                              {(row.county || '-') + ' / ' + (row.city || '-')}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-extrabold shadow-sm ${
                              row.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100">
                            <p className="font-extrabold uppercase tracking-wide text-slate-400">Type</p>
                            <p className="mt-1 truncate font-bold text-slate-800">{row.licenceType || '-'}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100">
                            <p className="font-extrabold uppercase tracking-wide text-slate-400">Areas</p>
                            <p className="mt-1 truncate font-bold text-slate-800">{row.areas || '-'}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100">
                            <p className="font-extrabold uppercase tracking-wide text-slate-400">Expiry</p>
                            <p className="mt-1 truncate font-bold text-slate-800">{row.licenceExpirationDate || '-'}</p>
                          </div>
                          <div className="rounded-2xl bg-brand-green/5 p-3 ring-1 ring-brand-green/10">
                            <p className="font-extrabold uppercase tracking-wide text-brand-green/70">Cost</p>
                            <p className="mt-1 truncate font-extrabold text-slate-900">{row.cost ? formatMoney(row.cost) : '-'}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm overflow-hidden"
            >
              {!selectedLicence ? (
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Licences overview</h2>
                      <p className="text-sm text-slate-500 mt-1">Select a licence on the left to view/edit details.</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                      {overview.total} total
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total licence cost</p>
                      <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatMoneyNumber(overview.licenceCostTotal)}</p>
                      <p className="mt-1 text-sm text-slate-500">Avg: {formatMoneyNumber(overview.licenceCostAvg)}</p>

                      <div className="mt-6 grid grid-cols-1 gap-3">
                        <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Tax/Occ total</p>
                          <p className="mt-1 text-lg font-extrabold text-slate-900">{formatMoneyNumber(overview.taxOccCostTotal)}</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">Avg: {formatMoneyNumber(overview.taxOccCostAvg)}</p>
                        </div>
                        <div className="rounded-2xl border border-brand-green/10 bg-brand-green/5 p-3">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-green/70">Expiring soon</p>
                          <p className="mt-1 text-lg font-extrabold text-slate-900">{overview.expiringSoon}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-600">Bond required</p>
                            <p className="mt-1 text-base font-extrabold text-slate-900">{overview.bondRequired}</p>
                          </div>
                          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-600">Tax receipts</p>
                            <p className="mt-1 text-base font-extrabold text-slate-900">{overview.withTaxReceipt}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status breakdown</p>
                        <p className="text-xs font-semibold text-slate-500">Licences by status</p>
                      </div>
                      {(() => {
                        const total = Math.max(0, overview.total || 0)
                        const segments = [
                          { id: 'active', label: 'Active', count: overview.active, color: '#84cc16' },
                          { id: 'inactive', label: 'Inactive', count: overview.inactive, color: '#94a3b8' },
                          { id: 'bond', label: 'Bond required', count: overview.bondRequired, color: '#f59e0b' },
                          { id: 'tax', label: 'Tax receipt', count: overview.withTaxReceipt, color: '#0ea5e9' },
                        ].map((seg) => ({ ...seg, pct: total > 0 ? (seg.count / total) * 100 : 0 }))

                        const size = 176
                        const cx = size / 2
                        const cy = size / 2
                        const r = 68
                        const stroke = 14
                        let cursor = -90

                        return (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                            <div className="relative mx-auto">
                              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
                                <defs>
                                  <linearGradient id="licenceStatusRingBg" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#e2e8f0" />
                                    <stop offset="100%" stopColor="#f1f5f9" />
                                  </linearGradient>
                                </defs>
                                <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#licenceStatusRingBg)" strokeWidth={stroke} />
                                {segments.slice(0, 2).map((seg) => {
                                  const sweep = total > 0 ? (seg.count / total) * 360 : 0
                                  const start = cursor
                                  const end = cursor + sweep
                                  cursor = end
                                  if (sweep <= 0.01) return null
                                  return (
                                    <path
                                      key={seg.id}
                                      d={describeArc(cx, cy, r, start, end)}
                                      fill="none"
                                      stroke={seg.color}
                                      strokeWidth={stroke}
                                      strokeLinecap="round"
                                    />
                                  )
                                })}
                              </svg>

                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Licences</div>
                                <div className="mt-1 text-2xl font-extrabold text-slate-900">{total}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">Total</div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {segments.map((seg) => (
                                <div key={seg.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-900 truncate text-sm">{seg.label}</div>
                                        <div className="text-xs text-slate-500">
                                          {total > 0 ? `${seg.pct.toFixed(1)}% of licences` : '0% of licences'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-base font-extrabold text-slate-900">{seg.count}</div>
                                      <div className="text-xs font-semibold text-slate-500">{seg.count === 1 ? 'licence' : 'licences'}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent activity (last 7 days)</p>
                      <p className="text-xs font-semibold text-slate-500">Licences updated/created</p>
                    </div>
                    {(() => {
                      const chartWidth = 720
                      const chartHeight = 220
                      const paddingX = 28
                      const paddingTop = 18
                      const paddingBottom = 46
                      const baselineY = chartHeight - paddingBottom
                      const innerHeight = baselineY - paddingTop
                      const maxCount = Math.max(1, ...overview.days.map((d) => d.count))

                      const chartPoints = overview.days.map((item, index) => {
                        const x =
                          overview.days.length === 1
                            ? chartWidth / 2
                            : paddingX + (index / (overview.days.length - 1)) * (chartWidth - paddingX * 2)
                        const y = baselineY - (item.count / maxCount) * innerHeight
                        return { ...item, x, y }
                      })
                      const linePath = buildSmoothSvgPath(chartPoints)
                      const areaPath = chartPoints.length
                        ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${baselineY} L ${chartPoints[0].x} ${baselineY} Z`
                        : ''

                      return (
                        <div className="mt-3 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-brand-green/5 p-4">
                          <div className="relative overflow-hidden rounded-[1.5rem] border border-brand-green/10 bg-white/80 p-4">
                            <div className="pointer-events-none absolute inset-x-4 top-4 bottom-14 flex flex-col justify-between">
                              {[maxCount, Math.round(maxCount * 0.66), Math.round(maxCount * 0.33), 0].map((tick, index) => (
                                <div key={`${tick}-${index}`} className="relative border-t border-dashed border-slate-200">
                                  <span className="absolute -top-3 right-0 bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {tick}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="relative">
                              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-56 w-full">
                                <defs>
                                  <linearGradient id="licenceActivityFill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#84cc16" stopOpacity="0.22" />
                                    <stop offset="100%" stopColor="#84cc16" stopOpacity="0.03" />
                                  </linearGradient>
                                  <linearGradient id="licenceActivityLine" x1="0" x2="1" y1="0" y2="0">
                                    <stop offset="0%" stopColor="#a3e635" />
                                    <stop offset="100%" stopColor="#65a30d" />
                                  </linearGradient>
                                </defs>

                                {areaPath ? <path d={areaPath} fill="url(#licenceActivityFill)" /> : null}
                                {linePath ? (
                                  <path
                                    d={linePath}
                                    fill="none"
                                    stroke="url(#licenceActivityLine)"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                ) : null}

                                {chartPoints.map((point, index) => {
                                  const isLatest = index === chartPoints.length - 1
                                  const isMax = point.count === maxCount && maxCount > 0
                                  const showLabel = (isLatest || isMax) && chartPoints.length > 0
                                  return (
                                    <g key={`${point.day}-${index}`}>
                                      {showLabel && (
                                        <text
                                          x={point.x}
                                          y={Math.max(18, point.y - 16)}
                                          textAnchor="middle"
                                          className="fill-slate-900 text-[14px] font-bold"
                                        >
                                          {point.count}
                                        </text>
                                      )}
                                      <circle
                                        cx={point.x}
                                        cy={point.y}
                                        r={showLabel ? 7 : 5}
                                        fill={showLabel ? '#65a30d' : '#84cc16'}
                                        stroke="#ffffff"
                                        strokeWidth="3"
                                      />
                                      {showLabel && <circle cx={point.x} cy={point.y} r={14} fill="#65a30d" fillOpacity="0.12" />}
                                    </g>
                                  )
                                })}
                              </svg>

                              <div
                                className="mt-4 grid gap-2 text-center text-xs font-medium text-slate-600"
                                style={{ gridTemplateColumns: `repeat(${Math.max(overview.days.length, 1)}, minmax(0, 1fr))` }}
                              >
                                {overview.days.map((item) => (
                                  <div key={`${item.day}-label`} className="truncate leading-tight">
                                    {item.day.slice(5).replace('-', '/')}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                              selectedLicence.isActive
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {selectedLicence.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {selectedLicence.licenceNumber && (
                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                              {selectedLicence.licenceNumber}
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">
                          {selectedLicence.county || selectedLicence.city || selectedLicence.licenceNumber || 'New licence'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                          {[selectedLicence.city, selectedLicence.areas, selectedLicence.licenceType].filter(Boolean).join(' • ') || 'Update licence fields, payments, and tax/occupational details.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={requestDelete}
                          disabled={isDeleting || isSaving}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={saveLicence}
                          disabled={isSaving || isDeleting}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save Licence'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div>
                      <p className={labelClass}>County</p>
                      <div className="mt-2 relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          value={selectedLicence.county}
                          onChange={(e) => updateRow(selectedLicence.id, { county: e.target.value })}
                          placeholder="County"
                          className={`${inputClass} pl-11`}
                        />
                      </div>
                    </div>
                    <div>
                      <p className={labelClass}>City</p>
                      <div className="mt-2 relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          value={selectedLicence.city}
                          onChange={(e) => updateRow(selectedLicence.id, { city: e.target.value })}
                          placeholder="City"
                          className={`${inputClass} pl-11`}
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <p className={labelClass}>Active / Areas</p>
                      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
                        <button
                          type="button"
                          onClick={() => updateRow(selectedLicence.id, { isActive: !selectedLicence.isActive })}
                          className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                        >
                          <span>{selectedLicence.isActive ? 'Active' : 'Inactive'}</span>
                          {selectedLicence.isActive ? <ToggleRight className="h-5 w-5 text-brand-green" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                        </button>
                        <input
                          value={selectedLicence.areas}
                          onChange={(e) => updateRow(selectedLicence.id, { areas: e.target.value })}
                          placeholder="Areas served"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <p className={labelClass}>Licence type</p>
                      <input
                        value={selectedLicence.licenceType}
                        onChange={(e) => updateRow(selectedLicence.id, { licenceType: e.target.value })}
                        placeholder="Type"
                        className={`mt-2 ${inputClass}`}
                      />
                    </div>

                    <div>
                      <p className={labelClass}>Licence number</p>
                      <div className="mt-2 relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          value={selectedLicence.licenceNumber}
                          onChange={(e) => updateRow(selectedLicence.id, { licenceNumber: e.target.value })}
                          placeholder="Licence #"
                          className={`${inputClass} pl-11`}
                        />
                      </div>
                    </div>

                    <div>
                      <p className={labelClass}>Licence expiration date</p>
                      <div className="mt-2 relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          value={selectedLicence.licenceExpirationDate}
                          onChange={(e) => updateRow(selectedLicence.id, { licenceExpirationDate: e.target.value })}
                          className={`${inputClass} pl-11`}
                        />
                      </div>
                    </div>

                    <div>
                      <p className={labelClass}>Last payment date</p>
                      <div className="mt-2 relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          value={selectedLicence.lastPaymentDate}
                          onChange={(e) => updateRow(selectedLicence.id, { lastPaymentDate: e.target.value })}
                          className={`${inputClass} pl-11`}
                        />
                      </div>
                    </div>

                    <div>
                      <p className={labelClass}>Cost</p>
                      <div className="mt-2 relative">
                        <BadgeDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          value={selectedLicence.cost}
                          onChange={(e) => updateRow(selectedLicence.id, { cost: e.target.value })}
                          placeholder="$"
                          className={`${inputClass} pl-11`}
                        />
                      </div>
                    </div>

                    <div>
                      <p className={labelClass}>Bond required</p>
                      <button
                        type="button"
                        onClick={() => updateRow(selectedLicence.id, { bondRequired: !selectedLicence.bondRequired })}
                        className="mt-2 inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                      >
                        <span>{selectedLicence.bondRequired ? 'Yes' : 'No'}</span>
                        {selectedLicence.bondRequired ? <ToggleRight className="h-5 w-5 text-brand-green" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tax / Occupational</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">Business Tax Occupational</p>
                      </div>
                      <span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-xs font-bold text-brand-green">
                        Track payments
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                      <div className="flex h-full flex-col justify-end">
                        <p className={`${labelClass} min-h-[2.25rem] leading-5`}>Business tax occupational licence number</p>
                        <div className="mt-2 relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            value={selectedLicence.businessTaxOccLicenceNumber}
                            onChange={(e) => updateRow(selectedLicence.id, { businessTaxOccLicenceNumber: e.target.value })}
                            placeholder="Number"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      <div className="flex h-full flex-col justify-end">
                        <p className={`${labelClass} min-h-[2.25rem] leading-5`}>Tax/Occ expiration date</p>
                        <div className="mt-2 relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="date"
                            value={selectedLicence.taxOccExpirationDate}
                            onChange={(e) => updateRow(selectedLicence.id, { taxOccExpirationDate: e.target.value })}
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      <div className="flex h-full flex-col justify-end">
                        <p className={`${labelClass} min-h-[2.25rem] leading-5`}>Tax/Occ cost</p>
                        <div className="mt-2 relative">
                          <BadgeDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            value={selectedLicence.taxOccCost}
                            onChange={(e) => updateRow(selectedLicence.id, { taxOccCost: e.target.value })}
                            placeholder="$"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <StickyNote className="h-4 w-4 text-brand-green" />
                      <p className="text-sm font-bold">Notes about competence cards</p>
                    </div>
                    <textarea
                      value={selectedLicence.competenceCardsNotes}
                      onChange={(e) => updateRow(selectedLicence.id, { competenceCardsNotes: e.target.value })}
                      rows={6}
                      placeholder="Competence card notes..."
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <StickyNote className="h-4 w-4 text-brand-green" />
                      <p className="text-sm font-bold">Notes about the business tax receipt</p>
                    </div>
                    <textarea
                      value={selectedLicence.businessTaxReceiptNotes}
                      onChange={(e) => updateRow(selectedLicence.id, { businessTaxReceiptNotes: e.target.value })}
                      rows={5}
                      placeholder="Business tax receipt notes..."
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>
                </div>
                </>
              )}
            </motion.section>
          </div>
        </main>
      </div>

      {deleteModalOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50"
            aria-label="Close delete modal"
            onClick={() => {
              if (isDeleting) return
              setDeleteModalOpen(false)
              setPendingDeleteId(null)
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-slate-900">Delete licence?</h3>
                    <p className="mt-1 text-sm text-slate-500">This will permanently delete the licence. This action cannot be undone.</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setDeleteModalOpen(false)
                      setPendingDeleteId(null)
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={confirmDelete}
                    className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete licence'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

