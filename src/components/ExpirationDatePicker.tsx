'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Calendar, CheckCircle2 } from 'lucide-react'
import { NULL_ATTACHMENT_HATCH_STYLE } from '@/lib/nullAttachmentStyle'

function safeDateParse(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const s = dateStr.trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s + 'T00:00:00')
  }
  return new Date(s)
}

function getExpirationStatus(expiryDate: string | null | undefined): 'valid' | 'expiring' | 'expired' | 'none' {
  if (!expiryDate) return 'none'
  
  const expiry = safeDateParse(expiryDate)
  if (!expiry) return 'none'
  const today = new Date()
  
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  
  if (expiry < today) {
    return 'expired'
  }
  
  const yearsDiff = expiry.getFullYear() - today.getFullYear()
  const monthsDiff = expiry.getMonth() - today.getMonth()
  const totalMonthsDiff = yearsDiff * 12 + monthsDiff
  const daysDiff = expiry.getDate() - today.getDate()
  const adjustedMonthsDiff = daysDiff < 0 ? totalMonthsDiff - 1 : totalMonthsDiff
  
  if (adjustedMonthsDiff >= 0 && adjustedMonthsDiff <= 3) {
    return 'expiring'
  }
  
  return 'valid'
}

export function ExpirationDatePicker({ 
  label, 
  value, 
  onChange, 
  isEditing,
  onNullToggle,
  initialNullActive = false,
  allowNull = false,
}: { 
  label: string
  value: string
  onChange: (value: string) => void
  isEditing: boolean
  onNullToggle?: (active: boolean) => void
  initialNullActive?: boolean
  allowNull?: boolean
}) {
  const [nullActive, setNullActive] = useState(initialNullActive)
  const prevValueRef = useRef<string>('')
  const status = getExpirationStatus(value)

  const setNullActiveAndNotify = useCallback((v: boolean) => {
    setNullActive(v)
    onNullToggle?.(v)
  }, [onNullToggle])

  // Reset nullActive when value becomes non-empty (e.g. from edit mode)
  useEffect(() => {
    if (value && value !== 'null') {
      setNullActive(false)
      prevValueRef.current = ''
    }
  }, [value])

  // Sync initialNullActive from parent
  useEffect(() => {
    setNullActive(initialNullActive)
  }, [initialNullActive])

  const handleDeactivateNull = useCallback(() => {
    if (prevValueRef.current) {
      onChange(prevValueRef.current)
      prevValueRef.current = ''
    }
    setNullActiveAndNotify(false)
  }, [onChange, setNullActiveAndNotify])

  const handleActivateNullNonEdit = useCallback(() => {
    if (value && value !== 'null') {
      prevValueRef.current = value
      onChange('')
    }
    setNullActiveAndNotify(true)
  }, [value, onChange, setNullActiveAndNotify])

  const handleActivateNullEdit = useCallback(() => {
    prevValueRef.current = value
    onChange('')
    setNullActiveAndNotify(true)
  }, [value, onChange, setNullActiveAndNotify])
  
  const getStatusColor = () => {
    switch (status) {
      case 'expired':
        return 'border-red-500 bg-red-50'
      case 'expiring':
        return 'border-yellow-500 bg-yellow-50'
      case 'valid':
        return 'border-green-500 bg-green-50'
      default:
        return 'border-slate-200 bg-slate-50/50'
    }
  }
  
  const getStatusBadge = () => {
    switch (status) {
      case 'expired':
        return <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">Expired</span>
      case 'expiring':
        return <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Expiring Soon</span>
      case 'valid':
        return <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Valid</span>
      default:
        return null
    }
  }
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = safeDateParse(dateString)
    if (!date || Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  
  // NULL active — show shade with N/A
  if (nullActive && !isEditing) {
    return (
      <div className="group relative p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:shadow-sm transition-all duration-200">
        <span className="absolute inset-0 rounded-xl pointer-events-none opacity-90" style={NULL_ATTACHMENT_HATCH_STYLE} aria-hidden />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {allowNull && (
              <button type="button" onClick={handleDeactivateNull} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors shrink-0 border-slate-400 bg-slate-200 text-slate-800" title="Deactivate NULL">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                NULL
              </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <p className="font-semibold text-slate-900">N/A</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`group relative p-4 rounded-xl border-2 ${getStatusColor()} hover:shadow-sm transition-all duration-200`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {allowNull && !isEditing && (
            <button type="button" onClick={handleActivateNullNonEdit} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors shrink-0 border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Set to NULL">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              NULL
            </button>
          )}
        </div>
      </div>
      {isEditing ? (
        nullActive ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-emerald-300 bg-emerald-50">
            <span className="absolute inset-0 rounded-xl pointer-events-none opacity-90" style={NULL_ATTACHMENT_HATCH_STYLE} aria-hidden />
            <div className="flex items-center gap-2 relative z-10 w-full">
              <Calendar className="w-4 h-4 text-slate-400" />
              <p className="font-semibold text-slate-900">N/A (NULL)</p>
            </div>
            {allowNull && (
            <button type="button" onClick={() => { setNullActiveAndNotify(false); prevValueRef.current = '' }} className="relative z-10 inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors shrink-0 border-slate-400 bg-slate-200 text-slate-800" title="Deactivate NULL">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
              NULL
            </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input type="date" max="2099-12-31" value={value ? new Date(value).toISOString().split('T')[0] : ''} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900" />
            {allowNull && (
            <button type="button" onClick={handleActivateNullEdit} className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${!value || value === 'null' ? 'border-slate-400 bg-slate-200 text-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`} title="Set to NULL">
              <CheckCircle2 className={`w-3.5 h-3.5 ${!value || value === 'null' ? 'text-slate-700' : 'text-slate-400'}`} />
              NULL
            </button>
            )}
          </div>
        )
      ) : (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <p className="font-semibold text-slate-900">{formatDate(value)}</p>
        </div>
      )}
    </div>
  )
}
