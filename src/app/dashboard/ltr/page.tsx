'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  Settings,
  User,
  LogOut,
  StickyNote,
  ShieldAlert,
  FileCheck,
  Activity,
  Building2,
  ClipboardList,
  ClipboardCheck,
  Upload,
  Loader2,
  X,
  FileText,
  Megaphone,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type Batch = {
  id: string
  createdAt: string
  fileName: string | null
  rowCount: number
  uploadedByEmail: string | null
}

type SummaryRow = {
  workroom: string
  companyName: string
  installerName: string
  surveys: number
}

type SurveyDetailRow = {
  id: string
  surveyDate: string | null
  surveyComment: string | null
  ltrScore: number | null
  customer: string | null
  poNumber: string | null
  woNumber: string | null
  laborCategory: string | null
  region: string | null
  storeName: string | null
  craftScore: number | null
  professionalScore: number | null
  homeImprovementScore: number | null
  projectValueScore: number | null
  installerKnowledgeScore: number | null
  timeTaken: string | null
}

function formatSurveyDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function avgScore(rows: SurveyDetailRow[], pick: (r: SurveyDetailRow) => number | null | undefined): number | null {
  const nums = rows.map(pick).filter((x): x is number => typeof x === 'number' && !Number.isNaN(x))
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function ScorePill({ value }: { value: number | null }) {
  if (value == null) return null
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      {value.toFixed(1)}
    </span>
  )
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">{label}</p>
      <div className="text-xs font-semibold text-slate-900 leading-snug">{children}</div>
    </div>
  )
}

function LtrDetailModalContent({ rows, context }: { rows: SurveyDetailRow[]; context: SummaryRow }) {
  const first = rows[0]!
  const storeDisplay =
    rows.find((r) => (r.storeName || '').trim())?.storeName?.trim() || (first.region || '').trim() || ''
  const customers = Array.from(
    new Set(rows.map((r) => r.customer).filter((c): c is string => Boolean((c || '').trim())))
  )
  const customerHeader =
    customers.length === 0 ? '' : customers.length === 1 ? customers[0]! : `${customers.length} customers`
  const laborDisplay = (first.laborCategory || '').trim() || ''

  const ltrAvg = avgScore(rows, (r) => r.ltrScore)

  return (
    <div className="px-4 pb-4 pt-1">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <FieldBlock label="Store name">{storeDisplay}</FieldBlock>
        <FieldBlock label="Labor category">{laborDisplay}</FieldBlock>
        <FieldBlock label="Company name">{context.companyName === '—' ? '' : context.companyName}</FieldBlock>
        <FieldBlock label="Installer name">{context.installerName === '—' ? '' : context.installerName}</FieldBlock>
        <FieldBlock label="Customer name">{customerHeader}</FieldBlock>
        <div className="flex flex-col justify-end">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">LTR avg</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums leading-none">
            {ltrAvg != null ? ltrAvg.toFixed(1) : ''}
          </p>
        </div>
      </div>

      <hr className="my-3 border-slate-200" />

      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
        Surveys ({rows.length})
      </h3>
      <div className="space-y-3">
        {rows.map((d) => (
          <div key={d.id} className="rounded-lg border border-slate-200/90 bg-slate-50/40 p-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
              <FieldBlock label="Survey date">{formatSurveyDate(d.surveyDate)}</FieldBlock>
              <FieldBlock label="Customer name">{(d.customer || '').trim()}</FieldBlock>
              <FieldBlock label="LTR score">
                <ScorePill value={d.ltrScore} />
              </FieldBlock>
            </div>
            {(d.surveyComment || '').trim() ? (
              <>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mt-3 mb-1">Survey comment</p>
                <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {(d.surveyComment || '').trim()}
                </div>
              </>
            ) : null}
            {(d.poNumber || d.woNumber || d.region) ? (
              <p className="mt-2 text-[10px] text-slate-500">
                {[d.poNumber && `PO ${d.poNumber}`, d.woNumber && `WO ${d.woNumber}`, d.region && `Region ${d.region}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LtrPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailContext, setDetailContext] = useState<SummaryRow | null>(null)
  const [detailRows, setDetailRows] = useState<SurveyDetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [sendingToInstaller, setSendingToInstaller] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!detailOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailOpen])

  const loadBatches = useCallback(async () => {
    const res = await fetch('/api/admin/ltr/batches', { cache: 'no-store' })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const hint = [data?.error, data?.details].filter(Boolean).join(': ')
      throw new Error(hint || 'Could not load uploads')
    }
    const list = (data?.batches || []) as Batch[]
    setBatches(list)
    setSelectedBatchId((prev) => {
      if (prev && list.some((b) => b.id === prev)) return prev
      return list[0]?.id || ''
    })
    return list
  }, [])

  const openSurveyDetails = useCallback(
    async (row: SummaryRow) => {
      if (!selectedBatchId) return
      setDetailContext(row)
      setDetailOpen(true)
      setDetailLoading(true)
      setDetailError(null)
      setDetailRows([])
      try {
        const q = new URLSearchParams({
          batchId: selectedBatchId,
          workroom: row.workroom,
          company: row.companyName,
          installer: row.installerName,
        })
        const res = await fetch(`/api/admin/ltr/details?${q}`, { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const msg = [data?.error, data?.details].filter(Boolean).join(': ')
          throw new Error(msg || 'Could not load surveys')
        }
        setDetailRows((data?.rows || []) as SurveyDetailRow[])
      } catch (e: any) {
        setDetailError(e?.message || 'Failed to load survey details')
      } finally {
        setDetailLoading(false)
      }
    },
    [selectedBatchId]
  )

  const sendToInstaller = useCallback(async () => {
    if (!selectedBatchId || !detailContext) return
    setSendingToInstaller(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/ltr/send-to-installer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatchId,
          workroom: detailContext.workroom,
          company: detailContext.companyName,
          installer: detailContext.installerName,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.details || data?.error || `Failed (${res.status})`)
      setMessage({ type: 'ok', text: `Sent survey to ${detailContext.installerName}.` })
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || 'Failed to send survey' })
    } finally {
      setSendingToInstaller(false)
    }
  }, [detailContext, selectedBatchId])

  const sendAllForBatch = useCallback(async () => {
    if (!selectedBatchId) return
    setSendingAll(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/ltr/send-to-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: selectedBatchId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.details || data?.error || `Failed (${res.status})`)
      setMessage({ type: 'ok', text: `Sent ${data?.sent ?? 0} surveys to installers (${data?.skipped ?? 0} skipped).` })
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || 'Failed to send to all' })
    } finally {
      setSendingAll(false)
    }
  }, [selectedBatchId])

  const deleteSelectedBatch = useCallback(async () => {
    if (!selectedBatchId) return
    const ok = window.confirm(
      'Remove this upload from the admin Survey list? Surveys already sent to installers stay in their portal with full details.'
    )
    if (!ok) return
    setMessage(null)
    try {
      const res = await fetch('/api/admin/ltr/batches/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: selectedBatchId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.details || data?.error || `Failed (${res.status})`)
      setMessage({
        type: 'ok',
        text: `Removed “${data?.deleted?.fileName || 'upload'}” from your list (${data?.deleted?.rowCount ?? 0} rows). Installer copies are unchanged.`,
      })
      const list = await loadBatches()
      setSelectedBatchId(list?.[0]?.id || '')
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || 'Failed to delete upload' })
    }
  }, [selectedBatchId, loadBatches])

  const loadSummary = useCallback(async (batchId: string) => {
    if (!batchId) {
      setSummaryRows([])
      return
    }
    setSummaryLoading(true)
    try {
      const res = await fetch(`/api/admin/ltr/summary?batchId=${encodeURIComponent(batchId)}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Could not load summary')
      setSummaryRows((data?.rows || []) as SummaryRow[])
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || 'Failed to load summary' })
      setSummaryRows([])
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String((session?.user as any)?.role || '').toUpperCase())) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await loadBatches()
      } catch (e: any) {
        if (!cancelled) setMessage({ type: 'err', text: e?.message || 'Failed to load LTR uploads' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionStatus, session, loadBatches])

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String((session?.user as any)?.role || '').toUpperCase())) return
    if (selectedBatchId) void loadSummary(selectedBatchId)
  }, [selectedBatchId, sessionStatus, session, loadSummary])

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    else if (sessionStatus === 'authenticated' && !['ADMIN', 'SUPER_ADMIN'].includes(String((session?.user as any)?.role || '').toUpperCase())) {
      router.push('/dashboard')
    }
  }, [sessionStatus, session, router])

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    if (!['ADMIN', 'SUPER_ADMIN'].includes(String((session?.user as any)?.role || '').toUpperCase())) return
    const load = async () => {
      try {
        const [a, s] = await Promise.all([
          fetch('/api/admin/change-requests/count', { cache: 'no-store' }),
          fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' }),
        ])
        if (a.ok) {
          const d = await a.json().catch(() => null)
          setPendingApprovalsCount(Number(d?.count ?? 0) || 0)
        }
        if (s.ok) {
          const d = await s.json().catch(() => null)
          setSignatureNotSignedCount(Number(d?.count ?? 0) || 0)
        }
      } catch {
        // ignore
      }
    }
    void load()
  }, [sessionStatus, session])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/ltr/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.details || data?.error || `Upload failed (${res.status})`)
      setMessage({ type: 'ok', text: `Imported ${data.rowCount} rows from ${data.fileName || 'file'}.` })
      const list = await loadBatches()
      if (data.batchId) setSelectedBatchId(data.batchId)
      else if (list?.[0]?.id) setSelectedBatchId(list[0].id)
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message || 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!['ADMIN', 'SUPER_ADMIN'].includes(String((session?.user as any)?.role || '').toUpperCase())) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} sidebarOpen={sidebarOpen} />

      <AdminMobileMenu pathname={pathname} />

      <main className="lg:ml-64 flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="bg-white border-b border-slate-200 pr-4 pl-16 lg:px-6 pt-16 lg:pt-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-brand-green/10 rounded-xl">
                  <ClipboardList className="w-6 h-6 text-brand-green" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Survey</h1>
              </div>
              <p className="text-slate-600 ml-14 max-w-2xl">
                Upload the weekly LTR Excel export. We store each survey row and show survey counts by workroom, company,
                and installer.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="hidden lg:inline-flex text-sm px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                {sidebarOpen ? 'Collapse menu' : 'Expand menu'}
              </button>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl font-medium shadow-sm hover:bg-brand-green-dark cursor-pointer disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploading ? 'Uploading…' : 'Upload Excel'}</span>
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={uploading} onChange={handleFile} />
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {message ? (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                message.type === 'ok' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-5 flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Report upload</label>
              <select
                className="w-full max-w-md border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              >
                {batches.length === 0 ? (
                  <option value="">No uploads yet</option>
                ) : (
                  batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {new Date(b.createdAt).toLocaleString()} — {b.fileName || 'file'} ({b.rowCount} rows)
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!selectedBatchId || sendingAll}
                onClick={() => void sendAllForBatch()}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                {sendingAll ? 'Sending…' : 'Send to all'}
              </button>
              <button
                type="button"
                disabled={!selectedBatchId}
                onClick={() => void deleteSelectedBatch()}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-red-200 text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                Drop
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Survey counts</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Grouped by workroom, company, and installer. Click a number in <strong className="text-slate-700">Surveys</strong> to
                open the underlying survey rows.
              </p>
            </div>
            <div className="overflow-x-auto">
              {summaryLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
                </div>
              ) : summaryRows.length === 0 ? (
                <p className="text-center text-slate-500 py-16 px-4">No rows for this upload. Import an Excel file to populate this table.</p>
              ) : (
                <table className="w-full min-w-[720px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="text-left font-bold uppercase tracking-wide text-xs px-5 py-3.5 border-b border-slate-800">
                        Workroom
                      </th>
                      <th className="text-left font-bold uppercase tracking-wide text-xs px-5 py-3.5 border-b border-slate-800">
                        Company name
                      </th>
                      <th className="text-left font-bold uppercase tracking-wide text-xs px-5 py-3.5 border-b border-slate-800">
                        Installer name
                      </th>
                      <th className="text-right font-bold uppercase tracking-wide text-xs px-5 py-3.5 border-b border-slate-800 w-36">
                        Surveys
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryRows.map((r, i) => (
                      <tr
                        key={`${r.workroom}-${r.companyName}-${r.installerName}-${i}`}
                        className="bg-white hover:bg-slate-50/80 cursor-pointer"
                        onClick={() => void openSurveyDetails(r)}
                      >
                        <td className="px-5 py-3.5 text-slate-900 font-medium">{r.workroom}</td>
                        <td className="px-5 py-3.5 text-slate-800">{r.companyName}</td>
                        <td className="px-5 py-3.5 text-slate-800">{r.installerName}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => void openSurveyDetails(r)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="tabular-nums font-semibold text-brand-green hover:text-brand-green-dark hover:underline underline-offset-2 rounded-md px-2 py-1 -mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                            aria-label={`View ${r.surveys} survey${r.surveys === 1 ? '' : 's'} for ${r.installerName} at ${r.workroom}`}
                          >
                            {r.surveys}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {mounted && detailOpen && detailContext
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-3 sm:p-4 bg-black/45 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ltr-detail-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) setDetailOpen(false)
              }}
            >
              <div
                className="bg-white rounded-xl shadow-xl border border-slate-200/90 w-full max-w-2xl max-h-[min(88vh,720px)] flex flex-col overflow-hidden sm:max-h-[82vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-slate-50/80">
                  <h2 id="ltr-detail-title" className="text-sm font-semibold text-slate-900 truncate pr-2">
                    Survey details – {detailContext.workroom}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={sendingToInstaller}
                      onClick={() => void sendToInstaller()}
                      className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-green text-white hover:bg-brand-green-dark disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {sendingToInstaller ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Send to installer
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailOpen(false)}
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200/80 hover:text-slate-800"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
                  {detailLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 text-brand-green animate-spin" />
                    </div>
                  ) : detailError ? (
                    <p className="text-center text-red-600 text-sm py-8 px-4">{detailError}</p>
                  ) : detailRows.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-8 px-4">No matching survey rows.</p>
                  ) : (
                    <LtrDetailModalContent rows={detailRows} context={detailContext} />
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
