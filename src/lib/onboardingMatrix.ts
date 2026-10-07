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
  url?: string | null
  name?: string | null
}

function isStatusOnlyDocument(doc: BareDoc | null | undefined): boolean {
  if (!doc) return false
  const url = String(doc.url || '').trim()
  const name = String(doc.name || '').trim()
  return url.startsWith('status-only:') || name === 'Not needed (NULL)'
}

function normalizeDocStatus(raw: string | null | undefined): 'active' | 'inactive' | 'missing' | 'na' | 'pending' | '' {
  const s = String(raw || '').trim().toLowerCase()
  if (s === 'active' || s === 'compliant') return 'active'
  if (s === 'inactive' || s === 'not_compliant' || s === 'non_compliant' || s === 'not active') return 'inactive'
  if (s === 'missing' || s === 'in_progress' || s === 'in progress' || s === 'required' || s === 'document_required') {
    return 'missing'
  }
  if (s === 'expired') return 'missing'
  if (s === 'na' || s === 'n/a') return 'na'
  if (s === 'null') return 'na'
  if (s === 'pending') return 'pending'
  return ''
}

/** Same rules as installer profile Insurance & Registration document rows. */
function profileDocCell(
  docs: BareDoc[],
  types: string[],
  latestDocFor: (keys: string[]) => BareDoc | null
): MatrixCell {
  const relevant = docs.filter((d) => docMatchesMatrixKeys(d.type, types))
  const hasFile = relevant.some((d) => !isStatusOnlyDocument(d))
  const latest = latestDocFor(types)
  const raw = String(latest?.verificationLinkStatus || '').trim().toLowerCase()
  if (raw === 'null') return { state: 'na', detail: 'NULL' }
  const override = normalizeDocStatus(latest?.verificationLinkStatus)
  if (override === 'active') return { state: 'ok' }
  if (override === 'pending') return { state: 'warn' }
  if (override === 'na') return withNullDetail({ state: 'na' }, types, latestDocFor)
  if (override === 'inactive') return { state: 'missing', detail: 'Inactive' }
  if (override === 'missing' && raw === 'expired') return { state: 'missing', detail: 'exp' }
  if (override === 'missing') return { state: 'missing' }
  return hasFile ? { state: 'ok' } : { state: 'missing' }
}

export function isInstallerIcsSigned(
  agreements: Array<{
    type?: string | null
    status?: string | null
    signedAt?: Date | string | null
    adminSignedDate?: string | null
    payload?: { title?: string | null } | null
  }>
): boolean {
  const match = (agreements || []).find((a) => {
    const type = String(a?.type || '').trim().toLowerCase()
    const title = String(a?.payload?.title || '').trim().toLowerCase()
    return (
      type === 'independent-contractor-services-agreement' ||
      (type.startsWith('admin-uploaded-agreement:') && title === 'independent contractor services agreement')
    )
  })
  if (!match) return false
  const statusNorm = String(match.status || '').trim().toLowerCase()
  return Boolean(match.signedAt) || Boolean(String(match.adminSignedDate || '').trim()) || statusNorm === 'approved'
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
  /** Workers' comp insurance policy number (used to distinguish Missing vs N/A). */
  employerLiabilityPolicyNumber?: string | null
  serviceAgreementSignedAt: Date | null
  icsSignedAt: Date | null
  /** Profile treats ICS as signed when status is approved or admin signed, not only signedAt. */
  icsStatus?: string | null
  icsAdminSignedDate?: string | null
  icsAgreements?: Array<{
    type?: string | null
    status?: string | null
    signedAt?: Date | string | null
    adminSignedDate?: string | null
    payload?: { title?: string | null } | null
  }>
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

  // Sunbiz — same as profile Insurance & Registration (doc + status dropdown)
  cells.sunbiz = profileDocCell(docs, ['sunbiz'], latestDocFor)

  // Cert/licence columns mirror the installer profile: driven by the installer's
  // expiry-date field (valid → ok, expiring within 0–3 months → warn, past → expired).
  // Document status/expiry no longer overrides these cells — it caused the tracking
  // table to disagree with the installer profile.
  const fieldExpiryCell = (expiry: Date | null | undefined): MatrixCell => {
    if (expiry == null) return { state: 'missing' }
    const days = daysFromToday(expiry)
    if (days !== null && days < 0) return { state: 'missing', detail: 'exp' }
    if (isExpiringSoonByMonths(expiry)) return { state: 'warn' }
    return { state: 'ok' }
  }

  /** Profile badge: expired / missing / Active (expiring still counts as Active). Date chips keep warn. */
  const profileExpiryOverall = (expiry: Date | null | undefined): MatrixCell => {
    if (expiry == null) return { state: 'missing' }
    const days = daysFromToday(expiry)
    if (days !== null && days < 0) return { state: 'missing', detail: 'exp' }
    return { state: 'ok' }
  }

  /** Profile uses the earliest date for overall status; chips stay per date. */
  const fieldExpiryCells = (dates: Date[]): MatrixCell => {
    if (dates.length === 0) return { state: 'missing' }
    const items: MatrixCellState[] = dates.map((d) => fieldExpiryCell(d).state)
    const earliest = [...dates].sort((a, b) => a.getTime() - b.getTime())[0]
    const overall = profileExpiryOverall(earliest)
    return items.length > 0 ? { ...overall, items } : overall
  }

  const parseDateList = (raw: string | null | undefined, fallback?: Date | null): Date[] => {
    const out: Date[] = []
    if (raw) {
      try {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          for (const item of arr) {
            const d = parseInstallerCalendarDate(item)
            if (d) out.push(d)
          }
        }
      } catch {
        const d = parseInstallerCalendarDate(raw)
        if (d) out.push(d)
      }
    }
    if (out.length === 0 && fallback) {
      const d = parseInstallerCalendarDate(fallback)
      if (d) out.push(d)
    }
    return out
  }

  // BTR
  cells.btr = fieldExpiryCells(parseDateList(null, input.btrExpiry))

  // WCE: N/A only when both flags are off; otherwise document status like the profile.
  if (!input.hasWorkersComp && !input.hasWorkersCompExemption) {
    cells.wce = { state: 'na' }
  } else {
    cells.wce = profileDocCell(docs, ['workers_comp_certificate', 'workers_comp'], latestDocFor)
  }

  // WC: Workers Comp Insurance (employers liability)
  cells.wc = input.employersLiabilityExpiry
    ? fieldExpiryCells(parseDateList(null, input.employersLiabilityExpiry))
    : input.employerLiabilityPolicyNumber
      ? { state: 'missing' }
      : { state: 'na' }

  // COI
  cells.coi = fieldExpiryCells(parseDateList(null, input.generalLiabilityExpiry))

  // AL (auto) — profile uses the dates array, not only the single expiry field
  cells.al = input.hasCommercialAutoLiability === false
    ? { state: 'na' }
    : fieldExpiryCells(parseDateList(input.automobileLiabilityExpiryDates, input.automobileLiabilityExpiry))

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

  const compliance = String(input.complianceStatus || '').trim().toUpperCase()
  if (compliance === 'COMPLIANT') cells.bg = { state: 'ok' }
  else if (compliance === 'NOT_COMPLIANT') cells.bg = { state: 'missing' }
  else if (compliance === 'IN_PROGRESS') cells.bg = { state: 'warn' }
  else if (input.canPassBackgroundCheck === true) cells.bg = { state: 'ok' }
  else if (input.canPassBackgroundCheck === false) cells.bg = { state: 'missing' }
  else cells.bg = { state: 'warn' }

  cells.lead = profileDocCell(docs, ['lead_firm_certificate'], latestDocFor)

  // LLRP — profile status uses the main expiry field; extra dates are chips only
  cells.llrp = fieldExpiryCells(parseDateList(input.llrpExpiryDates, input.llrpExpiry))

  const icsSigned = input.icsAgreements
    ? isInstallerIcsSigned(input.icsAgreements)
    : Boolean(input.icsSignedAt) ||
      Boolean(String(input.icsAdminSignedDate || '').trim()) ||
      String(input.icsStatus || '').trim().toLowerCase() === 'approved'
  cells.ics = icsSigned ? { state: 'ok' } : { state: 'missing' }

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
