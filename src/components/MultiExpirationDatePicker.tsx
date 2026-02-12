import { Calendar, Plus, Trash2 } from 'lucide-react'

function getExpirationStatus(expiryDate: string | null | undefined): 'valid' | 'expiring' | 'expired' | 'none' {
  if (!expiryDate) return 'none'
  const d = new Date(expiryDate)
  if (Number.isNaN(d.getTime())) return 'none'

  const expiry = new Date(d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)

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
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function normalize(values: string[]) {
  const cleaned = values
    .map((v) => (v || '').trim())
    .filter(Boolean)
    .map((v) => {
      // allow YYYY-MM-DD or ISO
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) return null
      return d.toISOString().split('T')[0]
    })
    .filter(Boolean) as string[]

  const uniq = Array.from(new Set(cleaned))
  uniq.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  return uniq
}

export function MultiExpirationDatePicker({
  label,
  values,
  onChange,
  isEditing,
  addLabel = 'Add date',
}: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  isEditing: boolean
  addLabel?: string
}) {
  const normalized = normalize(values || [])
  const statuses = normalized.map((v) => getExpirationStatus(v))
  const overallStatus =
    statuses.includes('expired') ? 'expired' : statuses.includes('expiring') ? 'expiring' : statuses.includes('valid') ? 'valid' : 'none'

  const borderBg =
    overallStatus === 'expired'
      ? 'border-red-500 bg-red-50'
      : overallStatus === 'expiring'
        ? 'border-yellow-500 bg-yellow-50'
        : overallStatus === 'valid'
          ? 'border-green-500 bg-green-50'
          : 'border-slate-200 bg-slate-50/50'

  const badge =
    overallStatus === 'expired' ? (
      <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">Expired</span>
    ) : overallStatus === 'expiring' ? (
      <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Expiring Soon</span>
    ) : overallStatus === 'valid' ? (
      <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Valid</span>
    ) : null

  if (!isEditing) {
    if (normalized.length === 0) {
      return (
        <div className={`group relative p-4 rounded-xl border-2 ${borderBg} hover:shadow-sm transition-all duration-200`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
            {badge}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <p className="font-semibold text-slate-900">N/A</p>
          </div>
        </div>
      )
    }

    return (
      <div className={`group relative p-4 rounded-xl border-2 ${borderBg} hover:shadow-sm transition-all duration-200`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
          {badge}
        </div>
        <div className="space-y-1">
          {normalized.slice(0, 3).map((v) => (
            <div key={v} className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <p className="font-semibold text-slate-900">{formatDisplayDate(v)}</p>
            </div>
          ))}
          {normalized.length > 3 && (
            <p className="text-xs text-slate-600 mt-2">+{normalized.length - 3} more</p>
          )}
        </div>
      </div>
    )
  }

  const ensureAtLeastOne = normalized.length === 0 ? [''] : normalized

  return (
    <div className={`group relative p-4 rounded-xl border-2 ${borderBg} hover:shadow-sm transition-all duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
        {badge}
      </div>

      <div className="space-y-2">
        {ensureAtLeastOne.map((v, idx) => (
          <div key={`${idx}-${v}`} className="flex items-center gap-2">
            <input
              type="date"
              value={v}
              max="2099-12-31"
              onChange={(e) => {
                const next = [...ensureAtLeastOne]
                next[idx] = e.target.value
                onChange(normalize(next))
              }}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
            />
            {ensureAtLeastOne.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const next = ensureAtLeastOne.filter((_, i) => i !== idx)
                  onChange(normalize(next))
                }}
                className="p-2 text-slate-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => onChange([...normalized, new Date().toISOString().split('T')[0]])}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-green-dark"
        >
          <Plus className="w-4 h-4" />
          {addLabel}
        </button>
      </div>
    </div>
  )
}

