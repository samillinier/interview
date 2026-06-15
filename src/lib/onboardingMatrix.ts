/** Onboarding document matrix — row labels match the admin tracking spreadsheet (Sunbiz, BTR, WC, …). */

export type MatrixCellState = 'ok' | 'missing' | 'warn' | 'na'

export type MatrixCell = {
  state: MatrixCellState
  detail?: string
  items?: MatrixCellState[]
}

export const MATRIX_ROW_DEFS = [
  { id: 'surface', label: 'Surface', subtitle: 'Primary strength', required: false },
  { id: 'compliance', label: 'Compliance', subtitle: '', required: false },
  { id: 'sunbiz', label: 'Sunbiz', subtitle: 'State registry', required: false },
  { id: 'btr', label: 'BTR', subtitle: 'Business tax receipt', required: true },
  { id: 'wc', label: 'WC', subtitle: "Workers' comp", required: true },
  { id: 'wce', label: 'WCE', subtitle: 'WC exemption', required: true },
  { id: 'coi', label: 'COI', subtitle: 'Gen. liability', required: true },
  { id: 'al', label: 'AL', subtitle: 'Auto liability', required: false },
  { id: 'w9', label: 'W-9', subtitle: 'IRS tax form', required: true },
  { id: 'photo', label: 'Photo', subtitle: 'Profile photo', required: true },
  { id: 'bg', label: 'BG', subtitle: 'Background check', required: true },
  { id: 'lead', label: 'Lead', subtitle: 'Lead firm cert.', required: false },
  { id: 'llrp', label: 'LLRP', subtitle: 'Lead registry', required: false },
  { id: 'ics', label: 'ICS', subtitle: 'Contractor agreement', required: true },
  { id: 'bank', label: 'Bank', subtitle: 'Direct deposit', required: false },
] as const

export type MatrixRowId = (typeof MATRIX_ROW_DEFS)[number]['id']

export type OnboardingMatrixResult = Record<MatrixRowId, MatrixCell> & {
  onboard: MatrixCell
  /** True if any required item is missing or workers-comp path is incomplete */
  hasRequiredGap: boolean
  /** Distinct required gaps (WC+WCE double-miss counts as one) */
  missingRequiredCount: number
}

/** Profile Insurance & Registration → matrix cell (read-only in tracker). */
export function complianceStatusToMatrixCell(
  status: string | null | undefined
): MatrixCell {
  const s = String(status || '').trim().toUpperCase()
  if (s === 'COMPLIANT') return { state: 'ok', detail: 'Compliant' }
  if (s === 'NOT_COMPLIANT') return { state: 'missing', detail: 'Not compliant' }
  if (s === 'IN_PROGRESS') return { state: 'warn', detail: 'In progress' }
  return { state: 'missing', detail: 'Not set' }
}

export function normalizeInstallerDocType(type: string): string {
  const t = (type || '').toLowerCase().trim()
  if (t === 'w9' || t === 'w-9' || t === 'form-w-9') return 'w9'
  if (t === 'workers_comp' || t === 'workers_compensation') return 'workers_comp'
  if (t === 'business_tax_receipt' || t === 'btr' || t === 'business_registration') return 'business_registration'
  if (t === 'lrrp') return 'lrrp'
  return t
}

/** Profile attachment types that satisfy a matrix column key (e.g. WCE uploads use workers_comp_certificate). */
const MATRIX_DOC_TYPE_ALIASES: Record<string, readonly string[]> = {
  workers_comp_exemption: ['workers_comp_exemption', 'workers_comp_certificate'],
}

function docMatchesMatrixKeys(rawType: string, normalizedKeys: string[]): boolean {
  const normalized = normalizeInstallerDocType(rawType)
  const raw = (rawType || '').toLowerCase().trim()
  if (normalizedKeys.includes(normalized) || normalizedKeys.includes(raw)) return true
  for (const key of normalizedKeys) {
    const aliases = MATRIX_DOC_TYPE_ALIASES[key]
    if (aliases && (aliases.includes(raw) || aliases.includes(normalized))) return true
  }
  return false
}

function isNullVerificationStatus(raw: string | null | undefined): boolean {
  return String(raw || '').trim().toLowerCase() === 'null'
}

function withNullDetail(cell: MatrixCell, keys: string[], latestDocFor: (k: string[]) => BareDoc | null): MatrixCell {
  if (cell.state !== 'na') return cell
  const d = latestDocFor(keys)
  if (d && isNullVerificationStatus(d.verificationLinkStatus)) {
    return { ...cell, detail: 'NULL' }
  }
  return cell
}

function wcPathSatisfied(wc: MatrixCell, wce: MatrixCell): boolean {
  const okish = (s: MatrixCellState) => s === 'ok' || s === 'warn' || s === 'na'
  return okish(wc.state) || okish(wce.state)
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const MATRIX_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

/** Parse profile/installer expiry values as a local calendar date (avoids UTC off-by-one). */
export function parseInstallerCalendarDate(dateStr: string | Date | null | undefined): Date | null {
  if (dateStr == null || dateStr === '') return null
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return null
    return startOfDay(dateStr)
  }
  const s = String(dateStr).trim()
  if (!s) return null
  const parsed = s.includes('T') ? new Date(s) : new Date(`${s}T00:00:00`)
  if (isNaN(parsed.getTime())) return null
  return startOfDay(parsed)
}

/** Matrix cell date label — must match installer profile calendar dates. */
export function formatInstallerCalendarDate(dateStr: string | Date | null | undefined): string | null {
  const d = parseInstallerCalendarDate(dateStr)
  if (!d) return null
  return `${MATRIX_MONTHS_SHORT[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${String(d.getFullYear()).slice(-2)}`
}

function daysFromToday(d: Date | null | undefined): number | null {
  if (!d) return null
  const t0 = startOfDay(new Date()).getTime()
  const t1 = startOfDay(new Date(d)).getTime()
  return Math.round((t1 - t0) / (24 * 60 * 60 * 1000))
}

/** Matches profile / expiration notifications: 0–3 calendar months before expiry. */
function isExpiringSoonByMonths(d: Date | null | undefined): boolean {
  if (!d) return false
  const expiry = startOfDay(new Date(d))
  const today = startOfDay(new Date())
  if (expiry < today) return false
  const yearsDiff = expiry.getFullYear() - today.getFullYear()
  const monthsDiff = expiry.getMonth() - today.getMonth()
  const totalMonthsDiff = yearsDiff * 12 + monthsDiff
  const daysDiff = expiry.getDate() - today.getDate()
  const adjustedMonthsDiff = daysDiff < 0 ? totalMonthsDiff - 1 : totalMonthsDiff
  return adjustedMonthsDiff >= 0 && adjustedMonthsDiff <= 3
}

type BareDoc = {
  type: string
  expiryDate: Date | null
  verificationLinkStatus?: string | null
  createdAt?: Date | null
}

function normalizeDocStatus(raw: string | null | undefined): 'active' | 'inactive' | 'missing' | 'na' | 'pending' | '' {
  const s = String(raw || '').trim().toLowerCase()
  if (s === 'active') return 'active'
  if (s === 'inactive') return 'inactive'
  if (s === 'missing') return 'missing'
  if (s === 'na' || s === 'n/a' || s === 'null') return 'na'
  if (s === 'pending') return 'pending'
  return ''
}

function parseMultiDateJson(raw: string | null | undefined): Date[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((value) => parseInstallerCalendarDate(String(value || '').trim()))
      .filter((date): date is Date => date !== null)
  } catch {
    return []
  }
}

function summarizeItemStates(states: MatrixCellState[]): MatrixCellState {
  if (states.length === 0) return 'missing'
  if (states.every((s) => s === 'na')) return 'na'
  if (states.some((s) => s === 'missing')) return 'missing'
  if (states.some((s) => s === 'warn')) return 'warn'
  if (states.some((s) => s === 'ok')) return 'ok'
  return 'missing'
}

function cellFromStates(
  states: MatrixCellState[],
  fallbackMissing: MatrixCell = { state: 'missing' }
): MatrixCell {
  if (states.length === 0) return fallbackMissing
  return {
    state: summarizeItemStates(states),
    items: states,
  }
}

export function computeOnboardingMatrix(input: {
  /** Interview / profile: single strongest flooring surface (optional). */
  primaryFlooringSurface?: string | null
  isSunbizRegistered: boolean
  isSunbizActive: boolean
  hasBusinessLicense: boolean
  btrExpiry: Date | null
  hasWorkersComp: boolean
  hasWorkersCompExemption: boolean
  hasGeneralLiability: boolean
  generalLiabilityExpiry: Date | null
  hasCommercialAutoLiability: boolean
  automobileLiabilityExpiry: Date | null
  canPassBackgroundCheck: boolean | null
  photoUrl: string | null
  paymentAccountNumber: string | null
  paymentRoutingNumber: string | null
  llrpExpiry: Date | null
  /** Workers' comp insurance expiry (stored as employersLiabilityExpiry on Installer). */
  employersLiabilityExpiry?: Date | null
  serviceAgreementSignedAt: Date | null
  icsSignedAt: Date | null
  Document: BareDoc[]
  staffMemberPhotoUrls?: Array<string | null | undefined>
  workersCompExemExpiry?: Date | null
  workersCompExemExpiryDates?: string | null
  automobileLiabilityExpiryDates?: string | null
  llrpExpiryDates?: string | null
  /** Installer profile: Insurance & Registration compliance status. */
  complianceStatus?: string | null
}): OnboardingMatrixResult {
  const docs = input.Document || []
  const latestDocFor = (normalizedKeys: string[]): BareDoc | null => {
    const relevant = docs
      .filter((d) => docMatchesMatrixKeys(d.type, normalizedKeys))
      .slice()
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
    return relevant[0] || null
  }

  const hasDoc = (...keys: string[]) => {
    const d = latestDocFor(keys)
    if (!d) return false
    const manual = normalizeDocStatus(d.verificationLinkStatus)
    // NULL / N/A = not required — do not count as an uploaded file for matrix fallbacks.
    if (manual === 'na') return false
    // If an admin explicitly marks the latest doc Missing/Inactive, do not treat the doc as present.
    if (manual === 'missing' || manual === 'inactive') return false
    return true
  }

  const docExpiryMeta = (normalizedKeys: string[]): { expired: boolean; minDays: number | null } => {
    const d = latestDocFor(normalizedKeys)
    if (!d?.expiryDate) return { expired: false, minDays: null }
    const days = daysFromToday(d.expiryDate)
    if (days === null) return { expired: false, minDays: null }
    return { expired: days < 0, minDays: days }
  }

  const docStateList = (normalizedKeys: string[]): MatrixCellState[] => {
    const d = latestDocFor(normalizedKeys)
    if (!d) return []
    const manual = normalizeDocStatus(d.verificationLinkStatus)
    if (manual === 'na') return ['na']
    if (manual === 'active') {
      if (d.expiryDate && isExpiringSoonByMonths(d.expiryDate)) return ['warn']
      return ['ok']
    }
    if (manual === 'pending') return ['warn']
    if (manual === 'inactive' || manual === 'missing') return ['missing']
    if (!d.expiryDate) return ['ok']
    const days = daysFromToday(d.expiryDate)
    if (days === null) return ['ok']
    if (days < 0) return ['missing']
    if (isExpiringSoonByMonths(d.expiryDate)) return ['warn']
    return ['ok']
  }

  const cells = {} as Record<MatrixRowId, MatrixCell>

  const surfaceLabel = (input.primaryFlooringSurface || '').trim()
  cells.surface = surfaceLabel
    ? { state: 'ok', detail: surfaceLabel }
    : { state: 'missing' }

  cells.compliance = complianceStatusToMatrixCell(input.complianceStatus)

  // Sunbiz
  // Per admin request: Sunbiz is driven ONLY by the latest document status dropdown.
  // Ignore installer profile flags and any dates.
  const sunbizDoc = latestDocFor(['sunbiz'])
  if (!sunbizDoc) {
    cells.sunbiz = { state: 'missing' }
  } else {
    const st = normalizeDocStatus(sunbizDoc.verificationLinkStatus)
    if (st === 'active') cells.sunbiz = { state: 'ok' }
    else if (st === 'pending') cells.sunbiz = { state: 'warn' }
    else if (st === 'na') {
      cells.sunbiz = withNullDetail({ state: 'na' }, ['sunbiz'], latestDocFor)
    } else cells.sunbiz = { state: 'missing' } // inactive, missing, or blank
  }

  // BTR
  const btrFieldDays = daysFromToday(input.btrExpiry)
  const btrStates = docStateList(['business_registration'])
  const btrDoc = docExpiryMeta(['business_registration'])
  const btrExpiredField = input.btrExpiry != null && btrFieldDays !== null && btrFieldDays < 0
  let btrSatisfied =
    input.hasBusinessLicense ||
    hasDoc('business_registration') ||
    (input.btrExpiry != null && btrFieldDays !== null && btrFieldDays >= 0)
  if (btrExpiredField) btrSatisfied = false
  if (btrDoc.expired && !input.hasBusinessLicense && !hasDoc('business_registration')) btrSatisfied = false
  if (btrStates.length > 0) {
    // If the field date is explicitly expired, show that — don't let docs override
    if (btrExpiredField) {
      cells.btr = { state: 'missing', detail: 'exp' }
    } else {
      cells.btr = withNullDetail(cellFromStates(btrStates), ['business_registration'], latestDocFor)
    }
  } else if (btrSatisfied) {
    const warn =
      (btrFieldDays !== null && btrFieldDays >= 0 && isExpiringSoonByMonths(input.btrExpiry)) ||
      (btrDoc.minDays !== null && btrDoc.minDays >= 0 && btrDoc.minDays <= 90)
    const d = btrFieldDays !== null && btrFieldDays >= 0 && isExpiringSoonByMonths(input.btrExpiry) ? btrFieldDays : btrDoc.minDays
    cells.btr = warn && d !== null ? { state: 'warn', detail: `${d}d` } : { state: 'ok' }
  } else {
    cells.btr = { state: 'missing', detail: btrDoc.expired || btrExpiredField ? 'exp' : undefined }
  }

  // BTR: override ok→warn if expiring soon by months (matches WC/WCE behavior)
  if (cells.btr.state === 'ok') {
    const btrLatestDoc = latestDocFor(['business_registration'])
    const btrExpiryDates = [
      input.btrExpiry,
      btrLatestDoc?.expiryDate ?? null,
    ].filter((d): d is Date => d != null && !isNaN(new Date(d).getTime()))
    if (btrExpiryDates.some(isExpiringSoonByMonths)) {
      cells.btr = { ...cells.btr, state: 'warn' }
    }
  }

  // WC / WCE (either comp insurance or exemption)
  // Check actual uploaded documents first, then fall back to interview flags
  
  // WCE: Workers Comp Exemption
  const wceStates = docStateList(['workers_comp_exemption'])
  const wceDoc = docExpiryMeta(['workers_comp_exemption'])
  const parsedExemDates = parseMultiDateJson(input.workersCompExemExpiryDates)
  const wceDatesRaw = parsedExemDates.length > 0
    ? parsedExemDates
    : (input.workersCompExemExpiry ? [input.workersCompExemExpiry] : [])
  const wceDates = wceDatesRaw.filter(
    (date, index, arr) =>
      arr.findIndex((other) => startOfDay(other).getTime() === startOfDay(date).getTime()) === index
  )

  if (wceDates.length > 0) {
    const states: MatrixCellState[] = wceDates.map((date) => {
      const days = daysFromToday(date)
      if (days === null) return 'ok'
      if (days < 0) return 'missing'
      if (isExpiringSoonByMonths(date)) return 'warn'
      return 'ok'
    })
    cells.wce = cellFromStates(states)
  } else if (wceStates.length > 0) {
    cells.wce = withNullDetail(cellFromStates(wceStates), ['workers_comp_exemption'], latestDocFor)
  } else if (hasDoc('workers_comp_exemption') && !wceDoc.expired) {
    const wceLatestDoc = latestDocFor(['workers_comp_exemption'])
    const warnDoc =
      wceLatestDoc?.expiryDate != null && isExpiringSoonByMonths(wceLatestDoc.expiryDate)
    cells.wce = warnDoc ? { state: 'warn' } : { state: 'ok' }
  } else if (hasDoc('workers_comp_exemption') && wceDoc.expired) {
    cells.wce = { state: 'missing', detail: 'exp' }
  } else if (input.hasWorkersComp) {
    cells.wce = { state: 'na' }
  } else if (input.hasWorkersCompExemption) {
    cells.wce = { state: 'ok' }
  } else {
    cells.wce = { state: 'missing' }
  }

  // WC: Workers Comp Insurance
  const wcFieldDays = daysFromToday(input.employersLiabilityExpiry)
  const wcStates = docStateList(['workers_comp', 'workers_comp_certificate'])
  const wcDoc = docExpiryMeta(['workers_comp', 'workers_comp_certificate'])
  const wcLatestDoc = latestDocFor(['workers_comp', 'workers_comp_certificate'])
  const wcFieldExpired =
    input.employersLiabilityExpiry != null && wcFieldDays !== null && wcFieldDays < 0
  let wcSatisfied =
    hasDoc('workers_comp', 'workers_comp_certificate') ||
    (input.hasWorkersComp &&
      (input.employersLiabilityExpiry == null || (wcFieldDays !== null && wcFieldDays >= 0)))
  if (wcFieldExpired) wcSatisfied = false
  if (wcDoc.expired && !hasDoc('workers_comp', 'workers_comp_certificate') && !input.hasWorkersComp) {
    wcSatisfied = false
  }

  if (wcStates.length > 0) {
    // If the field date is explicitly expired, show that — don't let docs override
    if (wcFieldExpired) {
      cells.wc = { state: 'missing', detail: 'exp' }
    } else {
      cells.wc = withNullDetail(
        cellFromStates(wcStates),
        ['workers_comp', 'workers_comp_certificate'],
        latestDocFor
      )
    }
  } else if (input.hasWorkersCompExemption) {
    cells.wc = { state: 'na' }
  } else if (hasDoc('workers_comp', 'workers_comp_certificate') && !wcDoc.expired) {
    const warnDoc =
      wcLatestDoc?.expiryDate != null && isExpiringSoonByMonths(wcLatestDoc.expiryDate)
    cells.wc = warnDoc ? { state: 'warn' } : { state: 'ok' }
  } else if (hasDoc('workers_comp', 'workers_comp_certificate') && wcDoc.expired) {
    cells.wc = { state: 'missing', detail: 'exp' }
  } else if (wcSatisfied) {
    const warnField =
      input.employersLiabilityExpiry != null && isExpiringSoonByMonths(input.employersLiabilityExpiry)
    cells.wc = warnField ? { state: 'warn' } : { state: 'ok' }
  } else {
    cells.wc = { state: 'missing', detail: wcFieldExpired || wcDoc.expired ? 'exp' : undefined }
  }

  if (cells.wc.state === 'ok') {
    const wcExpiryDates = [
      input.employersLiabilityExpiry,
      wcLatestDoc?.expiryDate ?? null,
    ].filter((d): d is Date => d != null && !isNaN(new Date(d).getTime()))
    if (wcExpiryDates.some(isExpiringSoonByMonths)) {
      cells.wc = { ...cells.wc, state: 'warn' }
    }
  }

  if (cells.wce.state === 'ok') {
    const wceLatestDoc = latestDocFor(['workers_comp_exemption'])
    const wceExpiryDates = [
      ...wceDates,
      wceLatestDoc?.expiryDate ?? null,
    ].filter((d): d is Date => d != null && !isNaN(new Date(d).getTime()))
    if (wceExpiryDates.some(isExpiringSoonByMonths)) {
      cells.wce = { ...cells.wce, state: 'warn' }
    }
  }

  // COI
  const glDays = daysFromToday(input.generalLiabilityExpiry)
  const coiStates = docStateList(['liability_insurance'])
  const liDoc = docExpiryMeta(['liability_insurance'])
  const glExpired = input.generalLiabilityExpiry != null && glDays !== null && glDays < 0
  let coiOk =
    (input.hasGeneralLiability && (input.generalLiabilityExpiry == null || (glDays !== null && glDays >= 0))) ||
    (hasDoc('liability_insurance') && !liDoc.expired)
  if (glExpired) coiOk = false
  if (liDoc.expired && !input.hasGeneralLiability) coiOk = false
  if (coiStates.length > 0) {
    cells.coi = withNullDetail(cellFromStates(coiStates), ['liability_insurance'], latestDocFor)
  } else if (coiOk) {
    const warn =
      (glDays !== null && glDays >= 0 && isExpiringSoonByMonths(input.generalLiabilityExpiry)) ||
      (liDoc.minDays !== null && liDoc.minDays >= 0 && liDoc.minDays <= 90)
    const d = glDays !== null && glDays >= 0 && isExpiringSoonByMonths(input.generalLiabilityExpiry) ? glDays : liDoc.minDays
    cells.coi = warn && d !== null ? { state: 'warn', detail: `${d}d` } : { state: 'ok' }
  } else {
    cells.coi = { state: 'missing', detail: liDoc.expired || glExpired ? 'exp' : undefined }
  }

  // COI: override ok→warn if expiring soon by months (matches BTR/WC/WCE behavior)
  if (cells.coi.state === 'ok') {
    const coiLatestDoc = latestDocFor(['liability_insurance'])
    const coiExpiryDates = [
      input.generalLiabilityExpiry,
      coiLatestDoc?.expiryDate ?? null,
    ].filter((d): d is Date => d != null && !isNaN(new Date(d).getTime()))
    if (coiExpiryDates.some(isExpiringSoonByMonths)) {
      cells.coi = { ...cells.coi, state: 'warn' }
    }
  }

  // AL (auto)
  const alDays = daysFromToday(input.automobileLiabilityExpiry)
  const alStates = docStateList(['auto_insurance'])
  const alDoc = docExpiryMeta(['auto_insurance'])
  const alExpired = input.automobileLiabilityExpiry != null && alDays !== null && alDays < 0
  let alOk =
    (input.hasCommercialAutoLiability &&
      (input.automobileLiabilityExpiry == null || (alDays !== null && alDays >= 0))) ||
    (hasDoc('auto_insurance') && !alDoc.expired)
  if (alExpired) alOk = false
  if (alDoc.expired && !input.hasCommercialAutoLiability) alOk = false
  if (alStates.length > 0) {
    cells.al = withNullDetail(cellFromStates(alStates), ['auto_insurance'], latestDocFor)
  } else if (alOk) {
    const warn =
      (alDays !== null && alDays >= 0 && isExpiringSoonByMonths(input.automobileLiabilityExpiry)) ||
      (alDoc.minDays !== null && alDoc.minDays >= 0 && alDoc.minDays <= 90)
    const d = alDays !== null && alDays >= 0 && isExpiringSoonByMonths(input.automobileLiabilityExpiry) ? alDays : alDoc.minDays
    cells.al = warn && d !== null ? { state: 'warn', detail: `${d}d` } : { state: 'ok' }
  } else {
    cells.al = { state: 'missing', detail: alDoc.expired || alExpired ? 'exp' : undefined }
  }

  // AL: override ok→warn if expiring soon by months (matches BTR/WC/WCE behavior)
  if (cells.al.state === 'ok') {
    const alLatestDoc = latestDocFor(['auto_insurance'])
    const alExpiryDates = [
      input.automobileLiabilityExpiry,
      alLatestDoc?.expiryDate ?? null,
    ].filter((d): d is Date => d != null && !isNaN(new Date(d).getTime()))
    if (alExpiryDates.some(isExpiringSoonByMonths)) {
      cells.al = { ...cells.al, state: 'warn' }
    }
  }

  const w9States = docStateList(['w9'])
  cells.w9 =
    w9States.length > 0
      ? withNullDetail(cellFromStates(w9States), ['w9'], latestDocFor)
      : { state: 'missing' }
  const staffPhotoUrls = input.staffMemberPhotoUrls || []
  if (staffPhotoUrls.length > 0) {
    const states: MatrixCellState[] = [
      input.photoUrl ? 'ok' : 'missing',
      ...staffPhotoUrls.map((url) => (String(url || '').trim() ? 'ok' : 'missing')),
    ]
    cells.photo = cellFromStates(states)
  } else {
    cells.photo = input.photoUrl ? { state: 'ok' } : { state: 'missing' }
  }

  if (input.canPassBackgroundCheck === true) cells.bg = { state: 'ok' }
  else if (input.canPassBackgroundCheck === false) cells.bg = { state: 'missing' }
  else cells.bg = { state: 'warn' }

  const leadStates = docStateList(['lead_firm_certificate'])
  cells.lead = withNullDetail(cellFromStates(leadStates), ['lead_firm_certificate'], latestDocFor)

  const llrpFieldDays = daysFromToday(input.llrpExpiry)
  const llrpStates = docStateList(['lrrp'])
  const llrpDoc = docExpiryMeta(['lrrp'])
  const llrpFieldExpired = input.llrpExpiry != null && llrpFieldDays !== null && llrpFieldDays < 0
  const llrpSatisfied =
    hasDoc('lrrp') || (input.llrpExpiry != null && llrpFieldDays !== null && llrpFieldDays >= 0)
  if (llrpStates.length > 0) {
    cells.llrp = withNullDetail(cellFromStates(llrpStates), ['lrrp'], latestDocFor)
  } else if (llrpFieldExpired) {
    cells.llrp = { state: 'missing', detail: 'exp' }
  } else if (llrpSatisfied) {
    const warn =
      (llrpFieldDays !== null && llrpFieldDays >= 0 && isExpiringSoonByMonths(input.llrpExpiry)) ||
      (llrpDoc.minDays !== null && llrpDoc.minDays >= 0 && llrpDoc.minDays <= 90)
    const d =
      llrpFieldDays !== null && llrpFieldDays >= 0 && isExpiringSoonByMonths(input.llrpExpiry) ? llrpFieldDays : llrpDoc.minDays
    cells.llrp = warn && d !== null ? { state: 'warn', detail: `${d}d` } : { state: 'ok' }
  } else {
    cells.llrp = { state: 'missing' }
  }

  // LLRP: override ok→warn if expiring soon by months (matches other columns)
  if (cells.llrp.state === 'ok') {
    const llrpLatestDoc = latestDocFor(['lrrp'])
    const llrpExpiryDates = [
      input.llrpExpiry,
      llrpLatestDoc?.expiryDate ?? null,
    ].filter((d): d is Date => d != null && !isNaN(new Date(d).getTime()))
    if (llrpExpiryDates.some(isExpiringSoonByMonths)) {
      cells.llrp = { ...cells.llrp, state: 'warn' }
    }
  }

  cells.ics = input.icsSignedAt ? { state: 'ok' } : { state: 'missing' }

  // Bank — direct deposit info
  const hasAccount = (input.paymentAccountNumber || '').trim().length > 0
  const hasRouting = (input.paymentRoutingNumber || '').trim().length > 0
  if (hasAccount && hasRouting) {
    cells.bank = { state: 'ok' }
  } else if (hasAccount || hasRouting) {
    cells.bank = { state: 'warn', detail: hasAccount ? 'No routing' : 'No account' }
  } else {
    cells.bank = { state: 'missing' }
  }

  const wcPathOk = wcPathSatisfied(cells.wc, cells.wce)

  const requiredMissingIds = new Set<string>()
  for (const def of MATRIX_ROW_DEFS) {
    if (!def.required) continue
    const c = cells[def.id]
    if (c.state === 'na') continue
    if (c.state === 'missing') requiredMissingIds.add(def.id)
  }
  if (requiredMissingIds.has('wc') && requiredMissingIds.has('wce')) {
    requiredMissingIds.delete('wce')
  }

  const hasRequiredGap = !wcPathOk || requiredMissingIds.size > 0

  const anyWarn = MATRIX_ROW_DEFS.some(
    (def) => def.id !== 'compliance' && cells[def.id].state === 'warn'
  )

  let onboard: MatrixCell
  if (hasRequiredGap) onboard = { state: 'missing' }
  else if (anyWarn) onboard = { state: 'warn' }
  else onboard = { state: 'ok' }

  return {
    ...cells,
    onboard,
    hasRequiredGap,
    missingRequiredCount: requiredMissingIds.size,
  }
}

const MATRIX_CELL_STATES: MatrixCellState[] = ['ok', 'missing', 'warn', 'na']

function isValidMatrixCellState(s: unknown): s is MatrixCellState {
  return typeof s === 'string' && (MATRIX_CELL_STATES as readonly string[]).includes(s)
}

/** Recompute onboard summary and gap counts from row cells (used after admin overrides). */
export function recomputeOnboardingSummaryFromRowCells(cells: Record<MatrixRowId, MatrixCell>): Pick<
  OnboardingMatrixResult,
  'onboard' | 'hasRequiredGap' | 'missingRequiredCount'
> {
  const wcPathOk = wcPathSatisfied(cells.wc, cells.wce)

  const requiredMissingIds = new Set<string>()
  for (const def of MATRIX_ROW_DEFS) {
    if (!def.required) continue
    const c = cells[def.id]
    if (c.state === 'na') continue
    if (c.state === 'missing') requiredMissingIds.add(def.id)
  }
  if (requiredMissingIds.has('wc') && requiredMissingIds.has('wce')) {
    requiredMissingIds.delete('wce')
  }

  const hasRequiredGap = !wcPathOk || requiredMissingIds.size > 0
  const anyWarn = MATRIX_ROW_DEFS.some(
    (def) => def.id !== 'compliance' && cells[def.id].state === 'warn'
  )
  let onboard: MatrixCell
  if (hasRequiredGap) onboard = { state: 'missing' }
  else if (anyWarn) onboard = { state: 'warn' }
  else onboard = { state: 'ok' }

  return {
    onboard,
    hasRequiredGap,
    missingRequiredCount: requiredMissingIds.size,
  }
}

/** Merge installer-derived matrix with admin JSON overrides on the matrix row (`InstallerTracking.matrixCellOverrides`). */
export function applyMatrixCellOverrides(
  base: OnboardingMatrixResult,
  overridesRaw: unknown
): OnboardingMatrixResult {
  const overrides =
    overridesRaw && typeof overridesRaw === 'object' && !Array.isArray(overridesRaw)
      ? (overridesRaw as Record<string, unknown>)
      : {}
  const rowCells = {} as Record<MatrixRowId, MatrixCell>

  for (const def of MATRIX_ROW_DEFS) {
    // Always from installer profile — not editable via matrix overrides.
    if (def.id === 'compliance') {
      rowCells.compliance = base.compliance
      continue
    }
    const o = overrides[def.id]
    if (o && typeof o === 'object' && o !== null && 'state' in o) {
      const st = (o as { state: unknown; detail?: unknown; items?: unknown }).state
      const det = (o as { detail?: unknown }).detail
      const rawItems = (o as { items?: unknown }).items
      const baseItems = base[def.id].items
      if (Array.isArray(rawItems)) {
        const validOverrideItems = rawItems.filter(isValidMatrixCellState)
        const mergedItems = (() => {
          if (Array.isArray(baseItems) && baseItems.length > 0) {
            // Keep the base length for index-based overrides, but also preserve any
            // additional "appended" statuses beyond the base list.
            const head = baseItems.map((item, index) => validOverrideItems[index] ?? item)
            const tail = validOverrideItems.slice(baseItems.length)
            return tail.length > 0 ? head.concat(tail) : head
          }
          return validOverrideItems
        })()
        rowCells[def.id] = {
          state: summarizeItemStates(mergedItems),
          ...(mergedItems.length > 0 ? { items: mergedItems } : {}),
          ...(typeof det === 'string' && det.trim() ? { detail: det.trim() } : {}),
        }
      } else if (isValidMatrixCellState(st)) {
        rowCells[def.id] = {
          state: st,
          ...(typeof det === 'string' && det.trim() ? { detail: det.trim() } : {}),
        }
      } else {
        rowCells[def.id] = base[def.id]
      }
    } else {
      rowCells[def.id] = base[def.id]
    }
  }

  const summary = recomputeOnboardingSummaryFromRowCells(rowCells)

  const onboardOverrideRaw = overrides.onboard
  const onboardOverride = (() => {
    if (!onboardOverrideRaw || typeof onboardOverrideRaw !== 'object' || onboardOverrideRaw === null) return null
    if (!('state' in onboardOverrideRaw)) return null
    const st = (onboardOverrideRaw as { state: unknown; detail?: unknown; items?: unknown }).state
    const det = (onboardOverrideRaw as { detail?: unknown }).detail
    const rawItems = (onboardOverrideRaw as { items?: unknown }).items
    if (Array.isArray(rawItems)) {
      const validItems = rawItems.filter(isValidMatrixCellState)
      return {
        state: summarizeItemStates(validItems),
        ...(validItems.length > 0 ? { items: validItems } : {}),
        ...(typeof det === 'string' && det.trim() ? { detail: det.trim() } : {}),
      } satisfies MatrixCell
    }
    if (isValidMatrixCellState(st)) {
      return {
        state: st,
        ...(typeof det === 'string' && det.trim() ? { detail: det.trim() } : {}),
      } satisfies MatrixCell
    }
    return null
  })()

  return {
    ...rowCells,
    onboard: onboardOverride ?? summary.onboard,
    hasRequiredGap: summary.hasRequiredGap,
    missingRequiredCount: summary.missingRequiredCount,
  }
}

/** Column IDs that have a valid admin override object stored. */
export function listMatrixOverrideColumnIds(overridesRaw: unknown): MatrixRowId[] {
  if (!overridesRaw || typeof overridesRaw !== 'object' || Array.isArray(overridesRaw)) return []
  const o = overridesRaw as Record<string, unknown>
  return MATRIX_ROW_DEFS.map((d) => d.id).filter((id) => {
    const v = o[id]
    if (!v || typeof v !== 'object' || v === null || !('state' in v)) return false
    return isValidMatrixCellState((v as { state: unknown }).state)
  })
}
