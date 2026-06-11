import * as XLSX from 'xlsx'

export type ParsedLtrRow = {
  region: string | null
  laborCategory: string | null
  surveyComment: string | null
  surveyDate: Date | null
  poNumber: string | null
  woNumber: string | null
  ltrScore: number | null
  company: string | null
  installer: string | null
  customer: string | null
  workroom: string | null
  storeName: string | null
  craftScore: number | null
  professionalScore: number | null
  homeImprovementScore: number | null
  projectValueScore: number | null
  installerKnowledgeScore: number | null
  timeTaken: string | null
}

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).trim()
}

function normHeader(v: unknown): string {
  return cellStr(v).replace(/\s+/g, ' ').toLowerCase()
}

/** Match header label to canonical field (first row of sheet). */
function mapHeaderToKey(h: string): keyof ParsedLtrRow | null {
  const n = normHeader(h)
  if (!n) return null
  if (n === 'region' || n.startsWith('region ')) return 'region'
  if (n.includes('labor') && n.includes('categor')) return 'laborCategory'
  if (n.includes('survey') && n.includes('comment')) return 'surveyComment'
  if (n.includes('survey') && n.includes('date')) return 'surveyDate'
  if (n.includes('po number') || n.includes('po#') || n === 'po') return 'poNumber'
  if (n.includes('wo number') || n.includes('wo #') || (n.includes('wo') && n.includes('sfi'))) return 'woNumber'
  if (n.includes('ltr') && (n.includes('score') || n.includes('rating'))) return 'ltrScore'
  if (n.includes('store') && n.includes('name')) return 'storeName'
  if (n === 'store' || n === 'store location') return 'storeName'
  if (n.includes('craft') && (n.includes('score') || n.includes('rating') || n.includes('manship'))) return 'craftScore'
  if (n.includes('professional') && (n.includes('score') || n.includes('rating'))) return 'professionalScore'
  if (n.includes('prof') && n.includes('score') && !n.includes('professional')) return 'professionalScore'
  if (n === 'prof score' || n === 'prof. score') return 'professionalScore'
  if (n.includes('home') && n.includes('improvement')) return 'homeImprovementScore'
  if (n.includes('project') && n.includes('value')) return 'projectValueScore'
  if (n.includes('installer') && n.includes('knowledge')) return 'installerKnowledgeScore'
  if (n.includes('time taken') || n.includes('days to complete') || (n.includes('time') && n.includes('complete')))
    return 'timeTaken'
  if (n === 'company' || n.includes('company name')) return 'company'
  if (n === 'installer' || (n.includes('installer') && n.includes('name'))) return 'installer'
  if (n === 'customer' || n.includes('customer name')) return 'customer'
  if (n === 'workroom' || n.includes('work room')) return 'workroom'
  return null
}

/** Known Lowe's-style export: columns A, G, H, I, J, K, L, T, U, V, W (0-based indices). */
const FALLBACK_COL_MAP: Partial<Record<keyof ParsedLtrRow, number>> = {
  region: 0,
  laborCategory: 6,
  surveyComment: 7,
  surveyDate: 8,
  poNumber: 9,
  woNumber: 10,
  ltrScore: 11,
  company: 19,
  installer: 20,
  customer: 21,
  workroom: 22,
}

function parseLtrScore(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  const s = String(v).trim()
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

function parseSurveyDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date && !isNaN(v.getTime())) {
    const d = new Date(v)
    d.setUTCHours(12, 0, 0, 0)
    return d
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    try {
      const d = (XLSX as unknown as { SSF?: { parse_date_code?: (n: number) => { y: number; m: number; d: number } | null } })
        .SSF?.parse_date_code?.(v)
      if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d))
    } catch {
      // ignore
    }
  }
  const s = String(v).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const y = parseInt(m[1], 10)
    const mo = parseInt(m[2], 10) - 1
    const day = parseInt(m[3], 10)
    const d = new Date(Date.UTC(y, mo, day, 12, 0, 0, 0))
    return isNaN(d.getTime()) ? null : d
  }
  const tryDate = new Date(s)
  return isNaN(tryDate.getTime()) ? null : tryDate
}

function rowToParsed(row: unknown[], colIndex: Partial<Record<keyof ParsedLtrRow, number>>): ParsedLtrRow {
  const raw = (k: keyof ParsedLtrRow) => {
    const i = colIndex[k]
    if (i === undefined || i < 0) return undefined
    return row[i]
  }
  return {
    region: cellStr(raw('region')) || null,
    laborCategory: cellStr(raw('laborCategory')) || null,
    surveyComment: cellStr(raw('surveyComment')) || null,
    surveyDate: parseSurveyDate(raw('surveyDate')),
    poNumber: cellStr(raw('poNumber')) || null,
    woNumber: cellStr(raw('woNumber')) || null,
    ltrScore: parseLtrScore(raw('ltrScore')),
    company: cellStr(raw('company')) || null,
    installer: cellStr(raw('installer')) || null,
    customer: cellStr(raw('customer')) || null,
    workroom: cellStr(raw('workroom')) || null,
    storeName: cellStr(raw('storeName')) || null,
    craftScore: parseLtrScore(raw('craftScore')),
    professionalScore: parseLtrScore(raw('professionalScore')),
    homeImprovementScore: parseLtrScore(raw('homeImprovementScore')),
    projectValueScore: parseLtrScore(raw('projectValueScore')),
    installerKnowledgeScore: parseLtrScore(raw('installerKnowledgeScore')),
    timeTaken: cellStr(raw('timeTaken')) || null,
  }
}

function scoreHeaderRow(row: unknown[]): number {
  let score = 0
  for (const c of row) {
    const n = normHeader(c)
    if (n.includes('workroom')) score += 3
    if (n.includes('ltr') && n.includes('score')) score += 3
    if (n.includes('survey') && n.includes('comment')) score += 2
    if (n.includes('company') && !n.includes('customer')) score += 1
    if (n.includes('installer')) score += 1
    if (n.includes('customer')) score += 1
    if (n.includes('survey') && n.includes('date')) score += 1
    if (n.includes('store') && n.includes('name')) score += 1
    if (n.includes('craft') && n.includes('score')) score += 1
    if (n.includes('professional') && n.includes('score')) score += 1
  }
  return score
}

function buildColMapFromHeader(headerRow: unknown[]): Partial<Record<keyof ParsedLtrRow, number>> {
  const map: Partial<Record<keyof ParsedLtrRow, number>> = {}
  headerRow.forEach((cell, index) => {
    const key = mapHeaderToKey(cellStr(cell))
    if (key && map[key] === undefined) map[key] = index
  })
  return map
}

function mergeWithFallback(map: Partial<Record<keyof ParsedLtrRow, number>>): Partial<Record<keyof ParsedLtrRow, number>> {
  const out: Partial<Record<keyof ParsedLtrRow, number>> = { ...map }
  for (const k of Object.keys(FALLBACK_COL_MAP) as (keyof ParsedLtrRow)[]) {
    if (out[k] === undefined) out[k] = FALLBACK_COL_MAP[k]
  }
  return out
}

export function parseLtrWorkbook(buffer: ArrayBuffer): ParsedLtrRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][]

  if (rows.length === 0) return []

  let headerIdx = 0
  let bestScore = scoreHeaderRow(rows[0] || [])
  for (let i = 1; i < Math.min(5, rows.length); i++) {
    const s = scoreHeaderRow(rows[i] || [])
    if (s > bestScore) {
      bestScore = s
      headerIdx = i
    }
  }

  const headerRow = rows[headerIdx] || []
  let colMap = buildColMapFromHeader(headerRow)
  const keysFound = Object.keys(colMap).length
  if (keysFound < 4) {
    colMap = mergeWithFallback(colMap)
  } else {
    colMap = mergeWithFallback(colMap)
  }

  const dataRows = rows.slice(headerIdx + 1)
  const parsed: ParsedLtrRow[] = []

  for (const row of dataRows) {
    if (!Array.isArray(row) || row.length === 0) continue
    const padded = [...row]
    const rec = rowToParsed(padded, colMap)
    const hasAny =
      rec.workroom ||
      rec.company ||
      rec.installer ||
      rec.customer ||
      rec.surveyComment ||
      rec.poNumber ||
      rec.laborCategory ||
      rec.storeName ||
      rec.ltrScore != null
    if (!hasAny) continue
    parsed.push(rec)
  }

  return parsed
}
