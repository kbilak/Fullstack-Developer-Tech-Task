import type { ApiResult } from './api'

export interface Store {
  id: number
  name: string
  city: string
  country: string
}

export interface StoreDetail extends Store, ApiResult {}

export interface StoreList extends ApiResult {
  stores: Store[]
}

export interface StorePayload {
  name: string
  city: string
  country: string
}
