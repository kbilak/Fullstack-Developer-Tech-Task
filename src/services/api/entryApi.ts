import { useApi } from '@/composables/useApi'
import type { EntryListPaginated, StoreEntryListPaginated, NewEntry } from '@/types/entry'
import type { ApiResult } from '@/types/api'

const { apiClient } = useApi()

/** Fetches a paginated list of all entries. */
export async function fetchEntries(page = 1, pageSize = 10): Promise<EntryListPaginated> {
  const { data } = await apiClient.get<EntryListPaginated>('/Entry', {
    params: { page, pageSize },
  })
  return data
}

/** Fetches paginated entries for a specific store. */
export async function fetchEntriesByStore(
  storeId: number,
  page = 1,
  pageSize = 1,
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
