import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchStores, fetchStore } from '@/services/api/storeApi'
import type { StoreListItem, StoreDetail } from '@/types/store'

/**
 * @method useStoresStore
 * @summary Store managing stores list with server-side sort, search, and page caching
 */
export const useStoresStore = defineStore('stores', () => {
  // #region STATE
  const stores = ref<StoreListItem[]>([]) // Current page of stores
  const totalRecords = ref(0) // Total store count from API (after search filter)
  const page = ref(1) // Current page number
  const pageSize = ref(10) // Items per page
  const sortField = ref<'id' | 'name'>('id') // Sort column sent to API
  const sortOrder = ref<'asc' | 'desc'>('asc') // Sort direction sent to API
  const search = ref('') // Search query sent to API
  const loading = ref(false) // Loading indicator
  const error = ref<string | null>(null) // Last error message

  const pageCache = new Map<string, { items: StoreListItem[]; totalItems: number }>() // Cached pages keyed by all query params
  const detailCache = new Map<number, StoreDetail>() // Cached store details keyed by store ID
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
      const result = await fetchStores(page.value, pageSize.value, sortParam(), searchTrimmed)
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
    const detail = await fetchStore(id)
    detailCache.set(id, detail)
    return detail
  }

  /** Optimistically removes stores from the list and adjusts totalRecords. */
  function removeStoresLocally(ids: number[]) {
    const idSet = new Set(ids)
    stores.value = stores.value.filter((s) => !idSet.has(s.id))
    totalRecords.value = Math.max(0, totalRecords.value - ids.length)
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

  /** Clears all caches and force-reloads stores from the API. */
  function invalidateAndReload() {
    pageCache.clear()
    detailCache.clear()
    loadStores(true)
  }

  /** Resets all state and caches to initial values. */
  function $reset() {
    stores.value = []
    totalRecords.value = 0
    page.value = 1
    pageSize.value = 10
    sortField.value = 'id'
    sortOrder.value = 'asc'
    search.value = ''
    loading.value = false
    error.value = null
    pageCache.clear()
    detailCache.clear()
  }
  // #endregion METHODS

  return {
    stores, totalRecords, page, pageSize, sortField, sortOrder, search, loading, error,
    loadStores, getStoreDetail, removeStoresLocally, updateStoreLocally,
    incrementEntryCount, invalidateAndReload, $reset,
  }
})
