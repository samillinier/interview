export type WeeklyReportLine = {
  poNumber: string
  customer: string
  date: string
  mileage: string
  total: string
}

export function emptyWeeklyReportLine(): WeeklyReportLine {
  return { poNumber: '', customer: '', date: '', mileage: '', total: '' }
}

export function normalizeWeeklyReportLines(value: unknown): WeeklyReportLine[] {
  if (!Array.isArray(value)) return [emptyWeeklyReportLine()]
  const lines = value
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const r = row as Record<string, unknown>
      return {
        poNumber: String(r.poNumber ?? '').trim(),
        customer: String(r.customer ?? '').trim(),
        date: String(r.date ?? '').trim(),
        mileage: String(r.mileage ?? '').trim(),
        total: String(r.total ?? '').trim(),
      } satisfies WeeklyReportLine
    })
    .filter((row): row is WeeklyReportLine => Boolean(row))

  return lines.length > 0 ? lines : [emptyWeeklyReportLine()]
}

export function weekEndingToInputValue(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function parseWeekEnding(value: unknown): Date | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00.000Z`)
  return Number.isFinite(d.getTime()) ? d : null
}
