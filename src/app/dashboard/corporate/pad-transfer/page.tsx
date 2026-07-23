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
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  X,
  Truck,
  MapPin,
  DollarSign,
  FileQuestion,
  Package,
  Trash2,
  Layers,
  Download,
} from 'lucide-react'
import { downloadExcel } from '@/lib/export-utils'
import { AdminSidebar } from '@/components/AdminSidebar'
import { allWorkrooms } from '@/lib/workroomMapping'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'

// --- INTERFACES ---

interface PadTransfer {
  id: string
  createdAt: string
  updatedAt: string
  dateRequested: string
  requestorLocation: string
  receivingWorkroom: string
  fulfillmentWorkroom: string
  reasonForTransfer: string
  transferMethod: string | null
  estimatedCost: string | null
  padType: string | null
  rollQuantity: number | null
  linearFeet: number | null
  hasAdditionalItems: boolean
  additionalItems: { name: string; quantity: number }[] | null
  attachmentUrls: { url: string; name: string }[] | null
  createdByEmail: string | null
  createdByName: string | null
  authorizedBy: string | null
  authorized: boolean
  authorizationMethod: string | null
}

interface TransferEntry {
  id: string
  dateRequested: string
  requestorLocation: string
  receivingWorkroom: string
  fulfillmentWorkroom: string
  reasonForTransfer: string
  reasonOther: string
  transferMethod: string
  estimatedCost: string
  padType: string
  rollQuantity: string
  linearFeet: string
}

const PAD_TYPES = [
  'Super 6 LB',
  'Stainmaster Select',
  'Odor Ban',
  'Stainmaster Elite',
  'Stainmaster Memory Foam',
] as const

const PAD_MULTIPLIERS: Record<string, number> = {
  'Super 6 LB': 45,
  'Stainmaster Select': 45,
  'Odor Ban': 45,
  'Stainmaster Elite': 45,
  'Stainmaster Memory Foam': 30,
}

const REASON_OPTIONS = [
  'Urgent job need (large, unexpected job)',
  'Distributing excess inventory from fulfilling',
] as const

// --- COMPONENT ---

export default function PadTransferPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(normalizedRole)
  const canModify = ['ADMIN', 'MODERATOR', 'SUPER_ADMIN'].includes(normalizedRole)
  const { sidebarOpen } = useSidebarOpen()

  const defaultEntry = (): TransferEntry => ({
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dateRequested: new Date().toISOString().split('T')[0],
    requestorLocation: '',
    receivingWorkroom: '',
    fulfillmentWorkroom: '',
    reasonForTransfer: '',
    reasonOther: '',
    transferMethod: '',
    estimatedCost: '',
    padType: '',
    rollQuantity: '',
    linearFeet: '',
  })

  const [entries, setEntries] = useState<TransferEntry[]>([defaultEntry()])
  const [hasAdditionalItems, setHasAdditionalItems] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [transfers, setTransfers] = useState<PadTransfer[]>([])
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(true)
  const [expandedTransfer, setExpandedTransfer] = useState<string | null>(null)
  const [filterWorkroom, setFilterWorkroom] = useState('')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && normalizedRole && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess, normalizedRole])

  const fetchTransfers = useCallback(async () => {
    setIsLoadingTransfers(true)
    try {
      const params = new URLSearchParams()
      if (filterWorkroom) params.set('receivingWorkroom', filterWorkroom)
      const res = await fetch('/api/pad-transfers?' + params.toString())
      const data = await res.json()
      if (data.success) setTransfers(data.transfers || [])
    } catch (err) {
      console.error('Error fetching pad transfers:', err)
    } finally {
      setIsLoadingTransfers(false)
    }
  }, [filterWorkroom])

  useEffect(() => {
    if (canAccess) fetchTransfers()
  }, [canAccess, fetchTransfers])

  const exportToExcel = () => {
    const rows: Record<string, any>[] = []
    for (const t of transfers) {
      const authStatus = t.authorized
        ? (t.authorizedBy || t.authorizationMethod || 'Authorized')
        : 'Pending'
      const mainItemName = t.padType || '-'
      const mainLF = t.padType && t.rollQuantity != null
        ? (PAD_MULTIPLIERS[t.padType] || 45) * t.rollQuantity
        : 0
      rows.push({
        'Date Requested': t.dateRequested ? new Date(t.dateRequested).toLocaleDateString() : '-',
        'Requestor Location': t.requestorLocation,
        'Receiving Workroom': t.receivingWorkroom,
        'Fulfillment Workroom': t.fulfillmentWorkroom,
        'Reason': t.reasonForTransfer || '-',
        'Method': t.transferMethod || '-',
        'Est. Cost': t.estimatedCost || '-',
        'Pad Type': mainItemName,
        'Roll Qty': t.rollQuantity ?? '-',
        'LF': mainLF || '-',
        'Authorized': authStatus,
        'Authorized By': t.authorizedBy || t.authorizationMethod || '-',
        'Created By': t.createdByName || t.createdByEmail || '-',
      })
      if (t.hasAdditionalItems && t.additionalItems) {
        for (const item of t.additionalItems as { name: string; quantity: number }[]) {
          rows.push({
            'Date Requested': t.dateRequested ? new Date(t.dateRequested).toLocaleDateString() : '-',
            'Requestor Location': t.requestorLocation,
            'Receiving Workroom': t.receivingWorkroom,
            'Fulfillment Workroom': t.fulfillmentWorkroom,
            'Reason': t.reasonForTransfer || '-',
            'Method': t.transferMethod || '-',
            'Est. Cost': t.estimatedCost || '-',
            'Pad Type': item.name,
            'Roll Qty': item.quantity,
            'LF': '-',
            'Authorized': authStatus,
            'Authorized By': t.authorizedBy || t.authorizationMethod || '-',
            'Created By': t.createdByName || t.createdByEmail || '-',
          })
        }
      }
    }
    downloadExcel(rows, 'Pad_Transfers')
  }

  const updateEntry = (entryId: string, field: string, value: string) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, [field]: value } : e))
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

    const payloads = entries.map(e => {
      const finalReason = e.reasonForTransfer === 'Other' ? e.reasonOther : e.reasonForTransfer
      return {
        dateRequested: e.dateRequested,
        requestorLocation: e.requestorLocation,
        receivingWorkroom: e.receivingWorkroom,
        fulfillmentWorkroom: e.fulfillmentWorkroom,
        reasonForTransfer: finalReason,
        transferMethod: e.transferMethod || null,
        estimatedCost: e.estimatedCost || null,
        padType: e.padType || null,
        rollQuantity: e.rollQuantity ? parseInt(e.rollQuantity) : null,
        linearFeet: e.linearFeet ? parseInt(e.linearFeet) : null,
        hasAdditionalItems: entries.length > 1,
      }
    })

    for (const p of payloads) {
      if (!p.dateRequested) { setSaveError('All entries must have a date of request'); return }
      if (!p.requestorLocation) { setSaveError('All entries must have a requestor workroom'); return }
      if (!p.receivingWorkroom) { setSaveError('All entries must have a receiving workroom'); return }
      if (!p.fulfillmentWorkroom) { setSaveError('All entries must have a fulfillment workroom'); return }
      if (!p.reasonForTransfer) { setSaveError('All entries must have a reason for transfer'); return }
    }

    setIsSaving(true)
    try {
      for (const p of payloads) {
        const res = await fetch('/api/pad-transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save') }
      }
      setSaveSuccess(true)
      setShowForm(false)
      resetForm()
      fetchTransfers()
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

  const setAuthorization = async (transferId: string, authorized: boolean) => {
    try {
      const res = await fetch('/api/pad-transfers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transferId, authorized }),
      })
      const data = await res.json()
      if (data.success && data.transfer) {
        setTransfers(prev => prev.map(t => t.id === transferId ? data.transfer : t))
      }
    } catch (err) {
      console.error('Failed to set authorization:', err)
    }
  }

  const deleteTransfer = async (transferId: string) => {
    setConfirmDeleteId(transferId)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    const transferId = confirmDeleteId
    try {
      const res = await fetch(`/api/pad-transfers?id=${transferId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setTransfers(prev => prev.filter(t => t.id !== transferId))
      }
    } catch (err) {
      console.error('Failed to delete transfer:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const renderBarcode = (transferId: string) => {
    const serial = transferId.slice(-8)
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

  const analytics = (() => {
    const totalRollQty = transfers.reduce((sum, t) => sum + (t.rollQuantity || 0), 0)
    const withCost = transfers.filter(t => t.estimatedCost && t.estimatedCost.trim() !== '').length
    const totalLinearFt = transfers.reduce((sum, t) => {
      if (t.padType && t.rollQuantity) {
        return sum + (t.rollQuantity * (PAD_MULTIPLIERS[t.padType] || 45))
      }
      return sum
    }, 0)
    return {
      totalTransfers: transfers.length,
      authorizedCount: transfers.filter(t => t.authorized).length,
      totalRollQty,
      withCost,
      totalLinearFt,
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
                <h1 className="text-3xl font-bold text-white mb-2">Pad Transfer</h1>
                <p className="text-emerald-50/90">Request and manage pad transfers between workrooms.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <FileText className="w-3.5 h-3.5" />{analytics.totalTransfers} transfers
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />{analytics.authorizedCount} authorized
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <Layers className="w-3.5 h-3.5" />{analytics.totalRollQty} rolls
                  </span>
                </div>
              </div>
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20 flex-shrink-0">
                <Plus className="w-5 h-5" />New Pad Transfer
              </button>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Transfers', value: analytics.totalTransfers, desc: 'Pad transfer records' },
                { label: 'Authorized', value: analytics.authorizedCount, desc: 'Approved transfers' },
                { label: 'Est. Cost Records', value: analytics.withCost, desc: 'With cost estimates' },
                { label: 'Total LF', value: analytics.totalLinearFt, desc: 'From formula across records' },
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
                    <p className="text-xs text-slate-400">{transfers.length} record{transfers.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={filterWorkroom} onChange={(e) => setFilterWorkroom(e.target.value)}
                    className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium">
                    <option value="">All Workrooms</option>
                    {allWorkrooms().map((w: string) => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <button
                    onClick={exportToExcel}
                    disabled={transfers.length === 0}
                    className="flex items-center gap-1.5 px-3 py-2 border-2 border-brand-green/20 rounded-xl bg-brand-green/5 hover:bg-brand-green/10 text-brand-green text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {isLoadingTransfers ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-brand-green animate-spin mb-3" />
                <p className="text-sm text-slate-400">Loading pad transfers...</p>
              </div>
            ) : transfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No pad transfers yet</p>
                <p className="text-xs text-slate-300 mt-1">Click "New Pad Transfer" to create your first record</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                      <th className="text-left py-3 px-5 font-semibold">Added By</th>
                      <th className="text-left py-3 px-5 font-semibold">Date</th>
                      <th className="text-left py-3 px-5 font-semibold">From</th>
                      <th className="text-left py-3 px-5 font-semibold">To</th>
                      <th className="text-left py-3 px-5 font-semibold">Items</th>
                      <th className="text-left py-3 px-4 font-semibold">Authorization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((t) => (
                      <React.Fragment key={t.id}>
                        <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedTransfer(expandedTransfer === t.id ? null : t.id)}>
                          <td className="py-3.5 px-5"><span className="text-sm font-medium text-slate-700 whitespace-nowrap">{t.createdByName || t.createdByEmail || '-'}</span></td>
                          <td className="py-3.5 px-5"><div className="flex items-center gap-2 whitespace-nowrap"><Calendar className="w-3.5 h-3.5 text-brand-green flex-shrink-0" /><span className="font-medium text-slate-700">{formatDate(t.dateRequested)}</span></div></td>
                          <td className="py-3.5 px-5"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold"><MapPin className="w-3 h-3" />{t.requestorLocation}</span></td>
                          <td className="py-3.5 px-5"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-green/10 text-brand-green rounded-full text-xs font-semibold"><Building2 className="w-3 h-3" />{t.receivingWorkroom}</span></td>
                          <td className="py-3.5 px-5">
                            <div className="flex flex-wrap gap-1">
                              {t.padType && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-green/10 text-brand-green rounded-full text-[11px] font-semibold"><Package className="w-3 h-3" />{t.padType}{t.rollQuantity != null ? <> x {(t.rollQuantity * (PAD_MULTIPLIERS[t.padType] || 45))} LF</> : ''}</span>}
                              {t.hasAdditionalItems && t.additionalItems && (t.additionalItems as { name: string; quantity: number }[]).map((item, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[11px] font-semibold">{item.name} x{item.quantity}</span>
                              ))}
                              {!t.padType && (!t.additionalItems || (t.additionalItems as any[]).length === 0) && <span className="text-xs text-slate-400">-</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between gap-2">
                              {t.authorized ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold whitespace-nowrap"><CheckCircle2 className="w-3 h-3 flex-shrink-0" />{t.authorizedBy || t.authorizationMethod || 'Authorized'}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-semibold whitespace-nowrap"><AlertCircle className="w-3 h-3 flex-shrink-0" />Pending</span>
                              )}
                              {canModify && (
                              <select key={t.id + '-' + t.authorized} defaultValue={t.authorized ? 'authorized' : 'denied'}
                                onChange={(e) => { if (e.target.value === 'authorized') setAuthorization(t.id, true); else if (e.target.value === 'denied') setAuthorization(t.id, false); else if (e.target.value === 'delete') deleteTransfer(t.id) }}
                                className="px-1.5 py-1 border border-slate-200 rounded-md bg-slate-50 text-xs font-medium text-slate-500 focus:ring-1 focus:ring-brand-green/20 focus:border-brand-green outline-none cursor-pointer">
                                <option value="authorized">Authorize</option><option value="denied">Deny</option><option value="delete">Delete</option>
                              </select>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedTransfer === t.id && (
                          <tr>
                            <td colSpan={6} className="px-5 py-4 bg-slate-50/30">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <Card label="Date Requested" value={formatDate(t.dateRequested)} />
                                <Card label="Requestor Workroom" value={t.requestorLocation} />
                                <Card label="Receiving" value={t.receivingWorkroom} />
                                <Card label="Fulfillment" value={t.fulfillmentWorkroom} />
                                <Card label="Added By" value={t.createdByName || t.createdByEmail || '-'} />
                                <Card label="Authorized By" value={t.authorized ? (t.authorizedBy || t.authorizationMethod || '-') : '-'} />
                                <Card label="Method" value={t.transferMethod || '-'} />
                                <Card label="Est. Cost" value={t.estimatedCost || '-'} />
                                <Card label="Pad Type" value={t.padType || '-'} />
                                <Card label="Roll Qty" value={t.rollQuantity != null ? String(t.rollQuantity) : '-'} />
                                <Card label="Total LF" value={t.padType && t.rollQuantity != null
                                  ? ((PAD_MULTIPLIERS[t.padType] || 45) * t.rollQuantity) + ' LF'
                                  : '-'} />
                              </div>
                              {t.hasAdditionalItems && t.additionalItems && (t.additionalItems as { name: string; quantity: number }[]).length > 0 && (
                                <div className="mt-3 bg-white rounded-lg p-4 border border-slate-100">
                                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Additional Items</p>
                                  <div className="divide-y divide-slate-50">
                                    {(t.additionalItems as { name: string; quantity: number }[]).map((item, i) => (
                                      <div key={i} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-2">
                                          <Package className="w-3.5 h-3.5 text-brand-green" />
                                          <span className="text-sm text-slate-700">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-brand-green">x{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="mt-3 bg-white rounded-lg p-4 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Reason for Transfer</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{t.reasonForTransfer}</p>
                              </div>
                              {t.attachmentUrls && t.attachmentUrls.length > 0 && (
                                <div className="mt-3 bg-white rounded-lg p-4 border border-slate-100">
                                  <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Attachments</p>
                                      <div className="flex flex-wrap gap-2">
                                        {t.attachmentUrls.map((att, i) => (
                                          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"><img src={att.url} alt={att.name} className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm hover:ring-2 hover:ring-brand-green/30 transition-all" /></a>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="mt-3 flex items-center justify-end bg-white rounded-lg p-4 border border-slate-100">
                                <div className="flex flex-col items-center">
                                  <div className="-mb-1">{renderBarcode(t.id)}</div>
                                  <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest leading-none">
                                    {t.id.slice(-8).toUpperCase()}
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

        {/* New Pad Transfer Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm() }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center"><Plus className="w-5 h-5 text-brand-green" /></div>
                  <div><h2 className="text-base font-bold text-slate-800">New Pad Transfer</h2><p className="text-xs text-slate-400">Fill in the transfer details below</p></div>
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
                            <Trash2 className="w-3 h-3" />Remove
                          </button>
                        )}
                      </div>
                    )}

                    {/* Date of Request */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-brand-green" />Date of Request</span>
                      </label>
                      <input type="date" value={entry.dateRequested}
                        onChange={(e) => updateEntry(entry.id, 'dateRequested', e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium" />
                    </div>

                    {/* Requestor Workroom */}
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-brand-green" />Requestor Workroom</span>
                      </label>
                      <select value={entry.requestorLocation}
                        onChange={(e) => updateEntry(entry.id, 'requestorLocation', e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium">
                        <option value="">Select workroom</option>
                        {allWorkrooms().map((wr: string) => <option key={wr} value={wr}>{wr}</option>)}
                      </select>
                    </div>

                    {/* Receiving and Fulfillment Workrooms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-brand-green" />Receiving Workroom</span>
                        </label>
                        <select value={entry.receivingWorkroom}
                          onChange={(e) => updateEntry(entry.id, 'receivingWorkroom', e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium">
                          <option value="">Select workroom</option>
                          {allWorkrooms().map((wr: string) => <option key={wr} value={wr}>{wr}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-brand-green" />Fulfillment Workroom</span>
                        </label>
                        <select value={entry.fulfillmentWorkroom}
                          onChange={(e) => updateEntry(entry.id, 'fulfillmentWorkroom', e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium">
                          <option value="">Select workroom</option>
                          {allWorkrooms().map((wr: string) => <option key={wr} value={wr}>{wr}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Reason for Transfer */}
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1"><FileQuestion className="w-3.5 h-3.5 text-brand-green" />Reason for Transfer</span>
                      </label>
                      <select value={entry.reasonForTransfer}
                        onChange={(e) => updateEntry(entry.id, 'reasonForTransfer', e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium">
                        <option value="">Select a reason...</option>
                        {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        <option value="Other">Other</option>
                      </select>
                      {entry.reasonForTransfer === 'Other' && (
                        <textarea value={entry.reasonOther}
                          onChange={(e) => updateEntry(entry.id, 'reasonOther', e.target.value)}
                          placeholder="Please specify the reason..." rows={2}
                          className="mt-3 w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium resize-none" />
                      )}
                    </div>

                    {/* Method of Transfer */}
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-brand-green" />Method of Transfer</span>
                      </label>
                      <textarea value={entry.transferMethod}
                        onChange={(e) => updateEntry(entry.id, 'transferMethod', e.target.value)}
                        placeholder="Explain the shipping process (e.g. freight truck, courier, etc.)..." rows={2}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium resize-none" />
                    </div>

                    {/* Estimated Cost + Pad Type side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-brand-green" />Estimated Cost</span>
                        </label>
                        <input type="text" value={entry.estimatedCost}
                          onChange={(e) => updateEntry(entry.id, 'estimatedCost', e.target.value)}
                          placeholder="e.g. Labor $50, Fuel $30"
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-brand-green" />Pad Type</span>
                        </label>
                        <select value={entry.padType}
                          onChange={(e) => updateEntry(entry.id, 'padType', e.target.value)}
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium">
                          <option value="">Select pad type...</option>
                          {PAD_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Roll Quantity + Linear Feet */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                          <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-brand-green" />Roll Quantity</span>
                        </label>
                        <input type="number" min="0" value={entry.rollQuantity}
                          onChange={(e) => updateEntry(entry.id, 'rollQuantity', e.target.value)}
                          placeholder="Enter roll quantity..."
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium" />
                      </div>
                      <div className="flex items-end pb-1">
                        <span className="text-sm font-bold text-brand-green">
                          Total: {(parseInt(entry.rollQuantity) || 0) * (PAD_MULTIPLIERS[entry.padType] || 45)} LF
                        </span>
                      </div>
                    </div>

                    {/* Divider between entries */}
                    {idx < entries.length - 1 && <hr className="mt-4 border-slate-100" />}
                  </div>
                ))}

                {/* Additional Items checkbox */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={hasAdditionalItems}
                      onChange={(e) => {
                        setHasAdditionalItems(e.target.checked)
                        if (!e.target.checked) setEntries(prev => prev.slice(0, 1))
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-brand-green focus:ring-brand-green/30 accent-brand-green" />
                    <span className="text-sm font-medium text-slate-600">Additional items?</span>
                  </label>
                  {hasAdditionalItems && (
                    <button type="button" onClick={addAdditionalEntry}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-green bg-brand-green/10 rounded-lg hover:bg-brand-green/20 transition-colors">
                      <Plus className="w-3.5 h-3.5" />Add Pad Transfer
                    </button>
                  )}
                </div>

                {/* Error / Success Messages */}
                {saveError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />Pad transfers saved successfully!
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={handleSave} disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed">
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Pad Transfers</>}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                    className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>

                {/* Warning */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-amber-700">Full Rolls Only - Do Not Transfer Partial Rolls</p>
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
              <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Pad Transfer</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Are you sure you want to delete this pad transfer? This action cannot be undone.
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

// --- HELPER COMPONENTS ---

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-100">
      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}
