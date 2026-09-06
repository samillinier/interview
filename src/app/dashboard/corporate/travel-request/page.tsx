'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plane,
  Loader2,
  Plus,
  Send,
  Building2,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  X,
  Car,
  MapPin,
  DollarSign,
  BedDouble,
  User,
  FileText,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  PlaneLanding,
  PlaneTakeoff,
  ArrowLeft,
} from 'lucide-react'
import { downloadExcel } from '@/lib/export-utils'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { allWorkrooms } from '@/lib/workroomMapping'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'

interface TravelRequest {
  id: string
  createdAt: string
  dateOfRequest: string
  travelerName: string
  travelReason: string
  chargeWorkroom: string
  stayType: string | null
  destinationCity: string | null
  checkInDate: string | null
  checkOutDate: string | null
  stayComments: string | null
  departingFrom: string | null
  arrivingAt: string | null
  departureDate: string | null
  arrivalDate: string | null
  flightComments: string | null
  vehiclePickupLocation: string | null
  vehicleReturnLocation: string | null
  vehiclePickupDate: string | null
  vehicleReturnDate: string | null
  licenseState: string | null
  licenseNumber: string | null
  carComments: string | null
  rideshareBudget: string | null
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdByEmail: string | null
  createdByName: string | null
}

interface FormState {
  dateOfRequest: string
  travelerName: string
  travelReason: string
  chargeWorkroom: string
  stayType: string
  destinationCity: string
  checkInDate: string
  checkOutDate: string
  stayComments: string
  departingFrom: string
  arrivingAt: string
  departureDate: string
  arrivalDate: string
  flightComments: string
  vehiclePickupLocation: string
  vehicleReturnLocation: string
  vehiclePickupDate: string
  vehicleReturnDate: string
  licenseState: string
  licenseNumber: string
  carComments: string
  rideshareBudget: string
}

const emptyForm = (): FormState => ({
  dateOfRequest: new Date().toISOString().split('T')[0],
  travelerName: '',
  travelReason: '',
  chargeWorkroom: '',
  stayType: '',
  destinationCity: '',
  checkInDate: '',
  checkOutDate: '',
  stayComments: '',
  departingFrom: '',
  arrivingAt: '',
  departureDate: '',
  arrivalDate: '',
  flightComments: '',
  vehiclePickupLocation: '',
  vehicleReturnLocation: '',
  vehiclePickupDate: '',
  vehicleReturnDate: '',
  licenseState: '',
  licenseNumber: '',
  carComments: '',
  rideshareBudget: '',
})

const statusMeta: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-600 border-amber-200', icon: Clock },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
  denied: { label: 'Denied', className: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle },
}

function fmtDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function SectionHeader({ icon: Icon, step, title, subtitle }: { icon: typeof Plane; step: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg shadow-brand-green/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-green">{step}</p>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
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

export default function TravelRequestPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { sidebarOpen } = useSidebarOpen()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(normalizedRole)
  const canReview = normalizedRole === 'SUPER_ADMIN'

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [requests, setRequests] = useState<TravelRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterWorkroom, setFilterWorkroom] = useState('')
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
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (filterWorkroom) params.set('chargeWorkroom', filterWorkroom)
      if (search) params.set('search', search)
      const res = await fetch('/api/travel-requests?' + params.toString())
      const data = await res.json()
      if (data.success) setRequests(data.requests || [])
    } catch (err) {
      console.error('Error fetching travel requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, filterWorkroom, search])

  useEffect(() => {
    if (canAccess) fetchRequests()
  }, [canAccess, fetchRequests])

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setSaveError(null)
    if (!form.dateOfRequest || !form.travelerName.trim() || !form.travelReason.trim() || !form.chargeWorkroom) {
      setSaveError('Please complete the required fields in the General section.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ...form,
        checkInDate: form.checkInDate || null,
        checkOutDate: form.checkOutDate || null,
        departureDate: form.departureDate || null,
        arrivalDate: form.arrivalDate || null,
        vehiclePickupDate: form.vehiclePickupDate || null,
        vehicleReturnDate: form.vehicleReturnDate || null,
      }
      const res = await fetch('/api/travel-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to submit travel request')
      }
      setShowForm(false)
      setForm(emptyForm())
      fetchRequests()
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const setStatus = async (id: string, status: 'approved' | 'denied') => {
    try {
      const res = await fetch('/api/travel-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (data.success && data.travelRequest) {
        setRequests((prev) => prev.map((r) => (r.id === id ? data.travelRequest : r)))
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    try {
      const res = await fetch(`/api/travel-requests?id=${id}`, { method: 'DELETE' })
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
      'Date Requested': fmtDate(r.dateOfRequest),
      'Traveler': r.travelerName,
      'Reason': r.travelReason,
      'Charge Workroom': r.chargeWorkroom,
      'Stay Type': r.stayType || '-',
      'Destination City': r.destinationCity || '-',
      'Check-in': fmtDate(r.checkInDate),
      'Check-out': fmtDate(r.checkOutDate),
      'Departing From': r.departingFrom || '-',
      'Arriving At': r.arrivingAt || '-',
      'Departure Date': fmtDate(r.departureDate),
      'Arrival Date': fmtDate(r.arrivalDate),
      'Vehicle Pickup': r.vehiclePickupLocation || '-',
      'Vehicle Return': r.vehicleReturnLocation || '-',
      'Vehicle Pickup Date': fmtDate(r.vehiclePickupDate),
      'Vehicle Return Date': fmtDate(r.vehicleReturnDate),
      'Rideshare Budget': r.rideshareBudget || '-',
      'Status': statusMeta[r.status]?.label || r.status,
      'Reviewed By': r.reviewedBy || '-',
      'Created By': r.createdByName || r.createdByEmail || '-',
    }))
    downloadExcel(rows, 'Travel_Requests')
  }

  const analytics = (() => {
    const total = requests.length
    const approved = requests.filter((r) => r.status === 'approved').length
    const denied = requests.filter((r) => r.status === 'denied').length
    const pending = requests.filter((r) => r.status === 'pending').length
    return { total, approved, denied, pending }
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
      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-[1550px] mx-auto space-y-8">

            {/* Header */}
            <div className="rounded-2xl border border-brand-green-dark/20 bg-brand-green shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Travel Request</h1>
                  <p className="text-emerald-50/90">Employee business travel &amp; transportation accommodation requests.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <ClipboardList className="w-3.5 h-3.5" />{analytics.total} requests
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <Clock className="w-3.5 h-3.5" />{analytics.pending} pending
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <CheckCircle2 className="w-3.5 h-3.5" />{analytics.approved} approved
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20 flex-shrink-0">
                  <Plus className="w-5 h-5" />New Travel Request
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Requests', value: analytics.total, desc: 'All travel requests', icon: ClipboardList },
                { label: 'Pending', value: analytics.pending, desc: 'Awaiting review', icon: Clock },
                { label: 'Approved', value: analytics.approved, desc: 'Ready to book', icon: CheckCircle2 },
                { label: 'Denied', value: analytics.denied, desc: 'Not approved', icon: AlertCircle },
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
                      <button onClick={() => setShowForm(false)}
                        className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                      </button>
                      <div>
                        <h2 className="text-base font-bold text-slate-800">Employee Business Travel &amp; Transportation Accommodation Request</h2>
                        <p className="text-xs text-slate-400">Fields marked <span className="text-red-500">*</span> are required</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* General */}
                    <section>
                      <SectionHeader icon={FileText} step="General" title="Trip Details"
                        subtitle="It is recommended that travel requests be made 7-10 business days in advance of travel dates. You may review the FIS Travel policy in the FIS Employee handbook." />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        <Field label="Date of Request" required hint="Recommended 7-10 business days before travel.">
                          <input type="date" value={form.dateOfRequest} onChange={(e) => update('dateOfRequest', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Name of individual requiring travel" required hint="Include the full name as it appears on a driver's license or passport for air travel.">
                          <input type="text" value={form.travelerName} onChange={(e) => update('travelerName', e.target.value)} placeholder="Full legal name" className={inputClass} />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Reason travel is being requested" required hint="Please be specific.">
                            <textarea value={form.travelReason} onChange={(e) => update('travelReason', e.target.value)} rows={3} placeholder="Explain the purpose of this trip..." className={`${inputClass} resize-none`} />
                          </Field>
                        </div>
                        <Field label="Select Workroom to be charged for this expense" required hint="This travel expense will be charged to the selected workroom's operating budget.">
                          <select value={form.chargeWorkroom} onChange={(e) => update('chargeWorkroom', e.target.value)} className={inputClass}>
                            <option value="">Select workroom</option>
                            {allWorkrooms().map((w) => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </Field>
                      </div>
                    </section>

                    {/* Stays */}
                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader icon={BedDouble} step="Stays" title="Hotel / Airbnb Stay"
                        subtitle="If you do not require a hotel or Airbnb stay, you can skip this section. All hotel rooms are booked at a mid-tier hotel with 'good' to 'very good' rating and single occupancy." />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        <Field label="Travel Requirements">
                          <select value={form.stayType} onChange={(e) => update('stayType', e.target.value)} className={inputClass}>
                            <option value="">No stay required</option>
                            <option value="hotel">Hotel</option>
                            <option value="airbnb">Airbnb (extended stays)</option>
                          </select>
                        </Field>
                        <Field label="What is your destination city?">
                          <input type="text" value={form.destinationCity} onChange={(e) => update('destinationCity', e.target.value)} placeholder="City, State" className={inputClass} />
                        </Field>
                        <Field label="Check-in and/or Arrival Date">
                          <input type="date" value={form.checkInDate} onChange={(e) => update('checkInDate', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Check-out and/or Departure Date">
                          <input type="date" value={form.checkOutDate} onChange={(e) => update('checkOutDate', e.target.value)} className={inputClass} />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Stays — Special needs, requests and/or comments">
                            <textarea value={form.stayComments} onChange={(e) => update('stayComments', e.target.value)} rows={2} placeholder="Any special requirements for your stay..." className={`${inputClass} resize-none`} />
                          </Field>
                        </div>
                      </div>
                    </section>

                    {/* Flights */}
                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader icon={Plane} step="Flights" title="Air Travel"
                        subtitle="If you do not require air travel, you can skip this section. All flights are booked economy class with round-trip airfare unless otherwise approved." />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        <Field label="Departing from...">
                          <input type="text" value={form.departingFrom} onChange={(e) => update('departingFrom', e.target.value)} placeholder="City, state and airport" className={inputClass} />
                        </Field>
                        <Field label="Arriving at...">
                          <input type="text" value={form.arrivingAt} onChange={(e) => update('arrivingAt', e.target.value)} placeholder="City, state and airport" className={inputClass} />
                        </Field>
                        <Field label="Date of Departure">
                          <input type="date" value={form.departureDate} onChange={(e) => update('departureDate', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Date of Arrival">
                          <input type="date" value={form.arrivalDate} onChange={(e) => update('arrivalDate', e.target.value)} className={inputClass} />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Flights — Special needs, requests and/or comments">
                            <textarea value={form.flightComments} onChange={(e) => update('flightComments', e.target.value)} rows={2} placeholder="Any special requirements for your flight..." className={`${inputClass} resize-none`} />
                          </Field>
                        </div>
                      </div>
                    </section>

                    {/* Cars */}
                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader icon={Car} step="Cars" title="Car Rental / Ground Transport"
                        subtitle="All rentals are economy or compact cars unless pre-approved. Ride-share services are purchased by the traveler and reimbursed per FIS policy — enter an expected budget to pre-approve." />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        <Field label="Where will you need to pick up the vehicle?">
                          <input type="text" value={form.vehiclePickupLocation} onChange={(e) => update('vehiclePickupLocation', e.target.value)} placeholder="City, state or airport" className={inputClass} />
                        </Field>
                        <Field label="Where will you return the vehicle?">
                          <input type="text" value={form.vehicleReturnLocation} onChange={(e) => update('vehicleReturnLocation', e.target.value)} placeholder="City, state or airport" className={inputClass} />
                        </Field>
                        <Field label="Date you will pick up the vehicle">
                          <input type="date" value={form.vehiclePickupDate} onChange={(e) => update('vehiclePickupDate', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Date you will return the vehicle">
                          <input type="date" value={form.vehicleReturnDate} onChange={(e) => update('vehicleReturnDate', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="State that issued your driver's license">
                          <input type="text" value={form.licenseState} onChange={(e) => update('licenseState', e.target.value)} placeholder="e.g. Florida" className={inputClass} />
                        </Field>
                        <Field label="Driver's license number">
                          <input type="text" value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)} placeholder="License number" className={inputClass} />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Cars — Special needs, requests or comments">
                            <textarea value={form.carComments} onChange={(e) => update('carComments', e.target.value)} rows={2} placeholder="Any special requirements for ground transport..." className={`${inputClass} resize-none`} />
                          </Field>
                        </div>
                        <Field label="Uber/Lyft/Taxi Expected Budget" hint="If applicable, enter the budget in dollars. Once approved you are expected to stay within the budget.">
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" inputMode="decimal" value={form.rideshareBudget} onChange={(e) => update('rideshareBudget', e.target.value)} placeholder="0.00" className={`${inputClass} pl-9`} />
                          </div>
                        </Field>
                      </div>
                    </section>

                    {/* Actions */}
                    {saveError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                      <button onClick={handleSubmit} disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-40 disabled:cursor-not-allowed">
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit Travel Request</>}
                      </button>
                      <button onClick={() => { setShowForm(false); setForm(emptyForm()); setSaveError(null) }}
                        className="px-5 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                        Cancel
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
                      <ClipboardList className="w-4 h-4 text-brand-green" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Travel Requests</h2>
                      <p className="text-xs text-slate-400">{requests.length} request{requests.length !== 1 ? 's' : ''}{!canReview ? ' (your submissions)' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search traveler..." className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white" />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                    </select>
                    <select value={filterWorkroom} onChange={(e) => setFilterWorkroom(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="">All Workrooms</option>
                      {allWorkrooms().map((w) => <option key={w} value={w}>{w}</option>)}
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
                  <p className="text-sm text-slate-400">Loading travel requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Plane className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No travel requests yet</p>
                  <p className="text-xs text-slate-300 mt-1">Click "New Travel Request" to submit your first request</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                        <th className="text-left py-3 px-5 font-semibold">Traveler</th>
                        <th className="text-left py-3 px-5 font-semibold">Workroom</th>
                        <th className="text-left py-3 px-5 font-semibold">Destination</th>
                        <th className="text-left py-3 px-5 font-semibold">Dates</th>
                        <th className="text-left py-3 px-5 font-semibold">Status</th>
                        {canReview && <th className="text-left py-3 px-4 font-semibold">Review</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => {
                        const meta = statusMeta[r.status] || statusMeta.pending
                        const StatusIcon = meta.icon
                        const expanded = expandedId === r.id
                        return (
                          <React.Fragment key={r.id}>
                            <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                              onClick={() => setExpandedId(expanded ? null : r.id)}>
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-brand-green" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">{r.travelerName}</p>
                                    <p className="text-[11px] text-slate-400">{fmtDate(r.dateOfRequest)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-5"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold"><Building2 className="w-3 h-3" />{r.chargeWorkroom}</span></td>
                              <td className="py-3.5 px-5">
                                {r.destinationCity || r.arrivingAt ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-green/10 text-brand-green rounded-full text-xs font-semibold"><MapPin className="w-3 h-3" />{r.destinationCity || r.arrivingAt}</span>
                                ) : <span className="text-xs text-slate-400">-</span>}
                              </td>
                              <td className="py-3.5 px-5">
                                <div className="text-xs text-slate-600 whitespace-nowrap">
                                  {r.checkInDate || r.departureDate ? `${fmtDate(r.checkInDate || r.departureDate)}` : '-'}
                                  {(r.checkOutDate || r.arrivalDate) && <span className="text-slate-400"> → {fmtDate(r.checkOutDate || r.arrivalDate)}</span>}
                                </div>
                              </td>
                              <td className="py-3.5 px-5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${meta.className}`}>
                                  <StatusIcon className="w-3 h-3 flex-shrink-0" />{meta.label}
                                </span>
                              </td>
                              {canReview && (
                                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2">
                                    {r.status !== 'approved' && (
                                      <button onClick={() => setStatus(r.id, 'approved')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors">
                                        <CheckCircle2 className="w-3 h-3" />Approve
                                      </button>
                                    )}
                                    {r.status !== 'denied' && (
                                      <button onClick={() => setStatus(r.id, 'denied')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                                        <X className="w-3 h-3" />Deny
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
                                {expanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                              </td>
                            </tr>

                            {expanded && (
                              <tr>
                                <td colSpan={canReview ? 7 : 6} className="px-5 py-4 bg-slate-50/40">
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {/* General */}
                                    <div className="lg:col-span-3 bg-white rounded-xl p-4 border border-slate-100">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-brand-green" />General</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <Card label="Date of Request" value={fmtDate(r.dateOfRequest)} />
                                        <Card label="Traveler" value={r.travelerName} />
                                        <Card label="Charge Workroom" value={r.chargeWorkroom} />
                                        <Card label="Created By" value={r.createdByName || r.createdByEmail || '-'} />
                                      </div>
                                      <div className="mt-3">
                                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Reason for Travel</p>
                                        <p className="text-sm text-slate-700 leading-relaxed">{r.travelReason}</p>
                                      </div>
                                    </div>

                                    {/* Stays */}
                                    {r.stayType && (
                                      <div className="bg-white rounded-xl p-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><BedDouble className="w-3.5 h-3.5 text-brand-green" />Stays</p>
                                        <div className="space-y-2.5">
                                          <Card label="Type" value={r.stayType === 'airbnb' ? 'Airbnb (extended)' : 'Hotel'} />
                                          <Card label="Destination" value={r.destinationCity || '-'} />
                                          <Card label="Check-in" value={fmtDate(r.checkInDate)} />
                                          <Card label="Check-out" value={fmtDate(r.checkOutDate)} />
                                          {r.stayComments && <Card label="Comments" value={r.stayComments} />}
                                        </div>
                                      </div>
                                    )}

                                    {/* Flights */}
                                    {r.departingFrom && (
                                      <div className="bg-white rounded-xl p-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Plane className="w-3.5 h-3.5 text-brand-green" />Flights</p>
                                        <div className="space-y-2.5">
                                          <div className="flex items-center gap-2 text-sm">
                                            <PlaneTakeoff className="w-3.5 h-3.5 text-brand-green flex-shrink-0" />
                                            <span className="text-slate-700">{r.departingFrom}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-sm">
                                            <PlaneLanding className="w-3.5 h-3.5 text-brand-green flex-shrink-0" />
                                            <span className="text-slate-700">{r.arrivingAt || '-'}</span>
                                          </div>
                                          <Card label="Departure" value={fmtDate(r.departureDate)} />
                                          <Card label="Arrival" value={fmtDate(r.arrivalDate)} />
                                          {r.flightComments && <Card label="Comments" value={r.flightComments} />}
                                        </div>
                                      </div>
                                    )}

                                    {/* Cars */}
                                    {(r.vehiclePickupLocation || r.rideshareBudget) && (
                                      <div className="bg-white rounded-xl p-4 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-brand-green" />Cars</p>
                                        <div className="space-y-2.5">
                                          {r.vehiclePickupLocation && <Card label="Pickup" value={r.vehiclePickupLocation} />}
                                          {r.vehicleReturnLocation && <Card label="Return" value={r.vehicleReturnLocation} />}
                                          {r.vehiclePickupDate && <Card label="Pickup Date" value={fmtDate(r.vehiclePickupDate)} />}
                                          {r.vehicleReturnDate && <Card label="Return Date" value={fmtDate(r.vehicleReturnDate)} />}
                                          {r.licenseState && <Card label="License State" value={r.licenseState} />}
                                          {r.licenseNumber && <Card label="License #" value={r.licenseNumber} />}
                                          {r.carComments && <Card label="Comments" value={r.carComments} />}
                                          {r.rideshareBudget && <Card label="Rideshare Budget" value={`$${r.rideshareBudget}`} />}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {(r.reviewedBy || r.reviewNote) && (
                                    <div className="mt-3 bg-white rounded-xl p-4 border border-slate-100">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Review</p>
                                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                                        {r.reviewedBy && <span className="text-slate-600"><span className="text-slate-400 font-semibold">Reviewed by:</span> {r.reviewedBy}</span>}
                                        {r.reviewNote && <span className="text-slate-600"><span className="text-slate-400 font-semibold">Note:</span> {r.reviewNote}</span>}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>

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
                <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Travel Request</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to delete this travel request? This action cannot be undone.</p>
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

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-100">
      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
    </div>
  )
}
