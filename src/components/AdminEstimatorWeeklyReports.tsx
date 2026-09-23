'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Download, Loader2, FileSpreadsheet, Trash2 } from 'lucide-react'
import { downloadExcel } from '@/lib/export-utils'
import { canDeleteInvoices } from '@/lib/invoiceAccess'
import {
  normalizeWeeklyReportLines,
  type WeeklyReportLine,
} from '@/lib/weeklyReport'

type WeeklyReport = {
  id: string
  subcontractorName: string
  weekEnding: string
  lines: WeeklyReportLine[]
  createdAt: string
}

type DateFilter = 'week' | 'month' | 'year'

function toDateKey(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function monthKey(value: string | Date): string {
  return toDateKey(value).slice(0, 7)
}

function yearKey(value: string | Date): string {
  const key = toDateKey(value)
  return key ? key.slice(0, 4) : ''
}

function todayMonthInput(): string {
  return new Date().toISOString().slice(0, 7)
}

function filledLines(report: WeeklyReport) {
  return normalizeWeeklyReportLines(report.lines).filter(
    (line) => line.poNumber || line.customer || line.date || line.mileage || line.total
  )
}

export function AdminEstimatorWeeklyReports({ installerId }: { installerId: string }) {
  const { data: session } = useSession()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const canDelete = canDeleteInvoices(role)
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [weekValue, setWeekValue] = useState(() => new Date().toISOString().slice(0, 10))
  const [monthValue, setMonthValue] = useState(todayMonthInput)
  const [yearValue, setYearValue] = useState(() => String(new Date().getUTCFullYear()))

  const reload = async () => {
    const res = await fetch(`/api/installers/${installerId}/weekly-reports`, { cache: 'no-store' })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || 'Failed to load weekly invoices')
    const next = (data?.reports || []).map((report: any) => ({
      ...report,
      lines: normalizeWeeklyReportLines(report.lines),
    }))
    setReports(next)
    return next as WeeklyReport[]
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const next = await reload()
        if (cancelled) return
        if (next[0]?.id) setExpandedId(next[0].id)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load weekly invoices')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [installerId])

  const handleDelete = async (reportId: string) => {
    if (!canDelete) return
    if (!window.confirm('Delete this weekly invoice? This cannot be undone.')) return
    setDeletingId(reportId)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/installers/${installerId}/weekly-reports/${reportId}`, {
        method: 'DELETE',
        cache: 'no-store',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to delete invoice')
      setReports((prev) => prev.filter((report) => report.id !== reportId))
      if (expandedId === reportId) setExpandedId(null)
      setSuccess('Weekly invoice deleted.')
    } catch (e: any) {
      setError(e?.message || 'Failed to delete invoice')
    } finally {
      setDeletingId(null)
    }
  }

  const yearOptions = useMemo(() => {
    const years = new Set<string>([String(new Date().getUTCFullYear())])
    for (const report of reports) {
      const y = yearKey(report.weekEnding)
      if (y) years.add(y)
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [reports])

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (dateFilter === 'week') return toDateKey(report.weekEnding) === weekValue
      if (dateFilter === 'month') return monthKey(report.weekEnding) === monthValue
      return yearKey(report.weekEnding) === yearValue
    })
  }, [reports, dateFilter, weekValue, monthValue, yearValue])

  const handleDownloadExcel = () => {
    const rows = filteredReports.flatMap((report) => {
      const lines = filledLines(report)
      const weekEndingLabel = new Date(report.weekEnding).toLocaleDateString()
      if (lines.length === 0) {
        return [
          {
            'Subcontractor Name': report.subcontractorName,
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
        'Subcontractor Name': report.subcontractorName,
        'Week Ending': weekEndingLabel,
        'PO #': line.poNumber,
        Customer: line.customer,
        Date: line.date,
        Mileage: line.mileage,
        Total: line.total,
      }))
    })

    if (rows.length === 0) return

    const nameHint =
      filteredReports[0]?.subcontractorName?.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'estimator'
    const rangeHint =
      dateFilter === 'week' ? weekValue : dateFilter === 'month' ? monthValue : yearValue
    downloadExcel(rows, `weekly-invoices-${nameHint}-${rangeHint}`)
  }

  const filterTabs: { id: DateFilter; label: string }[] = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-0.5">Weekly Invoices</h2>
            <p className="text-sm text-slate-500">Submitted by this estimator</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadExcel}
          disabled={filteredReports.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Download Excel
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDateFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                dateFilter === tab.id
                  ? 'bg-brand-green text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {dateFilter === 'week' ? (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Week ending</span>
            <input
              type="date"
              value={weekValue}
              onChange={(e) => setWeekValue(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
            />
          </label>
        ) : null}

        {dateFilter === 'month' ? (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Month</span>
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
            />
          </label>
        ) : null}

        {dateFilter === 'year' ? (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Year</span>
            <select
              value={yearValue}
              onChange={(e) => setYearValue(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
          {filteredReports.length} {filteredReports.length === 1 ? 'invoice' : 'invoices'}
        </span>
      </div>

      {success ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-500 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading weekly invoices…
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No weekly invoices submitted yet.</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No invoices match this {dateFilter} filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const open = expandedId === report.id
            const lines = filledLines(report)
            return (
              <div key={report.id} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : report.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left hover:opacity-90"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{report.subcontractorName}</p>
                      <p className="text-sm text-slate-500">
                        Week ending {new Date(report.weekEnding).toLocaleDateString()} · {lines.length}{' '}
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
                        void handleDelete(report.id)
                      }}
                      disabled={deletingId === report.id}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === report.id ? 'Deleting…' : 'Delete'}
                    </button>
                  ) : null}
                </div>
                {open ? (
                  <div className="space-y-3 border-t border-slate-200 bg-white p-4">
                    {lines.length === 0 ? (
                      <p className="text-sm text-slate-500">No job details on this report.</p>
                    ) : (
                      lines.map((line, index) => (
                        <div
                          key={`${report.id}-${index}`}
                          className="rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-4"
                        >
                          <div className="grid grid-cols-6 gap-6 items-end">
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Job</p>
                              <p className="text-sm font-semibold text-slate-900">{index + 1}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-500 mb-1">PO #</p>
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {line.poNumber || '—'}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-500 mb-1">Customer</p>
                              <p className="text-sm text-slate-900 truncate">{line.customer || '—'}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-500 mb-1">Date</p>
                              <p className="text-sm text-slate-900 truncate">{line.date || '—'}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-500 mb-1">Mileage</p>
                              <p className="text-sm text-slate-900 truncate">{line.mileage || '—'}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-500 mb-1">Total</p>
                              <p className="text-sm font-semibold text-slate-900 truncate">
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
  )
}
