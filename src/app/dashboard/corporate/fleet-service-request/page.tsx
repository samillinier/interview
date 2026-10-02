'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Plus,
  Send,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  X,
  Trash2,
  Download,
  ArrowLeft,
  Car,
  Building2,
  FileText,
  Upload,
  Wrench,
  CheckCheck,
} from 'lucide-react'
import { downloadExcel } from '@/lib/export-utils'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { WORKROOM_OPTIONS } from '@/lib/questions'

interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

interface FleetServiceRequest {
  id: string
  createdAt: string
  requestDate: string
  location: string
  serviceType: string
  details: string
  attachmentUrls: Attachment[] | null
  status: string
  createdByEmail: string | null
  createdByName: string | null
}

const SERVICE_TYPES = ['Fleet Vehicle', 'Equipment'] as const
const MAX_FILES = 4

function fmtDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const inputClass =
  'w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium'

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{hint}</p>}
    </div>
  )
}

function SectionHeader({ icon: Icon, step, title, subtitle }: { icon: typeof Car; step: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg shadow-brand-green/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-green">{step}</p>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function FleetServiceRequestPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { sidebarOpen } = useSidebarOpen()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN', 'ACCOUNTING'].includes(normalizedRole)
  const canReview = normalizedRole === 'SUPER_ADMIN'

  const [showForm, setShowForm] = useState(false)
  const [requestDate, setRequestDate] = useState('')
  const [location, setLocation] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [details, setDetails] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [requests, setRequests] = useState<FleetServiceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [filterLocation, setFilterLocation] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && normalizedRole && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess, normalizedRole])

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterLocation) params.set('location', filterLocation)
      if (filterStatus) params.set('status', filterStatus)
      if (search) params.set('search', search)
      const res = await fetch('/api/fleet-service-requests?' + params.toString())
      const data = await res.json()
      if (data.success) setRequests(data.requests || [])
    } catch (err) {
      console.error('Error fetching fleet service requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterLocation, filterStatus, search])

  useEffect(() => {
    if (canAccess) fetchRequests()
  }, [canAccess, fetchRequests])

  const resetForm = () => {
    setRequestDate('')
    setLocation('')
    setServiceType('')
    setDetails('')
    setAttachments([])
    setUploadError(null)
    setSaveError(null)
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadError(null)

    const remaining = MAX_FILES - attachments.length
    const selected = Array.from(files).slice(0, remaining)

    if (Array.from(files).length > remaining) {
      setUploadError(`A maximum of ${MAX_FILES} files can be attached (${remaining} remaining).`)
      if (remaining === 0) return
    }

    if (selected.length === 0) return

    setUploading(true)
    try {
      const fd = new FormData()
      for (const file of selected) fd.append('files', file)
      const res = await fetch('/api/fleet-service-requests/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      setAttachments((prev) => [...prev, ...(data.files || [])])
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setSaveError(null)

    if (!requestDate || !location || !serviceType || !details.trim()) {
      setSaveError('Please complete the date, location, service type, and repair request details.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/fleet-service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestDate,
          location,
          serviceType,
          details: details.trim(),
          attachmentUrls: attachments,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to submit request')
      }
      setShowForm(false)
      resetForm()
      fetchRequests()
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const setStatus = async (id: string, status: 'open' | 'completed') => {
    try {
      const res = await fetch('/api/fleet-service-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (data.success && data.request) {
        setRequests((prev) => prev.map((r) => (r.id === id ? data.request : r)))
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    try {
      const res = await fetch(`/api/fleet-service-requests?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const exportToExcel = () => {
    const rows = requests.map((r) => ({
      'Request Date': fmtDate(r.requestDate),
      'Location': r.location,
      'Service Type': r.serviceType,
      'Details': r.details,
      'Attachments': (r.attachmentUrls || []).map((a) => a.name).join('; ') || '-',
      'Status': r.status === 'completed' ? 'Completed' : 'Open',
      'Created By': r.createdByName || r.createdByEmail || '-',
    }))
    downloadExcel(rows, 'Fleet_Service_Requests')
  }

  const analytics = useMemo(() => {
    const total = requests.length
    const open = requests.filter((r) => r.status !== 'completed').length
    const completed = requests.filter((r) => r.status === 'completed').length
    const vehicles = requests.filter((r) => r.serviceType === 'Fleet Vehicle').length
    return { total, open, completed, vehicles }
  }, [requests])

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

  const detail = requests.find((r) => r.id === detailId) || null

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-[1550px] mx-auto space-y-8">

            {/* Header */}
            <div className="rounded-2xl border border-brand-green-dark/20 bg-brand-green shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Fleet Vehicles or Equipment Service Request</h1>
                  <p className="text-emerald-50/90">Submit a repair or service request for a fleet vehicle or piece of equipment.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <ClipboardList className="w-3.5 h-3.5" />{analytics.total} requests
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <Car className="w-3.5 h-3.5" />{analytics.vehicles} vehicles
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <CheckCheck className="w-3.5 h-3.5" />{analytics.completed} completed
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20 flex-shrink-0">
                  <Plus className="w-5 h-5" />New Service Request
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Requests', value: analytics.total, desc: 'All service requests', icon: ClipboardList },
                { label: 'Open', value: analytics.open, desc: 'Awaiting service', icon: AlertCircle },
                { label: 'Completed', value: analytics.completed, desc: 'Service completed', icon: CheckCircle2 },
                { label: 'Fleet Vehicles', value: analytics.vehicles, desc: 'Vehicle requests', icon: Car },
              ].map((card) => {
                const Icon = card.icon
                return (
                  <div key={card.label} className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-1.5 w-full rounded-full bg-brand-green" />
                      <Icon className="w-5 h-5 text-brand-green ml-3 flex-shrink-0" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">{card.label}</p>
                      <h3 className="text-4xl leading-none font-black tracking-tight text-slate-900 mb-1">{card.value}</h3>
                      <p className="text-sm text-slate-500">{card.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Form */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden"
                >
                  <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setShowForm(false); resetForm() }}
                        className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors" aria-label="Back">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                      </button>
                      <div>
                        <h2 className="text-base font-bold text-slate-800">Fleet Vehicles or Equipment Service Request</h2>
                        <p className="text-xs text-slate-400">Fields marked <span className="text-red-500">*</span> are required</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    <section>
                      <SectionHeader icon={Wrench} step="Request" title="Service Request Details" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        <Field label="1. Today's Date" required>
                          <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="2. Location" required>
                          <select value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass}>
                            <option value="">Select your answer</option>
                            {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </Field>
                        <Field label="3. Is this service for a fleet vehicle or equipment?" required>
                          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputClass}>
                            <option value="">Select your answer</option>
                            {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </Field>
                      </div>
                    </section>

                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader icon={FileText} step="Repair Request" title="Repair Request"
                        subtitle="Please enter as much information as possible for the request. If you are a manager submitting the request for another driver please include the driver's name." />
                      <div className="mt-5">
                        <textarea
                          value={details}
                          onChange={(e) => setDetails(e.target.value)}
                          rows={6}
                          placeholder="Describe the repair or service needed..."
                          className={`${inputClass} resize-none`}
                        />
                      </div>
                    </section>

                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader icon={Upload} step="Attachments" title="Upload any pictures of the vehicle"
                        subtitle={`Up to ${MAX_FILES} files, 100MB each. Allowed: Word, Excel, PPT, PDF, Image, Video, Audio.`} />

                      <div className="mt-5">
                        <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-8 cursor-pointer hover:border-brand-green/50 hover:bg-brand-green/5 transition-colors">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-sm font-semibold text-slate-600">Click to upload files</span>
                          <span className="text-xs text-slate-400 mt-1">File number limit: {MAX_FILES} · Single file size limit: 100MB</span>
                          <input
                            type="file"
                            multiple
                            disabled={uploading || attachments.length >= MAX_FILES}
                            onChange={(e) => {
                              void handleFiles(e.target.files)
                              e.target.value = ''
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {uploading && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin text-brand-green" />Uploading...
                        </div>
                      )}

                      {uploadError && (
                        <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />{uploadError}
                        </div>
                      )}

                      {attachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {attachments.map((a, i) => (
                            <div key={`${a.name}-${i}`} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-4 h-4 text-brand-green" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-700 truncate">{a.name}</p>
                                  <p className="text-xs text-slate-400">{formatBytes(a.size)}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(i)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                aria-label="Remove file"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Actions */}
                    {saveError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <button onClick={handleSubmit} disabled={isSaving || uploading}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed">
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit Request</>}
                      </button>
                      <button onClick={() => { setShowForm(false); resetForm() }}
                        className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                        Back
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Records */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-brand-green" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Service Requests</h2>
                      <p className="text-xs text-slate-400">{requests.length} request{requests.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search details..." className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white" />
                    <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="">All Locations</option>
                      {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="">All Status</option>
                      <option value="open">Open</option>
                      <option value="completed">Completed</option>
                    </select>
                    {canReview && (
                      <button onClick={exportToExcel} disabled={requests.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 border-2 border-brand-green/20 rounded-xl bg-brand-green/5 hover:bg-brand-green/10 text-brand-green text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        <Download className="w-3.5 h-3.5" />Export
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-brand-green animate-spin mb-3" />
                  <p className="text-sm text-slate-400">Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Wrench className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No service requests yet</p>
                  <p className="text-xs text-slate-300 mt-1">Click "New Service Request" to submit your first request</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                        <th className="text-left py-3 px-5 font-semibold">Date</th>
                        <th className="text-left py-3 px-5 font-semibold">Location</th>
                        <th className="text-left py-3 px-5 font-semibold">Type</th>
                        <th className="text-left py-3 px-5 font-semibold">Details</th>
                        <th className="text-left py-3 px-5 font-semibold">Attachments</th>
                        <th className="text-left py-3 px-5 font-semibold">Status</th>
                        {canReview && <th className="text-left py-3 px-4 font-semibold">Actions</th>}
                        <th className="text-left py-3 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => {
                        const completed = r.status === 'completed'
                        return (
                          <tr key={r.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => setDetailId(r.id)}>
                            <td className="py-3.5 px-5">
                              <div>
                                <p className="text-sm font-medium text-slate-700">{fmtDate(r.requestDate)}</p>
                                <p className="text-[11px] text-slate-400">{r.createdByName || r.createdByEmail || '-'}</p>
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                                <Building2 className="w-3 h-3" />{r.location}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${r.serviceType === 'Fleet Vehicle' ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>
                                {r.serviceType === 'Fleet Vehicle' ? <Car className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                                {r.serviceType}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 max-w-[240px]">
                              <p className="text-sm text-slate-600 truncate">{r.details}</p>
                            </td>
                            <td className="py-3.5 px-5 text-slate-600">
                              {(r.attachmentUrls || []).length > 0 ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                                  <FileText className="w-3.5 h-3.5 text-brand-green" />{(r.attachmentUrls || []).length}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${completed ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                {completed ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                {completed ? 'Completed' : 'Open'}
                              </span>
                            </td>
                            {canReview && (
                              <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  {completed ? (
                                    <button onClick={() => setStatus(r.id, 'open')}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors">
                                      <AlertCircle className="w-3 h-3" />Reopen
                                    </button>
                                  ) : (
                                    <button onClick={() => setStatus(r.id, 'completed')}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors">
                                      <CheckCircle2 className="w-3 h-3" />Complete
                                    </button>
                                  )}
                                  <button onClick={() => setConfirmDeleteId(r.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
                                    <Trash2 className="w-3 h-3" />Delete
                                  </button>
                                </div>
                              </td>
                            )}
                            <td className="py-3.5 px-2 w-8">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 group-hover:bg-white group-hover:text-brand-green transition-colors">
                                <FileText className="w-3 h-3" />View
                              </span>
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
        </div>

        {/* Detail modal */}
        <AnimatePresence>
          {detail && (() => {
            const completed = detail.status === 'completed'
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[65] flex items-center justify-center p-4"
                onClick={() => setDetailId(null)}
              >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <motion.div
                  initial={{ scale: 0.95, y: 12, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 12, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/90 backdrop-blur px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg shadow-brand-green/20">
                        <Wrench className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Service Request</h3>
                        <p className="text-xs text-slate-500">{fmtDate(detail.requestDate)} · {detail.location}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailId(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4 p-6">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${completed ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                        {completed ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {completed ? 'Completed' : 'Open'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${detail.serviceType === 'Fleet Vehicle' ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'}`}>
                        {detail.serviceType === 'Fleet Vehicle' ? <Car className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                        {detail.serviceType}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                        <Building2 className="w-3 h-3" />{detail.location}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Repair Request Details</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{detail.details}</p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Attachments ({(detail.attachmentUrls || []).length})</p>
                      {(detail.attachmentUrls || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No attachments uploaded.</p>
                      ) : (
                        <div className="space-y-2">
                          {(detail.attachmentUrls || []).map((a, i) => (
                            <a
                              key={`${a.name}-${i}`}
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-brand-green/40 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-4 h-4 text-brand-green" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-700 truncate">{a.name}</p>
                                  <p className="text-xs text-slate-400">{formatBytes(a.size)}</p>
                                </div>
                              </div>
                              <Download className="w-4 h-4 text-brand-green flex-shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-400">
                      Submitted by {detail.createdByName || detail.createdByEmail || '-'} on {fmtDate(detail.createdAt)}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )
          })()}
        </AnimatePresence>

        {/* Delete confirmation */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Service Request</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to delete this service request? This action cannot be undone.</p>
                <div className="flex items-center gap-3 w-full">
                  <button onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
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
