import type { ApiResult } from './api'

export interface StoreListItem {
  id: number
  name: string
  entryCount: number
}

export interface Store {
  id: number
  name: string
  city: string
  country: string
}

export interface StoreDetail extends Store, ApiResult {}

export interface StoreListPaginated extends ApiResult {
  items: StoreListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface StorePayload {
  name: string
  city: string
  country: string
}
