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

  // today (default)
  const from = zonedLocalToUtc(today.year, today.month, today.day, 0, 0, 0, timeZone)
  return { from: from.toISOString(), to: now.toISOString() }
}
