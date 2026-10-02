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
  Gauge,
  ShieldCheck,
  FileText,
  XCircle,
  Calendar,
  Wrench,
} from 'lucide-react'
import { downloadExcel } from '@/lib/export-utils'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { WORKROOM_OPTIONS } from '@/lib/questions'

interface FleetCar {
  id: string
  makeModel: string
  plate: string
  location: string
}

interface VehicleInspection {
  id: string
  createdAt: string
  inspectionDate: string
  assignedLocation: string
  makeModel: string
  tagNumber: string
  headlightsTailLights: string | null
  brakeLights: string | null
  signalHazardLights: string | null
  autoGlassMirrors: string | null
  wipers: string | null
  brakes: string | null
  horn: string | null
  seatBelts: string | null
  tires: string | null
  firstAidKit: string | null
  fireExtinguisher: string | null
  insuranceRegistration: string | null
  licensePlateSticker: string | null
  cleanedRegularly: string | null
  currentMileage: number | null
  nextOilChangeDate: string | null
  nextOilChangeMileage: number | null
  comments: string | null
  inspectionStatement: string
  createdByEmail: string | null
  createdByName: string | null
}

const YES_NO_OPTIONS = ['Yes', 'No'] as const

const YES_NO_FIELDS: { key: keyof VehicleInspection; label: string; question: string }[] = [
  { key: 'headlightsTailLights', label: 'Headlights & Tail Lights', question: 'Are the Headlights (low & high beam) & Tail Lights working properly?' },
  { key: 'brakeLights', label: 'Brake Lights', question: 'Are the Brake Lights working properly?' },
  { key: 'signalHazardLights', label: 'Signal & Hazard Lights', question: 'Are all (front, rear, side) Signal Lights & Hazard Lights work properly?' },
  { key: 'autoGlassMirrors', label: 'Auto Glass & Mirrors', question: 'Is all (front, rear, side) Auto Glass including mirrors free from any damage (chips, cracks, loose seals), so the drivers view is not obstructed? (do not include repaired glass unless it obstructs the drivers view)' },
  { key: 'wipers', label: 'Wipers', question: 'Are the Wipers working properly?' },
  { key: 'brakes', label: 'Brakes', question: 'Are the Brakes working properly?' },
  { key: 'horn', label: 'Horn', question: 'Is the Horn working properly?' },
  { key: 'seatBelts', label: 'Seat Belts', question: 'Are all (driver & passenger) Seat Belts working properly and free from damage?' },
  { key: 'tires', label: 'Tires', question: 'Are the Tires free from damage or unusual wear?' },
  { key: 'firstAidKit', label: 'First Aid / Emergency Kit', question: 'Is there a First Aid Kit or Roadside Emergency Kit onboard the vehicle?' },
  { key: 'fireExtinguisher', label: 'Fire Extinguisher', question: 'Is there a properly charged Fire Extinguisher onboard the vehicle?' },
  { key: 'insuranceRegistration', label: 'Insurance & Registration', question: 'Are the proof of Insurance & Registration cards onboard the vehicle and current (not expired)?' },
  { key: 'licensePlateSticker', label: 'License Plate Sticker', question: 'After a visual inspection is the License Plate expiration sticker month/year current (not expired)?' },
  { key: 'cleanedRegularly', label: 'Cleaned Inside & Out', question: 'Is the vehicle being regularly Cleaned both inside and out?' },
]

const SAFETY_INDEX = 11 // first 11 yes/no fields are "safety features"
const OPERATING_INDEX = 13 // fields 12-13 are "operating requirements"

interface FormState {
  inspectionDate: string
  assignedLocation: string
  makeModel: string
  tagNumber: string
  headlightsTailLights: string
  brakeLights: string
  signalHazardLights: string
  autoGlassMirrors: string
  wipers: string
  brakes: string
  horn: string
  seatBelts: string
  tires: string
  firstAidKit: string
  fireExtinguisher: string
  insuranceRegistration: string
  licensePlateSticker: string
  cleanedRegularly: string
  currentMileage: string
  nextOilChangeDate: string
  nextOilChangeMileage: string
  comments: string
  inspectionStatement: string
}

const emptyForm = (): FormState => ({
  inspectionDate: '',
  assignedLocation: '',
  makeModel: '',
  tagNumber: '',
  headlightsTailLights: '',
  brakeLights: '',
  signalHazardLights: '',
  autoGlassMirrors: '',
  wipers: '',
  brakes: '',
  horn: '',
  seatBelts: '',
  tires: '',
  firstAidKit: '',
  fireExtinguisher: '',
  insuranceRegistration: '',
  licensePlateSticker: '',
  cleanedRegularly: '',
  currentMileage: '',
  nextOilChangeDate: '',
  nextOilChangeMileage: '',
  comments: '',
  inspectionStatement: '',
})

function fmtDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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

function YesNoSelect({ value, onChange, placeholder = 'Select your answer' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">{placeholder}</option>
      {YES_NO_OPTIONS.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
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

export default function VehicleInspectionPage() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { sidebarOpen } = useSidebarOpen()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN', 'ACCOUNTING'].includes(normalizedRole)
  const canDelete = normalizedRole === 'SUPER_ADMIN'

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [manualVehicle, setManualVehicle] = useState(false)
  const [cars, setCars] = useState<FleetCar[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [inspections, setInspections] = useState<VehicleInspection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [filterLocation, setFilterLocation] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
    if (sessionStatus === 'authenticated' && normalizedRole && !canAccess) router.push('/dashboard')
  }, [sessionStatus, router, canAccess, normalizedRole])

  const fetchInspections = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterLocation) params.set('location', filterLocation)
      if (search) params.set('search', search)
      const res = await fetch('/api/vehicle-inspections?' + params.toString())
      const data = await res.json()
      if (data.success) setInspections(data.inspections || [])
    } catch (err) {
      console.error('Error fetching vehicle inspections:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterLocation, search])

  const fetchCars = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicle-inspections?action=vehicles')
      const data = await res.json()
      if (data.success) setCars(data.cars || [])
    } catch (err) {
      console.error('Error fetching fleet cars:', err)
    }
  }, [])

  useEffect(() => {
    if (canAccess) {
      fetchInspections()
      fetchCars()
    }
  }, [canAccess, fetchInspections, fetchCars])

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleVehicleSelect = (value: string) => {
    if (value === '__other__') {
      setManualVehicle(true)
      update('makeModel', '')
      update('tagNumber', '')
      return
    }
    setManualVehicle(false)
    const car = cars.find((c) => c.makeModel === value)
    update('makeModel', value)
    update('tagNumber', car?.plate || '')
  }

  const resetForm = () => {
    setForm(emptyForm())
    setManualVehicle(false)
    setSaveError(null)
  }

  const handleSubmit = async () => {
    setSaveError(null)

    const missing: string[] = []
    if (!form.inspectionDate) missing.push('Inspection Date')
    if (!form.assignedLocation) missing.push('Assigned Location')
    if (!form.makeModel.trim()) missing.push('Make & Model')
    if (!form.tagNumber.trim()) missing.push('Vehicle Tag Number')
    for (const f of YES_NO_FIELDS) {
      if (!form[f.key as keyof FormState]) missing.push(f.label)
    }
    if (!form.currentMileage) missing.push('Current Mileage')
    if (!form.inspectionStatement) missing.push('Inspection Statement')

    if (missing.length > 0) {
      setSaveError(`Please complete the required fields: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ` (+${missing.length - 4} more)` : ''}.`)
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/vehicle-inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          nextOilChangeDate: form.nextOilChangeDate || null,
          nextOilChangeMileage: form.nextOilChangeMileage || null,
          comments: form.comments || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to submit inspection')
      }
      setShowForm(false)
      resetForm()
      fetchInspections()
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    try {
      const res = await fetch(`/api/vehicle-inspections?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setInspections((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const exportToExcel = () => {
    const rows = inspections.map((r) => {
      const row: Record<string, string | number> = {
        'Inspection Date': fmtDate(r.inspectionDate),
        'Assigned Location': r.assignedLocation,
        'Make & Model': r.makeModel,
        'Tag Number': r.tagNumber,
      }
      for (const f of YES_NO_FIELDS) {
        row[f.label] = r[f.key] || '-'
      }
      row['Current Mileage'] = r.currentMileage ?? ''
      row['Next Oil Change Date'] = fmtDate(r.nextOilChangeDate)
      row['Next Oil Change Mileage'] = r.nextOilChangeMileage ?? ''
      row['Comments'] = r.comments || '-'
      row['Statement'] = r.inspectionStatement
      row['Created By'] = r.createdByName || r.createdByEmail || '-'
      return row
    })
    downloadExcel(rows, 'Monthly_Vehicle_Inspections')
  }

  const analytics = useMemo(() => {
    const total = inspections.length
    const passed = inspections.filter((r) => r.inspectionStatement === 'Agree').length
    const failed = inspections.filter((r) => r.inspectionStatement === 'Disagree').length
    let noCount = 0
    for (const r of inspections) {
      for (const f of YES_NO_FIELDS) {
        if (r[f.key] === 'No') noCount++
      }
    }
    return { total, passed, failed, noCount }
  }, [inspections])

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

  const detail = inspections.find((r) => r.id === detailId) || null

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
                  <h1 className="text-3xl font-bold text-white mb-2">Monthly Vehicle Inspection</h1>
                  <p className="text-emerald-50/90">Complete the monthly safety, operating, and maintenance inspection for company vehicles.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <ClipboardList className="w-3.5 h-3.5" />{analytics.total} inspections
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <CheckCircle2 className="w-3.5 h-3.5" />{analytics.passed} passed
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      <XCircle className="w-3.5 h-3.5" />{analytics.failed} failed
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20 flex-shrink-0">
                  <Plus className="w-5 h-5" />New Inspection
                </button>
              </div>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Inspections', value: analytics.total, desc: 'All inspections submitted', icon: ClipboardList },
                { label: 'Passed', value: analytics.passed, desc: 'Statement agreed', icon: CheckCircle2 },
                { label: 'Failed', value: analytics.failed, desc: 'Statement disagreed', icon: XCircle },
                { label: 'Flagged Items', value: analytics.noCount, desc: '"No" answers recorded', icon: AlertCircle },
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
                        <h2 className="text-base font-bold text-slate-800">Monthly Vehicle Inspection</h2>
                        <p className="text-xs text-slate-400">Fields marked <span className="text-red-500">*</span> are required</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* Vehicle Information */}
                    <section>
                      <SectionHeader icon={Car} step="Vehicle Information" title="Vehicle Information" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        <Field label="1. Inspection Date" required>
                          <input type="date" value={form.inspectionDate} onChange={(e) => update('inspectionDate', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="2. Assigned Location" required>
                          <select value={form.assignedLocation} onChange={(e) => update('assignedLocation', e.target.value)} className={inputClass}>
                            <option value="">Select your answer</option>
                            {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </Field>
                        <Field label="3. Make & Model of Vehicle being inspected" required hint="Choose from the fleet (cars).">
                          {!manualVehicle ? (
                            <select value={form.makeModel} onChange={(e) => handleVehicleSelect(e.target.value)} className={inputClass}>
                              <option value="">Select vehicle</option>
                              {cars.map((car) => (
                                <option key={car.id} value={car.makeModel}>
                                  {car.makeModel}{car.plate ? ` · ${car.plate}` : ''}{car.location ? ` (${car.location})` : ''}
                                </option>
                              ))}
                              <option value="__other__">Other / not listed</option>
                            </select>
                          ) : (
                            <input type="text" value={form.makeModel} onChange={(e) => update('makeModel', e.target.value)} placeholder="Year Make Model" className={inputClass} />
                          )}
                        </Field>
                        <Field label="4. Vehicle Tag Number" required>
                          <input type="text" value={form.tagNumber} onChange={(e) => update('tagNumber', e.target.value)} placeholder="Tag number" className={`${inputClass} font-semibold`} />
                        </Field>
                      </div>
                    </section>

                    {/* Safety features */}
                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader icon={ShieldCheck} step="Safety" title="Verify the following safety features are working properly" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        {YES_NO_FIELDS.slice(0, SAFETY_INDEX).map((f, i) => (
                          <Field key={f.key} label={`${i + 5}. ${f.question}`} required>
                            <YesNoSelect value={String(form[f.key as keyof FormState] || '')} onChange={(v) => update(f.key as keyof FormState, v)} />
                          </Field>
                        ))}
                      </div>
                    </section>

                    {/* Operating requirements */}
                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader icon={FileText} step="Operating" title="Verify the following operating requirements" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        {YES_NO_FIELDS.slice(SAFETY_INDEX, OPERATING_INDEX).map((f, i) => (
                          <Field key={f.key} label={`${SAFETY_INDEX + i + 5}. ${f.question}`} required>
                            <YesNoSelect value={String(form[f.key as keyof FormState] || '')} onChange={(v) => update(f.key as keyof FormState, v)} />
                          </Field>
                        ))}
                      </div>
                    </section>

                    {/* Maintenance items */}
                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader icon={Wrench} step="Maintenance" title="Visually inspect the following maintenance items" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                        <Field label={`${OPERATING_INDEX + 5}. ${YES_NO_FIELDS[OPERATING_INDEX].question}`} required>
                          <YesNoSelect value={String(form.cleanedRegularly || '')} onChange={(v) => update('cleanedRegularly', v)} />
                        </Field>
                        <Field label={`${OPERATING_INDEX + 6}. What is the Current Mileage of the vehicle (odometer reading)?`} required hint="The value must be a number.">
                          <input type="number" inputMode="numeric" value={form.currentMileage} onChange={(e) => update('currentMileage', e.target.value)} placeholder="0" className={inputClass} />
                        </Field>
                        <Field label={`${OPERATING_INDEX + 7}. Enter the Next Oil Change Date noted on the windshield sticker`} hint="If no windshield sticker, estimate the next oil change date. Skip if not applicable (i.e. Tesla models).">
                          <input type="date" value={form.nextOilChangeDate} onChange={(e) => update('nextOilChangeDate', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label={`${OPERATING_INDEX + 8}. Enter the Next Oil Change Mileage noted on the windshield sticker`} hint="If no windshield sticker, estimate the next oil change mileage. Skip if not applicable (i.e. Tesla models). The value must be a number.">
                          <input type="number" inputMode="numeric" value={form.nextOilChangeMileage} onChange={(e) => update('nextOilChangeMileage', e.target.value)} placeholder="0" className={inputClass} />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label={`${OPERATING_INDEX + 9}. Note any additional comments or concerns here`} hint="Service, Maintenance or Repairs will not be made based on comments in this section. A service request must be submitted via a Service Request form for fleet services to be performed.">
                            <textarea value={form.comments} onChange={(e) => update('comments', e.target.value)} rows={3} placeholder="Enter your answer" className={`${inputClass} resize-none`} />
                          </Field>
                        </div>
                      </div>
                    </section>

                    {/* Inspection statement */}
                    <section className="pt-6 border-t border-slate-100">
                      <SectionHeader icon={ClipboardList} step="Statement" title="Inspection Statement" />
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm text-slate-700 leading-relaxed">
                          This vehicle has passed a visual safety inspection, not limited to the items in this inspection report and is considered safe to operate notwithstanding a certified mechanical inspection.
                          If applicable, any and all repair or maintenance items will be submitted to the Fleet Manager via a Service Request form in a timely manner.
                        </p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(['Agree', 'Disagree'] as const).map((option) => (
                            <label key={option}
                              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors ${form.inspectionStatement === option ? 'border-brand-green bg-brand-green/5' : 'border-slate-200 bg-white hover:border-brand-green/40'}`}>
                              <input
                                type="radio"
                                name="inspectionStatement"
                                value={option}
                                checked={form.inspectionStatement === option}
                                onChange={() => update('inspectionStatement', option)}
                                className="h-4 w-4 accent-brand-green"
                              />
                              <span className={`text-sm font-semibold ${option === 'Agree' ? 'text-emerald-700' : 'text-red-600'}`}>{option}</span>
                            </label>
                          ))}
                        </div>
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
                        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Send className="w-4 h-4" />Submit Inspection</>}
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
                      <Car className="w-4 h-4 text-brand-green" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Inspection Records</h2>
                      <p className="text-xs text-slate-400">{inspections.length} inspection{inspections.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicle or tag..." className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white" />
                    <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none">
                      <option value="">All Locations</option>
                      {WORKROOM_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                    {canDelete && (
                      <button onClick={exportToExcel} disabled={inspections.length === 0}
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
                  <p className="text-sm text-slate-400">Loading inspections...</p>
                </div>
              ) : inspections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Car className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No vehicle inspections yet</p>
                  <p className="text-xs text-slate-300 mt-1">Click "New Inspection" to submit your first inspection</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                        <th className="text-left py-3 px-5 font-semibold">Inspection</th>
                        <th className="text-left py-3 px-5 font-semibold">Vehicle</th>
                        <th className="text-left py-3 px-5 font-semibold">Location</th>
                        <th className="text-left py-3 px-5 font-semibold">Mileage</th>
                        <th className="text-left py-3 px-5 font-semibold">Statement</th>
                        {canDelete && <th className="text-left py-3 px-4 font-semibold">Actions</th>}
                        <th className="text-left py-3 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map((r) => {
                        const passed = r.inspectionStatement === 'Agree'
                        return (
                          <tr key={r.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => setDetailId(r.id)}>
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                  <Calendar className="w-4 h-4 text-brand-green" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-700">{fmtDate(r.inspectionDate)}</p>
                                  <p className="text-[11px] text-slate-400">{r.createdByName || r.createdByEmail || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="text-sm font-medium text-slate-700">{r.makeModel}</div>
                              <div className="text-[11px] text-slate-400">{r.tagNumber}</div>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                                <Building2 className="w-3 h-3" />{r.assignedLocation}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-slate-600">
                              {r.currentMileage ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Gauge className="w-3.5 h-3.5 text-brand-green" />{r.currentMileage.toLocaleString()} mi
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${passed ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                {passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {passed ? 'Passed' : 'Failed'}
                              </span>
                            </td>
                            {canDelete && (
                              <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setConfirmDeleteId(r.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
                                  <Trash2 className="w-3 h-3" />Delete
                                </button>
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
            const passed = detail.inspectionStatement === 'Agree'
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
                        <Car className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Vehicle Inspection</h3>
                        <p className="text-xs text-slate-500">{fmtDate(detail.inspectionDate)} · {detail.assignedLocation}</p>
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
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${passed ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {passed ? 'Passed' : 'Failed'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                        <Building2 className="w-3 h-3" />{detail.assignedLocation}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Make & Model</p>
                        <p className="text-sm font-semibold text-slate-800">{detail.makeModel}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Tag Number</p>
                        <p className="text-sm font-semibold text-slate-800">{detail.tagNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Current Mileage</p>
                        <p className="text-sm font-semibold text-slate-800">{detail.currentMileage ? detail.currentMileage.toLocaleString() : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Next Oil Change</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {detail.nextOilChangeDate ? fmtDate(detail.nextOilChangeDate) : '-'}
                          {detail.nextOilChangeMileage ? ` · ${detail.nextOilChangeMileage.toLocaleString()} mi` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">Inspection Checklist</div>
                      <div className="divide-y divide-slate-100">
                        {YES_NO_FIELDS.map((f) => {
                          const value = String(detail[f.key] || '')
                          return (
                            <div key={f.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <span className="text-sm text-slate-700">{f.question}</span>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${value === 'Yes' ? 'bg-emerald-50 text-emerald-600' : value === 'No' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                                {value || '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {detail.comments && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Comments / Concerns</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{detail.comments}</p>
                      </div>
                    )}
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
                <h3 className="text-lg font-bold text-slate-800 mb-1">Delete Inspection</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">Are you sure you want to delete this vehicle inspection? This action cannot be undone.</p>
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
