'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  FileText,
  Loader2,
  Plus,
  Trash2,
  Save,
  Building2,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  X,
  TrendingUp,
  Camera,
} from 'lucide-react'
import { AdminSidebar } from '@/components/AdminSidebar'
import { allWorkrooms } from '@/lib/workroomMapping'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'

const PREDEFINED_ITEMS = [
  'Super 6 LB',
  'Stainmaster Select',
  'Odor Ban',
  'Stainmaster Elite',
  'Stainmaster Memory Foam',
] as const

interface PadOrderItem {
  id: string
  name: string
  quantity: number
  isCustom: boolean
}

interface PadOrder {
  id: string
  createdAt: string
  updatedAt: string
  workroom: string
  dateReceived: string
  items: PadOrderItem[]
  hasAdditionalItems: boolean
  attachmentUrls: { url: string; name: string }[] | null
  createdByEmail: string | null
  createdByName: string | null
  authorizedBy: string | null
  authorized: boolean
  authorizationMethod: string | null
}

interface OrderEntry {
  id: string
  workroom: string
  dateReceived: string
  selectedItems: Record<string, { checked: boolean; quantity: number }>
  attachmentUrls: { url: string; name: string }[]
}

export default function BolPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(normalizedRole)
  const { sidebarOpen } = useSidebarOpen()

  const defaultEntry = (): OrderEntry => ({
    id: `entry-${Date.now()}`,
    workroom: '',
    dateReceived: new Date().toISOString().split('T')[0],
    selectedItems: Object.fromEntries(PREDEFINED_ITEMS.map(item => [item, { checked: false, quantity: 0 }])),
    attachmentUrls: [],
  })

  const [entries, setEntries] = useState<OrderEntry[]>([defaultEntry()])
  const [hasAdditionalItems, setHasAdditionalItems] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [orders, setOrders] = useState<PadOrder[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [filterWorkroom, setFilterWorkroom] = useState('')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && normalizedRole && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess, normalizedRole])

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true)
    try {
      const params = new URLSearchParams()
      if (filterWorkroom) params.set('workroom', filterWorkroom)
      const res = await fetch(`/api/pad-orders?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.orders || [])
      }
    } catch (err) {
      console.error('Error fetching pad orders:', err)
    } finally {
      setIsLoadingOrders(false)
    }
  }, [filterWorkroom])

  useEffect(() => {
    if (canAccess) fetchOrders()
  }, [canAccess, fetchOrders])

  const updateEntry = (entryId: string, field: string, value: any) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, [field]: value } : e))
  }

  const updateEntryItem = (entryId: string, itemName: string, updates: Partial<{ checked: boolean; quantity: number }>) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      return { ...e, selectedItems: { ...e.selectedItems, [itemName]: { ...e.selectedItems[itemName], ...updates } } }
    }))
  }

  const handleItemToggle = (entryId: string, itemName: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      const cur = e.selectedItems[itemName]
      return { ...e, selectedItems: { ...e.selectedItems, [itemName]: { checked: !cur.checked, quantity: cur.checked ? 0 : 1 } } }
    }))
  }

  const handleItemQuantity = (entryId: string, itemName: string, qty: number) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e
      return { ...e, selectedItems: { ...e.selectedItems, [itemName]: { ...e.selectedItems[itemName], quantity: Math.max(0, qty) } } }
    }))
  }

  const addAdditionalEntry = () => {
    setEntries(prev => [...prev, defaultEntry()])
  }

  const removeEntry = (entryId: string) => {
    setEntries(prev => prev.length <= 1 ? prev : prev.filter(e => e.id !== entryId))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, entryId: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/pad-orders/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.success) {
          setEntries(prev => prev.map(en =>
            en.id === entryId ? { ...en, attachmentUrls: [...en.attachmentUrls, { url: data.url, name: data.name }] } : en
          ))
        }
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeAttachment = (entryId: string, idx: number) => {
    setEntries(prev => prev.map(en =>
      en.id === entryId ? { ...en, attachmentUrls: en.attachmentUrls.filter((_, i) => i !== idx) } : en
    ))
  }

  const buildEntryItems = (entry: OrderEntry): PadOrderItem[] => {
    const items: PadOrderItem[] = []
    for (const itemName of PREDEFINED_ITEMS) {
      const item = entry.selectedItems[itemName]
      if (item.checked && item.quantity > 0) {
        items.push({ id: `pre-${itemName.replace(/\s+/g, '-').toLowerCase()}`, name: itemName, quantity: item.quantity, isCustom: false })
      }
    }
    return items
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaveSuccess(false)

    const payloads = entries.map(e => ({
      workroom: e.workroom,
      dateReceived: e.dateReceived,
      items: buildEntryItems(e),
      hasAdditionalItems: entries.length > 1,
      attachmentUrls: e.attachmentUrls,
    }))

    // Validate
    for (const p of payloads) {
      if (!p.workroom) { setSaveError('All entries must have a workroom'); return }
      if (!p.dateReceived) { setSaveError('All entries must have a date'); return }
      if (!p.items || p.items.length === 0) { setSaveError('Each entry must have at least one item with a quantity'); return }
    }

    setIsSaving(true)
    try {
      for (const p of payloads) {
        const res = await fetch('/api/pad-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Failed to save')
        }
      }

      setSaveSuccess(true)
      setShowForm(false)
      resetForm()
      fetchOrders()
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const hasAnyItemSelected = () => {
    return entries.some(e => {
      for (const itemName of PREDEFINED_ITEMS) {
        if (e.selectedItems[itemName].checked && e.selectedItems[itemName].quantity > 0) return true
      }
      return false
    })
  }

  const resetForm = () => {
    setEntries([defaultEntry()])
    setHasAdditionalItems(false)
    setSaveSuccess(false)
    setSaveError(null)
  }

  const setAuthorization = async (orderId: string, authorized: boolean) => {
    try {
      const res = await fetch('/api/pad-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, authorized }),
      })
      const data = await res.json()
      if (data.success && data.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o))
      }
    } catch (err) {
      console.error('Failed to set authorization:', err)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderBarcode = (orderId: string) => {
    const serial = orderId.slice(-8)
    // Build a seeded deterministic bar pattern from the serial
    const seed = serial.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)
    const bars: { x: number; w: number; h: number }[] = []
    let x = 4

    // Start guard (3 bars: narrow, narrow, narrow)
    bars.push({ x, w: 1.5, h: 32 }); x += 2
    bars.push({ x, w: 1.5, h: 32 }); x += 2
    bars.push({ x, w: 1.5, h: 32 }); x += 3

    // Encode each character of the serial as a 5-bar pattern
    let rng = seed
    for (let i = 0; i < serial.length; i++) {
      // Generate 5 bars per character with varied widths (1.5 = narrow, 3.5 = wide)
      for (let b = 0; b < 5; b++) {
        rng = (rng * 16807 + 0) % 2147483647
        const isWide = (rng % 3) === 0
        const w = isWide ? 3.5 : 1.5
        bars.push({ x, w, h: 32 })
        x += w + 1.2
      }
      // Gap between characters
      x += 1
    }

    // Stop guard (2 bars: narrow, wide)
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const buildSmoothSvgPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const cpX = (curr.x + next.x) / 2
      path += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`
    }
    return path
  }

  // ── Analytics ──
  const analytics = (() => {
    const items = orders.flatMap(o => (o.items as PadOrderItem[]))
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)

    const byWeek: Record<string, { count: number; totalQty: number }> = {}
    const byMonth: Record<string, { count: number; totalQty: number }> = {}
    const byWorkroom: Record<string, { count: number; totalQty: number }> = {}

    for (const o of orders) {
      if (!byWorkroom[o.workroom]) byWorkroom[o.workroom] = { count: 0, totalQty: 0 }
      byWorkroom[o.workroom].count++

      const d = new Date(o.dateReceived)
      const dayOfWeek = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
      const weekKey = monday.toISOString().split('T')[0]

      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, totalQty: 0 }
      byWeek[weekKey].count++

      if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, totalQty: 0 }
      byMonth[monthKey].count++

      for (const item of (o.items as PadOrderItem[])) {
        byWorkroom[o.workroom].totalQty += item.quantity
        byWeek[weekKey].totalQty += item.quantity
        byMonth[monthKey].totalQty += item.quantity
      }
    }

    const weekEntries = Object.entries(byWeek).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6)
    const monthEntries = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6)

    // Chart-ready data: ascending order, all entries
    const weekChartData = Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, d]) => ({ label: formatWeekLabel(key), key, count: d.count, totalQty: d.totalQty }))

    const monthChartData = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, d]) => ({ label: formatMonthLabel(key), key, count: d.count, totalQty: d.totalQty }))

    // Peak values
    const weekMaxQty = Math.max(1, ...weekChartData.map(w => w.totalQty))
    const monthMaxQty = Math.max(1, ...monthChartData.map(m => m.count))
    const peakWeek = weekChartData.reduce((best, w) => (w.totalQty > best.totalQty ? w : best), weekChartData[0] || { label: '-', key: '', count: 0, totalQty: 0 })
    const peakMonth = monthChartData.reduce((best, m) => (m.count > best.count ? m : best), monthChartData[0] || { label: '-', key: '', count: 0, totalQty: 0 })
    const weekTotalQty = weekChartData.reduce((s, w) => s + w.totalQty, 0)
    const monthTotalCount = monthChartData.reduce((s, m) => s + m.count, 0)
    const weekAvgQty = weekChartData.length > 0 ? Math.round(weekTotalQty / weekChartData.length) : 0
    const monthAvgCount = monthChartData.length > 0 ? Math.round(monthTotalCount / monthChartData.length) : 0

    // SVG chart dimensions & helpers
    const monthChartW = 640
    const monthChartH = 260
    const monthPad = 32
    const monthBaseline = monthChartH - monthPad
    const monthInnerH = monthBaseline - monthPad

    const monthPoints = monthChartData.map((item, i) => {
      const x = monthChartData.length === 1
        ? monthChartW / 2
        : monthPad + (i / (monthChartData.length - 1)) * (monthChartW - monthPad * 2)
      const y = monthBaseline - (item.count / monthMaxQty) * monthInnerH
      return { ...item, x, y }
    })

    const monthPath = monthPoints.length
      ? buildSmoothSvgPath(monthPoints)
      : ''
    const monthAreaPath = monthPoints.length
      ? `${monthPath} L ${monthPoints[monthPoints.length - 1].x} ${monthBaseline} L ${monthPoints[0].x} ${monthBaseline} Z`
      : ''

    const monthGuideCount = 4
    const monthStep = Math.ceil(monthMaxQty / monthGuideCount)
    const monthGuideValues = Array.from({ length: monthGuideCount + 1 }, (_, i) => i * monthStep)

    return {
      totalOrders: orders.length,
      totalItems: items.length,
      totalQuantity,
      byWorkroom,
      weekEntries,
      monthEntries,
      weekChartData,
      monthChartData,
      weekMaxQty,
      monthMaxQty,
      peakWeek,
      peakMonth,
      weekTotalQty,
      monthTotalCount,
      weekAvgQty,
      monthAvgCount,
      monthChartW,
      monthChartH,
      monthPad,
      monthBaseline,
      monthInnerH,
      monthPoints,
      monthPath,
      monthAreaPath,
      monthGuideValues,
    }
  })()

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    )
  }

  if (!session || !canAccess) {
    return (
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
  }

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
                <h1 className="text-3xl font-bold text-white mb-2">BOL (Bill of Lading)</h1>
                <p className="text-emerald-50/90">Create and manage pad orders received and bill of lading records.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <FileText className="w-3.5 h-3.5" />
                    {analytics.totalOrders} orders
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <Package className="w-3.5 h-3.5" />
                    {analytics.totalItems} line items
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <Building2 className="w-3.5 h-3.5" />
                    {Object.keys(analytics.byWorkroom).length} workrooms
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20 flex-shrink-0"
              >
                <Plus className="w-5 h-5" />
                New Pad Order
              </button>
            </div>
          </div>

          {/* ── Analytics Section ── */}
            <div className="space-y-8">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Total Orders</p>
                  <h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-1">{analytics.totalOrders}</h3>
                  <p className="text-sm text-slate-500">Pad order records</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Line Items</p>
                  <h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-1">{analytics.totalItems}</h3>
                  <p className="text-sm text-slate-500">Total item entries</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Total Quantity</p>
                  <h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-1">{analytics.totalQuantity}</h3>
                  <p className="text-sm text-slate-500">Combined qty across items</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Workrooms</p>
                  <h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-1">{Object.keys(analytics.byWorkroom).length}</h3>
                  <p className="text-sm text-slate-500">Active from records</p>
                </div>
              </div>
            </div>

          </div>

          {/* ── Orders Table ── */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Records</h2>
                    <p className="text-xs text-slate-400">{orders.length} record{orders.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <select
                  value={filterWorkroom}
                  onChange={(e) => setFilterWorkroom(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                >
                  <option value="">All Workrooms</option>
                  {allWorkrooms().map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>

            {isLoadingOrders ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-brand-green animate-spin mb-3" />
                <p className="text-sm text-slate-400">Loading pad orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No pad orders yet</p>
                <p className="text-xs text-slate-300 mt-1">Click &quot;New Pad Order&quot; to create your first record</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                      <th className="text-left py-3 px-5 font-semibold">Added By</th>
                      <th className="text-left py-3 px-5 font-semibold">Workroom</th>
                      <th className="text-left py-3 px-5 font-semibold">Date</th>
                      <th className="text-left py-3 px-5 font-semibold">Authorized By</th>
                      <th className="text-left py-3 px-4 font-semibold">Authorization</th>
                      <th className="text-center py-3 px-5 font-semibold w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <>
                        <tr
                          key={order.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        >
                          <td className="py-3.5 px-5">
                            <span className="text-sm font-medium text-slate-700">{order.createdByName || order.createdByEmail || '-'}</span>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-green/10 text-brand-green rounded-full text-xs font-semibold">
                              <Building2 className="w-3 h-3" />
                              {order.workroom}
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-brand-green" />
                              <span className="font-medium text-slate-700">{formatDate(order.dateReceived)}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="text-sm font-medium text-slate-700">{order.authorizedBy || order.createdByName || order.createdByEmail || '-'}</span>
                          </td>
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between gap-2">
                              {order.authorized ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                  Authorized
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-500 rounded-full text-xs font-semibold whitespace-nowrap">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  Denied
                                </span>
                              )}
                              <select
                                key={`${order.id}-${order.authorized}`}
                                defaultValue={order.authorized ? 'authorized' : 'denied'}
                                onChange={(e) => {
                                  const val = e.target.value
                                  if (val === 'authorized') setAuthorization(order.id, true)
                                  else if (val === 'denied') setAuthorization(order.id, false)
                                }}
                                className="px-1.5 py-1 border border-slate-200 rounded-md bg-slate-50 text-xs font-medium text-slate-500 focus:ring-1 focus:ring-brand-green/20 focus:border-brand-green outline-none cursor-pointer"
                              >
                                <option value="authorized">Authorize</option>
                                <option value="denied">Deny</option>
                              </select>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            {expandedOrder === order.id ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </td>
                        </tr>
                        {expandedOrder === order.id && (
                          <tr key={`${order.id}-expanded`}>
                            <td colSpan={6} className="px-5 py-4 bg-slate-50/30">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-white rounded-lg p-3 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Workroom</p>
                                  <p className="text-sm font-semibold text-slate-800">{order.workroom}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Date Received</p>
                                  <p className="text-sm font-semibold text-slate-800">{formatDate(order.dateReceived)}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Added By</p>
                                  <p className="text-sm font-semibold text-slate-800">{order.createdByName || order.createdByEmail || '-'}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Authorized By</p>
                                  <p className="text-sm font-semibold text-slate-800">{order.authorizedBy || order.createdByName || order.createdByEmail || '-'}</p>
                                </div>
                              </div>
                              <div className="mt-3 bg-white rounded-lg p-4 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">All Items</p>
                                <div className="divide-y divide-slate-50">
                                  {(order.items as PadOrderItem[]).map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                                      <div className="flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5 text-brand-green" />
                                        <span className="text-sm text-slate-700">{item.name}</span>
                                        {item.isCustom && (
                                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded font-medium">Custom</span>
                                        )}
                                      </div>
                                      <span className="text-sm font-semibold text-brand-green">x{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {order.attachmentUrls && (order.attachmentUrls as { url: string; name: string }[]).length > 0 && (
                                <div className="mt-3 bg-white rounded-lg p-4 border border-slate-100">
                                  <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Attachments</p>
                                      <div className="flex flex-wrap gap-2">
                                        {(order.attachmentUrls as { url: string; name: string }[]).map((att, i) => (
                                          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                            <img
                                              src={att.url}
                                              alt={att.name}
                                              className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm hover:ring-2 hover:ring-brand-green/30 transition-all"
                                            />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center flex-shrink-0">
                                      <div className="-mb-1">{renderBarcode(order.id)}</div>
                                      <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest leading-none">
                                        {order.id.slice(-8).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {!(order.attachmentUrls && (order.attachmentUrls as { url: string; name: string }[]).length > 0) && (
                                <div className="mt-3 flex items-center justify-end bg-white rounded-lg p-4 border border-slate-100">
                                  <div className="flex flex-col items-center">
                                    <div className="-mb-1">{renderBarcode(order.id)}</div>
                                    <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest leading-none">
                                      {order.id.slice(-8).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

      {/* ── New Pad Order Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm() }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">New Pad Order</h2>
                  <p className="text-xs text-slate-400">Record a pad order received at warehouse</p>
                </div>
              </div>
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {entries.map((entry, idx) => (
                <div key={entry.id}>
                  {entries.length > 1 && (
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                        Pad Order {idx + 1}
                      </h3>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  )}

                  {/* Row 1: Workroom + Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-brand-green" />
                          Workroom
                        </span>
                      </label>
                      <select
                        value={entry.workroom}
                        onChange={(e) => updateEntry(entry.id, 'workroom', e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                      >
                        <option value="">Select workroom...</option>
                        {allWorkrooms().map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-brand-green" />
                          Date Order Received at Warehouse
                        </span>
                      </label>
                      <input
                        type="date"
                        value={entry.dateReceived}
                        onChange={(e) => updateEntry(entry.id, 'dateReceived', e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-brand-green" />
                        Items
                      </span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {PREDEFINED_ITEMS.map((itemName) => (
                        <div
                          key={itemName}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all ${
                            entry.selectedItems[itemName].checked
                              ? 'border-brand-green/30 bg-brand-green/[0.03]'
                              : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={entry.selectedItems[itemName].checked}
                              onChange={() => handleItemToggle(entry.id, itemName)}
                              className="w-4 h-4 rounded border-slate-300 text-brand-green focus:ring-brand-green/30 accent-brand-green flex-shrink-0"
                            />
                            <span className="text-xs font-medium text-slate-700 truncate">{itemName}</span>
                          </label>
                          {entry.selectedItems[itemName].checked && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <label className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">QTY:</label>
                              <input
                                type="number"
                                min="0"
                                value={entry.selectedItems[itemName].quantity}
                                onChange={(e) => handleItemQuantity(entry.id, itemName, parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1.5 text-xs border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none text-center font-medium"
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Attachment — sits in the grid */}
                      <div className="p-2.5 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/30">
                        <div className="flex items-center gap-2 mb-1.5">
                          <label className="flex items-center gap-1 px-2 py-1 border border-slate-200 rounded-lg bg-white hover:border-brand-green/30 transition-colors cursor-pointer">
                            {uploading ? (
                              <Loader2 className="w-3 h-3 text-brand-green animate-spin" />
                            ) : (
                              <Camera className="w-3 h-3 text-brand-green" />
                            )}
                            <span className="text-[10px] font-medium text-slate-500">
                              {uploading ? 'Uploading...' : 'Add Attachment'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleFileUpload(e, entry.id)}
                              className="hidden"
                              disabled={uploading}
                            />
                          </label>
                          <span className="text-[9px] text-slate-300">PNG/JPG</span>
                        </div>

                        {entry.attachmentUrls.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.attachmentUrls.map((att, attIdx) => (
                              <div key={attIdx} className="relative group">
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(entry.id, attIdx)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider between entries */}
                    {idx < entries.length - 1 && <hr className="mt-4 border-slate-100" />}
                  </div>
                </div>
              ))}

              {/* Additional Items checkbox */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAdditionalItems}
                    onChange={(e) => {
                      setHasAdditionalItems(e.target.checked)
                      if (!e.target.checked) setEntries(prev => prev.slice(0, 1))
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-brand-green focus:ring-brand-green/30 accent-brand-green"
                  />
                  <span className="text-sm font-medium text-slate-600">Additional items?</span>
                </label>
                {hasAdditionalItems && (
                  <button
                    type="button"
                    onClick={addAdditionalEntry}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-green bg-brand-green/10 rounded-lg hover:bg-brand-green/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Pad Order
                  </button>
                )}
              </div>

              {/* Error / Success Messages */}
              {saveError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Pad orders saved successfully!
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !hasAnyItemSelected()}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Pad Orders
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
    </div>
    </div>
  )
}
