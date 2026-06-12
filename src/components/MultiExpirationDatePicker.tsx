'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Calendar, CheckCircle2, Plus, Trash2, X } from 'lucide-react'
import { NULL_ATTACHMENT_HATCH_STYLE } from '@/lib/nullAttachmentStyle'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function parseDateOnlyToUTC(dateString: string): Date | null {
  const s = String(dateString || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
    return new Date(Date.UTC(y, mo - 1, d))
  }
  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

function toYMDUTC(dt: Date) {
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

function getExpirationStatus(expiryDate: string | null | undefined): 'valid' | 'expiring' | 'expired' | 'none' {
  if (!expiryDate) return 'none'
  const d = parseDateOnlyToUTC(expiryDate)
  if (!d) return 'none'

  const expiry = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  if (expiry < today) return 'expired'

  const yearsDiff = expiry.getFullYear() - today.getFullYear()
  const monthsDiff = expiry.getMonth() - today.getMonth()
  const totalMonthsDiff = yearsDiff * 12 + monthsDiff
  const daysDiff = expiry.getDate() - today.getDate()
  const adjustedMonthsDiff = daysDiff < 0 ? totalMonthsDiff - 1 : totalMonthsDiff

  if (adjustedMonthsDiff >= 0 && adjustedMonthsDiff <= 3) return 'expiring'
  return 'valid'
}

function formatDisplayDate(dateString: string) {
  const d = parseDateOnlyToUTC(dateString)
  if (!d) return 'N/A'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function normalize(values: string[]) {
  const cleaned = values
    .map((v) => (v || '').trim())
    .filter(Boolean)
    .map((v) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const d = parseDateOnlyToUTC(v)
        if (d && d.getUTCFullYear() >= 1000 && d.getUTCFullYear() <= 2099) {
          return v
        }
      }
      
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) return null
      
      const year = d.getFullYear()
      if (year < 1000 || year > 2099) {
        const match = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
        if (match) {
          const [, month, day, yearStr] = match
          const fullYear = yearStr.length === 2 
            ? (parseInt(yearStr) < 50 ? 2000 + parseInt(yearStr) : 1900 + parseInt(yearStr))
            : parseInt(yearStr)
          if (fullYear >= 1000 && fullYear <= 2099) {
            const fixedDate = new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day)))
            if (!Number.isNaN(fixedDate.getTime())) {
              return toYMDUTC(fixedDate)
            }
          }
        }
        return null
      }
      
      return toYMDUTC(d)
    })
    .filter(Boolean) as string[]

  cleaned.sort((a, b) => {
    const da = parseDateOnlyToUTC(a)
    const db = parseDateOnlyToUTC(b)
    return (da?.getTime() ?? 0) - (db?.getTime() ?? 0)
  })
  return cleaned
}

export function MultiExpirationDatePicker({
  label,
  values,
  onChange,
  isEditing,
  addLabel = 'Add date',
  onNullToggle,
  initialNullActive = false,
  allowNull = false,
}: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  isEditing: boolean
  addLabel?: string
  onNullToggle?: (active: boolean) => void
  initialNullActive?: boolean
  allowNull?: boolean
}) {
  const [localValues, setLocalValues] = useState<string[]>(() => {
    const n = normalize(values || [])
    return n.length === 0 ? [''] : n
  })
  const [nullActive, setNullActive] = useState(initialNullActive)
  const prevValuesRef = useRef<string[]>([])

  const setNullActiveAndNotify = useCallback((v: boolean) => {
    setNullActive(v)
    onNullToggle?.(v)
  }, [onNullToggle])

  // Sync local state with prop values (does NOT depend on localValues to avoid infinite loop)
  useEffect(() => {
    if (!isEditing) {
      const n = normalize(values || [])
      setLocalValues(n.length === 0 ? [''] : n)
    }
    // In edit mode, only sync when values prop becomes non-empty and local has no valid dates
  }, [values, isEditing])

  // Reset nullActive when values become non-empty
  useEffect(() => {
    if (!isEditing && normalize(values || []).length > 0) {
      setNullActive(false)
      prevValuesRef.current = []
    }
  }, [values, isEditing])

  // Sync initialNullActive from parent
  useEffect(() => {
    setNullActive(initialNullActive)
  }, [initialNullActive])

  const normalized = normalize(localValues)
  const statuses = normalized.map((v) => getExpirationStatus(v))
  let overallStatus: 'expired' | 'expiring' | 'valid' | 'none' = 'none'
  if (statuses.includes('expired')) {
    overallStatus = 'expired'
  } else if (statuses.includes('expiring')) {
    overallStatus = 'expiring'
  } else if (statuses.includes('valid')) {
    overallStatus = 'valid'
  }

  let borderBg = 'border-slate-200 bg-slate-50/50'
  if (overallStatus === 'expired') {
    borderBg = 'border-red-500 bg-red-50'
  } else if (overallStatus === 'expiring') {
    borderBg = 'border-yellow-500 bg-yellow-50'
  } else if (overallStatus === 'valid') {
    borderBg = 'border-green-500 bg-green-50'
  }

  let badge: React.ReactNode = null
  if (overallStatus === 'expired') {
    badge = <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">Expired</span>
  } else if (overallStatus === 'expiring') {
    badge = <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Expiring Soon</span>
  } else if (overallStatus === 'valid') {
    badge = <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Valid</span>
  }

  const handleDeactivateNull = useCallback(() => {
    if (prevValuesRef.current.length > 0) {
      onChange(prevValuesRef.current)
      prevValuesRef.current = []
    }
    setNullActiveAndNotify(false)
  }, [onChange, setNullActiveAndNotify])

  const handleActivateNull = useCallback(() => {
    setNullActiveAndNotify(true)
  }, [setNullActiveAndNotify])

  const handleSetNull = useCallback(() => {
    prevValuesRef.current = [...normalized]
    onChange([])
    setNullActiveAndNotify(true)
  }, [normalized, onChange, setNullActiveAndNotify])

  const handleEditSetNull = useCallback((currentVals: string[]) => {
    prevValuesRef.current = [...normalize(currentVals)]
    setLocalValues([''])
    onChange([])
    setNullActiveAndNotify(true)
  }, [onChange, setNullActiveAndNotify])

  if (!isEditing) {
    if (nullActive) {
      return (
        <div className="group relative p-3 sm:p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:shadow-sm transition-all duration-200">
          <span className="absolute inset-0 rounded-xl pointer-events-none opacity-90" style={NULL_ATTACHMENT_HATCH_STYLE} aria-hidden />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5 sm:mb-2 gap-0.5 sm:gap-0">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
              <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
                {badge}
                {allowNull && (
                <button type="button" onClick={handleDeactivateNull} className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[10px] sm:text-xs font-semibold transition-colors shrink-0 border-slate-400 bg-slate-200 text-slate-800" title="Deactivate NULL">
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-700" />
                  NULL
                </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              <p className="font-semibold text-sm sm:text-base text-slate-900">N/A</p>
            </div>
          </div>
        </div>
      )
    }

    if (normalized.length === 0) {
      return (
        <div className={`group relative p-3 sm:p-4 rounded-xl border-2 ${borderBg} hover:shadow-sm transition-all duration-200`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5 sm:mb-2 gap-0.5 sm:gap-0">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
            <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
              {badge}
              {allowNull && (
              <button type="button" onClick={handleActivateNull} className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[10px] sm:text-xs font-semibold transition-colors shrink-0 border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Set to NULL">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                NULL
              </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            <p className="font-semibold text-sm sm:text-base text-slate-900">N/A</p>
          </div>
        </div>
      )
    }

    return (
      <div className={`group relative p-3 sm:p-4 rounded-xl border-2 ${borderBg} hover:shadow-sm transition-all duration-200`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5 sm:mb-2 gap-0.5 sm:gap-0">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
          <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
            {badge}
            {allowNull && (
            <button type="button" onClick={handleSetNull} className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[10px] sm:text-xs font-semibold transition-colors shrink-0 border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Set to NULL">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
              NULL
            </button>
            )}
          </div>
        </div>
        <div className="space-y-0.5 sm:space-y-1">
          {normalized.map((v, idx) => (
            <div key={`${v}-${idx}`} className="flex items-center gap-1.5 sm:gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              <p className="font-semibold text-sm sm:text-base text-slate-900">{formatDisplayDate(v)}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const inputValues = localValues.length === 0 ? [''] : localValues

  return (
    <div className={`group relative p-3 sm:p-4 rounded-xl border-2 ${nullActive ? 'border-emerald-300 bg-emerald-50' : borderBg} hover:shadow-sm transition-all duration-200`}>
      {nullActive && <span className="absolute inset-0 rounded-xl pointer-events-none opacity-90" style={NULL_ATTACHMENT_HATCH_STYLE} aria-hidden />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 gap-0.5 sm:gap-0 relative z-10">
        <p className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto flex-wrap">
          {badge}
          {allowNull && (
          <button type="button" onClick={() => {
            if (nullActive) {
              handleDeactivateNull()
            } else {
              handleEditSetNull(inputValues)
            }
          }} className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[10px] sm:text-xs font-semibold transition-colors shrink-0 ${nullActive ? 'border-slate-400 bg-slate-200 text-slate-800' : normalize(inputValues).length === 0 ? 'border-slate-400 bg-slate-200 text-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`} title={nullActive ? 'Deactivate NULL' : normalize(inputValues).length === 0 ? 'NULL (cleared)' : 'Set to NULL'}>
            <CheckCircle2 className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${nullActive || normalize(inputValues).length === 0 ? 'text-slate-700' : 'text-slate-400'}`} />
            NULL
          </button>
          )}
          {allowNull && !nullActive && normalize(inputValues).length > 0 ? (
            <button type="button" onClick={() => handleEditSetNull(inputValues)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium text-slate-500 hover:bg-white/80 hover:text-slate-700" title="Clear all dates">
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {nullActive ? (
        <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
          <p className="font-semibold text-sm sm:text-base text-slate-900">N/A (NULL)</p>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2 relative z-10">
        {inputValues.map((v, idx) => (
          <div key={`${idx}-${v || ''}`} className="flex items-center gap-1.5 sm:gap-2">
            <input type="date" value={v || ''} max="2099-12-31" onChange={(e) => {
              const next = [...inputValues]
              next[idx] = e.target.value
              setLocalValues(next)
              onChange(normalize(next))
            }} onBlur={(e) => {
              const currentValue = e.target.value
              const next = [...localValues]
              next[idx] = currentValue
              const n = normalize(next)
              const finalValues = n.length === 0 && isEditing ? [''] : n
              setLocalValues(finalValues)
              onChange(n)
            }} className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 text-sm border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900" />
            {inputValues.length > 1 && (
              <button type="button" onClick={() => {
                const next = inputValues.filter((_, i) => i !== idx)
                const n = normalize(next)
                setLocalValues(n.length === 0 ? [''] : n)
                onChange(n)
              }} className="p-1.5 sm:p-2 text-slate-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors" title="Remove">
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
            {inputValues.length === 1 && v ? (
              <button type="button" onClick={() => { setLocalValues(['']); onChange([]) }} className="p-1.5 sm:p-2 text-slate-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors" title="Clear date">
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={() => setLocalValues([...inputValues, ''])} className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-brand-green hover:text-brand-green-dark">
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {addLabel}
        </button>
      </div>
      )}
    </div>
  )
}
