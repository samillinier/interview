'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  SlidersHorizontal,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  X,
  Loader2,
  User,
  Clock,
} from 'lucide-react'
import { MATRIX_ROW_DEFS, type MatrixRowId } from '@/lib/onboardingMatrix'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import Image from 'next/image'

/** Report table matrix columns — compliance lives on Tracking matrix only. */
const REPORT_MATRIX_ROW_DEFS = MATRIX_ROW_DEFS.filter((d) => d.id !== 'compliance')

function getInstallerAvatarRing(status?: string | null) {
  const s = String(status || '').toLowerCase()
  if (s === 'active') return 'ring-[3px] ring-brand-green'
  if (s === 'deactive' || s === 'inactive' || s === 'deactivated') return 'ring-[3px] ring-slate-900'
  if (s === 'passed' || s === 'qualified') return 'ring-[3px] ring-blue-500'
  if (s === 'failed' || s === 'notqualified' || s === 'not_qualified' || s === 'not qualified') return 'ring-[3px] ring-red-500'
  if (s === 'pending') return 'ring-[3px] ring-yellow-500'
  return 'ring-[3px] ring-slate-300'
}

function getInstallerStatusCircle(status?: string | null) {
  const s = String(status || '').toLowerCase()
  if (!s) return null
  if (s === 'active') return { label: 'Active', bg: 'bg-brand-green', Icon: CheckCircle2 }
  if (s === 'passed' || s === 'qualified') return { label: 'Qualified', bg: 'bg-blue-500', Icon: CheckCircle2 }
  if (s === 'pending') return { label: 'Pending', bg: 'bg-yellow-500', Icon: Clock }
  if (s === 'failed' || s === 'notqualified' || s === 'not_qualified' || s === 'not qualified')
    return { label: 'Not Qualified', bg: 'bg-red-500', Icon: XCircle }
  if (s === 'deactive' || s === 'inactive' || s === 'deactivated')
    return { label: 'Deactive', bg: 'bg-slate-900', Icon: XCircle }
  return { label: 'Unknown', bg: 'bg-slate-400', Icon: AlertCircle }
}

function getComplianceStatusBadge(complianceStatus: string | null | undefined): { label: string; bg: string; textColor: string } | null {
  const s = String(complianceStatus || '').trim().toUpperCase()
  if (s === 'COMPLIANT') return { label: 'Compliant', bg: 'bg-emerald-100', textColor: 'text-emerald-800' }
  if (s === 'NOT_COMPLIANT') return { label: 'Not Compliant', bg: 'bg-red-100', textColor: 'text-red-800' }
  if (s === 'IN_PROGRESS') return { label: 'In Progress', bg: 'bg-amber-100', textColor: 'text-amber-800' }
  return null
}

type MatrixCell = { state: string; detail?: string }

type ReportInstaller = {
  reportTrackingId: string
  id: string
  firstName: string
  lastName: string
  email: string
  companyName: string | null
  photoUrl: string | null
  notes: string | null
  status: string
  complianceStatus: string | null
  cells: Record<MatrixRowId, MatrixCell>
}

type InstallerSearchResult = {
  id: string
  firstName: string
  lastName: string
  email: string
  companyName: string | null
}

type ReportPayload = {
  rows: Array<{ id: string; label: string; subtitle: string }>
  installers: ReportInstaller[]
}

export default function ReportPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()

  const [reportData, setReportData] = useState<ReportPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddInstallerModal, setShowAddInstallerModal] = useState(false)
  const [addInstallerSaving, setAddInstallerSaving] = useState(false)
  const [installerSearchQuery, setInstallerSearchQuery] = useState('')
  const [installerSearchResults, setInstallerSearchResults] = useState<InstallerSearchResult[]>([])
  const [installerSearchLoading, setInstallerSearchLoading] = useState(false)
  const [installerSearchError, setInstallerSearchError] = useState('')
  const [showInstallerDropdown, setShowInstallerDropdown] = useState(false)
  const [selectedInstallerId, setSelectedInstallerId] = useState('')
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null)
  const [reportNotePicker, setReportNotePicker] = useState<{
    reportTrackingId: string
    note: string
    readOnly: boolean
    left: number
    top: number
  } | null>(null)
  const [reportNoteDraft, setReportNoteDraft] = useState('')
  const [reportNoteSaving, setReportNoteSaving] = useState(false)
  const installerSearchRef = useRef<HTMLDivElement>(null)

  const canEditReport =
    sessionStatus === 'authenticated' &&
    (() => {
      const role = String((session?.user as any)?.role || '').toUpperCase()
      return role === 'ADMIN' || role === 'SUPER_ADMIN'
    })()

  const canReadReportNotes =
    sessionStatus === 'authenticated' &&
    (() => {
      const role = String((session?.user as any)?.role || '').toUpperCase()
      return role === 'ADMIN' || role === 'MODERATOR' || role === 'SUPER_ADMIN'
    })()

  // Column visibility — persisted server-side via API
  const [visibleColumns, setVisibleColumns] = useState<Set<MatrixRowId>>(
    () => new Set(REPORT_MATRIX_ROW_DEFS.map((d) => d.id))
  )
  const [columnsLoaded, setColumnsLoaded] = useState(false)
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false)
  const columnsDropdownRef = useRef<HTMLDivElement>(null)

  // Close column dropdown on outside click
  useEffect(() => {
    if (!columnsDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
        setColumnsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [columnsDropdownOpen])

  const toggleColumn = (id: MatrixRowId) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  // Persist column visibility to server
  const saveColumns = useCallback(async (cols: Set<MatrixRowId>) => {
    try {
      await fetch('/api/admin/report', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleColumns: Array.from(cols) }),
      })
    } catch { /* ignore */ }
  }, [])

  // Save columns whenever they change (after initial load)
  useEffect(() => {
    if (!columnsLoaded) return
    saveColumns(visibleColumns)
  }, [visibleColumns, columnsLoaded, saveColumns])

  const visibleDefs = useMemo(
    () => REPORT_MATRIX_ROW_DEFS.filter((d) => visibleColumns.has(d.id)),
    [visibleColumns]
  )

  /** Installer + matrix cols fixed; notes fills remaining row width (matrix stays pinned right). */
  const reportTableLayout = useMemo(() => {
    const matrixColPx = 52
    const installerColPx = 200
    const hiddenCount = REPORT_MATRIX_ROW_DEFS.length - visibleDefs.length
    const notesMinPx = 180
    const lineClamp = hiddenCount >= 6 ? 8 : hiddenCount >= 3 ? 6 : 5
    return { installerColPx, notesMinPx, matrixColPx, lineClamp }
  }, [visibleDefs.length])

  // Auth check
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
    } else if (sessionStatus === 'authenticated') {
      const role = String((session?.user as any)?.role || '').toUpperCase()
      const canView = role === 'ADMIN' || role === 'MODERATOR' || role === 'SUPER_ADMIN'
      if (!canView) router.push('/dashboard')
    }
  }, [sessionStatus, session, router])

  const loadReport = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/report')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load report')
      setReportData(data)
      // Hydrate column visibility from server
      if (!columnsLoaded) {
        if (Array.isArray(data.columnVisibility) && data.columnVisibility.length > 0) {
          setVisibleColumns(new Set(data.columnVisibility as MatrixRowId[]))
        }
        setColumnsLoaded(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const role = String((session?.user as any)?.role || '').toUpperCase()
      if (role === 'ADMIN' || role === 'MODERATOR' || role === 'SUPER_ADMIN') {
        loadReport()
      }
    }
  }, [sessionStatus])

  useEffect(() => {
    if (!showInstallerDropdown) return
    const handler = (e: MouseEvent) => {
      if (installerSearchRef.current && !installerSearchRef.current.contains(e.target as Node)) {
        setShowInstallerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showInstallerDropdown])

  useEffect(() => {
    if (!showAddInstallerModal) return
    const q = installerSearchQuery.trim()
    if (!q || selectedInstallerId) {
      setInstallerSearchResults([])
      setInstallerSearchError('')
      return
    }
    const t = setTimeout(async () => {
      try {
        setInstallerSearchLoading(true)
        setInstallerSearchError('')
        const params = new URLSearchParams({ limit: '20', search: q })
        const res = await fetch(`/api/installers?${params.toString()}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setInstallerSearchResults([])
          setInstallerSearchError(data?.error || 'Search failed')
          return
        }
        const onReport = new Set((reportData?.installers || []).map((i) => i.id))
        setInstallerSearchResults(
          (Array.isArray(data?.installers) ? data.installers : []).filter(
            (i: InstallerSearchResult) => !onReport.has(i.id)
          )
        )
      } catch {
        setInstallerSearchResults([])
        setInstallerSearchError('Search failed')
      } finally {
        setInstallerSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [installerSearchQuery, showAddInstallerModal, selectedInstallerId, reportData?.installers])

  const handleAddInstaller = async () => {
    if (!selectedInstallerId) return
    setAddInstallerSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/report/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installerId: selectedInstallerId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to add installer')
      setShowAddInstallerModal(false)
      setInstallerSearchQuery('')
      setSelectedInstallerId('')
      setInstallerSearchResults([])
      await loadReport()
    } catch (err: any) {
      setError(err.message || 'Failed to add installer')
    } finally {
      setAddInstallerSaving(false)
    }
  }

  const openReportNotePicker = (
    e: React.MouseEvent<HTMLElement>,
    reportTrackingId: string,
    note?: string | null
  ) => {
    if (!canReadReportNotes) return
    e.stopPropagation()
    const currentNote = typeof note === 'string' ? note : ''
    if (!canEditReport && !currentNote.trim()) return
    const r = e.currentTarget.getBoundingClientRect()
    const menuWidth = 420
    const approxMenuH = 320
    let top = r.bottom + 6
    if (top + approxMenuH > window.innerHeight - 12) {
      top = Math.max(12, r.top - approxMenuH - 6)
    }
    setReportNoteDraft(currentNote)
    setReportNotePicker({
      reportTrackingId,
      note: currentNote,
      readOnly: !canEditReport,
      left: Math.max(8, Math.min(r.left, window.innerWidth - menuWidth - 8)),
      top,
    })
  }

  const saveReportNote = async (nextNote?: string) => {
    if (!reportNotePicker || reportNotePicker.readOnly) return
    setReportNoteSaving(true)
    setError('')
    try {
      const note = (nextNote ?? reportNoteDraft).trim()
      const res = await fetch('/api/admin/onboarding-matrix/cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingId: reportNotePicker.reportTrackingId,
          rowNote: note || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save note')
      setReportNotePicker(null)
      setReportNoteDraft('')
      await loadReport()
    } catch (err: any) {
      setError(err.message || 'Failed to save note')
    } finally {
      setReportNoteSaving(false)
    }
  }

  const handleRemoveInstaller = async (reportTrackingId: string) => {
    setRemoveBusyId(reportTrackingId)
    setError('')
    try {
      const res = await fetch(`/api/admin/report/manual/${reportTrackingId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to remove installer')
      await loadReport()
    } catch (err: any) {
      setError(err.message || 'Failed to remove installer')
    } finally {
      setRemoveBusyId(null)
    }
  }

  const filteredInstallers = useMemo(() => {
    if (!reportData) return []
    if (!searchQuery.trim()) return reportData.installers
    const q = searchQuery.toLowerCase()
    return reportData.installers.filter(
      (inst) =>
        inst.firstName.toLowerCase().includes(q) ||
        inst.lastName.toLowerCase().includes(q) ||
        inst.email.toLowerCase().includes(q) ||
        (inst.companyName || '').toLowerCase().includes(q)
    )
  }, [reportData, searchQuery])

  const renderCellIcon = (state: string) => {
    if (state === 'ok') return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
    if (state === 'warn') return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
    if (state === 'na') return <span className="text-[10px] text-slate-400 font-medium">N/A</span>
    return <XCircle className="w-4 h-4 text-red-600 shrink-0" />
  }

  const renderCell = (cell: MatrixCell | undefined, defId: string) => {
    if (!cell) return <span className="text-slate-300">—</span>
    if (defId === 'surface') {
      const text = (cell.detail || '').trim()
      return text ? (
        <span className="text-[10px] font-semibold text-slate-800">{text}</span>
      ) : (
        <span className="text-slate-400 text-[10px]">—</span>
      )
    }
    return (
      <span className="inline-flex items-center justify-center">
        {renderCellIcon(cell.state)}
      </span>
    )
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-[1550px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Report</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Build a custom list of installers — only people you add appear in this report.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {canEditReport && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddInstallerModal(true)
                      setInstallerSearchQuery('')
                      setSelectedInstallerId('')
                      setInstallerSearchResults([])
                      setInstallerSearchError('')
                    }}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-green text-white hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add installer
                  </button>
                )}
                <button
                  type="button"
                  onClick={loadReport}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                <p className="font-semibold">Report could not be loaded</p>
                <p className="mt-1.5 text-red-800/95">{error}</p>
                <button
                  type="button"
                  onClick={loadReport}
                  disabled={loading}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-300 bg-white text-red-900 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Search & filters — matches installer dashboard */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 relative min-w-0">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search installers..."
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white"
                  />
                  {loading && reportData && (
                    <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="relative shrink-0" ref={columnsDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setColumnsDropdownOpen((prev) => !prev)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium text-slate-700 min-w-[180px]"
                  >
                    <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0" />
                    <span>Columns ({visibleColumns.size}/{REPORT_MATRIX_ROW_DEFS.length})</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${columnsDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {columnsDropdownOpen && (
                    <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 z-50 bg-white rounded-xl border-2 border-slate-200 shadow-lg p-2 min-w-[240px] max-h-[400px] overflow-y-auto">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg mb-1 font-medium"
                        onClick={() => setVisibleColumns(new Set(REPORT_MATRIX_ROW_DEFS.map((d) => d.id)))}
                      >
                        Show all columns
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      {REPORT_MATRIX_ROW_DEFS.map((def) => (
                        <button
                          key={def.id}
                          type="button"
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-sm text-slate-700 rounded-lg transition-colors"
                          onClick={() => toggleColumn(def.id)}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              visibleColumns.has(def.id)
                                ? 'bg-brand-green border-brand-green text-white'
                                : 'border-slate-300'
                            }`}
                          >
                            {visibleColumns.has(def.id) && <Check className="w-3 h-3" />}
                          </span>
                          <span className="font-medium">{def.label}</span>
                          {def.subtitle ? (
                            <span className="text-slate-400 ml-auto text-xs">{def.subtitle}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {reportData && (
                <p className="mt-3 text-sm text-slate-500 tabular-nums">
                  {filteredInstallers.length} installer{filteredInstallers.length !== 1 ? 's' : ''}
                  {searchQuery.trim() ? ` matching “${searchQuery.trim()}”` : ''}
                </p>
              )}
            </div>

            {/* Report list — flat layout (no card grid / cell borders) */}
            {reportData && reportData.installers.length === 0 && !loading && !error ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <p className="text-slate-700 font-semibold mb-1">No installers on this report yet</p>
                <p className="text-sm text-slate-500 mb-4">
                  Add installers one at a time. The report no longer includes every active installer automatically.
                </p>
                {canEditReport && (
                  <button
                    type="button"
                    onClick={() => setShowAddInstallerModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-green text-white hover:bg-brand-green-dark transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add installer
                  </button>
                )}
              </div>
            ) : reportData && filteredInstallers.length > 0 ? (
              <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-xl border border-slate-200 bg-white">
                <table className="w-full table-fixed text-sm border-separate border-spacing-0 bg-white">
                  <colgroup>
                    <col style={{ width: reportTableLayout.installerColPx }} />
                    <col style={{ width: reportTableLayout.notesMinPx }} />
                    {visibleDefs.map((def) => (
                      <col key={def.id} style={{ width: reportTableLayout.matrixColPx }} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 z-20 bg-slate-100">
                    <tr className="border-b border-slate-200/80 bg-slate-100">
                      <th className="sticky left-0 z-30 bg-slate-100 px-3 py-2.5 text-left w-[200px] max-w-[220px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Installer</span>
                          <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">
                            Name, company &amp; email
                          </span>
                        </div>
                      </th>
                      <th
                        className="px-3 py-2.5 text-left align-top bg-slate-100 border-l border-slate-200"
                        style={{ width: reportTableLayout.notesMinPx }}
                      >
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notes</span>
                      </th>
                      {visibleDefs.map((def) => (
                        <th
                          key={def.id}
                          className="px-1.5 py-2.5 text-center bg-slate-100 border-l border-slate-200"
                          title={`${def.label}${def.required ? ' (required)' : ''}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-tight">
                              {def.label}
                            </span>
                            {def.subtitle ? (
                              <span className="text-[8px] font-medium text-slate-400 text-center">{def.subtitle}</span>
                            ) : null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInstallers.map((inst) => (
                      <tr key={inst.id} className="group border-b border-slate-100/90 bg-white hover:bg-white">
                        <td className="sticky left-0 z-10 bg-white px-3 py-3 align-top group-hover:bg-white w-max max-w-[300px]">
                          <div className="relative pr-8">
                            {canEditReport && (
                              <button
                                type="button"
                                disabled={removeBusyId === inst.reportTrackingId}
                                onClick={() => void handleRemoveInstaller(inst.reportTrackingId)}
                                className="absolute top-0 right-0 p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Remove from report"
                                aria-label="Remove from report"
                              >
                                {removeBusyId === inst.reportTrackingId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <div className="min-w-0 flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ${getInstallerAvatarRing(inst.status)}`}>
                                  {inst.photoUrl ? (
                                    <Image
                                      src={inst.photoUrl}
                                      alt={`${inst.firstName} ${inst.lastName}`}
                                      width={48}
                                      height={48}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-brand-green/10 flex items-center justify-center">
                                      <User className="w-5 h-5 text-brand-green" />
                                    </div>
                                  )}
                                </div>
                                {(() => {
                                  const sc = getInstallerStatusCircle(inst.status)
                                  if (!sc) return null
                                  const StatusIcon = sc.Icon
                                  return (
                                    <div
                                      title={sc.label}
                                      className={`absolute -bottom-0.5 -right-0.5 w-[1.25rem] h-[1.25rem] rounded-full flex items-center justify-center shadow-md z-20 ring-2 ring-white ${sc.bg}`}
                                    >
                                      <StatusIcon className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )
                                })()}
                              </div>
                              <div className="min-w-0 flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => router.push(`/dashboard/installers/${inst.id}`)}
                                  className="text-left min-w-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 group/name"
                                  title="Open installer profile"
                                >
                                  <span className="block font-bold text-slate-900 group-hover/name:text-brand-green transition-colors text-lg leading-snug tracking-tight">
                                    {inst.firstName} {inst.lastName}
                                  </span>
                                </button>
                                <span
                                  className={`block text-sm leading-snug ${
                                    inst.companyName
                                      ? 'font-medium text-slate-600'
                                      : 'text-slate-400 italic'
                                  }`}
                                >
                                  {inst.companyName || '—'}
                                </span>
                                <a
                                  href={`mailto:${inst.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="block text-xs text-slate-500 break-all hover:text-brand-green transition-colors"
                                  title={inst.email}
                                >
                                  {inst.email}
                                </a>
                                {(() => {
                                  const badge = getComplianceStatusBadge(inst.complianceStatus)
                                  if (!badge) return null
                                  return (
                                    <span className={`inline-flex self-start items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.textColor}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        badge.label === 'Compliant' ? 'bg-emerald-500' :
                                        badge.label === 'In Progress' ? 'bg-amber-500' : 'bg-red-500'
                                      }`} />
                                      {badge.label}
                                    </span>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td
                          className="px-3 py-3 align-top bg-white border-l border-slate-100"
                          style={{ width: reportTableLayout.notesMinPx }}
                        >
                          <button
                            type="button"
                            disabled={
                              reportNoteSaving ||
                              (!canEditReport && !inst.notes) ||
                              !canReadReportNotes
                            }
                            onClick={
                              canEditReport || inst.notes
                                ? (e) => openReportNotePicker(e, inst.reportTrackingId, inst.notes)
                                : undefined
                            }
                            className="block w-full min-h-[3.25rem] rounded-lg px-2 py-2 -mx-1 text-left hover:bg-slate-50 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                            title={
                              inst.notes
                                ? inst.notes
                                : canEditReport
                                  ? 'Add note'
                                  : 'No note'
                            }
                          >
                            <span
                              className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap break-words"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: reportTableLayout.lineClamp,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {inst.notes ? (
                                inst.notes
                              ) : canEditReport ? (
                                <span className="text-slate-400 italic text-xs">Add note…</span>
                              ) : (
                                '—'
                              )}
                            </span>
                          </button>
                        </td>
                        {visibleDefs.map((def) => (
                          <td
                            key={def.id}
                            className="text-center align-middle py-2.5 px-1 bg-white border-l border-slate-100"
                          >
                            <div className="flex min-h-[2rem] items-center justify-center">
                              {renderCell(inst.cells[def.id], def.id)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : reportData && filteredInstallers.length === 0 && !error ? (
              <div className="py-12 flex items-center justify-center text-slate-400 text-sm">
                {searchQuery ? 'No installers match your search.' : 'No installers on this report.'}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showAddInstallerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 p-6 relative">
            <button
              type="button"
              onClick={() => !addInstallerSaving && setShowAddInstallerModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 pr-10 mb-1">Add installer to report</h3>
            <p className="text-sm text-slate-600 mb-4">Search and pick an installer to include in this report.</p>

            <label className="block text-sm font-semibold text-slate-700 mb-2">Installer</label>
            <div className="relative mb-4" ref={installerSearchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={installerSearchQuery}
                onChange={(e) => {
                  setInstallerSearchQuery(e.target.value)
                  setShowInstallerDropdown(true)
                  if (selectedInstallerId) setSelectedInstallerId('')
                }}
                onFocus={() => setShowInstallerDropdown(true)}
                placeholder="Search by name, email, or company…"
                disabled={addInstallerSaving}
                className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green/60 text-base"
              />
              {selectedInstallerId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInstallerId('')
                    setInstallerSearchQuery('')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {showInstallerDropdown && installerSearchQuery.trim() && !selectedInstallerId && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {installerSearchLoading ? (
                    <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching…
                    </div>
                  ) : installerSearchError ? (
                    <p className="px-4 py-3 text-sm text-red-600">{installerSearchError}</p>
                  ) : installerSearchResults.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">No installers found</p>
                  ) : (
                    installerSearchResults.map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        onClick={() => {
                          setSelectedInstallerId(inst.id)
                          setInstallerSearchQuery(
                            `${inst.firstName} ${inst.lastName}${inst.companyName ? ` — ${inst.companyName}` : ''}`
                          )
                          setShowInstallerDropdown(false)
                        }}
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {inst.firstName} {inst.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{inst.email}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={addInstallerSaving}
                onClick={() => setShowAddInstallerModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addInstallerSaving || !selectedInstallerId}
                onClick={() => void handleAddInstaller()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-green text-white hover:bg-brand-green-dark disabled:opacity-50"
              >
                {addInstallerSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding…
                  </span>
                ) : (
                  'Add to report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportNotePicker ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[120] cursor-default bg-slate-900/10"
            aria-label="Close note"
            onClick={() => {
              if (!reportNoteSaving) {
                setReportNotePicker(null)
                setReportNoteDraft('')
              }
            }}
          />
          <div
            role="dialog"
            aria-label={reportNotePicker.readOnly ? 'View note' : 'Report note'}
            className="fixed z-[121] w-[min(26rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            style={{ left: reportNotePicker.left, top: reportNotePicker.top }}
          >
            {reportNotePicker.readOnly ? (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
                {reportNotePicker.note || 'No note'}
              </div>
            ) : (
              <textarea
                value={reportNoteDraft}
                onChange={(e) => setReportNoteDraft(e.target.value)}
                disabled={reportNoteSaving}
                placeholder="Write a note for this installer on the report…"
                rows={10}
                className="w-full min-h-[12rem] resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 disabled:opacity-50"
              />
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              {!reportNotePicker.readOnly ? (
                <button
                  type="button"
                  disabled={reportNoteSaving || !reportNoteDraft.trim()}
                  onClick={() => void saveReportNote('')}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  Clear
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={reportNoteSaving}
                  onClick={() => {
                    setReportNotePicker(null)
                    setReportNoteDraft('')
                  }}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  Cancel
                </button>
                {!reportNotePicker.readOnly ? (
                  <button
                    type="button"
                    disabled={reportNoteSaving}
                    onClick={() => void saveReportNote()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                  >
                    {reportNoteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
