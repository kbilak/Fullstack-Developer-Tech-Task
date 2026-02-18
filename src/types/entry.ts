import type { ApiResult } from './api'

/** Single entry (store visit) as returned by the paginated list endpoint. */
export interface EntryListItem {
  id: number
  idStore: number
  entryDate: string
  storeName: string
}

/** Entry belonging to a specific store (used by the per-store entries endpoint). */
export interface StoreEntryItem {
  id: number
  entryDate: string
}

/** Paginated response for the global entries list (GET /Entry). */
export interface EntryListPaginated extends ApiResult {
  items: EntryListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/** Paginated response for per-store entries (GET /Entry/store/:id). */
export interface StoreEntryListPaginated extends ApiResult {
  items: StoreEntryItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/** Payload for creating a new entry (POST /Entry). */
export interface NewEntry {
  idStore: number
  entryDate: string
}

/** Payload for updating an existing entry (PUT /Entry/:id). */
export interface UpdateEntry {
  entryDate: string
}

/** Single day's entry count — used in statistics charts and sparklines. */
export interface EntryDailyCount {
  date: string
  count: number
}

/** Aggregated entry count per store — used in the "By Store" doughnut chart. */
export interface EntryStoreCount {
  idStore: number
  storeName: string | null
  count: number
}

/** Response from the entry statistics endpoint (GET /Entry/statistics). */
export interface EntryStatistics extends ApiResult {
  dailyCounts: EntryDailyCount[]
  storeCounts: EntryStoreCount[]
}
