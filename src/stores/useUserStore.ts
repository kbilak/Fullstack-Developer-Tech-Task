import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import * as realStoreApi from '@/services/api/storeApi'
import * as testStoreApi from '@/services/testStoreApi'
import * as realEntryApi from '@/services/api/entryApi'
import * as testEntryApi from '@/services/testEntryApi'

export type DataSource = 'api' | 'test'

export type ChartSort = 'desc' | null

export type EntriesSortField = 'id' | 'date' | 'store'

const STORAGE_KEY = 'user-preferences'

interface PersistedState {
  storesDataSource: DataSource
  storesChartSort: ChartSort
  storesSortField: 'id' | 'name' | 'entries'
  storesSortOrder: 'asc' | 'desc'
  entriesSortField: EntriesSortField
  entriesSortOrder: 'asc' | 'desc'
}

function loadFromStorage(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export const useUserStore = defineStore('user', () => {
  const saved = loadFromStorage()

  const storesDataSource = ref<DataSource>(saved.storesDataSource ?? 'api')
  const storesChartSort = ref<ChartSort>(saved.storesChartSort ?? null)
  const storesSortField = ref<'id' | 'name' | 'entries'>(saved.storesSortField ?? 'id')
  const storesSortOrder = ref<'asc' | 'desc'>(saved.storesSortOrder ?? 'asc')
  const entriesSortField = ref<EntriesSortField>(saved.entriesSortField ?? 'date')
  const entriesSortOrder = ref<'asc' | 'desc'>(saved.entriesSortOrder ?? 'desc')

  watch(
    [storesDataSource, storesChartSort, storesSortField, storesSortOrder, entriesSortField, entriesSortOrder],
    () => {
      const state: PersistedState = {
        storesDataSource: storesDataSource.value,
        storesChartSort: storesChartSort.value,
        storesSortField: storesSortField.value,
        storesSortOrder: storesSortOrder.value,
        entriesSortField: entriesSortField.value,
        entriesSortOrder: entriesSortOrder.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
  )

  /** Returns the correct store API module based on the active data source. */
  function storeApi() {
    return storesDataSource.value === 'test' ? testStoreApi : realStoreApi
  }

  /** Returns the correct entry API module based on the active data source. */
  function entryApi() {
    return storesDataSource.value === 'test' ? testEntryApi : realEntryApi
  }

  return {
    storesDataSource, storesChartSort, storesSortField, storesSortOrder,
    entriesSortField, entriesSortOrder,
    storeApi, entryApi,
  }
})
