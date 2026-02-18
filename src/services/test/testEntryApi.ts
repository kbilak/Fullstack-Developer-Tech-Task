import type {
  EntryListPaginated,
  StoreEntryListPaginated,
  NewEntry,
  UpdateEntry,
  EntryStatistics,
} from '@/types/entry'
import type { ApiResult } from '@/types/api'
import { getTestEntries, testStores, testStatistics } from './testData'

/** Fetches a paginated list of test entries with optional sorting, search, and filters. */
export async function fetchEntries(
  page = 1,
  pageSize = 10,
  sort?: string,
  search?: string,
  storeId?: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<EntryListPaginated> {
  let items = [...getTestEntries()]

  // Filter by store
  if (storeId) items = items.filter((e) => e.idStore === storeId)

  // Filter by date range
  if (dateFrom) items = items.filter((e) => e.entryDate.slice(0, 10) >= dateFrom)

  if (dateTo) items = items.filter((e) => e.entryDate.slice(0, 10) <= dateTo)

  // Search by store name
  if (search) {
    const q = search.toLowerCase()
    const matchingStoreIds = new Set(
      testStores.filter((s) => s.name.toLowerCase().includes(q)).map((s) => s.id),
    )
    items = items.filter((e) => matchingStoreIds.has(e.idStore))
  }

  // Sort
  if (sort) {
    const [field, dir] = sort.split(':') as [string, 'asc' | 'desc']
    const mult = dir === 'desc' ? -1 : 1
    items.sort((a, b) => {
      let va: string | number, vb: string | number
      if (field === 'date') {
        va = a.entryDate
        vb = b.entryDate
      } else if (field === 'store') {
        va = (testStores.find((s) => s.id === a.idStore)?.name ?? '').toLowerCase()
        vb = (testStores.find((s) => s.id === b.idStore)?.name ?? '').toLowerCase()
      } else {
        va = a.id
        vb = b.id
      }
      return va < vb ? -1 * mult : va > vb ? 1 * mult : 0
    })
  }

  const totalItems = items.length
  const start = (page - 1) * pageSize
  const paged = items.slice(start, start + pageSize)

  const enriched = paged.map((e) => {
    const store = testStores.find((s) => s.id === e.idStore)
    return {
      ...e,
      storeName: store?.name ?? `Store #${e.idStore}`,
    }
  })

  return {
    items: enriched,
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    status: true,
    message: null,
  }
}

/** Fetches paginated test entries for a specific store. */
export async function fetchEntriesByStore(
  storeId: number,
  page = 1,
  pageSize = 10,
): Promise<StoreEntryListPaginated> {
  const entries = getTestEntries()
  const storeEntries = entries.filter((e) => e.idStore === storeId)
  const totalItems = storeEntries.length
  const start = (page - 1) * pageSize
  const paged = storeEntries.slice(start, start + pageSize)

  return {
    items: paged.map(({ id, entryDate }) => ({ id, entryDate })),
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    status: true,
    message: null,
  }
}

/** Creates a new test entry. */
export async function createEntry(payload: NewEntry): Promise<ApiResult> {
  const entries = getTestEntries()
  let maxId = 0
  for (const e of entries) {
    if (e.id > maxId) maxId = e.id
  }
  entries.push({ id: maxId + 1, idStore: payload.idStore, entryDate: payload.entryDate })
  return { status: true, message: null }
}

/** Updates a test entry by ID. */
export async function updateEntry(id: number, payload: UpdateEntry): Promise<ApiResult> {
  const entry = getTestEntries().find((e) => e.id === id)
  if (entry) entry.entryDate = payload.entryDate
  return { status: true, message: null }
}

/** Deletes a single test entry by ID. Returns error if entry does not exist. */
export async function deleteEntry(id: number): Promise<ApiResult> {
  const entries = getTestEntries()
  const idx = entries.findIndex((e) => e.id === id)
  if (idx === -1) return { status: false, message: `Entry with ID ${id} not found` }
  entries.splice(idx, 1)
  return { status: true, message: null }
}

/** Deletes multiple test entries by IDs. Returns error if any entry does not exist. */
export async function deleteEntries(ids: number[]): Promise<ApiResult> {
  const entries = getTestEntries()
  const existingIds = new Set(entries.map((e) => e.id))
  const missing = ids.filter((id) => !existingIds.has(id))
  if (missing.length > 0) {
    return { status: false, message: `Entries not found: ${missing.join(', ')}` }
  }
  const idSet = new Set(ids)
  for (let i = entries.length - 1; i >= 0; i--) {
    if (idSet.has(entries[i]!.id)) entries.splice(i, 1)
  }
  return { status: true, message: null }
}

/** Fetches aggregated entry statistics for a date range using pre-computed stats. */
export async function fetchEntryStatistics(
  startDate: string,
  endDate: string,
): Promise<EntryStatistics> {
  const dailyMap = new Map<string, number>()
  const storeMap = new Map<number, number>()

  for (const [storeId, stats] of testStatistics) {
    let storeTotal = 0
    for (const day of stats) {
      if (day.date >= startDate && day.date <= endDate) {
        dailyMap.set(day.date, (dailyMap.get(day.date) ?? 0) + day.count)
        storeTotal += day.count
      }
    }
    if (storeTotal > 0) storeMap.set(storeId, storeTotal)
  }

  const dailyCounts = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  const storeCounts = [...storeMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([idStore, count]) => ({
      idStore,
      storeName: testStores.find((s) => s.id === idStore)?.name ?? null,
      count,
    }))

  return {
    dailyCounts,
    storeCounts,
    status: true,
    message: null,
  }
}
