import type { AutoVerifyCheck, AutoVerifyResult, AutoVerifyVerdict } from '@/lib/documentAutoVerifyTypes'

export type { AutoVerifyCheck, AutoVerifyResult, AutoVerifyVerdict }

const TYPE_LABELS: Record<string, string> = {
  sunbiz: 'Sunbiz',
  business_registration: 'Business Tax Receipt (BTR)',
  w9: 'W-9 Form',
  liability_insurance: 'General Liability',
  auto_insurance: 'Auto Insurance',
  workers_comp: "Workers' Compensation Insurance",
  workers_comp_certificate: "Workers' Comp Exemption",
  lead_firm_certificate: 'Lead Firm Certificate',
  employers_liability: 'Additional Documents',
  lrrp: 'Lead Renovator Certificate (LRRP)',
}

const TYPE_KEYWORDS: Record<string, string[]> = {
  liability_insurance: [
    'commercial general liability',
    'general liability',
    'cgl',
    'acord 25',
    'certificate of liability insurance',
  ],
  auto_insurance: [
    'commercial automobile',
    'business auto',
    'hired auto',
    'non-owned auto',
    'automobile liability',
    'auto liability',
  ],
  workers_comp: [
    "workers' compensation",
    'workers compensation',
    'workmens compensation',
    'workers comp',
    'wc / el',
  ],
  workers_comp_certificate: [
    'exemption certificate',
    'workers compensation exemption',
    "workers' comp exemption",
    'dwc-252',
    'construction industry exemption',
  ],
  business_registration: [
    'business tax receipt',
    'occupational license',
    'local business tax',
    'valid until',
    'btr',
  ],
  sunbiz: ['sunbiz', 'division of corporations', 'florida department of state', 'annual report'],
  w9: ['form w-9', 'request for taxpayer', 'taxpayer identification', 'backup withholding'],
  lrrp: ['lead-safe', 'renovation, repair and painting', 'rrp certified', 'lead renovator'],
  lead_firm_certificate: ['lead-safe certified firm', 'epa firm', 'firm certification'],
}

const FIS_HOLDER_NAME = 'FLOOR INTERIOR SERVICES, CORP'
const FIS_HOLDER_ADDRESS = '4420 E ADAMO DR STE 203, Tampa FL 33605'

const GL_MIN = {
  eachOccurrence: 1_000_000,
  damageToRented: 100_000,
  medicalExpense: 5_000,
  personalAdInjury: 1_000_000,
  generalAggregate: 2_000_000,
  productsCompletedOps: 2_000_000,
}

const WC_EL_MIN = {
  eachAccident: 1_000_000,
  eachEmployee: 1_000_000,
  policyLimit: 1_000_000,
}

const AUTO_CSL_MIN = 300_000
const AUTO_SPLIT = { perPerson: 100_000, perAccident: 300_000, property: 50_000 }

const AI_WORDING_KEYS = [
  'additionalInsured',
  'primaryNoncontributory',
  'waiverOfSubrogation',
  'thirtyDayCancellation',
] as const

function typeLabel(type: string): string {
  return TYPE_LABELS[type] || type.replace(/_/g, ' ')
}

function isInsuranceSlot(type: string | null | undefined) {
  return (
    type === 'liability_insurance' ||
    type === 'auto_insurance' ||
    type === 'workers_comp' ||
    type === 'employers_liability'
  )
}

function normalizeName(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(the|llc|l\.?l\.?c\.?|inc|incorporated|corp|corporation|co|ltd|dba|company)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function namesLikelyMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeName(String(a || ''))
  const right = normalizeName(String(b || ''))
  if (!left || !right) return false
  if (left === right) return true
  if (left.includes(right) || right.includes(left)) return true
  const aTok = new Set(left.split(' ').filter((t) => t.length > 2))
  const bTok = new Set(right.split(' ').filter((t) => t.length > 2))
  if (aTok.size === 0 || bTok.size === 0) return false
  let overlap = 0
  Array.from(aTok).forEach((t) => {
    if (bTok.has(t)) overlap += 1
  })
  return overlap / Math.min(aTok.size, bTok.size) >= 0.6
}

function detectTypeFromText(text: string): { type: string; label: string; score: number } | null {
  const hay = text.toLowerCase()
  let best: { type: string; score: number } | null = null
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (hay.includes(kw)) score += kw.length > 18 ? 2 : 1
    }
    if (score > 0 && (!best || score > best.score)) best = { type, score }
  }
  if (!best) return null
  return { type: best.type, label: typeLabel(best.type), score: best.score }
}

function pickIsoDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : `${m[1]}-${m[2]}-${m[3]}`
}

function asBool(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw
  if (raw === 'true' || raw === 'yes' || raw === 1) return true
  if (raw === 'false' || raw === 'no' || raw === 0) return false
  return null
}

function asMoney(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw !== 'string') return null
  const cleaned = raw.replace(/[$,\s]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function moneyAtLeast(actual: number | null | undefined, min: number) {
  return actual != null && Number.isFinite(actual) && actual + 0.5 >= min
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('en-US')}`
}

function daysOld(iso: string) {
  const d = new Date(`${iso}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

function hayHas(hay: string, ...needles: string[]) {
  return needles.every((n) => hay.includes(n))
}

type CoverageBox = {
  present: boolean | null
  commercialCgl: boolean | null
  claimsMade: boolean | null
  occurrence: boolean | null
  aggregatePerPolicy: boolean | null
  aggregatePerProject: boolean | null
  aggregatePerLocation: boolean | null
  eachOccurrence: number | null
  damageToRented: number | null
  medicalExpense: number | null
  personalAdInjury: number | null
  generalAggregate: number | null
  productsCompletedOps: number | null
  anyAuto: boolean | null
  hiredAutos: boolean | null
  scheduledAutos: boolean | null
  nonOwnedAutos: boolean | null
  combinedSingleLimit: number | null
  bodilyInjuryPerPerson: number | null
  bodilyInjuryPerAccident: number | null
  propertyDamage: number | null
  statutory: boolean | null
  elEachAccident: number | null
  elEachEmployee: number | null
  elPolicyLimit: number | null
}

type ExtractedFields = {
  detectedType: string | null
  detectedTypeLabel: string | null
  namedInsured: string | null
  insuredAddress: string | null
  expiryDate: string | null
  effectiveDate: string | null
  issueDate: string | null
  coverages: string[]
  certificateHolder: string | null
  certificateHolderAddress: string | null
  gl: CoverageBox
  auto: CoverageBox
  workersComp: CoverageBox
  additionalInsured: boolean | null
  primaryNoncontributory: boolean | null
  waiverOfSubrogation: boolean | null
  thirtyDayCancellation: boolean | null
  signed: boolean | null
  notes: string | null
}

function emptyBox(): CoverageBox {
  return {
    present: null,
    commercialCgl: null,
    claimsMade: null,
    occurrence: null,
    aggregatePerPolicy: null,
    aggregatePerProject: null,
    aggregatePerLocation: null,
    eachOccurrence: null,
    damageToRented: null,
    medicalExpense: null,
    personalAdInjury: null,
    generalAggregate: null,
    productsCompletedOps: null,
    anyAuto: null,
    hiredAutos: null,
    scheduledAutos: null,
    nonOwnedAutos: null,
    combinedSingleLimit: null,
    bodilyInjuryPerPerson: null,
    bodilyInjuryPerAccident: null,
    propertyDamage: null,
    statutory: null,
    elEachAccident: null,
    elEachEmployee: null,
    elPolicyLimit: null,
  }
}

function readBox(raw: unknown): CoverageBox {
  const box = emptyBox()
  if (!raw || typeof raw !== 'object') return box
  const o = raw as Record<string, unknown>
  box.present = asBool(o.present)
  box.commercialCgl = asBool(o.commercialCgl)
  box.claimsMade = asBool(o.claimsMade)
  box.occurrence = asBool(o.occurrence)
  box.aggregatePerPolicy = asBool(o.aggregatePerPolicy)
  box.aggregatePerProject = asBool(o.aggregatePerProject)
  box.aggregatePerLocation = asBool(o.aggregatePerLocation)
  box.eachOccurrence = asMoney(o.eachOccurrence)
  box.damageToRented = asMoney(o.damageToRented)
  box.medicalExpense = asMoney(o.medicalExpense)
  box.personalAdInjury = asMoney(o.personalAdInjury)
  box.generalAggregate = asMoney(o.generalAggregate)
  box.productsCompletedOps = asMoney(o.productsCompletedOps)
  box.anyAuto = asBool(o.anyAuto)
  box.hiredAutos = asBool(o.hiredAutos)
  box.scheduledAutos = asBool(o.scheduledAutos)
  box.nonOwnedAutos = asBool(o.nonOwnedAutos)
  box.combinedSingleLimit = asMoney(o.combinedSingleLimit)
  box.bodilyInjuryPerPerson = asMoney(o.bodilyInjuryPerPerson)
  box.bodilyInjuryPerAccident = asMoney(o.bodilyInjuryPerAccident)
  box.propertyDamage = asMoney(o.propertyDamage)
  box.statutory = asBool(o.statutory)
  box.elEachAccident = asMoney(o.elEachAccident)
  box.elEachEmployee = asMoney(o.elEachEmployee)
  box.elPolicyLimit = asMoney(o.elPolicyLimit)
  return box
}

async function extractPdfText(buf: Buffer): Promise<string> {
  try {
    const mod: { default?: (data: Buffer) => Promise<{ text?: string }> } = await import('pdf-parse')
    const pdfParseFn = mod?.default ?? (mod as unknown as (data: Buffer) => Promise<{ text?: string }>)
    if (typeof pdfParseFn !== 'function') return ''
    const parsed = await pdfParseFn(buf).catch(() => null)
    return String(parsed?.text || '').replace(/\s+/g, ' ').trim()
  } catch (e) {
    console.error('Auto-verify pdf-parse failed:', e)
    return ''
  }
}

async function analyzeWithOpenAI(args: {
  text: string
  imageUrl?: string | null
  claimedType: string
  companyName: string
  personName: string
}): Promise<ExtractedFields | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') return null

  const userText = [
    `Claimed upload type: ${typeLabel(args.claimedType)} (${args.claimedType})`,
    `Installer company: ${args.companyName || '(none)'}`,
    `Installer name: ${args.personName || '(none)'}`,
    `Required certificate holder: ${FIS_HOLDER_NAME}, ${FIS_HOLDER_ADDRESS}`,
    'Commercial auto is currently WAIVED — still extract auto boxes if present, but missing auto is allowed.',
    args.text
      ? `Document text (truncated):\n${args.text.slice(0, 14000)}`
      : 'No selectable text was extracted. Use the image if provided.',
  ].join('\n\n')

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: userText }]
  if (args.imageUrl) {
    content.push({ type: 'image_url', image_url: { url: args.imageUrl } })
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content:
              'You check Floor Interior Services subcontractor ACORD 25 COIs and other compliance files. Return ONLY JSON with keys: detectedType (liability_insurance|auto_insurance|workers_comp|workers_comp_certificate|business_registration|sunbiz|w9|lrrp|lead_firm_certificate|employers_liability|other), detectedTypeLabel, namedInsured, insuredAddress, issueDate, effectiveDate, expiryDate, certificateHolder, certificateHolderAddress, coverages, gl, auto, workersComp, additionalInsured, primaryNoncontributory, waiverOfSubrogation, thirtyDayCancellation, signed, notes. Dates YYYY-MM-DD. Money as numbers not strings. gl/auto/workersComp objects use present, commercialCgl, claimsMade, occurrence, aggregatePerPolicy, aggregatePerProject, aggregatePerLocation, eachOccurrence, damageToRented, medicalExpense, personalAdInjury, generalAggregate, productsCompletedOps, anyAuto, hiredAutos, scheduledAutos, nonOwnedAutos, combinedSingleLimit, bodilyInjuryPerPerson, bodilyInjuryPerAccident, propertyDamage, statutory, elEachAccident, elEachEmployee, elPolicyLimit. GL section A must note Commercial General Liability, Occurrence (not claims-made), and Gen\'l Aggregate Limit Applies Per POLICY. If auto section B is filled, record which of Any Auto, Hired Autos, Scheduled Autos, and Non-Owned Autos are marked. All Owned Autos is not required. additionalInsured true only if Description of Operations lists FIS as additional insured (not merely certificate holder). signed true only if an authorized representative signature is visible.',
          },
          { role: 'user', content },
        ],
      }),
    })
    if (!resp.ok) {
      console.error('Auto-verify OpenAI failed:', resp.status, await resp.text().catch(() => ''))
      return null
    }
    const json: any = await resp.json().catch(() => null)
    const raw = String(json?.choices?.[0]?.message?.content || '').trim()
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    const obj = JSON.parse(match[0])
    const detectedType =
      typeof obj.detectedType === 'string' && obj.detectedType !== 'other' ? String(obj.detectedType) : null
    return {
      detectedType,
      detectedTypeLabel:
        typeof obj.detectedTypeLabel === 'string'
          ? obj.detectedTypeLabel
          : detectedType
            ? typeLabel(detectedType)
            : null,
      namedInsured: typeof obj.namedInsured === 'string' && obj.namedInsured.trim() ? obj.namedInsured.trim() : null,
      insuredAddress:
        typeof obj.insuredAddress === 'string' && obj.insuredAddress.trim() ? obj.insuredAddress.trim() : null,
      expiryDate: pickIsoDate(obj.expiryDate),
      effectiveDate: pickIsoDate(obj.effectiveDate),
      issueDate: pickIsoDate(obj.issueDate),
      coverages: Array.isArray(obj.coverages)
        ? obj.coverages.map((c: unknown) => String(c || '').trim()).filter(Boolean).slice(0, 8)
        : [],
      certificateHolder:
        typeof obj.certificateHolder === 'string' && obj.certificateHolder.trim()
          ? obj.certificateHolder.trim()
          : null,
      certificateHolderAddress:
        typeof obj.certificateHolderAddress === 'string' && obj.certificateHolderAddress.trim()
          ? obj.certificateHolderAddress.trim()
          : null,
      gl: readBox(obj.gl),
      auto: readBox(obj.auto),
      workersComp: readBox(obj.workersComp),
      additionalInsured: asBool(obj.additionalInsured),
      primaryNoncontributory: asBool(obj.primaryNoncontributory),
      waiverOfSubrogation: asBool(obj.waiverOfSubrogation),
      thirtyDayCancellation: asBool(obj.thirtyDayCancellation),
      signed: asBool(obj.signed),
      notes: typeof obj.notes === 'string' && obj.notes.trim() ? obj.notes.trim() : null,
    }
  } catch (e) {
    console.error('Auto-verify OpenAI parse failed:', e)
    return null
  }
}

function limitCheck(
  label: string,
  actual: number | null,
  min: number
): { ok: boolean; detail: string } {
  if (actual == null) {
    return { ok: false, detail: `${label} was not found. Required ${formatMoney(min)}.` }
  }
  if (!moneyAtLeast(actual, min)) {
    return { ok: false, detail: `${label} is ${formatMoney(actual)}; required ${formatMoney(min)}.` }
  }
  return { ok: true, detail: `${label} ${formatMoney(actual)} meets ${formatMoney(min)}.` }
}

function pushLimit(
  checks: AutoVerifyCheck[],
  id: string,
  label: string,
  actual: number | null,
  min: number
) {
  const result = limitCheck(label, actual, min)
  checks.push({
    id,
    label,
    status: result.ok ? 'pass' : actual == null ? 'warn' : 'fail',
    detail: result.detail,
  })
}

function buildResult(args: {
  claimedType: string
  companyName: string
  personName: string
  text: string
  ai: ExtractedFields | null
}): AutoVerifyResult {
  const claimedType = args.claimedType || ''
  const hay = args.text.toLowerCase()
  const heuristic = args.text ? detectTypeFromText(args.text) : null
  const detectedType = args.ai?.detectedType || heuristic?.type || null
  const detectedTypeLabel =
    args.ai?.detectedTypeLabel || (detectedType ? typeLabel(detectedType) : heuristic?.label) || null
  const namedInsured = args.ai?.namedInsured || null
  const expiryDate = args.ai?.expiryDate || null
  const issueDate = args.ai?.issueDate || null
  const holder = args.ai?.certificateHolder || null
  const holderAddress = args.ai?.certificateHolderAddress || null
  const checks: AutoVerifyCheck[] = []
  const treatAsCoi = isInsuranceSlot(claimedType) || isInsuranceSlot(detectedType)

  const readable = args.text.length >= 40 || Boolean(args.ai)
  checks.push({
    id: 'readable',
    label: 'File readable',
    status: readable ? 'pass' : 'warn',
    detail: readable
      ? args.text.length >= 40
        ? 'Pulled text from the file.'
        : 'Read with AI from the image/scan.'
      : 'Could not read enough text. Open the file to confirm it is not a blank scan.',
  })

  const claimedIsCatchAll = claimedType === 'employers_liability'
  if (detectedType && claimedType && !claimedIsCatchAll) {
    const typeOk = detectedType === claimedType
    checks.push({
      id: 'type',
      label: 'Document type',
      status: typeOk ? 'pass' : 'fail',
      detail: typeOk
        ? `Looks like ${detectedTypeLabel}, matching the ${typeLabel(claimedType)} slot.`
        : `Looks like ${detectedTypeLabel}, but it was uploaded as ${typeLabel(claimedType)}.`,
    })
  } else if (detectedType && claimedIsCatchAll) {
    checks.push({
      id: 'type',
      label: 'Document type',
      status: 'warn',
      detail: `Uploaded as Additional Documents. Auto-verify thinks it is ${detectedTypeLabel}.`,
    })
  } else {
    checks.push({
      id: 'type',
      label: 'Document type',
      status: 'warn',
      detail: 'Could not confidently identify the form. Admin should open the file.',
    })
  }

  const companyMatch = namesLikelyMatch(namedInsured, args.companyName)
  const personMatch = namesLikelyMatch(namedInsured, args.personName)
  if (namedInsured) {
    checks.push({
      id: 'named',
      label: 'Named insured / company',
      status: companyMatch || personMatch ? 'pass' : 'fail',
      detail:
        companyMatch || personMatch
          ? `File is in the name of ${namedInsured}.`
          : `File name on the document is ${namedInsured}, which does not match ${args.companyName || args.personName || 'this installer'}.`,
    })
  } else {
    checks.push({
      id: 'named',
      label: 'Named insured / company',
      status: 'warn',
      detail: 'No company/named insured found on the file.',
    })
  }

  if (treatAsCoi) {
    if (issueDate) {
      const age = daysOld(issueDate)
      if (age == null) {
        checks.push({
          id: 'issued',
          label: 'Issue date (30 days)',
          status: 'warn',
          detail: `Issue date ${issueDate} could not be parsed.`,
        })
      } else if (age > 30) {
        checks.push({
          id: 'issued',
          label: 'Issue date (30 days)',
          status: 'fail',
          detail: `Issued ${issueDate} (${age} days ago). Certificate must be received within 30 days of issue date.`,
        })
      } else {
        checks.push({
          id: 'issued',
          label: 'Issue date (30 days)',
          status: 'pass',
          detail: `Issued ${issueDate} (${age} day${age === 1 ? '' : 's'} ago).`,
        })
      }
    } else {
      checks.push({
        id: 'issued',
        label: 'Issue date (30 days)',
        status: 'warn',
        detail: 'No issue date found in the top-right Date box.',
      })
    }
  }

  const needsExpiry = !['w9', 'sunbiz'].includes(claimedType || detectedType || '')
  if (expiryDate) {
    const expiry = new Date(`${expiryDate}T00:00:00.000Z`)
    const expired = expiry.getTime() < Date.now() - 24 * 3600 * 1000
    checks.push({
      id: 'expiry',
      label: 'Expiration',
      status: expired ? 'fail' : 'pass',
      detail: expired ? `Expired ${expiryDate}.` : `Expiration ${expiryDate}.`,
    })
  } else if (needsExpiry) {
    checks.push({
      id: 'expiry',
      label: 'Expiration',
      status: 'warn',
      detail: 'No expiration date found. Add it on the profile if the file has one.',
    })
  }

  const checkGl = treatAsCoi && claimedType !== 'auto_insurance' && claimedType !== 'workers_comp'
  if (checkGl) {
    const gl = args.ai?.gl || emptyBox()
    const cglOk = gl.commercialCgl === true || hay.includes('commercial general liability')
    const occurrenceOk = gl.occurrence === true || hayHas(hay, 'occurrence')
    const claimsMade = gl.claimsMade === true
    const policyAgg =
      gl.aggregatePerPolicy === true ||
      /aggregate[^\.]{0,40}applies per[:\s]*policy/.test(hay) ||
      /applies per[:\s]*policy/.test(hay)
    const projectOrLoc = gl.aggregatePerProject === true || gl.aggregatePerLocation === true

    const glBoxMiss: string[] = []
    if (!cglOk) glBoxMiss.push('Commercial General Liability')
    if (claimsMade || !occurrenceOk) glBoxMiss.push('Occurrence (not claims-made)')
    if (!policyAgg || projectOrLoc) glBoxMiss.push('Gen\'l aggregate applies per Policy')

    checks.push({
      id: 'gl-boxes',
      label: 'GL boxes',
      status: glBoxMiss.length === 0 ? 'pass' : claimsMade || !cglOk || !occurrenceOk ? 'fail' : 'warn',
      detail:
        glBoxMiss.length === 0
          ? 'Commercial General Liability, Occurrence, and aggregate per Policy are marked. Claims-made, Project, and Loc are off.'
          : `The sample requires Commercial General Liability, Occurrence (not claims-made), and Gen'l Aggregate Limit Applies Per POLICY. Missing or wrong: ${glBoxMiss.join(', ')}.`,
    })
    pushLimit(checks, 'gl-occ', 'GL each occurrence', gl.eachOccurrence, GL_MIN.eachOccurrence)
    pushLimit(checks, 'gl-rent', 'Damage to rented premises', gl.damageToRented, GL_MIN.damageToRented)
    pushLimit(checks, 'gl-med', 'Medical expense', gl.medicalExpense, GL_MIN.medicalExpense)
    pushLimit(checks, 'gl-pai', 'Personal & advertising injury', gl.personalAdInjury, GL_MIN.personalAdInjury)
    pushLimit(checks, 'gl-agg', 'General aggregate', gl.generalAggregate, GL_MIN.generalAggregate)
    pushLimit(checks, 'gl-pco', 'Products / completed ops', gl.productsCompletedOps, GL_MIN.productsCompletedOps)
  }

  if (treatAsCoi) {
    const auto = args.ai?.auto || emptyBox()
    const autoPresent = auto.present === true || claimedType === 'auto_insurance'
    const boxed = {
      'Any Auto': auto.anyAuto === true || hay.includes('any auto'),
      'Hired Autos': auto.hiredAutos === true || hay.includes('hired auto'),
      'Scheduled Autos': auto.scheduledAutos === true || hay.includes('scheduled auto'),
      'Non-Owned Autos': auto.nonOwnedAutos === true || /non[-\s]?owned auto/.test(hay),
    }
    const missingBoxes = Object.entries(boxed)
      .filter(([, ok]) => !ok)
      .map(([label]) => label)

    if (autoPresent) {
      checks.push({
        id: 'auto-boxes',
        label: 'Circled auto boxes',
        status: missingBoxes.length === 0 ? 'pass' : 'fail',
        detail:
          missingBoxes.length === 0
            ? 'Any Auto, Hired Autos, Scheduled Autos, and Non-Owned Autos are marked, matching the sample circles.'
            : `The sample requires these auto boxes: Any Auto, Hired Autos, Scheduled Autos, and Non-Owned Autos. Missing: ${missingBoxes.join(', ')}. All Owned Autos is not required.`,
      })
      const cslOk = moneyAtLeast(auto.combinedSingleLimit, AUTO_CSL_MIN)
      const splitOk =
        moneyAtLeast(auto.bodilyInjuryPerPerson, AUTO_SPLIT.perPerson) &&
        moneyAtLeast(auto.bodilyInjuryPerAccident, AUTO_SPLIT.perAccident) &&
        moneyAtLeast(auto.propertyDamage, AUTO_SPLIT.property)
      checks.push({
        id: 'auto-limits',
        label: 'Auto limits',
        status: cslOk || splitOk ? 'pass' : 'warn',
        detail:
          cslOk || splitOk
            ? 'Auto limits meet the sample ($300,000 CSL or $100k/$300k/$50k split).'
            : 'Auto is on this file but Combined Single Limit $300,000 or split $100k/$300k/$50k was not confirmed.',
      })
    }

    checks.push({
      id: 'auto-waived',
      label: 'Commercial auto required?',
      status: 'pass',
      detail: autoPresent
        ? 'They included auto on this certificate, so the circled boxes are required. Having auto insurance itself is still waived if they leave section B blank.'
        : 'Commercial auto is waived. Section B can be blank. If they do fill it in, Any Auto, Hired, Scheduled, and Non-Owned must be marked.',
    })
  }

  const checkWc = claimedType === 'workers_comp' || (treatAsCoi && claimedType === 'liability_insurance' && args.ai?.workersComp.present === true)
  if (claimedType === 'workers_comp' || checkWc) {
    const wc = args.ai?.workersComp || emptyBox()
    if (claimedType === 'workers_comp' || wc.present === true) {
      pushLimit(checks, 'wc-acc', "WC employer's liability each accident", wc.elEachAccident, WC_EL_MIN.eachAccident)
      pushLimit(checks, 'wc-emp', 'EL each employee (disease)', wc.elEachEmployee, WC_EL_MIN.eachEmployee)
      pushLimit(checks, 'wc-pol', 'EL disease policy limit', wc.elPolicyLimit, WC_EL_MIN.policyLimit)
    }
  }

  if (treatAsCoi && claimedType !== 'auto_insurance') {
    const textHits = [
      hay.includes('additional insured'),
      hay.includes('ongoing') && hay.includes('completed'),
      hay.includes('primary') && hay.includes('noncontributory'),
      hay.includes('waiver of subrogation'),
      hay.includes('30 day') || hay.includes('thirty day'),
    ].filter(Boolean).length
    const aiHits = AI_WORDING_KEYS.filter((k) => args.ai?.[k] === true).length
    const hits = Math.max(textHits, aiHits)
    const aiSaysInsured = args.ai?.additionalInsured === true
    checks.push({
      id: 'ai-wording',
      label: 'Additional insured statement',
      status: hits >= 3 || aiSaysInsured ? 'pass' : hits >= 1 ? 'warn' : 'fail',
      detail:
        hits >= 3 || aiSaysInsured
          ? 'Description of Operations has the additional insured / waiver / 30-day cancellation wording.'
          : hits >= 1
            ? 'Some additional-insured wording was found, but the full yellow sample paragraph is incomplete.'
            : 'Missing the additional insured statement. FIS must be additional insured for GL (and auto if listed), with waiver and 30-day cancellation.',
    })
  }

  if (treatAsCoi && claimedType !== 'auto_insurance') {
    const blob = `${holder || ''} ${holderAddress || ''} ${args.text}`.toLowerCase()
    const nameOk = /floor\s*interior/.test(blob)
    const streetOk = /4420/.test(blob) && /adamo/.test(blob)
    const zipOk = /33605/.test(blob)
    if (nameOk && streetOk && zipOk) {
      checks.push({
        id: 'holder',
        label: 'Certificate holder',
        status: 'pass',
        detail: `Certificate holder matches ${FIS_HOLDER_NAME}, ${FIS_HOLDER_ADDRESS}.`,
      })
    } else if (nameOk) {
      checks.push({
        id: 'holder',
        label: 'Certificate holder',
        status: 'warn',
        detail: `FIS is named (${holder || 'Floor Interior Services'}) but confirm the address is 4420 E Adamo Dr Ste 203, Tampa FL 33605. Listing FIS only as additional insured is not enough.`,
      })
    } else {
      checks.push({
        id: 'holder',
        label: 'Certificate holder',
        status: treatAsCoi ? 'fail' : 'warn',
        detail: holder
          ? `Certificate holder reads ${holder}. Required: ${FIS_HOLDER_NAME}, ${FIS_HOLDER_ADDRESS}.`
          : `No certificate holder found. Required: ${FIS_HOLDER_NAME}, ${FIS_HOLDER_ADDRESS}.`,
      })
    }
  } else if (holder && !treatAsCoi) {
    const ours = /floor\s*interior/i.test(holder)
    checks.push({
      id: 'holder',
      label: 'Certificate holder',
      status: ours ? 'pass' : 'warn',
      detail: ours
        ? `Certificate holder looks like Floor Interior Services (${holder}).`
        : `Certificate holder reads ${holder}.`,
    })
  }

  if (treatAsCoi && claimedType !== 'auto_insurance') {
    if (args.ai?.signed === true) {
      checks.push({
        id: 'signed',
        label: 'Authorized signature',
        status: 'pass',
        detail: 'Authorized representative signature looks present.',
      })
    } else if (args.ai?.signed === false) {
      checks.push({
        id: 'signed',
        label: 'Authorized signature',
        status: 'fail',
        detail: 'No authorized representative signature found. The sample requires a signature.',
      })
    } else {
      checks.push({
        id: 'signed',
        label: 'Authorized signature',
        status: 'warn',
        detail: 'Could not confirm the authorized representative signature.',
      })
    }
  }

  const failCount = checks.filter((c) => c.status === 'fail').length
  const warnCount = checks.filter((c) => c.status === 'warn').length
  let verdict: AutoVerifyVerdict = 'review'
  if (failCount > 0) verdict = 'mismatch'
  else if (warnCount === 0 && checks.some((c) => c.id === 'type' && c.status === 'pass')) verdict = 'match'
  else verdict = 'review'

  const summary =
    verdict === 'match'
      ? treatAsCoi
        ? 'Matches the FIS ACORD sample. Commercial auto is waived. Still open the file if anything feels off.'
        : 'Looks like the right document. Still open it if anything feels off.'
      : verdict === 'mismatch'
        ? treatAsCoi
          ? 'This COI does not match the FIS ACORD sample. Reject or send a correction.'
          : 'This does not look like the right file. Reject or send a correction.'
        : treatAsCoi
          ? 'Needs a quick look against the FIS ACORD sample — some boxes could not be fully confirmed.'
          : 'Needs a quick human look — auto-verify could not fully confirm it.'

  return {
    verdict,
    summary,
    claimedType,
    claimedTypeLabel: typeLabel(claimedType),
    detectedType,
    detectedTypeLabel,
    namedInsured,
    expiryDate,
    effectiveDate: args.ai?.effectiveDate || null,
    issueDate,
    coverages: args.ai?.coverages || [],
    certificateHolder: holder,
    autoWaived: true,
    checks,
    notes: args.ai?.notes || null,
  }
}

export async function autoVerifyInstallerDocument(args: {
  url: string
  name?: string | null
  claimedType?: string | null
  companyName?: string | null
  firstName?: string | null
  lastName?: string | null
}): Promise<AutoVerifyResult> {
  const url = String(args.url || '').trim()
  const name = String(args.name || '').trim()
  const claimedType = String(args.claimedType || '').trim()
  const companyName = String(args.companyName || '').trim()
  const personName = `${args.firstName || ''} ${args.lastName || ''}`.trim()
  const ext = (name.split('.').pop() || url.split('?')[0].split('.').pop() || '').toLowerCase()
  const isImage = ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp'

  let text = ''
  if (url && (ext === 'pdf' || !ext)) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer())
        if (ext === 'pdf' || (res.headers.get('content-type') || '').includes('pdf')) {
          text = await extractPdfText(buf)
        }
      }
    } catch (e) {
      console.error('Auto-verify fetch failed:', e)
    }
  }

  const canUseAi = text.length >= 40 || isImage
  const ai = canUseAi
    ? await analyzeWithOpenAI({
        text,
        imageUrl: isImage ? url : null,
        claimedType,
        companyName,
        personName,
      })
    : null

  return buildResult({ claimedType, companyName, personName, text, ai })
}
