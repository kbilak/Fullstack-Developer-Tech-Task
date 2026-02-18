import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useUserStore } from './useUserStore'
import type { StoreListItem, StoreDetail } from '@/types/store'
import type { EntryDailyCount } from '@/types/entry'
import type { DailyStatistic } from '@/types/statistics'

export interface StoreQuickStatsCache {
  totalStoreCount: number
  allDailyCounts: EntryDailyCount[]
  topStore: { id: number; name: string; entryCount: number } | null
  topStoreDailyCounts: DailyStatistic[]
}

/** Store managing stores list with server-side sort, search, and page caching. */
export const useStoresStore = defineStore('stores', () => {
  const userStore = useUserStore()

  // #region STATE
  const stores = ref<StoreListItem[]>([])
  const totalRecords = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const sortField = computed({
    get: () => userStore.storesSortField,
    set: (v) => {
      userStore.storesSortField = v
    },
  })
  const sortOrder = computed({
    get: () => userStore.storesSortOrder,
    set: (v) => {
      userStore.storesSortOrder = v
    },
  })
  const search = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const pageCache = new Map<string, { items: StoreListItem[]; totalItems: number }>()
  const detailCache = new Map<number, StoreDetail>()
  const quickStatsCache = ref<StoreQuickStatsCache | null>(null)
  // #endregion STATE

  // #region HELPERS
  /** Builds a unique cache key from all query parameters. */
  function cacheKey(): string {
    return `${page.value}-${pageSize.value}-${sortField.value}:${sortOrder.value}-${search.value.trim().toLowerCase()}`
  }

  /** Builds the sort query string value for the API (e.g. "name:asc"). */
  function sortParam(): string {
    return `${sortField.value}:${sortOrder.value}`
  }
  // #endregion HELPERS

  // #region METHODS
  /** Loads stores for the current page; serves from cache unless `force` is true. */
  async function loadStores(force = false) {
    const key = cacheKey()

    if (!force && pageCache.has(key)) {
      const cached = pageCache.get(key)!
      stores.value = cached.items
      totalRecords.value = cached.totalItems
      return
    }

    loading.value = true
    error.value = null
    try {
      const searchTrimmed = search.value.trim() || undefined
      const result = await userStore
        .storeApi()
        .fetchStores(page.value, pageSize.value, sortParam(), searchTrimmed)
      stores.value = result.items
      totalRecords.value = result.totalItems
      pageCache.set(key, { items: result.items, totalItems: result.totalItems })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load stores'
    } finally {
      loading.value = false
    }
  }

  /** Returns store detail from cache or fetches from API. */
  async function getStoreDetail(id: number): Promise<StoreDetail> {
    if (detailCache.has(id)) return detailCache.get(id)!
    const detail = await userStore.storeApi().fetchStore(id)
    detailCache.set(id, detail)
    return detail
  }

  /** Optimistically removes stores from the list and adjusts totalRecords. */
  function removeStoresLocally(ids: number[]) {
    const idSet = new Set(ids)
    const before = stores.value.length
    stores.value = stores.value.filter((s) => !idSet.has(s.id))
    const removed = before - stores.value.length
    totalRecords.value = Math.max(0, totalRecords.value - removed)
    pageCache.clear()
    ids.forEach((id) => detailCache.delete(id))
  }

  /** Optimistically updates a store's name in the current list. */
  function updateStoreLocally(id: number, data: { name: string }) {
    const store = stores.value.find((s) => s.id === id)
    if (store) store.name = data.name
    pageCache.clear()
    detailCache.delete(id)
  }

  /** Locally increments entry count for a store after adding an entry. */
  function incrementEntryCount(storeId: number) {
    const store = stores.value.find((s) => s.id === storeId)
    if (store) store.entryCount++
    pageCache.clear()
  }

  async function invalidateAndReload() {
    pageCache.clear()
    detailCache.clear()
    await loadStores(true)
  }

  function $reset() {
    stores.value = []
    totalRecords.value = 0
    page.value = 1
    pageSize.value = 10
    search.value = ''
    loading.value = false
    error.value = null
    pageCache.clear()
    detailCache.clear()
    quickStatsCache.value = null
  }
  // #endregion METHODS

  return {
    stores,
    totalRecords,
    page,
    pageSize,
    sortField,
    sortOrder,
    search,
    loading,
    error,
    quickStatsCache,
    loadStores,
    getStoreDetail,
    removeStoresLocally,
    updateStoreLocally,
    incrementEntryCount,
    invalidateAndReload,
    $reset,
  }
})
