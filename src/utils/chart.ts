/** Returns a hex color based on value's position in min–max range (red → amber → blue → emerald). */
export function entryColor(count: number, min: number, max: number): string {
  if (count === 0) return '#9ca3af'
  if (min === max) return '#059669'
  const ratio = (count - min) / (max - min)
  if (ratio <= 0.25) return '#dc2626'
  if (ratio <= 0.5) return '#d97706'
  if (ratio <= 0.75) return '#2563eb'
  return '#059669'
}

/** Returns Tailwind badge classes based on value's position in min–max range. */
export function entryBadgeClasses(count: number, min: number, max: number): string {
  if (count === 0) return 'bg-gray-100 text-gray-500'
  if (min === max) return 'bg-emerald-50 text-emerald-600'
  const ratio = (count - min) / (max - min)
  if (ratio <= 0.25) return 'bg-red-50 text-red-600'
  if (ratio <= 0.5) return 'bg-amber-50 text-amber-600'
  if (ratio <= 0.75) return 'bg-blue-50 text-blue-600'
  return 'bg-emerald-50 text-emerald-600'
}

/** Palette for multi-series charts. */
export const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7',
  '#84cc16', '#e11d48',
]

/** Creates dual sparkline chart data (current vs previous period). */
export function makeDualSparkline(current: number[], previous: number[], color: string) {
  return {
    labels: current.map((_, i) => String(i)),
    datasets: [
      {
        data: current,
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
      },
      {
        data: previous,
        borderColor: '#9ca3af',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        tension: 0.4,
        fill: false,
      },
    ],
  }
}
