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
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'

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
  const [subcontractorName, setSubcontractorName] = useState('')
  const [weekEnding, setWeekEnding] = useState('')
  const [lines, setLines] = useState<WeeklyReportLine[]>([
    emptyWeeklyReportLine(),
    emptyWeeklyReportLine(),
    emptyWeeklyReportLine(),
  ])

  const fullName = useMemo(() => {
    if (!installer) return ''
    return `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
  }, [installer])

  const resetForm = (name = fullName) => {
    setEditingId(null)
    setSubcontractorName(name)
    setWeekEnding('')
    setLines([emptyWeeklyReportLine(), emptyWeeklyReportLine(), emptyWeeklyReportLine()])
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
    setEditingId(report.id)
    setSubcontractorName(report.subcontractorName)
    setWeekEnding(weekEndingToInputValue(report.weekEnding))
    setLines(
      normalizeWeeklyReportLines(report.lines).concat(
        report.lines.length < 2 ? [emptyWeeklyReportLine()] : []
      )
    )
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

      <main className="px-4 lg:px-6 py-6 space-y-6 max-w-5xl mx-auto">
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
          className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-8 shadow-lg backdrop-blur-sm"
        >
          <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Edit weekly report' : 'New weekly report'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Subcontractor name, week ending, and job lines
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/10">
              <Calendar className="h-6 w-6 text-brand-green" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Independent Subcontractor Name</span>
              <input
                value={subcontractorName}
                onChange={(e) => setSubcontractorName(e.target.value)}
                required
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">Week Ending</span>
              <input
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                required
                className={fieldClass}
              />
            </label>
          </div>

          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Job lines</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5 w-10">#</th>
                    <th className="px-3 py-2.5">PO #</th>
                    <th className="px-3 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Mileage</th>
                    <th className="px-3 py-2.5">Total</th>
                    <th className="px-3 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, index) => (
                    <tr key={`line-${index}`} className="bg-white">
                      <td className="px-3 py-2 text-center font-medium text-slate-500">{index + 1}</td>
                      {(['poNumber', 'customer', 'date', 'mileage', 'total'] as const).map((key) => (
                        <td key={key} className="px-2 py-1.5">
                          <input
                            type={key === 'date' ? 'date' : 'text'}
                            value={line[key]}
                            onChange={(e) => updateLine(index, key, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add row
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
                const lineCount = normalizeWeeklyReportLines(report.lines).filter(
                  (line) => line.poNumber || line.customer || line.date || line.mileage || line.total
                ).length
                return (
                  <div
                    key={report.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{report.subcontractorName}</p>
                      <p className="text-sm text-slate-500">
                        Week ending {new Date(report.weekEnding).toLocaleDateString()} · {lineCount}{' '}
                        {lineCount === 1 ? 'line' : 'lines'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                )
              })}
            </div>
          )}
        </section>
      </main>
    </IosProfileRoot>
  )
}
