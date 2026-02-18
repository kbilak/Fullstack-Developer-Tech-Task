import { useApi } from '@/composables/useApi'
import type { StoreListPaginated, StoreDetail, StorePayload, StoreStatistics } from '@/types/store'
import type { ApiResult, CreateResult } from '@/types/api'

const { apiClient } = useApi()

/** Fetches a paginated list of stores with optional sorting and search. */
export async function fetchStores(
  page = 1,
  pageSize = 10,
  sort?: string,
  search?: string,
): Promise<StoreListPaginated> {
  const { data } = await apiClient.get<StoreListPaginated>('/Store', {
    params: { page, pageSize, sort, search },
  })
  return data
}

/** Fetches store details by ID. */
export async function fetchStore(id: number): Promise<StoreDetail> {
  const { data } = await apiClient.get<StoreDetail>(`/Store/${id}`)
  return data
}

/** Creates a new store. */
export async function createStore(payload: StorePayload): Promise<CreateResult> {
  const { data } = await apiClient.post<CreateResult>('/Store', payload)
  return data
}

/** Updates an existing store by ID. */
export async function updateStore(id: number, payload: StorePayload): Promise<CreateResult> {
  const { data } = await apiClient.put<CreateResult>(`/Store/${id}`, payload)
  return data
}

/** Deletes a single store by ID. */
export async function deleteStore(id: number): Promise<ApiResult> {
  const { data } = await apiClient.delete<ApiResult>(`/Store/${id}`)
  return data
}

/** Deletes multiple stores by their IDs. */
export async function deleteStores(ids: number[]): Promise<ApiResult> {
  const { data } = await apiClient.delete<ApiResult>('/Store/bulk', { data: ids })
  return data
}

/** Fetches daily visit statistics for a store within a date range. */
export async function fetchStatistics(
  storeId: number,
  startDate: string,
  endDate: string,
): Promise<StoreStatistics> {
  const { data } = await apiClient.get<StoreStatistics>(`/Store/statistics/${storeId}`, {
    params: { startDate, endDate },
  })
  return data
}
