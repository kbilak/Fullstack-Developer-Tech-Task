import type { ApiResult } from './api'
import type { Store } from './store'

export interface DailyStatistic {
  date: string
  count: number
}

export interface StoreStatistics extends Store, ApiResult {
  statistics: DailyStatistic[]
}
