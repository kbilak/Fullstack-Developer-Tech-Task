import type { ApiResult } from './api'

export interface EntryListItem {
  id: number
  idStore: number
  entryDate: string
  storeName: string
}

export interface StoreEntryItem {
  id: number
  entryDate: string
}

export interface EntryListPaginated extends ApiResult {
  items: EntryListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface StoreEntryListPaginated extends ApiResult {
  items: StoreEntryItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface NewEntry {
  idStore: number
  entryDate: string
}

export interface UpdateEntry {
  entryDate: string
}

export interface EntryDailyCount {
  date: string
  count: number
}

export interface EntryStoreCount {
  idStore: number
  storeName: string | null
  count: number
}

export interface EntryStatistics extends ApiResult {
  dailyCounts: EntryDailyCount[]
  storeCounts: EntryStoreCount[]
}
