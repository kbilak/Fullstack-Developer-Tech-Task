/** Formats a Date as YYYY-MM-DD in local timezone. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns today's date as YYYY-MM-DD. */
export function today(): string {
  return toISODate(new Date())
}

/** Returns a date N days ago as YYYY-MM-DD. */
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISODate(d)
}

/** Formats ISO date string as short date (e.g. "05 Feb"). */
export function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

/** Formats an ISO datetime string for display (e.g. "05 Feb 2026, 14:30"). */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Returns a default date range: [30 days ago, today] as Date objects. */
export function defaultDateRange(): [Date, Date] {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return [start, end]
}

/** Fills gaps in daily data so every day in [startDate, endDate] has a data point (0 if missing). */
export function fillDailyGaps(
  stats: { date: string; count: number }[],
  startDate: string,
  endDate: string,
): { date: string; count: number }[] {
  const map = new Map(stats.map((s) => [s.date.slice(0, 10), s.count]))
  const result: { date: string; count: number }[] = []
  const current = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  while (current <= end) {
    const key = toISODate(current)
    result.push({ date: key, count: map.get(key) ?? 0 })
    current.setDate(current.getDate() + 1)
  }
  return result
}
