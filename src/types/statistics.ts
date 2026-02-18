import type { ApiResult } from './api'
import type { Store } from './store'

/** Single day's visitor count for a specific store. */
export interface DailyStatistic {
  date: string
  count: number
}

/** Response from GET /Store/statistics/:id — store info + daily entry counts for the requested date range. */
export interface StoreStatistics extends Store, ApiResult {
  statistics: DailyStatistic[]
}
