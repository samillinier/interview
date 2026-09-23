'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  ChevronLeft,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Trash2,
  User,
} from 'lucide-react'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { downloadExcel } from '@/lib/export-utils'
import { canAccessInvoices, canDeleteInvoices } from '@/lib/invoiceAccess'
import {
  normalizeWeeklyReportLines,
  type WeeklyReportLine,
} from '@/lib/weeklyReport'

type InvoiceRow = {
  id: string
  installerId: string
  subcontractorName: string
  weekEnding: string
  lines: WeeklyReportLine[]
  createdAt: string
  installer: {
    id: string
    firstName: string
    lastName: string
    email: string
    companyName?: string | null
    photoUrl?: string | null
  } | null
}

type EstimatorGroup = {
  installerId: string
  name: string
  email: string
  companyName: string
  invoiceCount: number
  latestWeekEnding: string
  invoices: InvoiceRow[]
}

type DateFilter = 'week' | 'month' | 'year' | 'all'

function toDateKey(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function filledLines(lines: WeeklyReportLine[]) {
  return normalizeWeeklyReportLines(lines).filter(
    (line) => line.poNumber || line.customer || line.date || line.mileage || line.total
  )
}

function estimatorName(invoice: InvoiceRow) {
  return (
    `${invoice.installer?.firstName || ''} ${invoice.installer?.lastName || ''}`.trim() ||
    invoice.subcontractorName ||
    'Estimator'
  )
}

export default function DashboardInvoicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const canDelete = canDeleteInvoices(role)

  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedInstallerId, setSelectedInstallerId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [weekValue, setWeekValue] = useState(() => new Date().toISOString().slice(0, 10))
  const [monthValue, setMonthValue] = useState(() => new Date().toISOString().slice(0, 7))
  const [yearValue, setYearValue] = useState(() => String(new Date().getUTCFullYear()))
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!canAccessInvoices(role)) {
      router.replace('/dashboard')
    }
  }, [status, role, router])

  useEffect(() => {
    if (status !== 'authenticated' || !canAccessInvoices(role)) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (dateFilter === 'week') params.set('week', weekValue)
        if (dateFilter === 'month') params.set('month', monthValue)
        if (dateFilter === 'year') params.set('year', yearValue)
        const res = await fetch(`/api/admin/invoices?${params.toString()}`, { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || 'Failed to load invoices')
        if (cancelled) return
        const next = (data?.invoices || []).map((row: any) => ({
          ...row,
          lines: normalizeWeeklyReportLines(row.lines),
        })) as InvoiceRow[]
        setInvoices(next)
        setSelectedInstallerId((current) => {
          if (!current) return null
          return next.some((row) => row.installerId === current) ? current : null
        })
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load invoices')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [status, role, search, dateFilter, weekValue, monthValue, yearValue])

  const estimators = useMemo(() => {
    const map = new Map<string, EstimatorGroup>()
    for (const invoice of invoices) {
      const existing = map.get(invoice.installerId)
      if (existing) {
        existing.invoices.push(invoice)
        existing.invoiceCount += 1
        if (new Date(invoice.weekEnding).getTime() > new Date(existing.latestWeekEnding).getTime()) {
          existing.latestWeekEnding = invoice.weekEnding
        }
      } else {
        map.set(invoice.installerId, {
          installerId: invoice.installerId,
          name: estimatorName(invoice),
          email: invoice.installer?.email || '',
          companyName: invoice.installer?.companyName || invoice.subcontractorName || '',
          invoiceCount: 1,
          latestWeekEnding: invoice.weekEnding,
          invoices: [invoice],
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [invoices])

  const selectedEstimator = useMemo(
    () => estimators.find((row) => row.installerId === selectedInstallerId) || null,
    [estimators, selectedInstallerId]
  )

  const visibleInvoices = selectedEstimator?.invoices || []

  const yearOptions = useMemo(() => {
    const years = new Set<string>([String(new Date().getUTCFullYear())])
    for (const invoice of invoices) {
      const y = toDateKey(invoice.weekEnding).slice(0, 4)
      if (y) years.add(y)
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [invoices])

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    setSearch(searchInput.trim())
    setSelectedInstallerId(null)
  }

  const handleDownloadExcel = () => {
    const source = selectedEstimator ? selectedEstimator.invoices : invoices
    const rows = source.flatMap((invoice) => {
      const lines = filledLines(invoice.lines)
      const weekEndingLabel = new Date(invoice.weekEnding).toLocaleDateString()
      const name = estimatorName(invoice)
      if (lines.length === 0) {
        return [
          {
            Estimator: name,
            Email: invoice.installer?.email || '',
            'Subcontractor Name': invoice.subcontractorName,
            'Week Ending': weekEndingLabel,
            'PO #': '',
            Customer: '',
            Date: '',
            Mileage: '',
            Total: '',
          },
        ]
      }
      return lines.map((line) => ({
        Estimator: name,
        Email: invoice.installer?.email || '',
        'Subcontractor Name': invoice.subcontractorName,
        'Week Ending': weekEndingLabel,
        'PO #': line.poNumber,
        Customer: line.customer,
        Date: line.date,
        Mileage: line.mileage,
        Total: line.total,
      }))
    })
    if (rows.length === 0) return
    const rangeHint =
      dateFilter === 'week' ? weekValue : dateFilter === 'month' ? monthValue : dateFilter === 'year' ? yearValue : 'all'
    const nameHint = selectedEstimator?.name?.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'all'
    downloadExcel(rows, `weekly-invoices-${nameHint}-${rangeHint}`)
  }

  const handleDeleteInvoice = async (invoice: InvoiceRow) => {
    if (!canDelete) return
    if (!window.confirm('Delete this weekly invoice? This cannot be undone.')) return
    setDeletingId(invoice.id)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/installers/${invoice.installerId}/weekly-reports/${invoice.id}`, {
        method: 'DELETE',
        cache: 'no-store',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to delete invoice')
      setInvoices((prev) => prev.filter((row) => row.id !== invoice.id))
      if (expandedId === invoice.id) setExpandedId(null)
      setSuccess('Weekly invoice deleted.')
    } catch (e: any) {
      setError(e?.message || 'Failed to delete invoice')
    } finally {
      setDeletingId(null)
    }
  }

  const openEstimator = (installerId: string) => {
    setSelectedInstallerId(installerId)
    setExpandedId(null)
  }

  if (status === 'loading' || (status === 'authenticated' && !canAccessInvoices(role) && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  const filterTabs: { id: DateFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar pathname={pathname || '/dashboard/corporate/invoice'} />
      <AdminMobileMenu pathname={pathname || '/dashboard/corporate/invoice'} />

      <div className={`transition-all duration-300 ${sidebarOpen ? '2xl:ml-64' : '2xl:ml-20'}`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-20 2xl:pt-6 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {selectedEstimator ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInstallerId(null)
                      setExpandedId(null)
                    }}
                    className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:text-brand-green-dark"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    All estimators
                  </button>
                ) : null}
                <h1 className="text-3xl font-bold text-slate-900 mb-1">
                  {selectedEstimator ? selectedEstimator.name : 'Invoice'}
                </h1>
                <p className="text-sm text-slate-500">
                  {selectedEstimator
                    ? `${selectedEstimator.invoiceCount} weekly ${
                        selectedEstimator.invoiceCount === 1 ? 'invoice' : 'invoices'
                      } for this estimator`
                    : 'Open an estimator to view their weekly invoices'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={(selectedEstimator ? visibleInvoices : invoices).length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Excel
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 lg:px-6 py-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <form onSubmit={handleSearch} className="flex min-w-[220px] flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search estimator"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Search
              </button>
            </form>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setDateFilter(tab.id)
                    setSelectedInstallerId(null)
                    setExpandedId(null)
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                    dateFilter === tab.id ? 'bg-brand-green text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {dateFilter === 'week' ? (
              <input
                type="date"
                value={weekValue}
                onChange={(e) => {
                  setWeekValue(e.target.value)
                  setSelectedInstallerId(null)
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              />
            ) : null}
            {dateFilter === 'month' ? (
              <input
                type="month"
                value={monthValue}
                onChange={(e) => {
                  setMonthValue(e.target.value)
                  setSelectedInstallerId(null)
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              />
            ) : null}
            {dateFilter === 'year' ? (
              <select
                value={yearValue}
                onChange={(e) => {
                  setYearValue(e.target.value)
                  setSelectedInstallerId(null)
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            ) : null}

            <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {selectedEstimator
                ? `${visibleInvoices.length} ${visibleInvoices.length === 1 ? 'invoice' : 'invoices'}`
                : `${estimators.length} ${estimators.length === 1 ? 'estimator' : 'estimators'}`}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 shadow-lg">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10">
                {selectedEstimator ? (
                  <FileSpreadsheet className="h-5 w-5 text-brand-green" />
                ) : (
                  <User className="h-5 w-5 text-brand-green" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedEstimator ? 'Weekly invoices' : 'Estimators'}
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedEstimator
                    ? selectedEstimator.email || 'Select an invoice to view details'
                    : 'Choose an estimator to open their invoices'}
                </p>
              </div>
              {selectedEstimator ? (
                <Link
                  href={`/dashboard/installers/${selectedEstimator.installerId}`}
                  className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Profile
                </Link>
              ) : null}
            </div>

            {success ? (
              <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {success}
              </p>
            ) : null}
            {error ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : !selectedEstimator ? (
              estimators.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-500">No estimators with invoices match this filter.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {estimators.map((estimator) => (
                    <button
                      key={estimator.installerId}
                      type="button"
                      onClick={() => openEstimator(estimator.installerId)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{estimator.name}</p>
                        <p className="text-sm text-slate-500 truncate">
                          {estimator.email || estimator.companyName || 'Estimator'} · Latest week{' '}
                          {new Date(estimator.latestWeekEnding).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                          {estimator.invoiceCount}{' '}
                          {estimator.invoiceCount === 1 ? 'invoice' : 'invoices'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wide text-brand-green">Open</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : visibleInvoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No invoices for this estimator in the selected range.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleInvoices.map((invoice) => {
                  const open = expandedId === invoice.id
                  const lines = filledLines(invoice.lines)
                  return (
                    <div key={invoice.id} className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(open ? null : invoice.id)}
                          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left hover:opacity-90"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{invoice.subcontractorName}</p>
                            <p className="text-sm text-slate-500">
                              Week ending {new Date(invoice.weekEnding).toLocaleDateString()} · {lines.length}{' '}
                              {lines.length === 1 ? 'job' : 'jobs'}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-brand-green">
                            {open ? 'Hide' : 'View'}
                          </span>
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              void handleDeleteInvoice(invoice)
                            }}
                            disabled={deletingId === invoice.id}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingId === invoice.id ? 'Deleting…' : 'Delete'}
                          </button>
                        ) : null}
                      </div>
                      {open ? (
                        <div className="space-y-3 border-t border-slate-200 bg-white p-4">
                          {lines.length === 0 ? (
                            <p className="text-sm text-slate-500">No job details on this invoice.</p>
                          ) : (
                            lines.map((line, index) => (
                              <div
                                key={`${invoice.id}-${index}`}
                                className="rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-4"
                              >
                                <div className="grid grid-cols-6 gap-6 items-end">
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-slate-500">Job</p>
                                    <p className="text-sm font-semibold text-slate-900">{index + 1}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="mb-1 text-xs font-medium text-slate-500">PO #</p>
                                    <p className="truncate text-sm font-medium text-slate-900">
                                      {line.poNumber || '—'}
                                    </p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="mb-1 text-xs font-medium text-slate-500">Customer</p>
                                    <p className="truncate text-sm text-slate-900">{line.customer || '—'}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="mb-1 text-xs font-medium text-slate-500">Date</p>
                                    <p className="truncate text-sm text-slate-900">{line.date || '—'}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="mb-1 text-xs font-medium text-slate-500">Mileage</p>
                                    <p className="truncate text-sm text-slate-900">{line.mileage || '—'}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="mb-1 text-xs font-medium text-slate-500">Total</p>
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                      {line.total || '—'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
