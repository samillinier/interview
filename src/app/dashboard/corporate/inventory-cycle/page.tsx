'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  FileText,
  Loader2,
  Plus,
  Save,
  Building2,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  X,
  Trash2,
} from 'lucide-react'
import { AdminSidebar } from '@/components/AdminSidebar'
import { allWorkrooms } from '@/lib/workroomMapping'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'

const PAD_TYPES = [
  'Super 6 LB',
  'Stainmaster Select',
  'Odor Ban',
  'Stainmaster Elite',
  'Stainmaster Memory Foam',
] as const

const CYCLE_TYPES = ['Weekly', 'End of Month'] as const

const PAD_MULTIPLIERS: Record<string, number> = {
  'Super 6 LB': 45,
  'Stainmaster Select': 45,
  'Odor Ban': 45,
  'Stainmaster Elite': 45,
  'Stainmaster Memory Foam': 30,
}

interface InventoryCycle {
  id: string
  createdAt: string
  updatedAt: string
  cycleCountDate: string
  cycleCountType: string
  workroom: string
  rollCounts: Record<string, number> | null
  linearFeetCounts: Record<string, number> | null
  attachmentUrls: { url: string; name: string }[] | null
  createdByEmail: string | null
  createdByName: string | null
  authorizedBy: string | null
  authorized: boolean
  authorizationMethod: string | null
}

interface CycleEntry {
  id: string
  cycleCountDate: string
  cycleCountType: string
  workroom: string
  rollCounts: Record<string, string>
  linearFeetCounts: Record<string, string>
}

export default function InventoryCyclePage() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(normalizedRole)
  const canModify = ['ADMIN', 'MODERATOR', 'SUPER_ADMIN'].includes(normalizedRole)
  const { sidebarOpen } = useSidebarOpen()

  const emptyCounts = () => Object.fromEntries(PAD_TYPES.map(p => [p, '']))

  const defaultEntry = (): CycleEntry => ({
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cycleCountDate: new Date().toISOString().split('T')[0],
    cycleCountType: '',
    workroom: '',
    rollCounts: emptyCounts(),
    linearFeetCounts: emptyCounts(),
  })

  const [entries, setEntries] = useState<CycleEntry[]>([defaultEntry()])
  const [hasAdditionalItems, setHasAdditionalItems] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [cycles, setCycles] = useState<InventoryCycle[]>([])
  const [isLoadingCycles, setIsLoadingCycles] = useState(true)
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null)
  const [filterWorkroom, setFilterWorkroom] = useState('')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && normalizedRole && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess, normalizedRole])

  const fetchCycles = useCallback(async () => {
    setIsLoadingCycles(true)
    try {
      const params = new URLSearchParams()
      if (filterWorkroom) params.set('workroom', filterWorkroom)
      const res = await fetch('/api/inventory-cycles?' + params.toString())
      const data = await res.json()
      if (data.success) setCycles(data.cycles || [])
    } catch (err) {
      console.error('Error fetching inventory cycles:', err)
    } finally {
      setIsLoadingCycles(false)
    }
  }, [filterWorkroom])

  useEffect(() => {
    if (canAccess) fetchCycles()
  }, [canAccess, fetchCycles])

  const updateEntry = (entryId: string, field: string, value: string) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, [field]: value } : e))
  }

  const updateRollCount = (entryId: string, padType: string, value: string) => {
    setEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, rollCounts: { ...e.rollCounts, [padType]: value } } : e
    ))
  }

  const updateLinearFeetCount = (entryId: string, padType: string, value: string) => {
    setEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, linearFeetCounts: { ...e.linearFeetCounts, [padType]: value } } : e
    ))
  }

  const addAdditionalEntry = () => {
    setEntries(prev => [...prev, defaultEntry()])
  }

  const removeEntry = (entryId: string) => {
    setEntries(prev => prev.length <= 1 ? prev : prev.filter(e => e.id !== entryId))
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaveSuccess(false)

    for (const e of entries) {
      if (!e.cycleCountDate) { setSaveError('All entries must have a cycle count date'); return }
      if (!e.cycleCountType) { setSaveError('All entries must have a cycle count type'); return }
      if (!e.workroom) { setSaveError('All entries must have a workroom'); return }
    }

    const payloads = entries.map(e => ({
      cycleCountDate: e.cycleCountDate,
      cycleCountType: e.cycleCountType,
      workroom: e.workroom,
      rollCounts: Object.fromEntries(
        PAD_TYPES.map(p => [p, parseInt(e.rollCounts[p]) || 0])
      ),
      linearFeetCounts: Object.fromEntries(
        PAD_TYPES.map(p => [p, parseInt(e.linearFeetCounts[p]) || 0])
      ),
      hasAdditionalItems: entries.length > 1,
    }))

    setIsSaving(true)
    try {
      for (const p of payloads) {
        const res = await fetch('/api/inventory-cycles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save') }
      }
      setSaveSuccess(true)
      setShowForm(false)
      resetForm()
      fetchCycles()
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setEntries([defaultEntry()])
    setHasAdditionalItems(false)
    setSaveSuccess(false)
    setSaveError(null)
  }

  const setAuthorization = async (cycleId: string, authorized: boolean) => {
    try {
      const res = await fetch('/api/inventory-cycles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cycleId, authorized }),
      })
      const data = await res.json()
      if (data.success && data.cycle) {
        setCycles(prev => prev.map(c => c.id === cycleId ? data.cycle : c))
      }
    } catch (err) {
      console.error('Failed to set authorization:', err)
    }
  }

  const deleteCycle = async (cycleId: string) => {
    setConfirmDeleteId(cycleId)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    const cycleId = confirmDeleteId
    try {
      const res = await fetch(`/api/inventory-cycles?id=${cycleId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setCycles(prev => prev.filter(c => c.id !== cycleId))
      }
    } catch (err) {
      console.error('Failed to delete cycle:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' })
  }

  const renderBarcode = (cycleId: string) => {
    const serial = cycleId.slice(-8)
    const seed = serial.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)
    const bars: { x: number; w: number; h: number }[] = []
    let x = 4

    bars.push({ x, w: 1.5, h: 32 }); x += 2
    bars.push({ x, w: 1.5, h: 32 }); x += 2
    bars.push({ x, w: 1.5, h: 32 }); x += 3

    let rng = seed
    for (let i = 0; i < serial.length; i++) {
      for (let b = 0; b < 5; b++) {
        rng = (rng * 16807 + 0) % 2147483647
        const isWide = (rng % 3) === 0
        const w = isWide ? 3.5 : 1.5
        bars.push({ x, w, h: 32 })
        x += w + 1.2
      }
      x += 1
    }

    bars.push({ x, w: 1.5, h: 32 }); x += 2
    bars.push({ x, w: 3.5, h: 32 }); x += 2
    bars.push({ x, w: 1.5, h: 32 }); x += 3

    const totalW = x + 4
    const scale = (s: number) => (s / totalW) * 220

    return (
      <svg className="w-72 h-16" viewBox="0 0 220 38" xmlns="http://www.w3.org/2000/svg">
        {bars.map((bar, i) => (
          <rect key={i} x={scale(bar.x)} y={2} width={scale(bar.w)} height={bar.h} fill="#1e293b" />
        ))}
        <rect x={0} y={0} width={220} height={38} fill="none" stroke="#e2e8f0" strokeWidth="0.5" rx="3" />
      </svg>
    )
  }

  const formatMonthLabel = (monthKey: string) => {
    const [y, m] = monthKey.split('-')
    return new Date(+y, +m - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  const formatWeekLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    const end = new Date(d)
    end.setDate(end.getDate() + 6)
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const analytics = (() => {
    const totalFullRolls = cycles.reduce((sum, c) => {
      if (!c.rollCounts) return sum
      return sum + Object.values(c.rollCounts as Record<string, number>).reduce((a, b) => a + b, 0)
    }, 0)
    const totalLinearFeet = cycles.reduce((sum, c) => {
      if (!c.linearFeetCounts) return sum
      return sum + Object.values(c.linearFeetCounts as Record<string, number>).reduce((a, b) => a + b, 0)
    }, 0)

    // Group records by week and month, filtered by cycleCountType
    const byWeek: Record<string, { label: string; records: InventoryCycle[] }> = {}
    const byMonth: Record<string, { label: string; records: InventoryCycle[] }> = {}

    for (const c of cycles) {
      const d = new Date(c.cycleCountDate)

      if (c.cycleCountType === 'Weekly') {
        const dayOfWeek = d.getDay()
        const monday = new Date(d)
        monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
        const weekKey = monday.toISOString().split('T')[0]
        if (!byWeek[weekKey]) byWeek[weekKey] = { label: formatWeekLabel(monday.toISOString().split('T')[0]), records: [] }
        byWeek[weekKey].records.push(c)
      }

      if (c.cycleCountType === 'End of Month') {
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!byMonth[monthKey]) byMonth[monthKey] = { label: formatMonthLabel(monthKey), records: [] }
        byMonth[monthKey].records.push(c)
      }
    }

    const weekGroups = Object.entries(byWeek)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => ({ key, label: val.label, records: val.records }))

    const monthGroups = Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => ({ key, label: val.label, records: val.records }))

    return {
      totalCycles: cycles.length,
      authorizedCount: cycles.filter(c => c.authorized).length,
      totalFullRolls,
      totalLinearFeet,
      weekGroups,
      monthGroups,
    }
  })()

  if (sessionStatus === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
    </div>
  )

  if (!session || !canAccess) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Unauthorized</h2>
        <p className="text-slate-500 mb-6">Please log in with an authorized account.</p>
        <button onClick={() => router.push('/login')}
          className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors">
          Go to Login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-[1550px] mx-auto space-y-8">

          {/* Header */}
          <div className="rounded-2xl border border-brand-green-dark/20 bg-brand-green shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Inventory Cycle Information</h1>
                <p className="text-emerald-50/90">Track cycle counts for full rolls and linear feet by pad type.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <FileText className="w-3.5 h-3.5" />{analytics.totalCycles} cycles
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />{analytics.authorizedCount} authorized
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <Package className="w-3.5 h-3.5" />{analytics.totalFullRolls} full rolls
                  </span>
                </div>
              </div>
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20 flex-shrink-0">
                <Plus className="w-5 h-5" />New Cycle Count
              </button>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Cycles', value: analytics.totalCycles, desc: 'Cycle count records' },
                { label: 'Authorized', value: analytics.authorizedCount, desc: 'Approved cycles' },
                { label: 'Full Rolls', value: analytics.totalFullRolls, desc: 'Total full rolls counted' },
                { label: 'LF', value: analytics.totalLinearFeet, desc: 'Total linear feet counted' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                  <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">{card.label}</p>
                    <h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-1">{card.value}</h3>
                    <p className="text-sm text-slate-500">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly & Monthly Grouped Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Counts */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Weekly Counts</h2>
                    <p className="text-xs text-slate-400">{analytics.weekGroups.length} week{analytics.weekGroups.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              {analytics.weekGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Calendar className="w-8 h-8 mb-2" />
                  <p className="text-sm">No weekly data yet</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-100 sticky top-0 bg-white">
                        <th className="text-left py-2 px-5 font-semibold">Date</th>
                        <th className="text-left py-2 px-3 font-semibold">Type</th>
                        <th className="text-left py-2 px-3 font-semibold">Workroom</th>
                        <th className="text-left py-2 px-3 font-semibold">Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.weekGroups.flatMap(g => g.records).map((c) => {
                        const rc = (c.rollCounts || {}) as Record<string, number>
                        const lf = (c.linearFeetCounts || {}) as Record<string, number>
                        return (
                        <tr key={c.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 px-5 text-slate-600 whitespace-nowrap">{formatDate(c.cycleCountDate)}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-semibold">{c.cycleCountType}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{c.workroom}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {PAD_TYPES.map(pt => {
                                const rolls = (rc[pt] || 0)
                                const ft = (lf[pt] || 0)
                                if (rolls === 0 && ft === 0) return null
                                const totalFt = rolls * (PAD_MULTIPLIERS[pt] || 45) + ft
                                return (
                                  <span key={pt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-green/10 text-brand-green rounded-full text-[10px] font-semibold">
                                    {pt}: {rolls}R / {totalFt}LF
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* End of Month Counts */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">End of Month Counts</h2>
                    <p className="text-xs text-slate-400">{analytics.monthGroups.length} month{analytics.monthGroups.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              {analytics.monthGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Calendar className="w-8 h-8 mb-2" />
                  <p className="text-sm">No monthly data yet</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-100 sticky top-0 bg-white">
                        <th className="text-left py-2 px-5 font-semibold">Date</th>
                        <th className="text-left py-2 px-3 font-semibold">Type</th>
                        <th className="text-left py-2 px-3 font-semibold">Workroom</th>
                        <th className="text-left py-2 px-3 font-semibold">Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.monthGroups.flatMap(g => g.records).map((c) => {
                        const rc = (c.rollCounts || {}) as Record<string, number>
                        const lf = (c.linearFeetCounts || {}) as Record<string, number>
                        return (
                        <tr key={c.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 px-5 text-slate-600 whitespace-nowrap">{formatDate(c.cycleCountDate)}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-semibold">{c.cycleCountType}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{c.workroom}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {PAD_TYPES.map(pt => {
                                const rolls = (rc[pt] || 0)
                                const ft = (lf[pt] || 0)
                                if (rolls === 0 && ft === 0) return null
                                const totalFt = rolls * (PAD_MULTIPLIERS[pt] || 45) + ft
                                return (
                                  <span key={pt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-green/10 text-brand-green rounded-full text-[10px] font-semibold">
                                    {pt}: {rolls}R / {totalFt}LF
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Records</h2>
                    <p className="text-xs text-slate-400">{cycles.length} record{cycles.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <select value={filterWorkroom} onChange={(e) => setFilterWorkroom(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium">
                  <option value="">All Workrooms</option>
                  {allWorkrooms().map((w: string) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>

            {isLoadingCycles ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-brand-green animate-spin mb-3" />
                <p className="text-sm text-slate-400">Loading inventory cycles...</p>
              </div>
            ) : cycles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No inventory cycles yet</p>
                <p className="text-xs text-slate-300 mt-1">Click "New Cycle Count" to create your first record</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                      <th className="text-left py-3 px-5 font-semibold whitespace-nowrap">Added By</th>
                      <th className="text-left py-3 px-5 font-semibold">Date</th>
                      <th className="text-left py-3 px-5 font-semibold">Workroom</th>
                      <th className="text-left py-3 px-5 font-semibold">Items</th>
                      <th className="text-left py-3 px-4 font-semibold">Authorization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycles.map((c) => (
                      <React.Fragment key={c.id}>
                        <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedCycle(expandedCycle === c.id ? null : c.id)}>
                          <td className="py-3.5 px-5"><span className="text-sm font-medium text-slate-700 whitespace-nowrap">{c.createdByName || c.createdByEmail || '-'}</span></td>
                          <td className="py-3.5 px-5"><div className="flex items-center gap-2 whitespace-nowrap"><Calendar className="w-3.5 h-3.5 text-brand-green flex-shrink-0" /><span className="font-medium text-slate-700">{formatDate(c.cycleCountDate)}</span></div></td>
                          <td className="py-3.5 px-5"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-green/10 text-brand-green rounded-full text-xs font-semibold"><Building2 className="w-3 h-3" />{c.workroom}</span></td>
                          <td className="py-3.5 px-5">
                            <div className="flex flex-wrap gap-1">
                              {PAD_TYPES.map(pt => {
                                const rolls = c.rollCounts ? ((c.rollCounts as Record<string, number>)[pt] ?? 0) : 0
                                const ft = c.linearFeetCounts ? ((c.linearFeetCounts as Record<string, number>)[pt] ?? 0) : 0
                                if (rolls === 0 && ft === 0) return null
                                const totalFt = rolls * (PAD_MULTIPLIERS[pt] || 45) + ft
                                return (
                                  <span key={pt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-green/10 text-brand-green rounded-full text-[11px] font-semibold">
                                    <Package className="w-3 h-3" />
                                    {pt} - {rolls}R / {totalFt}LF
                                  </span>
                                )
                              })}
                              {PAD_TYPES.every(pt => {
                                const rolls = c.rollCounts ? ((c.rollCounts as Record<string, number>)[pt] ?? 0) : 0
                                const ft = c.linearFeetCounts ? ((c.linearFeetCounts as Record<string, number>)[pt] ?? 0) : 0
                                return rolls === 0 && ft === 0
                              }) && <span className="text-xs text-slate-400">-</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between gap-2">
                              {c.authorized ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold whitespace-nowrap"><CheckCircle2 className="w-3 h-3 flex-shrink-0" />{c.authorizedBy || c.authorizationMethod || 'Authorized'}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-semibold whitespace-nowrap"><AlertCircle className="w-3 h-3 flex-shrink-0" />Pending</span>
                              )}
                              {canModify && (
                              <select key={c.id + '-' + c.authorized} defaultValue={c.authorized ? 'authorized' : 'denied'}
                                onChange={(e) => { if (e.target.value === 'authorized') setAuthorization(c.id, true); else if (e.target.value === 'denied') setAuthorization(c.id, false); else if (e.target.value === 'delete') deleteCycle(c.id) }}
                                className="px-1.5 py-1 border border-slate-200 rounded-md bg-slate-50 text-xs font-medium text-slate-500 focus:ring-1 focus:ring-brand-green/20 focus:border-brand-green outline-none cursor-pointer">
                                <option value="authorized">Authorize</option><option value="denied">Deny</option><option value="delete">Delete</option>
                              </select>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedCycle === c.id && (
                          <tr>
                            <td colSpan={5} className="px-5 py-4 bg-slate-50/30">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <Card label="Date" value={formatDate(c.cycleCountDate)} />
                                <Card label="Cycle Type" value={c.cycleCountType} />
                                <Card label="Workroom" value={c.workroom} />
                                <Card label="Added By" value={c.createdByName || c.createdByEmail || '-'} />
                                <Card label="Authorized By" value={c.authorized ? (c.authorizedBy || c.authorizationMethod || '-') : '-'} />
                              </div>

                              <div className="mt-3 bg-white rounded-lg p-4 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Counts by Pad Type</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-xs text-slate-500 border-b border-slate-100">
                                        <th className="text-left py-2 px-3 font-semibold">Pad Type</th>
                                        <th className="text-center py-2 px-3 font-semibold">Full Rolls</th>
                                        <th className="text-center py-2 px-3 font-semibold">Linear Feet (Partial)</th>
                                        <th className="text-center py-2 px-3 font-semibold">Total LF</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {PAD_TYPES.map(padType => {
                                        const rolls = c.rollCounts ? ((c.rollCounts as Record<string, number>)[padType] ?? 0) : 0
                                        const ft = c.linearFeetCounts ? ((c.linearFeetCounts as Record<string, number>)[padType] ?? 0) : 0
                                        const totalFt = rolls * (PAD_MULTIPLIERS[padType] || 45) + ft
                                        return (
                                        <tr key={padType} className="border-b border-slate-50 last:border-0">
                                          <td className="py-2 px-3">
                                            <div className="flex items-center gap-2">
                                              <Package className="w-3.5 h-3.5 text-brand-green" />
                                              <span className="font-medium text-slate-700">{padType}</span>
                                            </div>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className="font-semibold text-slate-800">{rolls}</span>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className="font-semibold text-slate-800">{ft}</span>
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <span className="font-semibold text-brand-green">{totalFt}</span>
                                          </td>
                                        </tr>
                                      )})}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-end bg-white rounded-lg p-4 border border-slate-100">
                                <div className="flex flex-col items-center">
                                  <div className="-mb-1">{renderBarcode(c.id)}</div>
                                  <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest leading-none">
                                    {c.id.slice(-8).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          </div>
        </div>

        {/* New Cycle Count Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm() }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center"><Plus className="w-5 h-5 text-brand-green" /></div>
                  <div><h2 className="text-base font-bold text-slate-800">New Cycle Count</h2><p className="text-xs text-slate-400">Enter inventory cycle count details</p></div>
                </div>
                <button onClick={() => { setShowForm(false); resetForm() }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
              </div>

              <div className="p-6 space-y-5">
                {entries.map((entry, idx) => (
                  <div key={entry.id}>
                    {idx > 0 && (
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-brand-green bg-brand-green/10 px-2.5 py-1 rounded-full">Entry {idx + 1}</span>
                        {entries.length > 1 && (
                          <button onClick={() => removeEntry(entry.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <X className="w-3 h-3" />Remove
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-brand-green" />Cycle Count Date</span>
                        </label>
                        <input type="date" value={entry.cycleCountDate}
                          onChange={(e) => updateEntry(entry.id, 'cycleCountDate', e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5 text-brand-green" />Cycle Count Type</span>
                        </label>
                        <select value={entry.cycleCountType}
                          onChange={(e) => updateEntry(entry.id, 'cycleCountType', e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium">
                          <option value="">Select type...</option>
                          {CYCLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-brand-green" />Workroom</span>
                        </label>
                        <select value={entry.workroom}
                          onChange={(e) => updateEntry(entry.id, 'workroom', e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium">
                          <option value="">Select workroom</option>
                          {allWorkrooms().map((wr: string) => <option key={wr} value={wr}>{wr}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-slate-600 mb-2">
                        <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-brand-green" />Pad Counts</span>
                      </label>
                      <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="text-xs font-semibold text-slate-500 uppercase bg-slate-100/50 border-b border-slate-200">
                              <th className="text-left py-2 px-3 w-[30%]">Pad Type</th>
                              <th className="text-center py-2 px-2 w-[22%]">Full Roll Count</th>
                              <th className="text-center py-2 px-2 w-[24%]">Linear Feet (Partial)</th>
                              <th className="text-center py-2 px-2 w-[24%]">Total LF</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PAD_TYPES.map((padType) => {
                              const rollsVal = parseInt(entry.rollCounts[padType]) || 0
                              const ftVal = parseInt(entry.linearFeetCounts[padType]) || 0
                              const totalFt = rollsVal * (PAD_MULTIPLIERS[padType] || 45) + ftVal
                              return (
                              <tr key={padType} className="border-b border-slate-100 last:border-0">
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <Package className="w-3 h-3 text-brand-green flex-shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 truncate">{padType}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-2">
                                  <input type="number" min="0" value={entry.rollCounts[padType]}
                                    onChange={(e) => updateRollCount(entry.id, padType, e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2 py-1.5 text-xs border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none text-center font-medium" />
                                </td>
                                <td className="py-2 px-2">
                                  <input type="number" min="0" value={entry.linearFeetCounts[padType]}
                                    onChange={(e) => updateLinearFeetCount(entry.id, padType, e.target.value)}
                                    placeholder="0"
                                    className="w-full px-2 py-1.5 text-xs border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none text-center font-medium" />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className="text-xs font-semibold text-brand-green">{totalFt}</span>
                                </td>
                              </tr>
                            )})}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {idx < entries.length - 1 && <hr className="mt-4 border-slate-100" />}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={hasAdditionalItems}
                      onChange={(e) => {
                        setHasAdditionalItems(e.target.checked)
                        if (!e.target.checked) setEntries(prev => prev.slice(0, 1))
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-brand-green focus:ring-brand-green/30 accent-brand-green" />
                    <span className="text-sm font-medium text-slate-600">Additional entries?</span>
                  </label>
                  {hasAdditionalItems && (
                    <button type="button" onClick={addAdditionalEntry}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-green bg-brand-green/10 rounded-lg hover:bg-brand-green/20 transition-colors">
                      <Plus className="w-3.5 h-3.5" />Add Entry
                    </button>
                  )}
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />Cycle counts saved successfully!
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={handleSave} disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed">
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Cycle Counts</>}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                    className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Inventory Cycle</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Are you sure you want to delete this inventory cycle? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-100">
      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}
