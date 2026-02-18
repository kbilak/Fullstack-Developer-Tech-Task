import type { DailyStatistic } from '@/types/store'

/** Simple seeded PRNG for deterministic data. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/** Formats a Date as YYYY-MM-DD in local timezone. */
function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Generates daily entry counts for a store from Jan 1 up to today. */
function generateDailyStats(storeId: number, min: number, max: number): DailyStatistic[] {
  const stats: DailyStatistic[] = []
  const current = new Date(2026, 0, 1) // Jan 1, 2026 local midnight
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // today local midnight
  let day = 0
  while (current <= end) {
    const count = Math.round(min + seededRandom(storeId * 1000 + day) * (max - min))
    stats.push({ date: toLocalDate(current), count })
    current.setDate(current.getDate() + 1)
    day++
  }
  return stats
}

const baseStores = [
  { id: 1, name: 'Urban Market Tokyo', city: 'Tokyo', country: 'Japan' },
  { id: 2, name: 'Downtown Store NYC', city: 'New York', country: 'USA' },
  { id: 3, name: 'City Center Berlin', city: 'Berlin', country: 'Germany' },
  { id: 4, name: 'Sydney Harbor Shop', city: 'Sydney', country: 'Australia' },
  { id: 5, name: 'London Bridge Market', city: 'London', country: 'UK' },
  { id: 6, name: 'Galeria Krakowska', city: 'Kraków', country: 'Poland' },
  { id: 7, name: 'Shibuya Express', city: 'Osaka', country: 'Japan' },
  { id: 8, name: 'Maple Leaf Store', city: 'Toronto', country: 'Canada' },
  { id: 9, name: 'Champs-Élysées Shop', city: 'Paris', country: 'France' },
  { id: 10, name: 'Piazza Grande', city: 'Rome', country: 'Italy' },
  { id: 11, name: 'Nordic Mart', city: 'Stockholm', country: 'Sweden' },
  { id: 12, name: 'Bazar de Lisboa', city: 'Lisbon', country: 'Portugal' },
]

// Traffic patterns per store (80–800 entries per day)
const patterns = [
  { min: 400, max: 800 },
  { min: 300, max: 700 },
  { min: 200, max: 500 },
  { min: 150, max: 400 },
  { min: 80, max: 250 },
  { min: 250, max: 600 },
  { min: 350, max: 750 },
  { min: 100, max: 350 },
  { min: 280, max: 650 },
  { min: 180, max: 450 },
  { min: 80, max: 200 },
  { min: 220, max: 550 },
]

/** Pre-computed statistics per store ID. */
export const testStatistics = new Map<number, DailyStatistic[]>(
  baseStores.map((s, i) => [s.id, generateDailyStats(s.id, patterns[i]!.min, patterns[i]!.max)]),
)

/** Test stores with aggregated entry counts. */
export const testStores = baseStores.map((s) => ({
  ...s,
  entryCount: testStatistics.get(s.id)!.reduce((sum, d) => sum + d.count, 0),
}))

/** Generates individual test entries matching daily statistics counts. */
function generateTestEntries(): { id: number; idStore: number; entryDate: string }[] {
  const entries: { id: number; idStore: number; entryDate: string }[] = []
  let id = 1
  for (const store of baseStores) {
    const stats = testStatistics.get(store.id)!
    for (const day of stats) {
      for (let i = 0; i < day.count; i++) {
        const h = Math.floor(seededRandom(id * 7) * 14) + 7 // 07:00–20:59
        const m = Math.floor(seededRandom(id * 13) * 60)
        const s = Math.floor(seededRandom(id * 19) * 60)
        entries.push({
          id: id++,
          idStore: store.id,
          entryDate: `${day.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
        })
      }
    }
  }
  return entries
}

/** Mutable array of test entries (modified by testEntryApi CRUD operations). */
export const testEntries = generateTestEntries()
