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

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

const US_DATE_RE = /\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})\b/g
const JAMMED_DATES_RE = /(\d{1,2})\/(\d{1,2})\/(\d{4})(\d{1,2})\/(\d{1,2})\/(\d{4})/g

function pickIsoDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return mdyToIso(iso[2], iso[3], iso[1])
  const us = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})$/)
  if (us) return mdyToIso(us[1], us[2], us[3])
  const embedded = Array.from(s.matchAll(new RegExp(US_DATE_RE.source, 'g')))[0]
  if (embedded) return mdyToIso(embedded[1], embedded[2], embedded[3])
  const embeddedIso = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (embeddedIso) return mdyToIso(embeddedIso[2], embeddedIso[3], embeddedIso[1])
  return null
}

/** ACORD DATE is MM/DD/YYYY. 10/23/2026 is October 23, 2026 — never 2023-10-23. */
function mdyToIso(mm: string, dd: string, yearRaw: string): string | null {
  const month = Number(mm)
  const day = Number(dd)
  let year = Number(yearRaw)
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) return null
  if (String(yearRaw).length <= 2) year += 2000
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null
  const utc = Date.UTC(year, month - 1, day)
  const check = new Date(utc)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null
  }
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function isoToUs(iso: string) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  return `${Number(m[2])}/${Number(m[3])}/${m[1]}`
}

function utcTodayIso() {
  const n = new Date()
  return `${n.getUTCFullYear()}-${pad2(n.getUTCMonth() + 1)}-${pad2(n.getUTCDate())}`
}

function addDaysIso(iso: string, days: number) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

/** True when a model turned 10/23/2026 into 2023-10-23 (day used as the year). */
function looksLikeDayAsYearSwap(iso: string | null | undefined) {
  if (!iso) return false
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  return Number(m[1]) % 100 === Number(m[3])
}

function sameMonthDay(a: string, b: string) {
  return a.slice(5) === b.slice(5)
}

function daysBetween(fromIso: string, toIso: string) {
  const a = fromIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const b = toIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!a || !b) return null
  const start = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]))
  const end = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]))
  return Math.round((end - start) / 86_400_000)
}

type PolicyPair = { eff: string; exp: string }

function extractAcordPrintedDates(text: string) {
  const policyPairs: PolicyPair[] = []
  const jammedRanges: Array<{ start: number; end: number }> = []
  Array.from(text.matchAll(new RegExp(JAMMED_DATES_RE.source, 'g'))).forEach((m) => {
    const eff = mdyToIso(m[1], m[2], m[3])
    const exp = mdyToIso(m[4], m[5], m[6])
    if (eff && exp && m.index != null) {
      policyPairs.push({ eff, exp })
      jammedRanges.push({ start: m.index, end: m.index + m[0].length })
    }
  })

  const singles: string[] = []
  Array.from(text.matchAll(new RegExp(US_DATE_RE.source, 'g'))).forEach((m) => {
    if (m.index == null) return
    if (jammedRanges.some((r) => m.index! >= r.start && m.index! < r.end)) return
    const iso = mdyToIso(m[1], m[2], m[3])
    if (iso && !singles.includes(iso)) singles.push(iso)
  })

  const yearPairs = [...singles].sort()
  for (let i = 0; i < yearPairs.length; i++) {
    for (let j = i + 1; j < yearPairs.length; j++) {
      const a = yearPairs[i]
      const b = yearPairs[j]
      const days = daysBetween(a, b)
      if (days != null && days >= 300 && days <= 400) {
        policyPairs.push({ eff: a, exp: b })
      }
    }
  }

  const pairDates = new Set(policyPairs.flatMap((p) => [p.eff, p.exp]))
  const standalone = singles.filter((d) => !pairDates.has(d))

  const labeled: string[] = []
  const label = text.match(/DATE\s*\(\s*MM\s*\/\s*DD\s*\/\s*YYYY\s*\)/i)
  if (label && label.index != null) {
    const from = label.index + label[0].length
    const window = text.slice(from, from + 1200)
    Array.from(window.matchAll(new RegExp(US_DATE_RE.source, 'g'))).forEach((m) => {
      if (m.index == null) return
      const abs = from + m.index
      if (jammedRanges.some((r) => abs >= r.start && abs < r.end)) return
      const iso = mdyToIso(m[1], m[2], m[3])
      if (iso && !labeled.includes(iso)) labeled.push(iso)
    })
  }

  return { singles, policyPairs, standalone, labeled }
}

function mostRecentOnOrBefore(dates: string[], latestAllowed: string) {
  const ok = dates.filter((d) => d <= latestAllowed).sort()
  return ok.length ? ok[ok.length - 1] : null
}

function fixAiDateYear(aiIso: string | null, context: string[]) {
  if (!aiIso) return null
  if (context.includes(aiIso)) return aiIso
  if (looksLikeDayAsYearSwap(aiIso)) {
    const swapped = context.find((d) => sameMonthDay(d, aiIso) && d !== aiIso)
    if (swapped) return swapped
    return null
  }
  const sameMd = context.filter((d) => sameMonthDay(d, aiIso) && d !== aiIso)
  if (sameMd.length) return mostRecentOnOrBefore(sameMd, addDaysIso(utcTodayIso(), 1)) || sameMd[0]
  const formYears = new Set(context.map((d) => d.slice(0, 4)))
  if (formYears.size && !formYears.has(aiIso.slice(0, 4))) return null
  return aiIso
}

function pickAcordDates(
  text: string,
  aiIssue: string | null,
  aiEffective: string | null,
  aiExpiry: string | null,
  dateBox?: string | null
) {
  const { singles, policyPairs, standalone, labeled } = extractAcordPrintedDates(text)
  const printed = [...singles].sort()
  const latestAllowed = addDaysIso(utcTodayIso(), 1)
  const policyExp = policyPairs.map((p) => p.exp).sort().at(-1) || null
  const policyEff = policyPairs.map((p) => p.eff).sort().at(0) || null
  const context = [...printed, dateBox, aiEffective, aiExpiry].filter((d): d is string => Boolean(d))

  const labeledIssue =
    mostRecentOnOrBefore(
      labeled.filter((d) => standalone.includes(d) || labeled.length === 1),
      latestAllowed
    ) || mostRecentOnOrBefore(labeled, latestAllowed)

  let issue =
    (dateBox && dateBox <= latestAllowed ? dateBox : null) ||
    labeledIssue ||
    mostRecentOnOrBefore(standalone, latestAllowed) ||
    mostRecentOnOrBefore(printed, latestAllowed)

  const aiFixed = fixAiDateYear(aiIssue, context)
  if (!issue && aiFixed && aiFixed <= latestAllowed) issue = aiFixed
  if (issue && looksLikeDayAsYearSwap(issue) && dateBox) issue = dateBox

  let expiry = policyExp || (printed.length ? printed[printed.length - 1] : null)
  if (aiExpiry && (printed.includes(aiExpiry) || policyPairs.some((p) => p.exp === aiExpiry))) {
    expiry = aiExpiry
  } else if (!expiry && aiExpiry && !looksLikeDayAsYearSwap(aiExpiry)) {
    expiry = aiExpiry
  }

  let effective = policyEff
  if (aiEffective && (printed.includes(aiEffective) || policyPairs.some((p) => p.eff === aiEffective))) {
    effective = aiEffective
  } else if (!effective) {
    effective = fixAiDateYear(aiEffective, context)
  }

  return {
    issueDate: issue,
    effectiveDate: effective,
    expiryDate: expiry,
  }
}

/** Next/ACORD text often dumps GL limits as 1,000,000 / 100,000 / 5,000 / 2,000,000 / 2,000,000. */
function extractGlLimitsFromText(text: string): Partial<CoverageBox> {
  const nums = Array.from(text.matchAll(/(\d{1,3}(?:,\d{3}){1,3}(?:\.\d{2})?)/g)).map((m) =>
    Number(m[1].replace(/,/g, ''))
  )
  for (let i = 0; i < nums.length - 3; i++) {
    const occ = nums[i]
    const rented = nums[i + 1]
    const med = nums[i + 2]
    if (occ < 500_000 || occ > 10_000_000) continue
    if (rented < 25_000 || rented > 1_000_000) continue
    if (med < 1_000 || med > 50_000) continue
    const a = nums[i + 3]
    const b = nums[i + 4]
    const c = nums[i + 5]
    let personalAdInjury: number | null = null
    let generalAggregate: number | null = null
    let productsCompletedOps: number | null = null
    if (a >= 2_000_000 && b >= 2_000_000) {
      generalAggregate = a
      productsCompletedOps = b
      personalAdInjury =
        nums.slice(i + 3).find((n) => n >= 1_000_000 && n < 2_000_000) ?? null
    } else if (a >= 1_000_000 && b >= 2_000_000 && c >= 2_000_000) {
      personalAdInjury = a
      generalAggregate = b
      productsCompletedOps = c
    }
    return {
      eachOccurrence: occ,
      damageToRented: rented,
      medicalExpense: med,
      personalAdInjury,
      generalAggregate,
      productsCompletedOps,
    }
  }
  return {}
}

function fillGlLimits(gl: CoverageBox, text: string): CoverageBox {
  const found = extractGlLimitsFromText(text)
  return {
    ...gl,
    eachOccurrence: gl.eachOccurrence ?? found.eachOccurrence ?? null,
    damageToRented: gl.damageToRented ?? found.damageToRented ?? null,
    medicalExpense: gl.medicalExpense ?? found.medicalExpense ?? null,
    personalAdInjury: gl.personalAdInjury ?? found.personalAdInjury ?? null,
    generalAggregate: gl.generalAggregate ?? found.generalAggregate ?? null,
    productsCompletedOps: gl.productsCompletedOps ?? found.productsCompletedOps ?? null,
  }
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
  const age = daysBetween(iso, utcTodayIso())
  return age == null ? null : age
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
  dateBoxPrinted: string | null
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
    return String(parsed?.text || '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } catch (e) {
    console.error('Auto-verify pdf-parse failed:', e)
    return ''
  }
}

/** A scanned/print-to-PDF has little to no selectable text. Anything under this
 *  is treated as an image-only PDF and routed through vision instead of text. */
const PDF_MIN_TEXT_CHARS = 200

/** Render the first page of a PDF to a PNG buffer so the vision model can read it. */
async function renderPdfFirstPageToPng(buf: Buffer): Promise<Buffer | null> {
  try {
    const mod: any = await import('pdf-to-img')
    const pdfFn = mod?.pdf
    if (typeof pdfFn !== 'function') return null
    const document = await pdfFn(buf, { scale: 2 })
    const page = await document.getPage(1)
    const png = Buffer.isBuffer(page) ? page : Buffer.from(page)
    try {
      if (typeof document.destroy === 'function') await document.destroy()
    } catch {
      /* ignore */
    }
    return png && png.length > 0 ? png : null
  } catch (e) {
    console.error('Auto-verify PDF render failed:', e)
    return null
  }
}

/** Upload a rendered page PNG to Vercel Blob so OpenAI can fetch it as an image URL. */
async function uploadRenderedPdfToBlob(png: Buffer): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN
  if (!token) return null
  try {
    const blobModule: any = await import('@vercel/blob')
    const put = blobModule?.put
    if (typeof put !== 'function') return null
    const name = `renders/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`
    const blob = await put(name, png, { access: 'public', contentType: 'image/png', token })
    return blob?.url || null
  } catch (e) {
    console.error('Auto-verify PDF render upload failed:', e)
    return null
  }
}

async function readAcordDateBox(imageUrl: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sk-your-openai-api-key-here' || !imageUrl) return null
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        max_tokens: 60,
        messages: [
          {
            role: 'system',
            content:
              'Read the ACORD 25 DATE (MM/DD/YYYY) box. It is the small box in the TOP RIGHT, beside CERTIFICATE OF LIABILITY INSURANCE. It is not POLICY EFF and not POLICY EXP in the coverages grid. Reply with ONLY JSON {"date":"MM/DD/YYYY"} using the printed digits. 08/28/2026 means August 28, 2026. Never output 08/20/2022 or 2022-08-20 for 08/28/2026. Never use the day as the year.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Read only the top-right DATE (MM/DD/YYYY) box. Return {"date":"MM/DD/YYYY"}.' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    })
    if (!resp.ok) {
      console.error('Auto-verify DATE box read failed:', resp.status, await resp.text().catch(() => ''))
      return null
    }
    const json: any = await resp.json().catch(() => null)
    const raw = String(json?.choices?.[0]?.message?.content || '').trim()
    let dateStr = raw
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const obj = JSON.parse(jsonMatch[0])
        if (typeof obj?.date === 'string' && obj.date.trim()) dateStr = obj.date.trim()
      } catch {
        /* keep raw */
      }
    }
    return pickIsoDate(dateStr) || pickIsoDate(raw)
  } catch (e) {
    console.error('Auto-verify DATE box read failed:', e)
    return null
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
    content.push({ type: 'image_url', image_url: { url: args.imageUrl, detail: 'high' } })
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: args.imageUrl ? 'gpt-4o' : 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content:
              'You check Floor Interior Services subcontractor ACORD 25 COIs and other compliance files. Return ONLY JSON with keys: detectedType (liability_insurance|auto_insurance|workers_comp|workers_comp_certificate|business_registration|sunbiz|w9|lrrp|lead_firm_certificate|employers_liability|other), detectedTypeLabel, namedInsured, insuredAddress, dateBoxPrinted, issueDate, effectiveDate, expiryDate, certificateHolder, certificateHolderAddress, coverages, gl, auto, workersComp, additionalInsured, primaryNoncontributory, waiverOfSubrogation, thirtyDayCancellation, signed, notes. dateBoxPrinted is the exact MM/DD/YYYY from the small DATE box in the TOP RIGHT, next to the title — not POLICY EFF and not POLICY EXP. Example: printed 08/28/2026 means dateBoxPrinted "08/28/2026" and issueDate 2026-08-28. NEVER turn 08/28/2026 into 2022-08-20 or 10/23/2026 into 2023-10-23. Never use the day as the year. Never copy POLICY EFF (for example 08/20/2026) into the DATE box. Other dates YYYY-MM-DD. Money as numbers not strings. gl/auto/workersComp objects use present, commercialCgl, claimsMade, occurrence, aggregatePerPolicy, aggregatePerProject, aggregatePerLocation, eachOccurrence, damageToRented, medicalExpense, personalAdInjury, generalAggregate, productsCompletedOps, anyAuto, hiredAutos, scheduledAutos, nonOwnedAutos, combinedSingleLimit, bodilyInjuryPerPerson, bodilyInjuryPerAccident, propertyDamage, statutory, elEachAccident, elEachEmployee, elPolicyLimit. GL section A must note Commercial General Liability, Occurrence (not claims-made), and Gen\'l Aggregate Limit Applies Per POLICY. If auto section B is filled, record which of Any Auto, Hired Autos, Scheduled Autos, and Non-Owned Autos are marked. All Owned Autos is not required. additionalInsured true only if Description of Operations lists FIS as additional insured (not merely certificate holder). signed true only if an authorized representative signature is visible.',
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
    // The model sometimes nests the coverage boxes under `coverages` (e.g. coverages.gl)
    // instead of returning top-level gl/auto/workersComp. Accept both shapes.
    const coveragesObj =
      obj.coverages && typeof obj.coverages === 'object' && !Array.isArray(obj.coverages)
        ? (obj.coverages as Record<string, unknown>)
        : null
    const glRaw = obj.gl ?? coveragesObj?.gl
    const autoRaw = obj.auto ?? coveragesObj?.auto
    const workersCompRaw = obj.workersComp ?? coveragesObj?.workersComp
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
      dateBoxPrinted: pickIsoDate(obj.dateBoxPrinted || obj.dateBox || obj.issueDatePrinted),
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
      gl: readBox(glRaw),
      auto: readBox(autoRaw),
      workersComp: readBox(workersCompRaw),
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
  let detectedType = args.ai?.detectedType || heuristic?.type || null
  const looksLikeGlCoi =
    hay.includes('certificate of liability insurance') && hay.includes('commercial general liability')
  if (looksLikeGlCoi && (detectedType === 'employers_liability' || detectedType === 'workers_comp')) {
    detectedType = 'liability_insurance'
  }
  const detectedTypeLabel =
    detectedType === 'liability_insurance'
      ? typeLabel('liability_insurance')
      : args.ai?.detectedTypeLabel || (detectedType ? typeLabel(detectedType) : heuristic?.label) || null
  const namedInsured = args.ai?.namedInsured || null
  const acordDates = pickAcordDates(
    args.text,
    args.ai?.issueDate || null,
    args.ai?.effectiveDate || null,
    args.ai?.expiryDate || null,
    args.ai?.dateBoxPrinted || null
  )
  const expiryDate = acordDates.expiryDate
  const issueDate = acordDates.issueDate
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
        : 'Auto Verify read the file.'
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
      detail: looksLikeGlCoi
        ? 'Uploaded as Additional Documents. This is a General Liability ACORD 25, not an employers-liability-only form.'
        : `Uploaded as Additional Documents. Auto-verify thinks it is ${detectedTypeLabel}.`,
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
      const printed = isoToUs(issueDate)
      if (age == null) {
        checks.push({
          id: 'issued',
          label: 'Issue date (30 days)',
          status: 'warn',
          detail: `Issue date ${printed} could not be parsed.`,
        })
      } else if (age > 30) {
        checks.push({
          id: 'issued',
          label: 'Issue date (30 days)',
          status: 'fail',
          detail: `Issued ${printed} (${age} days ago). Certificate must be received within 30 days of issue date.`,
        })
      } else {
        const ago =
          age <= 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`
        checks.push({
          id: 'issued',
          label: 'Issue date (30 days)',
          status: 'pass',
          detail: `Issued ${printed} (${ago}).`,
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
    const gl = fillGlLimits(args.ai?.gl || emptyBox(), args.text)
    const cglOk = gl.commercialCgl === true || hay.includes('commercial general liability')
    const occurrenceOk = gl.occurrence === true || hayHas(hay, 'occurrence')
    const claimsMade = gl.claimsMade === true

    checks.push({
      id: 'gl-boxes',
      label: 'GL coverage',
      status: cglOk && occurrenceOk && !claimsMade ? 'pass' : 'fail',
      detail:
        cglOk && occurrenceOk && !claimsMade
          ? 'Commercial General Liability and Occurrence are marked.'
          : 'Missing Commercial General Liability or Occurrence.',
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
    const anyAuto = auto.anyAuto === true || hay.includes('any auto')
    const hired = auto.hiredAutos === true || hay.includes('hired auto')
    const scheduled = auto.scheduledAutos === true || hay.includes('scheduled auto')
    const nonOwned = auto.nonOwnedAutos === true || /non[-\s]?owned auto/.test(hay)

    // "Any Auto" is the broadest coverage — it includes hired, scheduled, and
    // non-owned autos, so those boxes are not circled separately on the form.
    const missingBoxes: string[] = []
    if (!anyAuto) {
      if (!scheduled) missingBoxes.push('Scheduled Autos')
      if (!hired) missingBoxes.push('Hired Autos')
      if (!nonOwned) missingBoxes.push('Non-Owned Autos')
    }

    if (autoPresent) {
      checks.push({
        id: 'auto-boxes',
        label: 'Auto coverage',
        status: missingBoxes.length === 0 ? 'pass' : 'fail',
        detail:
          missingBoxes.length === 0
            ? anyAuto
              ? 'Any Auto is marked, which covers hired, scheduled, and non-owned autos.'
              : 'Hired, Scheduled, and Non-Owned autos are marked.'
            : `Missing auto boxes: ${missingBoxes.join(', ')}.`,
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
    effectiveDate: acordDates.effectiveDate,
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
  let renderedImageUrl: string | null = null
  let fileError: string | null = null
  if (url) {
    if (ext === 'pdf' || !ext) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer())
          if (ext === 'pdf' || (res.headers.get('content-type') || '').includes('pdf')) {
            text = await extractPdfText(buf)
            // Scanned / print-to-PDF files have no text layer. Render page 1 to an
            // image and read it with vision so fields are not hallucinated.
            if (text.length < PDF_MIN_TEXT_CHARS) {
              const png = await renderPdfFirstPageToPng(buf)
              if (png) renderedImageUrl = await uploadRenderedPdfToBlob(png)
            }
          }
        } else {
          fileError = `Could not open the file (HTTP ${res.status}). It may have been deleted or replaced.`
        }
      } catch (e) {
        console.error('Auto-verify fetch failed:', e)
        fileError = 'Could not reach the file. It may have been deleted or replaced.'
      }
    } else if (isImage) {
      try {
        let res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
        if (res.status === 405 || res.status === 501) {
          res = await fetch(url, { method: 'GET', cache: 'no-store' })
        }
        if (!res.ok) {
          fileError = `Could not open the file (HTTP ${res.status}). It may have been deleted or replaced.`
        }
      } catch (e) {
        fileError = 'Could not reach the file. It may have been deleted or replaced.'
      }
    }
  }

  if (fileError) {
    return {
      verdict: 'review',
      summary: 'This file could not be opened — it may have been deleted or replaced. Ask the installer to re-upload it.',
      claimedType,
      claimedTypeLabel: typeLabel(claimedType),
      detectedType: null,
      detectedTypeLabel: null,
      namedInsured: null,
      expiryDate: null,
      effectiveDate: null,
      issueDate: null,
      coverages: [],
      certificateHolder: null,
      autoWaived: true,
      checks: [
        {
          id: 'readable',
          label: 'File readable',
          status: 'warn',
          detail: fileError,
        },
      ],
      notes: null,
    }
  }

  const imageUrlForAi = isImage ? url : renderedImageUrl
  const canUseAi = text.length >= 40 || isImage || Boolean(renderedImageUrl)
  const [ai, dateBox] = await Promise.all([
    canUseAi
      ? analyzeWithOpenAI({
          text,
          imageUrl: imageUrlForAi,
          claimedType,
          companyName,
          personName,
        })
      : Promise.resolve(null),
    isImage && url ? readAcordDateBox(url) : Promise.resolve(null),
  ])
  if (ai && dateBox) ai.dateBoxPrinted = dateBox
  else if (dateBox && !ai) {
    return buildResult({
      claimedType,
      companyName,
      personName,
      text,
      ai: {
        detectedType: null,
        detectedTypeLabel: null,
        namedInsured: null,
        insuredAddress: null,
        expiryDate: null,
        effectiveDate: null,
        issueDate: dateBox,
        dateBoxPrinted: dateBox,
        coverages: [],
        certificateHolder: null,
        certificateHolderAddress: null,
        gl: emptyBox(),
        auto: emptyBox(),
        workersComp: emptyBox(),
        additionalInsured: null,
        primaryNoncontributory: null,
        waiverOfSubrogation: null,
        thirtyDayCancellation: null,
        signed: null,
        notes: null,
      },
    })
  }

  return buildResult({ claimedType, companyName, personName, text, ai })
}
