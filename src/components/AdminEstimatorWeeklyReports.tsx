'use client'

import { useEffect, useState } from 'react'
import { Calendar, Loader2, FileSpreadsheet } from 'lucide-react'
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

export function AdminEstimatorWeeklyReports({ installerId }: { installerId: string }) {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/installers/${installerId}/weekly-reports`, { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || 'Failed to load weekly reports')
        if (cancelled) return
        const next = (data?.reports || []).map((report: any) => ({
          ...report,
          lines: normalizeWeeklyReportLines(report.lines),
        }))
        setReports(next)
        if (next[0]?.id) setExpandedId(next[0].id)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load weekly reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [installerId])

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-0.5">Weekly Reports</h2>
            <p className="text-sm text-slate-500">Submitted by this estimator</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {reports.length} {reports.length === 1 ? 'report' : 'reports'}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-500 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading weekly reports…
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No weekly reports submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const open = expandedId === report.id
            const lines = normalizeWeeklyReportLines(report.lines).filter(
              (line) => line.poNumber || line.customer || line.date || line.mileage || line.total
            )
            return (
              <div key={report.id} className="overflow-hidden rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : report.id)}
                  className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{report.subcontractorName}</p>
                    <p className="text-sm text-slate-500">
                      Week ending {new Date(report.weekEnding).toLocaleDateString()} · {lines.length}{' '}
                      {lines.length === 1 ? 'line' : 'lines'}
                    </p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-brand-green">
                    {open ? 'Hide' : 'View'}
                  </span>
                </button>
                {open ? (
                  <div className="overflow-x-auto border-t border-slate-200">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-white text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                          <th className="border-b border-slate-200 px-3 py-2">#</th>
                          <th className="border-b border-slate-200 px-3 py-2">PO #</th>
                          <th className="border-b border-slate-200 px-3 py-2">Customer</th>
                          <th className="border-b border-slate-200 px-3 py-2">Date</th>
                          <th className="border-b border-slate-200 px-3 py-2">Mileage</th>
                          <th className="border-b border-slate-200 px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, index) => (
                          <tr key={`${report.id}-${index}`} className="bg-white">
                            <td className="border-b border-slate-100 px-3 py-2 text-slate-500">{index + 1}</td>
                            <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-900">
                              {line.poNumber || '—'}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                              {line.customer || '—'}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                              {line.date || '—'}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                              {line.mileage || '—'}
                            </td>
                            <td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-900">
                              {line.total || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
