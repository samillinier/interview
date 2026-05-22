'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  Bell,
  ClipboardList,
  ExternalLink,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Paperclip,
  Search,
  User,
  X,
} from 'lucide-react'

import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { InstallerMobileMenu } from '@/components/InstallerMobileMenu'

type Delivery = {
  id: string
  createdAt: string
  batchId: string
  workroom: string
  company: string
  installer: string
  LtrUploadBatch?: { createdAt: string; fileName: string | null; rowCount: number }
}

type DetailRow = {
  id: string
  surveyDate: string | null
  ltrScore: number | null
  surveyComment: string | null
  customer: string | null
  poNumber: string | null
  woNumber: string | null
  region: string | null
  storeName: string | null
  craftScore: number | null
  professionalScore: number | null
  homeImprovementScore: number | null
  projectValueScore: number | null
  installerKnowledgeScore: number | null
  timeTaken: string | null
}

function ScorePill({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-slate-400">—</span>
  const v = Number(value)
  const cls =
    v >= 9 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : v >= 7 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-800 border-red-200'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold tabular-nums ${cls}`}>{v}</span>
}

export default function InstallerSurveyPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)
  const [token, setToken] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [mounted, setMounted] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [detailRows, setDetailRows] = useState<DetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const tok = typeof window !== 'undefined' ? localStorage.getItem('installerToken') : null
    if (!tok) {
      router.push('/installer/login')
      return
    }
    // Mark "survey" notifications as read when visiting Survey page (so badge clears)
    const installerId = localStorage.getItem('installerId')
    if (installerId) {
      fetch('/api/notifications/survey-mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installerId }),
      }).catch(() => {})
    }
    setToken(tok)
  }, [router])

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      setNotificationCount(Number(data?.count ?? 0) || 0)
    } catch {
      // ignore
    }
  }, [])

  const loadDeliveries = useCallback(async () => {
    if (!token) return
    const res = await fetch('/api/installers/survey/deliveries', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || 'Could not load surveys')
    setDeliveries((data?.deliveries || []) as Delivery[])
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setMessage(null)
      try {
        await Promise.all([loadNotifications(), loadDeliveries()])
      } catch (e: any) {
        if (!cancelled) setMessage(e?.message || 'Failed to load surveys')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, loadNotifications, loadDeliveries])

  const openDetails = useCallback(async (d: Delivery) => {
    if (!token) return
    setSelectedDelivery(d)
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailRows([])
    setDetailError(null)
    try {
      const res = await fetch(`/api/installers/survey/details?deliveryId=${encodeURIComponent(d.id)}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Could not load survey details')
      setDetailRows((data?.rows || []) as DetailRow[])
    } catch (e: any) {
      setDetailError(e?.message || 'Failed to load details')
    } finally {
      setDetailLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!detailOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailOpen])

  const handleLogout = async () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  const title = useMemo(() => {
    if (!selectedDelivery) return 'Survey details'
    return `Survey details – ${selectedDelivery.workroom}`
  }, [selectedDelivery])

  const filteredDeliveries = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return deliveries
    return deliveries.filter((d) => {
      const hay = `${d.workroom} ${d.company} ${d.installer} ${d.LtrUploadBatch?.fileName || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [deliveries, query])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10">
              <Image src={logo} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-bold text-primary-900 text-sm">Installer Portal</h1>
                <p className="text-xs text-primary-500">Dashboard</p>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/installer/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link href="/installer/profile" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <User className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Profile</span>}
          </Link>
          <Link href="/installer/agreements" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <FileText className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Form</span>}
          </Link>
          <Link href="/installer/attachments" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Paperclip className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Attachments</span>}
          </Link>
          <Link href="/installer/referrals" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <ExternalLink className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Referrals</span>}
          </Link>
          <Link href="/installer/survey" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname === '/installer/survey' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'}`}>
            <ClipboardList className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Survey</span>}
          </Link>
          <Link href="/installer/notifications" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span>Notifications</span>
                {notificationCount > 0 && (
                  <span className="bg-white text-brand-green text-xs font-bold rounded-full min-w-[20px] h-5 px-2 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
            )}
          </Link>
          <Link href="/installer/help" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Help</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}>
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div
        className={`flex-1 min-w-0 w-full box-border transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}`}
      >
        <InstallerMobileMenu pathname={pathname} notificationCount={notificationCount} onLogout={handleLogout} />

        <main className="w-full max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 pt-16 lg:pt-8 pb-8 box-border">
          <div className="mb-6 w-full min-w-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between w-full min-w-0">
              <div className="min-w-0 shrink lg:max-w-[min(100%,42rem)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-brand-green/10 rounded-xl shrink-0">
                    <ClipboardList className="w-6 h-6 text-brand-green" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">Survey</h1>
                </div>
                <p className="text-slate-600 max-w-2xl text-sm sm:text-base">
                  Surveys shared with you by the admin team. Click a report to view the underlying survey entries.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch w-full min-w-0 lg:w-auto lg:min-w-[min(100%,28rem)] lg:max-w-xl lg:shrink-0">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm w-full min-w-0">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search…"
                    aria-label="Search workroom, company, installer"
                    title="Search workroom, company, installer"
                    className="min-w-0 flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 shrink-0"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 shrink-0 sm:min-w-[9.5rem]">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                    Shared reports
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums leading-tight">{deliveries.length}</div>
                </div>
              </div>
            </div>
          </div>

          {message ? (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-900">{message}</div>
          ) : null}

          {deliveries.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-brand-green/10 border border-brand-green/15">
                  <ClipboardList className="w-6 h-6 text-brand-green" />
                </div>
                <div className="min-w-0">
                  <div className="text-slate-900 font-bold text-lg">No surveys yet</div>
                  <div className="text-sm text-slate-600 mt-1">
                    When an admin shares a survey report with you, it will appear here automatically.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full min-w-0 bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Shared reports</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Search and click a row to open details.</p>
                </div>
                <div className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700 tabular-nums">{filteredDeliveries.length}</span> of{' '}
                  <span className="font-semibold text-slate-700 tabular-nums">{deliveries.length}</span>
                </div>
              </div>
              <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x">
                <table className="w-full min-w-0 sm:min-w-[860px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="text-left font-bold uppercase tracking-wide text-xs px-5 py-3.5 border-b border-slate-800 w-52">Sent</th>
                      <th className="text-left font-bold uppercase tracking-wide text-xs px-5 py-3.5 border-b border-slate-800">Workroom</th>
                      <th className="text-left font-bold uppercase tracking-wide text-xs px-5 py-3.5 border-b border-slate-800">Company</th>
                      <th className="text-left font-bold uppercase tracking-wide text-xs px-5 py-3.5 border-b border-slate-800">Installer</th>
                      <th className="text-left font-bold uppercase tracking-wide text-xs px-5 py-3.5 border-b border-slate-800">Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDeliveries.map((d) => (
                      <tr
                        key={d.id}
                        className="bg-white hover:bg-slate-50/80 cursor-pointer"
                        onClick={() => void openDetails(d)}
                      >
                        <td className="px-5 py-3.5 text-slate-700 tabular-nums">
                          {new Date(d.createdAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-slate-900 font-semibold">{d.workroom}</td>
                        <td className="px-5 py-3.5 text-slate-800">{d.company}</td>
                        <td className="px-5 py-3.5 text-slate-800">{d.installer}</td>
                        <td className="px-5 py-3.5 text-slate-700">
                          <div className="flex flex-col">
                            <span className="text-slate-700">
                              {d.LtrUploadBatch?.createdAt ? new Date(d.LtrUploadBatch.createdAt).toLocaleDateString() : ''}
                            </span>
                            {d.LtrUploadBatch?.fileName ? (
                              <span className="text-xs text-slate-500 truncate max-w-[360px]">{d.LtrUploadBatch.fileName}</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {mounted && detailOpen && selectedDelivery
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-3 sm:p-4 bg-black/45 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="installer-survey-detail-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) setDetailOpen(false)
              }}
            >
              <div
                className="bg-white rounded-xl shadow-xl border border-slate-200/90 w-full max-w-2xl max-h-[min(88vh,720px)] flex flex-col overflow-hidden sm:max-h-[82vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-slate-50/90">
                  <div className="min-w-0">
                    <h2 id="installer-survey-detail-title" className="text-sm font-semibold text-slate-900 truncate pr-2">
                      {title}
                    </h2>
                    <div className="text-xs text-slate-500 truncate">
                      {selectedDelivery.company} • {selectedDelivery.installer}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailOpen(false)}
                    className="p-2 rounded-lg hover:bg-slate-200/60 text-slate-600"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {detailLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
                    </div>
                  ) : detailError ? (
                    <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-900 border border-red-200">{detailError}</div>
                  ) : detailRows.length === 0 ? (
                    <div className="text-sm text-slate-600">No survey rows found for this report.</div>
                  ) : (
                    <div className="space-y-3">
                      {detailRows.map((r) => (
                        <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">
                                {r.surveyDate ? new Date(r.surveyDate).toLocaleString() : 'Survey'}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {[r.customer && `Customer: ${r.customer}`, r.poNumber && `PO ${r.poNumber}`, r.woNumber && `WO ${r.woNumber}`]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <ScorePill value={r.ltrScore} />
                            </div>
                          </div>
                          {(r.surveyComment || '').trim() ? (
                            <div className="mt-3 text-xs text-slate-700 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed">
                              {(r.surveyComment || '').trim()}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
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

