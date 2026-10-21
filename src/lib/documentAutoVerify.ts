export type AutoVerifyVerdict = 'match' | 'review' | 'mismatch'

export type AutoVerifyCheck = {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

export type AutoVerifyResult = {
  verdict: AutoVerifyVerdict
  summary: string
  claimedType: string
  claimedTypeLabel: string
  detectedType: string | null
  detectedTypeLabel: string | null
  namedInsured: string | null
  expiryDate: string | null
  effectiveDate: string | null
  coverages: string[]
  certificateHolder: string | null
  checks: AutoVerifyCheck[]
  notes: string | null
}

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

function typeLabel(type: string): string {
  return TYPE_LABELS[type] || type.replace(/_/g, ' ')
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
}): Promise<{
  detectedType: string | null
  detectedTypeLabel: string | null
  namedInsured: string | null
  expiryDate: string | null
  effectiveDate: string | null
  coverages: string[]
  certificateHolder: string | null
  notes: string | null
} | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') return null

  const userText = [
    `Claimed upload type: ${typeLabel(args.claimedType)} (${args.claimedType})`,
    `Installer company: ${args.companyName || '(none)'}`,
    `Installer name: ${args.personName || '(none)'}`,
    args.text
      ? `Document text (truncated):\n${args.text.slice(0, 12000)}`
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
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content:
              'You check subcontractor compliance files. Return ONLY JSON: {"detectedType":"liability_insurance|auto_insurance|workers_comp|workers_comp_certificate|business_registration|sunbiz|w9|lrrp|lead_firm_certificate|employers_liability|other","detectedTypeLabel":string,"namedInsured":string|null,"expiryDate":"YYYY-MM-DD"|null,"effectiveDate":"YYYY-MM-DD"|null,"coverages":string[],"certificateHolder":string|null,"notes":string}. Prefer policy expiration / valid until over effective date. If several policies, use the coverage that matches the claimed type.',
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
      detectedTypeLabel: typeof obj.detectedTypeLabel === 'string' ? obj.detectedTypeLabel : detectedType ? typeLabel(detectedType) : null,
      namedInsured: typeof obj.namedInsured === 'string' && obj.namedInsured.trim() ? obj.namedInsured.trim() : null,
      expiryDate: pickIsoDate(obj.expiryDate),
      effectiveDate: pickIsoDate(obj.effectiveDate),
      coverages: Array.isArray(obj.coverages)
        ? obj.coverages.map((c: unknown) => String(c || '').trim()).filter(Boolean).slice(0, 8)
        : [],
      certificateHolder:
        typeof obj.certificateHolder === 'string' && obj.certificateHolder.trim()
          ? obj.certificateHolder.trim()
          : null,
      notes: typeof obj.notes === 'string' && obj.notes.trim() ? obj.notes.trim() : null,
    }
  } catch (e) {
    console.error('Auto-verify OpenAI parse failed:', e)
    return null
  }
}

function buildResult(args: {
  claimedType: string
  companyName: string
  personName: string
  text: string
  ai: Awaited<ReturnType<typeof analyzeWithOpenAI>>
}): AutoVerifyResult {
  const claimedType = args.claimedType || ''
  const heuristic = args.text ? detectTypeFromText(args.text) : null
  const detectedType = args.ai?.detectedType || heuristic?.type || null
  const detectedTypeLabel = args.ai?.detectedTypeLabel || (detectedType ? typeLabel(detectedType) : heuristic?.label) || null
  const namedInsured = args.ai?.namedInsured || null
  const expiryDate = args.ai?.expiryDate || null
  const checks: AutoVerifyCheck[] = []

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

  const holder = args.ai?.certificateHolder || null
  if (holder) {
    const ours = /floor\s*interior/i.test(holder) || /\bfis\b/i.test(holder)
    checks.push({
      id: 'holder',
      label: 'Certificate holder',
      status: ours ? 'pass' : 'warn',
      detail: ours
        ? `Certificate holder looks like Floor Interior Services (${holder}).`
        : `Certificate holder reads ${holder}. Confirm they listed FIS if this is a COI.`,
    })
  }

  const failCount = checks.filter((c) => c.status === 'fail').length
  const warnCount = checks.filter((c) => c.status === 'warn').length
  let verdict: AutoVerifyVerdict = 'review'
  if (failCount > 0) verdict = 'mismatch'
  else if (warnCount === 0 && checks.some((c) => c.id === 'type' && c.status === 'pass')) verdict = 'match'
  else verdict = 'review'

  const summary =
    verdict === 'match'
      ? 'Looks like the right document. Still open it if anything feels off.'
      : verdict === 'mismatch'
        ? 'This does not look like the right file. Reject or send a correction.'
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
    coverages: args.ai?.coverages || [],
    certificateHolder: holder,
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
