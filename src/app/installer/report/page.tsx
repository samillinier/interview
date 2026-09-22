'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2, Save, Calendar } from 'lucide-react'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { IosProfileRoot } from '@/components/installer-profile/IosProfileChrome'
import {
  emptyWeeklyReportLine,
  normalizeWeeklyReportLines,
  weekEndingToInputValue,
  type WeeklyReportLine,
} from '@/lib/weeklyReport'

type WeeklyReport = {
  id: string
  subcontractorName: string
  weekEnding: string
  lines: WeeklyReportLine[]
  createdAt: string
  updatedAt: string
}

type InstallerProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
  accountType?: string | null
}

const fieldClass =
  'w-full max-w-full min-w-0 box-border rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'

const dateFieldClass = `${fieldClass} appearance-none [-webkit-appearance:none] [&::-webkit-date-and-time-value]:text-left`

export default function EstimatorWeeklyReportPage() {
  const router = useRouter()
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [token, setToken] = useState('')
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [subcontractorName, setSubcontractorName] = useState('')
  const [weekEnding, setWeekEnding] = useState('')
  const [lines, setLines] = useState<WeeklyReportLine[]>([emptyWeeklyReportLine()])

  const fullName = useMemo(() => {
    if (!installer) return ''
    return `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
  }, [installer])

  const resetForm = (name = fullName) => {
    setEditingId(null)
    setSubcontractorName(name)
    setWeekEnding('')
    setLines([emptyWeeklyReportLine()])
  }

  const startView = (reportId: string) => {
    setViewingId((prev) => (prev === reportId ? null : reportId))
  }

  const loadReports = async (installerId: string, authToken: string) => {
    const res = await fetch(`/api/installers/${installerId}/weekly-reports`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || 'Failed to load weekly reports')
    setReports(
      (data?.reports || []).map((report: any) => ({
        ...report,
        lines: normalizeWeeklyReportLines(report.lines),
      }))
    )
  }

  useEffect(() => {
    const boot = async () => {
      const authToken = localStorage.getItem('installerToken')
      if (!authToken) {
        router.push('/installer/login')
        return
      }
      setToken(authToken)

      try {
        const verifyResponse = await fetch('/api/installers/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: authToken }),
        })
        const verifyData = await verifyResponse.json().catch(() => null)
        if (!verifyData?.success || !verifyData?.installerId) {
          localStorage.removeItem('installerToken')
          localStorage.removeItem('installerId')
          router.push('/installer/login')
          return
        }

        const installerId = String(verifyData.installerId)
        localStorage.setItem('installerId', installerId)

        const profileResponse = await fetch(`/api/installers/${installerId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: 'no-store',
        })
        const profileData = await profileResponse.json().catch(() => null)
        if (!profileResponse.ok || !profileData?.installer) {
          throw new Error(profileData?.error || 'Failed to load profile')
        }

        const profile = profileData.installer as InstallerProfile
        if (profile.accountType !== 'estimator') {
          router.replace('/installer/profile')
          return
        }

        setInstaller(profile)
        const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
        setSubcontractorName(name)
        await loadReports(installerId, authToken)
      } catch (e: any) {
        setError(e?.message || 'Failed to load weekly reports')
      } finally {
        setIsLoading(false)
      }
    }

    void boot()
  }, [router])

  const updateLine = (index: number, key: keyof WeeklyReportLine, value: string) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)))
  }

  const addLine = () => setLines((prev) => [...prev, emptyWeeklyReportLine()])
  const removeLine = (index: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const startEdit = (report: WeeklyReport) => {
    setViewingId(null)
    setEditingId(report.id)
    setSubcontractorName(report.subcontractorName)
    setWeekEnding(weekEndingToInputValue(report.weekEnding))
    const nextLines = normalizeWeeklyReportLines(report.lines)
    setLines(nextLines.length > 0 ? nextLines : [emptyWeeklyReportLine()])
    setSuccess('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!installer || !token) return
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        subcontractorName: subcontractorName.trim(),
        weekEnding,
        lines,
      }
      const url = editingId
        ? `/api/installers/${installer.id}/weekly-reports/${editingId}`
        : `/api/installers/${installer.id}/weekly-reports`
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to save weekly report')

      await loadReports(installer.id, token)
      setSuccess(editingId ? 'Weekly report updated.' : 'Weekly report created.')
      resetForm(fullName)
    } catch (e: any) {
      setError(e?.message || 'Failed to save weekly report')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (reportId: string) => {
    if (!installer || !token) return
    if (!window.confirm('Delete this weekly report?')) return
    setError('')
    try {
      const res = await fetch(`/api/installers/${installer.id}/weekly-reports/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to delete report')
      await loadReports(installer.id, token)
      if (editingId === reportId) resetForm(fullName)
      setSuccess('Weekly report deleted.')
    } catch (e: any) {
      setError(e?.message || 'Failed to delete report')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  return (
    <IosProfileRoot>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
        <div className="px-4 lg:px-6 pt-20 2xl:pt-6 pb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Weekly Report</h1>
          <p className="text-sm text-slate-500">Create and manage your weekly submissions.</p>
        </div>
      </header>

      <main className="px-4 lg:px-6 py-6 space-y-6 max-w-5xl mx-auto min-w-0 overflow-x-hidden">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-8 shadow-lg backdrop-blur-sm min-w-0 overflow-hidden"
        >
          <div className="grid gap-4 sm:grid-cols-2 mb-6 min-w-0">
            <label className="flex flex-col gap-1.5 sm:col-span-2 min-w-0">
              <input
                value={subcontractorName}
                onChange={(e) => setSubcontractorName(e.target.value)}
                required
                className={fieldClass}
                placeholder="Independent subcontractor name"
                aria-label="Independent subcontractor name"
              />
            </label>
            <label className="flex flex-col gap-1.5 min-w-0 overflow-hidden">
              <input
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                required
                className={dateFieldClass}
                aria-label="Week ending"
              />
            </label>
          </div>

          <div className="mb-3 min-w-0">
            <div className="space-y-4">
              {lines.map((line, index) => (
                <div
                  key={`line-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 min-w-0 overflow-hidden"
                >
                  {lines.length > 1 ? (
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <div className="grid gap-4 min-w-0">
                    <label className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-slate-700">PO #</span>
                      <input
                        value={line.poNumber}
                        onChange={(e) => updateLine(index, 'poNumber', e.target.value)}
                        className={fieldClass}
                        placeholder="Purchase order number"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-slate-700">Customer</span>
                      <input
                        value={line.customer}
                        onChange={(e) => updateLine(index, 'customer', e.target.value)}
                        className={fieldClass}
                        placeholder="Customer name"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 min-w-0 overflow-hidden">
                      <span className="text-sm font-semibold text-slate-700">Date</span>
                      <input
                        type="date"
                        value={line.date}
                        onChange={(e) => updateLine(index, 'date', e.target.value)}
                        className={dateFieldClass}
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-slate-700">Mileage</span>
                        <input
                          value={line.mileage}
                          onChange={(e) => updateLine(index, 'mileage', e.target.value)}
                          className={fieldClass}
                          placeholder="0"
                          inputMode="decimal"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-slate-700">Total</span>
                        <input
                          value={line.total}
                          onChange={(e) => updateLine(index, 'total', e.target.value)}
                          className={fieldClass}
                          placeholder="0.00"
                          inputMode="decimal"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add another job
            </button>
            <div className="flex items-center gap-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => resetForm(fullName)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel edit
                </button>
              ) : null}
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Update report' : 'Save weekly report'}
              </button>
            </div>
          </div>
        </form>

        <section className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-8 shadow-lg backdrop-blur-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-5">
            <Calendar className="h-5 w-5 text-brand-green" />
            <h3 className="text-xl font-bold text-slate-900">Your weekly reports</h3>
          </div>
          {reports.length === 0 ? (
            <p className="text-sm text-slate-500">No weekly reports yet. Create your first one above.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const lines = normalizeWeeklyReportLines(report.lines).filter(
                  (line) => line.poNumber || line.customer || line.date || line.mileage || line.total
                )
                const isViewing = viewingId === report.id
                return (
                  <div
                    key={report.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{report.subcontractorName}</p>
                        <p className="text-sm text-slate-500">
                          Week ending {new Date(report.weekEnding).toLocaleDateString()} ·{' '}
                          {lines.length} {lines.length === 1 ? 'job' : 'jobs'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startView(report.id)}
                          className="rounded-lg border border-brand-green/30 bg-white px-3 py-1.5 text-sm font-semibold text-brand-green hover:bg-brand-green/5"
                        >
                          {isViewing ? 'Hide' : 'View'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(report)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(report.id)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {isViewing ? (
                      <div className="space-y-3 border-t border-slate-200 bg-white p-4">
                        {lines.length === 0 ? (
                          <p className="text-sm text-slate-500">No job details on this report.</p>
                        ) : (
                          lines.map((line, index) => (
                            <div
                              key={`${report.id}-view-${index}`}
                              className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4"
                            >
                              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
                                  <p className="text-sm text-slate-900 truncate">
                                    {line.customer || '—'}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-slate-500 mb-1">Date</p>
                                  <p className="text-sm text-slate-900 truncate">{line.date || '—'}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-slate-500 mb-1">Mileage</p>
                                  <p className="text-sm text-slate-900 truncate">
                                    {line.mileage || '—'}
                                  </p>
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
        </section>
      </main>
    </IosProfileRoot>
  )
}
