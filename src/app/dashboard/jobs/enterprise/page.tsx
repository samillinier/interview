'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Briefcase,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wrench,
} from 'lucide-react'

import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface EnterpriseAnalytics {
  summary: {
    totalCrewPay: number
    crewPayCount: number
    avgCrewPay: number
    minCrewPay: number
    maxCrewPay: number
    totalPO: number
    poCount: number
    marginPct: number
  }
  byWorkroom: { workroom: string; total: number; count: number; avg: number }[]
  byLaborCategory: { category: string; total: number; count: number; avg: number }[]
  topInstallers: { name: string; total: number; count: number }[]
  crewPayTrend: { month: string; total: number }[]
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function EnterprisePage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(String((session?.user as any)?.role || '').toUpperCase())

  const [data, setData] = useState<EnterpriseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/enterprise/analytics', { cache: 'no-store' })
      if (res.ok) {
        setData(await res.json())
      } else {
        setError('Failed to load enterprise analytics')
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Failed to load</h2>
          <p className="text-slate-500 mb-4">{error}</p>
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors">Retry</button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const s = data.summary

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="max-w-[1400px] mx-auto">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-brand-green mb-2">Jobs · Enterprise</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Enterprise Analytics</h1>
              <p className="text-sm text-slate-500">Crew pay data, labor costs, and profit margins across the business.</p>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
              <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-6" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Total Crew Pay</p><h3 className="text-3xl sm:text-4xl leading-none font-black tracking-tight text-slate-900 mb-2 tabular-nums">{fmtCurrency(s.totalCrewPay)}</h3><p className="text-sm text-slate-500">{s.crewPayCount} jobs with crew pay</p></div>
                <div className="w-14 h-14 shrink-0 bg-brand-green/10 rounded-2xl border border-brand-green/10 flex items-center justify-center shadow-sm"><DollarSign className="w-6 h-6 text-brand-green" /></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
              <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Average Crew Pay</p><h3 className="text-3xl sm:text-4xl leading-none font-black tracking-tight text-slate-900 mb-2 tabular-nums">{fmtCurrency(s.avgCrewPay)}</h3><p className="text-sm text-slate-500">Per job</p></div>
                <div className="w-14 h-14 shrink-0 bg-brand-green/10 rounded-2xl border border-brand-green/20 flex items-center justify-center shadow-sm"><TrendingUp className="w-6 h-6 text-brand-green" /></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
              <div className="h-1.5 w-full rounded-full bg-amber-400 mb-6" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Total PO Value</p><h3 className="text-3xl sm:text-4xl leading-none font-black tracking-tight text-slate-900 mb-2 tabular-nums">{fmtCurrency(s.totalPO)}</h3><p className="text-sm text-slate-500">{s.poCount} jobs with PO</p></div>
                <div className="w-14 h-14 shrink-0 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center shadow-sm"><DollarSign className="w-6 h-6 text-amber-500" /></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
              <div className="h-1.5 w-full rounded-full bg-purple-400 mb-6" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Margin</p><h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{s.marginPct}%</h3><p className="text-sm text-slate-500">PO minus crew pay</p></div>
                <div className="w-14 h-14 shrink-0 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-center shadow-sm"><Building2 className="w-6 h-6 text-purple-500" /></div>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Crew Pay by Workroom</h2>
            <p className="text-sm text-slate-500 mb-5">Total crew pay and averages per workroom</p>
            {data.byWorkroom.length > 0 ? (
              <div className="space-y-3">
                {data.byWorkroom.slice(0, 8).map((wr) => {
                  const maxVal = Math.max(...data.byWorkroom.map(w => w.total), 1)
                  const barWidth = Math.max((wr.total / maxVal) * 100, 4)
                  const isLeader = wr === data.byWorkroom[0]
                  return (
                    <div key={wr.workroom} className="group flex items-center gap-0">
                      <div className={`h-10 rounded-xl transition-all duration-300 group-hover:opacity-90 flex items-center justify-between pr-3 min-w-[32px] flex-1 ${isLeader ? 'bg-brand-green shadow-[0_4px_12px_-6px_rgba(101,163,13,0.6)]' : 'bg-brand-green/70'}`} style={{ maxWidth: `${barWidth}%` }}>
                        <span className="text-xs font-semibold text-white truncate pl-3 leading-tight">{wr.workroom}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-bold text-white">{fmtCurrency(wr.total)}</span>
                          <span className="text-[10px] text-white/80 w-16 text-right">{wr.count} jobs · {fmtCurrency(wr.avg)}/ea</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">No crew pay data yet. Crew pay populates through the Cilio auto-sync enrichment phase.</p>
            )}
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">By Labor Category</h2>
              <p className="text-sm text-slate-500 mb-5">Average crew pay per category</p>
              {data.byLaborCategory.length > 0 ? (
                <div className="space-y-2.5">
                  {data.byLaborCategory.slice(0, 8).map((item) => {
                    const maxAvg = Math.max(...data.byLaborCategory.map(c => c.avg), 1)
                    const barWidth = Math.max((item.avg / maxAvg) * 100, 4)
                    return (
                      <div key={item.category} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-700 w-28 truncate">{item.category}</span>
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-green/70 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-20 text-right">{fmtCurrency(item.avg)} · {item.count} jobs</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-6 text-center">No category data</p>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Top Installers</h2>
              <p className="text-sm text-slate-500 mb-5">By total crew pay</p>
              {data.topInstallers.length > 0 ? (
                <div className="space-y-2.5">
                  {data.topInstallers.map((inst) => {
                    const maxVal = Math.max(...data.topInstallers.map(i => i.total), 1)
                    const barWidth = Math.max((inst.total / maxVal) * 100, 4)
                    return (
                      <div key={inst.name} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-700 w-24 truncate">{inst.name}</span>
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-green/70 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-20 text-right">{fmtCurrency(inst.total)} · {inst.count} jobs</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-6 text-center">No installer data</p>
              )}
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Crew Pay Trend</h2>
            <p className="text-sm text-slate-500 mb-5">Monthly crew pay over the last 12 months</p>
            {data.crewPayTrend.length > 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                <div className="relative">
                  <svg viewBox="0 0 800 280" className="w-full h-auto">
                    <defs>
                      <linearGradient id="crewPayGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8CB63C" stopOpacity="0.35" />
                        <stop offset="50%" stopColor="#8CB63C" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#8CB63C" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const pad = 50
                      const w = 800
                      const h = 280
                      const maxVal = Math.max(...data.crewPayTrend.map(t => t.total), 1)
                      const points = data.crewPayTrend.map((t, i) => ({
                        x: pad + (i / (data.crewPayTrend.length - 1)) * (w - pad * 2),
                        y: h - pad - ((t.total / maxVal) * (h - pad * 2)),
                      }))
                      const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                      const step = Math.ceil(maxVal / 4)
                      const guides = Array.from({ length: 5 }, (_, i) => i * step)
                      return (
                        <>
                          {guides.map(v => (
                            <g key={v}>
                              <line x1={pad} y1={h - pad - ((v / maxVal) * (h - pad * 2))} x2={w - pad} y2={h - pad - ((v / maxVal) * (h - pad * 2))} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                              <text x={pad - 6} y={h - pad - ((v / maxVal) * (h - pad * 2)) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v}`}</text>
                            </g>
                          ))}
                          <path d={`${path} L ${points[points.length-1].x} ${h - pad} L ${pad} ${h - pad} Z`} fill="url(#crewPayGrad)" />
                          <path d={path} fill="none" stroke="#8CB63C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          {points.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#8CB63C" strokeWidth="2" />
                              <circle cx={p.x} cy={p.y} r="1.5" fill="#8CB63C" />
                            </g>
                          ))}
                        </>
                      )
                    })()}
                  </svg>
                  <div className="flex justify-between mt-1 px-1">
                    {data.crewPayTrend.filter((_, i) => i % 2 === 0).map(t => (
                      <span key={t.month} className="text-[10px] font-semibold text-slate-400">{fmtMonth(t.month)}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No trend data available</p>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
