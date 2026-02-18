import type { ApiResult } from './api'

/** Store summary as returned by the paginated list endpoint (includes aggregated entry count). */
export interface StoreListItem {
  id: number
  name: string
  entryCount: number
}

/** Core store fields shared by detail and statistics responses. */
export interface Store {
  id: number
  name: string
  city: string
  country: string
}

/** Full store detail returned by GET /Store/:id. */
export interface StoreDetail extends Store, ApiResult {}

/** Paginated response for the stores list (GET /Store). */
export interface StoreListPaginated extends ApiResult {
  items: StoreListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/** Payload for creating or updating a store (POST/PUT /Store). */
export interface StorePayload {
  name: string
  city: string
  country: string
}
