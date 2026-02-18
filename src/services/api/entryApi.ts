import { useApi } from '@/composables/useApi'
import type { EntryListPaginated, StoreEntryListPaginated, NewEntry, UpdateEntry, EntryStatistics } from '@/types/entry'
import type { ApiResult } from '@/types/api'

const { apiClient } = useApi()

/** Fetches a paginated list of all entries with optional sorting, search, and filters. */
export async function fetchEntries(
  page = 1,
  pageSize = 10,
  sort?: string,
  search?: string,
  storeId?: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<EntryListPaginated> {
  const { data } = await apiClient.get<EntryListPaginated>('/Entry', {
    params: { page, pageSize, sort, search, storeId, dateFrom, dateTo },
  })
  return data
}

/** Fetches paginated entries for a specific store. */
export async function fetchEntriesByStore(
  storeId: number,
  page = 1,
  pageSize = 10,
): Promise<StoreEntryListPaginated> {
  const { data } = await apiClient.get<StoreEntryListPaginated>(
    `/Entry/store/${storeId}`,
    { params: { page, pageSize } },
  )
  return data
}

/** Creates a new entry (visit) for a store. */
export async function createEntry(payload: NewEntry): Promise<ApiResult> {
  const { data } = await apiClient.post<ApiResult>('/Entry', payload)
  return data
}

/** Updates an existing entry by ID. */
export async function updateEntry(id: number, payload: UpdateEntry): Promise<ApiResult> {
  const { data } = await apiClient.put<ApiResult>(`/Entry/${id}`, payload)
  return data
}

/** Deletes a single entry by ID. */
export async function deleteEntry(id: number): Promise<ApiResult> {
  const { data } = await apiClient.delete<ApiResult>(`/Entry/${id}`)
  return data
}

/** Deletes multiple entries by their IDs. */
export async function deleteEntries(ids: number[]): Promise<ApiResult> {
  const { data } = await apiClient.delete<ApiResult>('/Entry/bulk', { data: ids })
  return data
}

/** Fetches aggregated entry statistics (daily + per-store counts) for a date range. */
export async function fetchEntryStatistics(
  startDate: string,
  endDate: string,
): Promise<EntryStatistics> {
  const { data } = await apiClient.get<EntryStatistics>('/Entry/statistics', {
    params: { startDate, endDate },
  })
  return data
}
