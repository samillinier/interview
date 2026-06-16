'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp,
  Wrench,
} from 'lucide-react'

import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface JobsAnalytics {
  totalJobs: number
  chargebacks: number
  chargebackRate: string
  withInstaller: number
  withoutInstaller: number
  typeDistribution: { type: string; count: number }[]
  statusDistribution: { status: string; count: number }[]
  laborDistribution: { category: string; count: number }[]
  workroomDistribution: { workroom: string; count: number }[]
  topStores: { name: string; count: number }[]
  topInstallers: { name: string; count: number }[]
  poAmount: { total: number; average: number; min: number; max: number; count: number }
  monthlyTrend: { month: string; count: number; poTotal: number }[]
  dailyTrend: { date: string; count: number }[]
  weeklyDistribution: { day: string; count: number }[]
  scheduledDates: Record<string, { total: number; byWorkroom: Record<string, number> }>
  scheduledCount: number
  hasInstallDates: boolean
  workrooms: string[]
  completionBreakdown: { label: string; count: number; color: string }[]
  completionByWorkroom: Record<string, { completed: number; inProgress: number; pending: number; canceled: number }>
}

const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const formatPercent = (value: number, total: number) => {
  if (!total || total <= 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 shadow-sm">
        {icon}
      </div>
    </div>
  )
}

function MiniBar({ value, max, colorClass = 'bg-brand-green' }: { value: number; max: number; colorClass?: string }) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-200">
      <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function buildSmoothSvgPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const c = points[i], n = points[i + 1]
    const cx = (c.x + n.x) / 2
    path += ` C ${cx} ${c.y}, ${cx} ${n.y}, ${n.x} ${n.y}`
  }
  return path
}

export default function JobsAnalyticsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(String((session?.user as any)?.role || '').toUpperCase())

  const [data, setData] = useState<JobsAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [calendarWorkroom, setCalendarWorkroom] = useState('all')
  const [completionWorkroom, setCompletionWorkroom] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs/analytics', { cache: 'no-store' })
      if (res.ok) {
        setData(await res.json())
      } else {
        setError('Failed to load analytics')
      }
    } catch { setError('Network error') }
    setLoading(false)
  }

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess])

  useEffect(() => {
    if (sessionStatus === 'authenticated' && canAccess) fetchData()
  }, [sessionStatus, canAccess])

  if (sessionStatus === 'loading' || loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><LogoHeartbeatLoader /></div>
  }

  if (!data && error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 rounded-2xl border border-slate-200 bg-white shadow-xl max-w-md">
          <p className="text-slate-700 mb-2 font-semibold">Failed to load analytics</p>
          <p className="text-slate-500 mb-5 text-sm">{error}</p>
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors">
            <RefreshCw className="w-4 h-4" />Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const maxMonthly = Math.max(1, ...data.monthlyTrend.map(t => t.count))
  const maxDaily = Math.max(1, ...data.dailyTrend.map(t => t.count))

  // SVG chart data for monthly trend
  const chartW = 600; const chartH = 220; const chartPad = 30
  const monthlyPoints = data.monthlyTrend.map((t, i) => ({
    x: chartPad + ((chartW - chartPad * 2) / (data.monthlyTrend.length - 1 || 1)) * i,
    y: chartH - chartPad - ((t.count / maxMonthly) * (chartH - chartPad * 2)),
  }))
  const monthlyPath = buildSmoothSvgPath(monthlyPoints)

  // SVG chart data for daily trend
  const dailyW = 800; const dailyH = 200; const dailyPad = 30
  const dailyPoints = data.dailyTrend.map((t, i) => ({
    x: dailyPad + ((dailyW - dailyPad * 2) / (data.dailyTrend.length - 1 || 1)) * i,
    y: dailyH - dailyPad - ((t.count / maxDaily) * (dailyH - dailyPad * 2)),
  }))
  const dailyPath = buildSmoothSvgPath(dailyPoints)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-[1550px] mx-auto space-y-8">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-brand-green-dark/20 bg-brand-green shadow-sm p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Job Analytics</h1>
                <p className="text-emerald-50/90">Comprehensive insights into Cilio job data across all saved reports.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <Briefcase className="w-3.5 h-3.5" />
                    {data.totalJobs.toLocaleString()} jobs
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <Wrench className="w-3.5 h-3.5" />
                    {data.laborDistribution.length} labor categories
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/15 px-3 py-1 text-xs font-semibold text-white">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {data.chargebacks.toLocaleString()} chargebacks
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Jump to nav */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sticky top-16 lg:top-4 z-10">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold mr-1">Jump to:</span>
              <a href="#overview" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Overview</a>
              <a href="#trends" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Trends</a>
              <a href="#distributions" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Distributions</a>
              <a href="#stores" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Stores &amp; Installers</a>
              <a href="#completion" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Completion</a>
              <a href="#calendar" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Calendar</a>
              <a href="#financial" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Financial</a>
            </div>
          </div>

          {/* Key Metrics */}
          <div id="overview" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 scroll-mt-24">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
              <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-6" />
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Total Jobs</p><h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{data.totalJobs.toLocaleString()}</h3><p className="text-sm text-slate-500">Saved job records</p></div>
                <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/10 flex items-center justify-center shadow-sm"><Briefcase className="w-6 h-6 text-brand-green" /></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
              <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">PO Value</p><h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{fmtCurrency(data.poAmount.total)}</h3><p className="text-sm text-slate-500">Avg {fmtCurrency(data.poAmount.average)}</p></div>
                <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/20 flex items-center justify-center shadow-sm"><DollarSign className="w-6 h-6 text-brand-green" /></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
              <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Stores</p><h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{data.topStores.length.toLocaleString()}</h3><p className="text-sm text-slate-500">Unique stores with jobs</p></div>
                <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/20 flex items-center justify-center shadow-sm"><Building2 className="w-6 h-6 text-brand-green" /></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
              <div className="h-1.5 w-full rounded-full bg-red-400 mb-6" />
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Chargebacks</p><h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{data.chargebacks.toLocaleString()}</h3><p className="text-sm text-slate-500">{data.chargebackRate} of total</p></div>
                <div className="w-14 h-14 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-center shadow-sm"><AlertCircle className="w-6 h-6 text-red-500" /></div>
              </div>
            </motion.div>
          </div>

          {/* Trends */}

          {/* Daily Trend */}
          <div id="trends" className="scroll-mt-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Daily Jobs Trend</h2>
                <p className="mt-1 text-sm text-slate-500">Job count over the last 30 days</p>
              </div>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            {(() => {
              const totalPeriod = data.dailyTrend.reduce((s, t) => s + t.count, 0)
              const peakDay = data.dailyTrend.reduce((best, t) => (t.count > best.count ? t : best), data.dailyTrend[0] || { date: '-', count: 0 })
              const avgDaily = Math.round(totalPeriod / 30)
              const guideCount = 4
              const step = Math.ceil(maxDaily / guideCount)
              const guideValues = Array.from({ length: guideCount + 1 }, (_, i) => i * step)
              return (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">Peak Day</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{fmtDate(peakDay.date)}</div>
                      <div className="text-sm text-slate-500">{peakDay.count} jobs</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">30-Day Total</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{totalPeriod.toLocaleString()}</div>
                      <div className="text-sm text-slate-500">All days combined</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Daily Avg</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{avgDaily}</div>
                      <div className="text-sm text-slate-500">Per day</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                    <div className="relative">
                      <svg viewBox={`0 0 ${dailyW} ${dailyH}`} className="w-full h-auto">
                        <defs>
                          <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8CB63C" stopOpacity="0.35" />
                            <stop offset="50%" stopColor="#8CB63C" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#8CB63C" stopOpacity="0.0" />
                          </linearGradient>
                          <filter id="dailyGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                          </filter>
                        </defs>
                        {/* Guide lines */}
                        {guideValues.map(v => (
                          <g key={v}>
                            <line
                              x1={dailyPad} y1={dailyH - dailyPad - ((v / maxDaily) * (dailyH - dailyPad * 2))}
                              x2={dailyW - dailyPad} y2={dailyH - dailyPad - ((v / maxDaily) * (dailyH - dailyPad * 2))}
                              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4"
                            />
                            <text
                              x={dailyPad - 6} y={dailyH - dailyPad - ((v / maxDaily) * (dailyH - dailyPad * 2)) + 3}
                              textAnchor="end" className="text-[9px]" fill="#94a3b8">{v}</text>
                          </g>
                        ))}
                        {/* Area fill */}
                        <path d={`${dailyPath} L ${dailyPoints[dailyPoints.length - 1].x} ${dailyH - dailyPad} L ${dailyPad} ${dailyH - dailyPad} Z`} fill="url(#dailyGrad)" />
                        {/* Glow + line */}
                        <path d={dailyPath} fill="none" stroke="#8CB63C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#dailyGlow)" />
                        <path d={dailyPath} fill="none" stroke="#8CB63C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Dots + count labels */}
                        {dailyPoints.map((p, i) => {
                          if (data.dailyTrend[i].count === 0) return null
                          const isPeak = data.dailyTrend[i].count === maxDaily
                          return (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r={isPeak ? 5 : 2.5} fill="white" stroke="#8CB63C" strokeWidth={isPeak ? 2.5 : 1.5} />
                              <circle cx={p.x} cy={p.y} r={isPeak ? 2 : 1} fill="#8CB63C" />
                              <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[9px] font-semibold" fill="#1e293b">{data.dailyTrend[i].count}</text>
                            </g>
                          )
                        })}
                      </svg>
                      {/* Date labels at key intervals */}
                      <div className="flex justify-between mt-1 px-1">
                        {data.dailyTrend.filter((_, i) => i % 5 === 0 || i === data.dailyTrend.length - 1).map(t => (
                          <span key={t.date} className="text-[10px] font-semibold text-slate-400">{fmtDate(t.date)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
          </div>

          {/* Masonry Charts Grid */}
          <div className="columns-1 lg:columns-2 lg:gap-6 [column-fill:_balance]">
          {/* Completion Breakdown */}
          <div id="completion" className="scroll-mt-24">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Completion Overview</h2>
                    <p className="mt-1 text-sm text-slate-500">Job completion status breakdown</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-brand-green" />
                </div>
                <select
                  value={completionWorkroom}
                  onChange={(e) => setCompletionWorkroom(e.target.value)}
                  className="px-3 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-slate-600"
                >
                  <option value="all">All Workrooms</option>
                  {data.workrooms.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              {(() => {
                // Compute filtered breakdown based on workroom selection
                let items: { label: string; count: number; color: string }[]
                if (completionWorkroom === 'all') {
                  items = data.completionBreakdown
                } else {
                  const wr = data.completionByWorkroom[completionWorkroom] || { completed: 0, inProgress: 0, pending: 0, canceled: 0 }
                  items = [
                    { label: 'Completed', count: wr.completed, color: '#7ab82e' },
                    { label: 'In Progress', count: wr.inProgress, color: '#9dcf4a' },
                    { label: 'Pending', count: wr.pending, color: '#c5e88f' },
                    { label: 'Canceled', count: wr.canceled, color: '#4a6a1e' },
                  ].filter(c => c.count > 0)
                }
                const total = items.reduce((s, c) => s + c.count, 0)

                return total > 0 ? (
                  <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                    {/* Pie Chart */}
                    <div className="flex justify-center">
                      {(() => {
                        let cumulative = 0
                        const segments = items.map(c => {
                          const start = (cumulative / total) * 100
                          cumulative += c.count
                          const end = (cumulative / total) * 100
                          return `${c.color} ${start}% ${end}%`
                        })
                        const gradient = `conic-gradient(${segments.join(', ')})`
                        return (
                          <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-brand-green/15 bg-brand-green/[0.02] shadow-sm">
                            <div className="h-40 w-40 rounded-full" style={{ background: gradient }} />
                            <div className="absolute flex h-20 w-20 flex-col items-center justify-center rounded-full border border-brand-green/20 bg-white shadow-sm">
                              <span className="text-xl font-bold text-slate-900">{total}</span>
                              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand-green/70">Total</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    {/* Legend */}
                    <div className="space-y-2">
                      {items.map((item) => {
                        const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0'
                        return (
                          <div key={item.label} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-brand-green/10 bg-brand-green/[0.03] px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-600">{item.count}</span>
                              <span className="text-xs text-slate-400 w-12 text-right">{pct}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-6 text-center">No completion data available</p>
                )
              })()}
            </motion.div>
          </div>

            <div className="h-8 lg:h-10" />

            {/* Weekly Report */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Weekly Report</h2>
                  <p className="mt-1 text-sm text-slate-500">Jobs by day of the week</p>
                </div>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              {(() => {
                const weekData = data.weeklyDistribution
                const maxVal = Math.max(1, ...weekData.map((item) => item.count))
                const leading = weekData.reduce((best, item) => (item.count > best.count ? item : best), weekData[0] || { day: '-', count: 0 })

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">Busiest Day</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{leading.day}</div>
                        <div className="text-sm text-slate-500">{leading.count} jobs</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Weekly Total</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{data.totalJobs}</div>
                        <div className="text-sm text-slate-500">All days combined</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                      <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Days of the week</span>
                        <span>Max {maxVal}</span>
                      </div>

                      <div className="relative h-72">
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                          {[1, 2, 3, 4].map((line) => (
                            <div key={line} className="border-t border-dashed border-slate-200" />
                          ))}
                        </div>

                        <div className="absolute inset-0 flex items-end gap-2">
                          {weekData.map((item, index) => {
                            const percentage = data.totalJobs > 0 ? (item.count / data.totalJobs) * 100 : 0
                            const barHeight = item.count === 0 ? 6 : Math.max((item.count / maxVal) * 100, 8)
                            const isLeader = item.day === leading.day && item.count === leading.count

                            return (
                              <div key={item.day} className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-xl px-1 text-center">
                                <div className="mb-2 text-sm font-semibold text-slate-900">{item.count}</div>
                                <div className={`relative rounded-t-2xl transition-all duration-300 group-hover:opacity-90 ${isLeader ? 'bg-brand-green shadow-[0_14px_30px_-18px_rgba(101,163,13,0.9)]' : 'bg-brand-green/80'}`} style={{ height: `${barHeight}%` }}>
                                  <div className="absolute inset-x-0 top-0 h-8 rounded-t-2xl bg-white/15" />
                                </div>
                                <div className="mt-3 space-y-1">
                                  <div className="text-xs font-medium text-slate-700 group-hover:text-slate-900">{item.day}</div>
                                  <div className="text-[11px] text-slate-500">{percentage.toFixed(1)}%</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>

            {/* Labor Categories */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Labor Categories</h2>
                  <p className="mt-1 text-sm text-slate-500">Jobs by type of work</p>
                </div>
                <Wrench className="w-5 h-5 text-slate-400" />
              </div>
              {(() => {
                const topLabor = data.laborDistribution.slice(0, 8)
                const totalLabor = topLabor.reduce((sum, item) => sum + item.count, 0)
                const leading = topLabor.reduce((best, item) => (item.count > best.count ? item : best), topLabor[0] || { category: '-', count: 0 })
                const colors = ['#65a30d', '#84cc16', '#a3e635', '#4d7c0f', '#bef264', '#3f6212', '#d9f99d', '#a7f3d0']

                let cumulative = 0
                const chartFill = totalLabor
                  ? `conic-gradient(${topLabor
                      .map((item, index) => {
                        const start = (cumulative / totalLabor) * 100
                        cumulative += item.count
                        const end = (cumulative / totalLabor) * 100
                        return `${colors[index % colors.length]} ${start}% ${end}%`
                      })
                      .join(', ')})`
                  : 'conic-gradient(#e2e8f0 0% 100%)'

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">Top Category</div>
                        <div className="mt-1 text-lg font-bold text-slate-900 truncate">{leading.category}</div>
                        <div className="text-sm text-slate-500">{leading.count} jobs</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{totalLabor}</div>
                        <div className="text-sm text-slate-500">Across visible categories</div>
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                      <div className="flex justify-center">
                        <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-sm">
                          <div
                            className="h-44 w-44 rounded-full"
                            style={{ background: chartFill }}
                          />
                          <div className="absolute flex h-24 w-24 flex-col items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                            <span className="text-2xl font-bold text-slate-900">{topLabor.length}</span>
                            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Categories</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {topLabor.map((item, index) => {
                          const percentage = totalLabor > 0 ? (item.count / totalLabor) * 100 : 0
                          return (
                            <div key={`${item.category}-${index}`} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-left">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                                <span className="text-sm font-semibold text-slate-700 truncate">{item.category}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-sm font-bold text-slate-600">{item.count}</span>
                                <span className="text-xs text-slate-400 w-12 text-right">{percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>

            {/* Workroom Distribution */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Workroom Distribution</h2>
                  <p className="mt-1 text-sm text-slate-500">Jobs by workroom</p>
                </div>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              {(() => {
                const wrk = data.workroomDistribution
                const maxVal = Math.max(1, ...wrk.map((item) => item.count))
                const leading = wrk.reduce((best, item) => (item.count > best.count ? item : best), wrk[0] || { workroom: '-', count: 0 })

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">Top Workroom</div>
                        <div className="mt-1 text-lg font-bold text-slate-900 truncate">{leading.workroom}</div>
                        <div className="text-sm text-slate-500">{leading.count} jobs</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{data.totalJobs}</div>
                        <div className="text-sm text-slate-500">Across all workrooms</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                      <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Workrooms</span>
                        <span>Max {maxVal}</span>
                      </div>

                      <div className="relative h-72">
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                          {[1, 2, 3, 4].map((line) => (
                            <div key={line} className="border-t border-dashed border-slate-200" />
                          ))}
                        </div>

                        <div className="absolute inset-0 flex items-end gap-2">
                          {wrk.slice(0, 8).map((item, index) => {
                            const percentage = data.totalJobs > 0 ? (item.count / data.totalJobs) * 100 : 0
                            const barHeight = item.count === 0 ? 6 : Math.max((item.count / maxVal) * 100, 8)
                            const isLeader = item.workroom === leading.workroom && item.count === leading.count

                            return (
                              <div key={`${item.workroom}-${index}`} className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-xl px-1 text-center">
                                <div className="mb-2 text-sm font-semibold text-slate-900">{item.count}</div>
                                <div className={`relative rounded-t-2xl transition-all duration-300 group-hover:opacity-90 ${isLeader ? 'bg-brand-green shadow-[0_14px_30px_-18px_rgba(101,163,13,0.9)]' : 'bg-brand-green/80'}`} style={{ height: `${barHeight}%` }}>
                                  <div className="absolute inset-x-0 top-0 h-8 rounded-t-2xl bg-white/15" />
                                </div>
                                <div className="mt-3 space-y-1">
                                  <div className="text-xs font-medium leading-tight text-slate-700 group-hover:text-slate-900 truncate">{item.workroom}</div>
                                  <div className="text-[11px] text-slate-500">{percentage.toFixed(1)}%</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          </div>

          {/* Stores + Installers side by side */}
          <div id="stores" className="grid grid-cols-1 md:grid-cols-2 gap-6 scroll-mt-24">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Top Stores</h2>
                  <p className="mt-1 text-sm text-slate-500">Stores by job volume</p>
                </div>
                <Building2 className="w-5 h-5 text-slate-400" />
              </div>
              {data.topStores.length > 0 ? (
                (() => {
                  const top7 = data.topStores.slice(0, 7)
                  const maxVal = Math.max(1, ...top7.map(s => s.count))
                  const leading = top7.reduce((best, s) => (s.count > best.count ? s : best), top7[0] || { name: '-', count: 0 })
                  const totalShown = top7.reduce((sum, s) => sum + s.count, 0)
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">Top Store</div>
                          <div className="mt-1 text-lg font-bold text-slate-900 truncate">{leading.name}</div>
                          <div className="text-sm text-slate-500">{leading.count} jobs</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Unique Stores</div>
                          <div className="mt-1 text-lg font-bold text-slate-900">{data.topStores.length}</div>
                          <div className="text-sm text-slate-500">{totalShown} jobs shown</div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                        <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                          <span>Stores</span>
                          <span>Max {maxVal}</span>
                        </div>
                        <div className="space-y-2.5">
                          {(() => {
                            // Find longest name to size the label gutter evenly
                            const maxLabelLen = Math.max(...top7.map(s => s.name.length), 1)
                            return top7.map((s, i) => {
                              const barWidth = s.count === 0 ? 4 : Math.max((s.count / maxVal) * 100, 8)
                              const isLeader = s.name === leading.name && s.count === leading.count
                              return (
                                <div key={s.name} className="group flex items-center gap-0">
                                  <div
                                    className={`h-10 rounded-xl transition-all duration-300 group-hover:opacity-90 flex items-center justify-between pr-2.5 min-w-[32px] flex-1
                                      ${isLeader ? 'bg-brand-green shadow-[0_4px_12px_-6px_rgba(101,163,13,0.6)]' : 'bg-brand-green/70'}
                                    `}
                                    style={{ maxWidth: `${barWidth}%` }}
                                  >
                                    <span className="text-xs font-semibold text-white truncate pl-3 leading-tight max-w-[calc(100%-32px)]" title={s.name}>{s.name}</span>
                                    <span className="text-xs font-bold text-white flex-shrink-0">{s.count}</span>
                                  </div>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <p className="text-sm text-slate-400 py-6 text-center">No store data available</p>
              )}
            </motion.div>

            {/* Status Distribution */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Status Distribution</h2>
                  <p className="mt-1 text-sm text-slate-500">Jobs by current status</p>
                </div>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              {(() => {
                const statusData = data.statusDistribution
                const maxVal = Math.max(1, ...statusData.map((item) => item.count))
                const leadingStatus = statusData.reduce(
                  (best, item) => (item.count > best.count ? item : best),
                  statusData[0] || { status: '-', count: 0 }
                )

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">Top Status</div>
                        <div className="mt-1 text-lg font-bold text-slate-900 capitalize truncate">{leadingStatus.status}</div>
                        <div className="text-sm text-slate-500">{leadingStatus.count} jobs</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{data.totalJobs}</div>
                        <div className="text-sm text-slate-500">Across all statuses</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                      <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Job statuses</span>
                        <span>Max {maxVal}</span>
                      </div>

                      <div className="relative h-72">
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                          {[1, 2, 3, 4].map((line) => (
                            <div key={line} className="border-t border-dashed border-slate-200" />
                          ))}
                        </div>

                        <div className="absolute inset-0 flex items-end gap-2">
                          {statusData.slice(0, 8).map((item, index) => {
                            const percentage = data.totalJobs > 0 ? (item.count / data.totalJobs) * 100 : 0
                            const barHeight = item.count === 0 ? 6 : Math.max((item.count / maxVal) * 100, 8)
                            const isLeader = item.status === leadingStatus.status && item.count === leadingStatus.count

                            return (
                              <div
                                key={`${item.status}-${index}`}
                                className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-xl px-1 text-center"
                              >
                                <div className="mb-2 text-sm font-semibold text-slate-900">{item.count}</div>
                                <div
                                  className={`relative rounded-t-2xl transition-all duration-300 group-hover:opacity-90 ${
                                    isLeader ? 'bg-brand-green shadow-[0_14px_30px_-18px_rgba(101,163,13,0.9)]' : 'bg-brand-green/80'
                                  }`}
                                  style={{ height: `${barHeight}%` }}
                                >
                                  <div className="absolute inset-x-0 top-0 h-8 rounded-t-2xl bg-white/15" />
                                </div>
                                <div className="mt-3 space-y-1">
                                  <div className="text-xs font-medium capitalize leading-tight text-slate-700 group-hover:text-slate-900 truncate">{item.status}</div>
                                  <div className="text-[11px] text-slate-500">{percentage.toFixed(1)}%</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          </div>


          {/* Scheduled Install Dates - Full Width */}
          <div id="calendar" className="scroll-mt-24">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <SectionHeader title="Scheduled Install Dates" subtitle={`${data.scheduledCount} jobs with scheduled dates`} icon={<Calendar className="w-5 h-5" />} />
                            <select
                              value={calendarWorkroom}
                              onChange={(e) => setCalendarWorkroom(e.target.value)}
                              className="px-3 py-2 text-xs font-bold border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-slate-600"
                            >
                              <option value="all">All Workrooms</option>
                              {data.workrooms.map(w => (
                                <option key={w} value={w}>{w}</option>
                              ))}
                            </select>
                          </div>
                          {data.hasInstallDates ? (
                            <div className="mt-4">
                              {/* Month navigation */}
                              <div className="flex items-center justify-between mb-6">
                                <button
                                  onClick={() => setCalendarMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 })}
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-brand-green/40 hover:bg-brand-green/5 flex items-center justify-center transition-all shadow-sm"
                                >
                                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                                </button>
                                {(() => {
                                  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
                                  const monthLabel = `${monthNames[calendarMonth.month]} ${calendarMonth.year}`
                                  const prefix = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-`
                                  const monthDays = Object.entries(data.scheduledDates)
                                    .filter(([k]) => k.startsWith(prefix))
                                  const monthJobs = monthDays.reduce((acc, [, v]) => {
                                    if (calendarWorkroom === 'all') return acc + v.total
                                    return acc + (v.byWorkroom[calendarWorkroom] || 0)
                                  }, 0)
                                  return (
                                    <div className="text-center">
                                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">{monthLabel}</h3>
                                      <p className="text-xs text-slate-400 font-medium mt-0.5">{monthJobs} job{monthJobs !== 1 ? 's' : ''} scheduled</p>
                                    </div>
                                  )
                                })()}
                                <button
                                  onClick={() => setCalendarMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 })}
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-brand-green/40 hover:bg-brand-green/5 flex items-center justify-center transition-all shadow-sm"
                                >
                                  <ChevronRight className="w-4 h-4 text-slate-500" />
                                </button>
                              </div>
                              {/* Calendar card */}
                              {(() => {
                                const today = new Date()
                                const todayKey = today.toISOString().split('T')[0]
                                const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay()
                                const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate()
                                const weeks: (number | null)[][] = []
                                let week: (number | null)[] = []
                                for (let i = 0; i < firstDay; i++) week.push(null)
                                for (let d = 1; d <= daysInMonth; d++) {
                                  week.push(d)
                                  if (week.length === 7) { weeks.push(week); week = [] }
                                }
                                if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week) }
                                const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                                return (
                                  <div className="rounded-2xl overflow-hidden border border-brand-green/20 bg-brand-green/[0.03] shadow-md">
                                    {/* Day headers */}
                                    <div className="grid grid-cols-7 bg-brand-green/10 border-b border-brand-green/20">
                                      {dayLabels.map((d, idx) => (
                                        <div key={d} className={`text-center py-3 ${idx === 0 || idx === 6 ? 'bg-brand-green/[0.12]' : ''}`}>
                                          <span className="text-sm font-extrabold text-brand-green-dark uppercase tracking-wider">{d}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Weeks */}
                                    {weeks.map((w, wi) => (
                                      <div key={wi} className="grid grid-cols-7 border-b border-brand-green/10 last:border-b-0">
                                        {w.map((day, di) => {
                                          if (day === null) return (
                                            <div key={di} className="aspect-square bg-brand-green/[0.03] border-r border-brand-green/10 last:border-r-0 p-1" />
                                          )
                                          const dateKey = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                          const dateData = data.scheduledDates[dateKey]
                                          const count = dateData
                                            ? (calendarWorkroom === 'all' ? dateData.total : (dateData.byWorkroom[calendarWorkroom] || 0))
                                            : 0
                                          const isToday = dateKey === todayKey
                                          const isWeekend = di === 0 || di === 6
                                          const isScheduled = count > 0
                                          return (
                                            <div
                                              key={di}
                                              className={`aspect-square border-r border-brand-green/10 last:border-r-0 p-1 relative group transition-colors
                                                ${isToday ? 'bg-brand-green/15 ring-1 ring-brand-green/40 ring-inset' : isWeekend ? 'bg-brand-green/[0.04]' : 'bg-white hover:bg-brand-green/[0.05]'}
                                              `}
                                            >
                                              {/* Date number — top right */}
                                              <span className={`absolute top-0.5 right-1 text-2xl font-black w-8 h-8 flex items-center justify-center rounded-lg leading-none
                                                ${isToday ? 'bg-brand-green text-white shadow-md' : 'text-brand-green-dark'}
                                              `}>{day}</span>
                                              {/* Job count — center */}
                                              <div className="absolute inset-0 flex items-center justify-center">
                                                {isScheduled ? (
                                                  <span className={`inline-flex items-center justify-center text-sm font-bold rounded-lg px-1.5 py-0.5 leading-tight
                                                    ${isToday ? 'bg-white text-brand-green-dark shadow-sm' : 'bg-brand-green/20 text-brand-green-dark'}
                                                  `}>
                                                    {count} {count === 1 ? 'job' : 'jobs'}
                                                  </span>
                                                ) : (
                                                  <span className="text-[10px] text-slate-200/50">—</span>
                                                )}
                                              </div>
                                              {/* Tooltip */}
                                              {isScheduled && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                                  <span className="inline-block px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-medium shadow-xl">
                                                    {count} job{count > 1 ? 's' : ''} · {new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                              {/* Summary badges */}
                              <div className="mt-4 flex gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green-dark font-semibold">
                                  <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                                  Scheduled
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-green/5 border border-brand-green/15 text-brand-green-dark/70 font-medium">
                                  <div className="w-2.5 h-2.5 rounded-full bg-brand-green-dark" />
                                  Today
                                </span>
                                <span className="ml-auto text-brand-green-dark/60 font-medium">{data.scheduledCount} total</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 py-8 text-center">No scheduled install dates found in job records</p>
                          )}
                        </motion.div>
          </div>


          {/* Financial */}
          <div id="financial" className="scroll-mt-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-6" />
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Total PO</p><h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{fmtCurrency(data.poAmount.total)}</h3><p className="text-sm text-slate-500">{data.poAmount.count} jobs w/ PO</p></div>
                  <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/10 flex items-center justify-center shadow-sm"><DollarSign className="w-6 h-6 text-brand-green" /></div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Average PO</p><h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{fmtCurrency(data.poAmount.average)}</h3><p className="text-sm text-slate-500">Per job</p></div>
                  <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/20 flex items-center justify-center shadow-sm"><TrendingUp className="w-6 h-6 text-brand-green" /></div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-amber-400 mb-6" />
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Min PO</p><h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{fmtCurrency(data.poAmount.min)}</h3><p className="text-sm text-slate-500">Lowest</p></div>
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center shadow-sm"><DollarSign className="w-6 h-6 text-amber-500" /></div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-purple-400 mb-6" />
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Max PO</p><h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{fmtCurrency(data.poAmount.max)}</h3><p className="text-sm text-slate-500">Highest</p></div>
                  <div className="w-14 h-14 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-center shadow-sm"><DollarSign className="w-6 h-6 text-purple-500" /></div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Monthly Trend Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Monthly Jobs Trend</h2>
                  <p className="mt-1 text-sm text-slate-500">Job count over the last 12 months</p>
                </div>
                <TrendingUp className="w-5 h-5 text-slate-400" />
              </div>
              {(() => {
                const totalPeriod = data.monthlyTrend.reduce((s, t) => s + t.count, 0)
                const totalPO = data.monthlyTrend.reduce((s, t) => s + t.poTotal, 0)
                const peakMonth = data.monthlyTrend.reduce((best, t) => (t.count > best.count ? t : best), data.monthlyTrend[0] || { month: '-', count: 0 })
                const guideCount = 4
                const step = Math.ceil(maxMonthly / guideCount)
                const guideValues = Array.from({ length: guideCount + 1 }, (_, i) => i * step)
                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">Peak Month</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{fmtMonth(peakMonth.month)}</div>
                        <div className="text-sm text-slate-500">{peakMonth.count} jobs</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">12-Month Total</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{totalPeriod.toLocaleString()}</div>
                        <div className="text-sm text-slate-500">{fmtCurrency(totalPO)} PO</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Monthly Avg</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{Math.round(totalPeriod / 12)}</div>
                        <div className="text-sm text-slate-500">{fmtCurrency(Math.round(totalPO / 12))} PO</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                      <div className="relative">
                        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                          <defs>
                            <linearGradient id="monthlyGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8CB63C" stopOpacity="0.35" />
                              <stop offset="50%" stopColor="#8CB63C" stopOpacity="0.08" />
                              <stop offset="100%" stopColor="#8CB63C" stopOpacity="0.0" />
                            </linearGradient>
                            <filter id="monthlyGlow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                          </defs>
                          {/* Guide lines */}
                          {guideValues.map(v => (
                            <g key={v}>
                              <line
                                x1={chartPad} y1={chartH - chartPad - ((v / maxMonthly) * (chartH - chartPad * 2))}
                                x2={chartW - chartPad} y2={chartH - chartPad - ((v / maxMonthly) * (chartH - chartPad * 2))}
                                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4"
                              />
                              <text
                                x={chartPad - 6} y={chartH - chartPad - ((v / maxMonthly) * (chartH - chartPad * 2)) + 3}
                                textAnchor="end" className="text-[9px]" fill="#94a3b8">{v}</text>
                            </g>
                          ))}
                          {/* Area fill */}
                          <path d={`${monthlyPath} L ${monthlyPoints[monthlyPoints.length - 1].x} ${chartH - chartPad} L ${chartPad} ${chartH - chartPad} Z`} fill="url(#monthlyGrad)" />
                          {/* Smooth line */}
                          <path d={monthlyPath} fill="none" stroke="#8CB63C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#monthlyGlow)" />
                          <path d={monthlyPath} fill="none" stroke="#8CB63C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          {/* Data points */}
                          {monthlyPoints.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#8CB63C" strokeWidth="2.5" />
                              <circle cx={p.x} cy={p.y} r="2.5" fill="#8CB63C" />
                              {data.monthlyTrend[i].count > 0 && <text x={p.x} y={p.y - 13} textAnchor="middle" className="text-[10px] font-bold" fill="#1e293b">{data.monthlyTrend[i].count}</text>}
                            </g>
                          ))}
                        </svg>
                        {/* Month labels */}
                        <div className="flex justify-between mt-1 px-1">
                          {data.monthlyTrend.map(t => (
                            <span key={t.month} className="text-[10px] font-semibold text-slate-400">{fmtMonth(t.month)}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
}
