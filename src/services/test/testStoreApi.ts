import type { StoreListPaginated, StoreDetail } from '@/types/store'
import type { StoreStatistics } from '@/types/statistics'
import type { ApiResult, CreateResult } from '@/types/api'
import { testStores, testStatistics } from './testData'

/** Fetches a paginated list of test stores with optional sorting and search. */
export async function fetchStores(
  page = 1,
  pageSize = 10,
  sort?: string,
  search?: string,
): Promise<StoreListPaginated> {
  let items = [...testStores]

  // Search
  if (search) {
    const q = search.toLowerCase()
    items = items.filter((s) => s.name.toLowerCase().includes(q))
  }

  // Sort
  if (sort) {
    const [field, dir] = sort.split(':') as ['id' | 'name' | 'entries', 'asc' | 'desc']
    const mult = dir === 'desc' ? -1 : 1
    items.sort((a, b) => {
      const va = field === 'name' ? a.name.toLowerCase() : field === 'entries' ? a.entryCount : a.id
      const vb = field === 'name' ? b.name.toLowerCase() : field === 'entries' ? b.entryCount : b.id
      return va < vb ? -1 * mult : va > vb ? 1 * mult : 0
    })
  }

  const totalItems = items.length
  const start = (page - 1) * pageSize
  const paged = items.slice(start, start + pageSize)

  return {
    items: paged.map(({ id, name, entryCount }) => ({ id, name, entryCount })),
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    status: true,
    message: null,
  }
}

/** Fetches test store details by ID. */
export async function fetchStore(id: number): Promise<StoreDetail> {
  const store = testStores.find((s) => s.id === id)
  if (!store) throw new Error(`Store ${id} not found`)
  return { id: store.id, name: store.name, city: store.city, country: store.country, status: true, message: null }
}

/** Creates a new test store (no-op, returns next id). */
export async function createStore(payload: { name: string; city: string; country: string }): Promise<CreateResult> {
  const nextId = Math.max(...testStores.map((s) => s.id)) + 1
  testStores.push({ ...payload, id: nextId, entryCount: 0 })
  return { id: nextId, status: true, message: null }
}

/** Updates a test store by ID. */
export async function updateStore(id: number, payload: { name: string; city: string; country: string }): Promise<CreateResult> {
  const store = testStores.find((s) => s.id === id)
  if (store) Object.assign(store, payload)
  return { id, status: true, message: null }
}

/** Deletes a single test store by ID. Returns error if store does not exist. */
export async function deleteStore(id: number): Promise<ApiResult> {
  const idx = testStores.findIndex((s) => s.id === id)
  if (idx === -1) return { status: false, message: `Store with ID ${id} not found` }
  testStores.splice(idx, 1)
  return { status: true, message: null }
}

/** Deletes multiple test stores by IDs. Returns error if any store does not exist. */
export async function deleteStores(ids: number[]): Promise<ApiResult> {
  const existingIds = new Set(testStores.map((s) => s.id))
  const missing = ids.filter((id) => !existingIds.has(id))
  if (missing.length > 0) {
    return { status: false, message: `Stores not found: ${missing.join(', ')}` }
  }
  const idSet = new Set(ids)
  for (let i = testStores.length - 1; i >= 0; i--) {
    if (idSet.has(testStores[i]!.id)) testStores.splice(i, 1)
  }
  return { status: true, message: null }
}

/** Fetches daily statistics for a test store within a date range. */
export async function fetchStatistics(storeId: number, startDate: string, endDate: string): Promise<StoreStatistics> {
  const store = testStores.find((s) => s.id === storeId)
  if (!store) throw new Error(`Store ${storeId} not found`)

  const all = testStatistics.get(storeId) ?? []
  const statistics = all.filter((s) => s.date >= startDate && s.date <= endDate)

  return {
    id: store.id,
    name: store.name,
    city: store.city,
    country: store.country,
    statistics,
    status: true,
    message: null,
  }
}
