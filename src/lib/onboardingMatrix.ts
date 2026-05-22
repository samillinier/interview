/** Onboarding document matrix — row labels match the admin tracking spreadsheet (Sunbiz, BTR, WC, …). */

export type MatrixCellState = 'ok' | 'missing' | 'warn' | 'na'

export type MatrixCell = {
  state: MatrixCellState
  detail?: string
  items?: MatrixCellState[]
}

export const MATRIX_ROW_DEFS = [
  { id: 'surface', label: 'Surface', subtitle: 'Primary strength', required: false },
  { id: 'sunbiz', label: 'Sunbiz', subtitle: 'State registry', required: false },
  { id: 'btr', label: 'BTR', subtitle: 'Business tax receipt', required: true },
  { id: 'wc', label: 'WC', subtitle: "Workers' comp", required: true },
  { id: 'wce', label: 'WCE', subtitle: 'WC exemption', required: true },
  { id: 'coi', label: 'COI', subtitle: 'Gen. liability', required: true },
  { id: 'al', label: 'AL', subtitle: 'Auto liability', required: false },
  { id: 'w9', label: 'W-9', subtitle: 'IRS tax form', required: true },
  { id: 'photo', label: 'Photo', subtitle: 'Profile photo', required: true },
  { id: 'bg', label: 'BG', subtitle: 'Background check', required: true },
  { id: 'bank', label: 'Bank Form', subtitle: 'Payment / ACH', required: true },
  { id: 'lead', label: 'Lead', subtitle: 'Lead firm cert.', required: false },
  { id: 'llrp', label: 'LLRP', subtitle: 'Lead registry', required: false },
  { id: 'svc_agr', label: 'Svc Agr', subtitle: 'Service agreement', required: true },
  { id: 'ics', label: 'ICS', subtitle: 'Contractor agreement', required: true },
] as const

export type MatrixRowId = (typeof MATRIX_ROW_DEFS)[number]['id']

export type OnboardingMatrixResult = Record<MatrixRowId, MatrixCell> & {
  onboard: MatrixCell
  /** True if any required item is missing or workers-comp path is incomplete */
  hasRequiredGap: boolean
  /** Distinct required gaps (WC+WCE double-miss counts as one) */
  missingRequiredCount: number
}

export function normalizeInstallerDocType(type: string): string {
  const t = (type || '').toLowerCase().trim()
  if (t === 'w9' || t === 'w-9' || t === 'form-w-9') return 'w9'
  if (t === 'workers_comp' || t === 'workers_compensation') return 'workers_comp'
  if (t === 'business_tax_receipt' || t === 'btr' || t === 'business_registration') return 'business_registration'
  if (t === 'lrrp') return 'lrrp'
  return t
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function daysFromToday(d: Date | null | undefined): number | null {
  if (!d) return null
  const t0 = startOfDay(new Date()).getTime()
  const t1 = startOfDay(new Date(d)).getTime()
  return Math.round((t1 - t0) / (24 * 60 * 60 * 1000))
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
  if (s === 'na' || s === 'n/a') return 'na'
  if (s === 'pending') return 'pending'
  return ''
}

function parseMultiDateJson(raw: string | null | undefined): Date[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((value) => new Date(String(value || '')))
      .filter((date) => !isNaN(date.getTime()))
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
  serviceAgreementSignedAt: Date | null
  icsSignedAt: Date | null
  Document: BareDoc[]
  staffMemberPhotoUrls?: Array<string | null | undefined>
  workersCompExemExpiryDates?: string | null
  automobileLiabilityExpiryDates?: string | null
  llrpExpiryDates?: string | null
}): OnboardingMatrixResult {
  const docs = input.Document || []
  const latestDocFor = (normalizedKeys: string[]): BareDoc | null => {
    const relevant = docs
      .filter((d) => normalizedKeys.includes(normalizeInstallerDocType(d.type)))
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
    if (manual === 'active') return ['ok']
    if (manual === 'pending') return ['warn']
    if (manual === 'inactive' || manual === 'missing') return ['missing']
    if (!d.expiryDate) return ['ok']
    const days = daysFromToday(d.expiryDate)
    if (days === null) return ['ok']
    if (days < 0) return ['missing']
    if (days <= 30) return ['warn']
    return ['ok']
  }

  const cells = {} as Record<MatrixRowId, MatrixCell>

  const surfaceLabel = (input.primaryFlooringSurface || '').trim()
  cells.surface = surfaceLabel
    ? { state: 'ok', detail: surfaceLabel }
    : { state: 'missing' }

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
    else if (st === 'na') cells.sunbiz = { state: 'na' }
    else cells.sunbiz = { state: 'missing' } // inactive, missing, or blank
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
    cells.btr = cellFromStates(btrStates)
  } else if (btrSatisfied) {
    const warn =
      (btrFieldDays !== null && btrFieldDays >= 0 && btrFieldDays <= 30) ||
      (btrDoc.minDays !== null && btrDoc.minDays >= 0 && btrDoc.minDays <= 30)
    const d = btrFieldDays !== null && btrFieldDays >= 0 && btrFieldDays <= 30 ? btrFieldDays : btrDoc.minDays
    cells.btr = warn && d !== null ? { state: 'warn', detail: `${d}d` } : { state: 'ok' }
  } else {
    cells.btr = { state: 'missing', detail: btrDoc.expired || btrExpiredField ? 'exp' : undefined }
  }

  // WC / WCE (either comp insurance or exemption)
  if (input.hasWorkersComp) {
    cells.wce = { state: 'na' }
    const wcStates = docStateList(['workers_comp', 'workers_comp_certificate'])
    const wcDoc = docExpiryMeta(['workers_comp', 'workers_comp_certificate'])
    if (wcStates.length > 0) {
      cells.wc = cellFromStates(wcStates)
    } else if (wcDoc.expired && !hasDoc('workers_comp', 'workers_comp_certificate')) {
      cells.wc = { state: 'missing', detail: 'exp' }
    } else if (wcDoc.minDays !== null && wcDoc.minDays >= 0 && wcDoc.minDays <= 30) {
      cells.wc = { state: 'warn', detail: `${wcDoc.minDays}d` }
    } else {
      cells.wc = { state: 'ok' }
    }
  } else if (input.hasWorkersCompExemption) {
    cells.wc = { state: 'na' }
    const wceDates = parseMultiDateJson(input.workersCompExemExpiryDates)
    if (wceDates.length > 0) {
      const states: MatrixCellState[] = wceDates.map((date) => {
        const days = daysFromToday(date)
        if (days === null) return 'ok'
        if (days < 0) return 'missing'
        if (days <= 30) return 'warn'
        return 'ok'
      })
      cells.wce = cellFromStates(states)
    } else {
      cells.wce = { state: 'ok' }
    }
  } else {
    cells.wce = { state: 'missing' }
    const wcStates = docStateList(['workers_comp', 'workers_comp_certificate'])
    const wcDoc = docExpiryMeta(['workers_comp', 'workers_comp_certificate'])
    if (wcStates.length > 0) {
      cells.wc = cellFromStates(wcStates)
    } else if (hasDoc('workers_comp', 'workers_comp_certificate') && !wcDoc.expired) {
      cells.wc =
        wcDoc.minDays !== null && wcDoc.minDays >= 0 && wcDoc.minDays <= 30
          ? { state: 'warn', detail: `${wcDoc.minDays}d` }
          : { state: 'ok' }
    } else if (wcDoc.expired) {
      cells.wc = { state: 'missing', detail: 'exp' }
    } else {
      cells.wc = { state: 'missing' }
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
    cells.coi = cellFromStates(coiStates)
  } else if (coiOk) {
    const warnGl = glDays !== null && glDays >= 0 && glDays <= 30
    const warnDoc = liDoc.minDays !== null && liDoc.minDays >= 0 && liDoc.minDays <= 30
    const d = warnGl ? glDays : liDoc.minDays
    cells.coi = warnGl || warnDoc ? { state: 'warn', detail: d !== null ? `${d}d` : undefined } : { state: 'ok' }
  } else {
    cells.coi = { state: 'missing', detail: liDoc.expired || glExpired ? 'exp' : undefined }
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
    cells.al = cellFromStates(alStates)
  } else if (alOk) {
    const warnAl = alDays !== null && alDays >= 0 && alDays <= 30
    const warnD = alDoc.minDays !== null && alDoc.minDays >= 0 && alDoc.minDays <= 30
    const d = warnAl ? alDays : alDoc.minDays
    cells.al = warnAl || warnD ? { state: 'warn', detail: d !== null ? `${d}d` : undefined } : { state: 'ok' }
  } else {
    cells.al = { state: 'missing', detail: alDoc.expired || alExpired ? 'exp' : undefined }
  }

  const w9States = docStateList(['w9'])
  cells.w9 = w9States.length > 0 ? cellFromStates(w9States) : { state: 'missing' }
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

  const bankOk = Boolean(
    String(input.paymentAccountNumber || '').trim() && String(input.paymentRoutingNumber || '').trim()
  )
  cells.bank = bankOk ? { state: 'ok' } : { state: 'missing' }

  const leadStates = docStateList(['lead_firm_certificate'])
  cells.lead = cellFromStates(leadStates)

  const llrpFieldDays = daysFromToday(input.llrpExpiry)
  const llrpStates = docStateList(['lrrp'])
  const llrpDoc = docExpiryMeta(['lrrp'])
  const llrpFieldExpired = input.llrpExpiry != null && llrpFieldDays !== null && llrpFieldDays < 0
  const llrpSatisfied =
    hasDoc('lrrp') || (input.llrpExpiry != null && llrpFieldDays !== null && llrpFieldDays >= 0)
  if (llrpStates.length > 0) {
    cells.llrp = cellFromStates(llrpStates)
  } else if (llrpFieldExpired) {
    cells.llrp = { state: 'missing', detail: 'exp' }
  } else if (llrpSatisfied) {
    const warn =
      (llrpFieldDays !== null && llrpFieldDays >= 0 && llrpFieldDays <= 30) ||
      (llrpDoc.minDays !== null && llrpDoc.minDays >= 0 && llrpDoc.minDays <= 30)
    const d =
      llrpFieldDays !== null && llrpFieldDays >= 0 && llrpFieldDays <= 30 ? llrpFieldDays : llrpDoc.minDays
    cells.llrp = warn && d !== null ? { state: 'warn', detail: `${d}d` } : { state: 'ok' }
  } else {
    cells.llrp = { state: 'missing' }
  }

  cells.svc_agr = input.serviceAgreementSignedAt ? { state: 'ok' } : { state: 'missing' }
  cells.ics = input.icsSignedAt ? { state: 'ok' } : { state: 'missing' }

  const wcPathOk =
    cells.wc.state === 'ok' ||
    cells.wc.state === 'warn' ||
    cells.wce.state === 'ok' ||
    cells.wce.state === 'warn'

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

  const anyWarn = MATRIX_ROW_DEFS.some((def) => cells[def.id].state === 'warn')

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
  const wcPathOk =
    cells.wc.state === 'ok' ||
    cells.wc.state === 'warn' ||
    cells.wce.state === 'ok' ||
    cells.wce.state === 'warn'

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
  const anyWarn = MATRIX_ROW_DEFS.some((def) => cells[def.id].state === 'warn')
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
