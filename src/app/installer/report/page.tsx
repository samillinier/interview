'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Plus, Trash2, Save, Calendar } from 'lucide-react'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { IosProfileRoot } from '@/components/installer-profile/IosProfileChrome'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
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

const COMPANY_ADDRESS = ['4420 E ADAMO DR. STE 203', 'TAMPA, FL 33605', 'PH: 813-867-4714']

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
          <p className="text-sm text-slate-500">Create and manage your weekly estimator reports.</p>
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
          className="overflow-hidden rounded-2xl border-2 border-slate-800 bg-white shadow-lg"
        >
          <div className="grid gap-4 border-b-2 border-slate-800 px-4 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            <div className="flex items-center gap-3">
              <Image src={logo} alt="Floor Interior Services" width={48} height={48} className="h-12 w-12 object-contain" />
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">Floor Interior</p>
                <p className="text-[11px] text-slate-500">Services</p>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Weekly Report</h2>
            </div>
            <div className="text-right text-[11px] leading-relaxed text-slate-600 sm:justify-self-end">
              {COMPANY_ADDRESS.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-4 border-b-2 border-slate-800 px-4 py-3 sm:grid-cols-[1.4fr_auto]">
            <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700 whitespace-nowrap">
                Independent Subcontractor Name
              </span>
              <input
                value={subcontractorName}
                onChange={(e) => setSubcontractorName(e.target.value)}
                required
                className="w-full rounded border border-slate-300 bg-[#FFF59D] px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Week Ending</span>
              <input
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                required
                className="rounded border border-slate-300 bg-[#FFF59D] px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-700">
                  <th className="border border-slate-800 px-2 py-2 w-10">#</th>
                  <th className="border border-slate-800 px-2 py-2">PO #</th>
                  <th className="border border-slate-800 px-2 py-2">Customer</th>
                  <th className="border border-slate-800 px-2 py-2">Date</th>
                  <th className="border border-slate-800 px-2 py-2">Mileage</th>
                  <th className="border border-slate-800 px-2 py-2">Total</th>
                  <th className="border border-slate-800 px-2 py-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={`line-${index}`}>
                    <td className="border border-slate-800 px-2 py-1 text-center font-semibold text-slate-700">
                      {index + 1}
                    </td>
                    {(['poNumber', 'customer', 'date', 'mileage', 'total'] as const).map((key) => (
                      <td key={key} className="border border-slate-800 p-0">
                        <input
                          type={key === 'date' ? 'date' : 'text'}
                          value={line[key]}
                          onChange={(e) => updateLine(index, key, e.target.value)}
                          className="w-full bg-[#FFF59D] px-2 py-2 text-sm text-slate-900 outline-none"
                        />
                      </td>
                    ))}
                    <td className="border border-slate-800 px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-800 bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
              Add row
            </button>
            <div className="flex items-center gap-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => resetForm(fullName)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel edit
                </button>
              ) : null}
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white hover:bg-brand-green-dark disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Update report' : 'Save weekly report'}
              </button>
            </div>
          </div>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-green" />
            <h3 className="text-lg font-bold text-slate-900">Your weekly reports</h3>
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
