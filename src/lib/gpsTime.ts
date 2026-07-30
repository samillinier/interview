/**
 * Timezone helpers for GPS day boundaries (Florida / Eastern by default).
 */

export const GPS_TIMEZONE = process.env.GPS_TIMEZONE || 'America/New_York'

function tzParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const p = tzParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - date.getTime()
}

export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string = GPS_TIMEZONE
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second)
  utcMs -= tzOffsetMs(new Date(utcMs), timeZone)
  utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - tzOffsetMs(new Date(utcMs), timeZone)
  return new Date(utcMs)
}

function addCalendarDays(year: number, month: number, day: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1, day + delta))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseYmd(ymd: string): { year: number; month: number; day: number } | null {
  const m = YMD_RE.exec(ymd.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  // Reject invalid calendar dates (e.g. 2026-02-31)
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null
  }
  return { year, month, day }
}

/** Today's calendar date in GPS timezone as YYYY-MM-DD */
export function todayYmd(timeZone: string = GPS_TIMEZONE): string {
  const t = tzParts(new Date(), timeZone)
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
}

/**
 * Custom date-range bounds in GPS_TIMEZONE.
 * fromYmd/toYmd are inclusive calendar days (YYYY-MM-DD).
 * If `to` is today, end at now instead of 23:59:59.
 */
export function dateRangeBounds(
  fromYmd: string,
  toYmd: string,
  timeZone: string = GPS_TIMEZONE
): { from: string; to: string } | { error: string } {
  const fromParts = parseYmd(fromYmd)
  const toParts = parseYmd(toYmd)
  if (!fromParts || !toParts) return { error: 'Invalid date format (use YYYY-MM-DD)' }

  const fromStart = zonedLocalToUtc(fromParts.year, fromParts.month, fromParts.day, 0, 0, 0, timeZone)
  const toEndOfDay = zonedLocalToUtc(toParts.year, toParts.month, toParts.day, 23, 59, 59, timeZone)
  if (fromStart.getTime() > toEndOfDay.getTime()) {
    return { error: 'Start date must be on or before end date' }
  }

  const spanDays =
    (Date.UTC(toParts.year, toParts.month - 1, toParts.day) -
      Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day)) /
      86_400_000 +
    1
  if (spanDays > 31) {
    return { error: 'Date range cannot exceed 31 days' }
  }

  const now = new Date()
  const today = todayYmd(timeZone)
  const toIso =
    toYmd === today && toEndOfDay.getTime() > now.getTime()
      ? now.toISOString()
      : toEndOfDay.toISOString()

  return { from: fromStart.toISOString(), to: toIso }
}

/** Period bounds in GPS_TIMEZONE (default America/New_York) */
export function periodBounds(
  period: string,
  timeZone: string = GPS_TIMEZONE
): { from: string; to: string } {
  const now = new Date()
  const today = tzParts(now, timeZone)

  if (period === 'yesterday') {
    const y = addCalendarDays(today.year, today.month, today.day, -1)
    const from = zonedLocalToUtc(y.year, y.month, y.day, 0, 0, 0, timeZone)
    const to = zonedLocalToUtc(y.year, y.month, y.day, 23, 59, 59, timeZone)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (period === 'week') {
    const start = addCalendarDays(today.year, today.month, today.day, -6)
    const from = zonedLocalToUtc(start.year, start.month, start.day, 0, 0, 0, timeZone)
    return { from: from.toISOString(), to: now.toISOString() }
  }

  // Custom encoded period: range:YYYY-MM-DD:YYYY-MM-DD
  if (period.startsWith('range:')) {
    const parts = period.split(':')
    const fromYmd = parts[1]
    const toYmd = parts[2]
    if (fromYmd && toYmd) {
      const bounds = dateRangeBounds(fromYmd, toYmd, timeZone)
      if (!('error' in bounds)) return bounds
    }
  }

  // today (default)
  const from = zonedLocalToUtc(today.year, today.month, today.day, 0, 0, 0, timeZone)
  return { from: from.toISOString(), to: now.toISOString() }
}
