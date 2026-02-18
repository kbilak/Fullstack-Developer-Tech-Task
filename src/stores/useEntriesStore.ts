import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useUserStore } from './useUserStore'
import type { EntryListItem } from '@/types/entry'
import type { EntriesSortField } from './useUserStore'

/**
 * @method useEntriesStore
 * @summary Store managing entries list with server-side sort, search, and page caching
 */
export const useEntriesStore = defineStore('entries', () => {
  const userStore = useUserStore()

  // #region STATE
  const entries = ref<EntryListItem[]>([])
  const totalRecords = ref(0)
  const page = ref(1)
  const pageSize = ref(10)
  const sortField = computed<EntriesSortField>({ get: () => userStore.entriesSortField, set: (v) => { userStore.entriesSortField = v } })
  const sortOrder = computed({ get: () => userStore.entriesSortOrder, set: (v) => { userStore.entriesSortOrder = v } })
  const search = ref('')
  const storeId = ref<number | null>(null)
  const dateFrom = ref<string | null>(null)
  const dateTo = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const pageCache = new Map<string, { items: EntryListItem[]; totalItems: number }>()
  // #endregion STATE

  // #region HELPERS
  function cacheKey(): string {
    return `${page.value}-${pageSize.value}-${sortField.value}:${sortOrder.value}-${search.value.trim().toLowerCase()}-s${storeId.value ?? ''}-${dateFrom.value ?? ''}-${dateTo.value ?? ''}`
  }

  function sortParam(): string {
    return `${sortField.value}:${sortOrder.value}`
  }
  // #endregion HELPERS

  // #region METHODS
  /** Loads entries for the current page; serves from cache unless `force` is true. */
  async function loadEntries(force = false) {
    const key = cacheKey()

    if (!force && pageCache.has(key)) {
      const cached = pageCache.get(key)!
      entries.value = cached.items
      totalRecords.value = cached.totalItems
      return
    }

    loading.value = true
    error.value = null
    try {
      const searchTrimmed = search.value.trim() || undefined
      const result = await userStore.entryApi().fetchEntries(
        page.value, pageSize.value, sortParam(), searchTrimmed,
        storeId.value ?? undefined, dateFrom.value ?? undefined, dateTo.value ?? undefined,
      )
      entries.value = result.items
      totalRecords.value = result.totalItems
      pageCache.set(key, { items: result.items, totalItems: result.totalItems })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load entries'
    } finally {
      loading.value = false
    }
  }

  /** Optimistically removes entries from the list and adjusts totalRecords. */
  function removeEntriesLocally(ids: number[]) {
    const idSet = new Set(ids)
    entries.value = entries.value.filter((e) => !idSet.has(e.id))
    totalRecords.value = Math.max(0, totalRecords.value - ids.length)
    pageCache.clear()
  }

  /** Optimistically updates an entry's date in the current list. */
  function updateEntryLocally(id: number, data: { entryDate: string }) {
    const entry = entries.value.find((e) => e.id === id)
    if (entry) entry.entryDate = data.entryDate
    pageCache.clear()
  }

  /** Clears all caches and force-reloads entries from the API. */
  function invalidateAndReload() {
    pageCache.clear()
    loadEntries(true)
  }

  /** Resets all state and caches to initial values. */
  function $reset() {
    entries.value = []
    totalRecords.value = 0
    page.value = 1
    pageSize.value = 10
    search.value = ''
    storeId.value = null
    dateFrom.value = null
    dateTo.value = null
    loading.value = false
    error.value = null
    pageCache.clear()
  }
  // #endregion METHODS

  return {
    entries, totalRecords, page, pageSize, sortField, sortOrder, search,
    storeId, dateFrom, dateTo, loading, error,
    loadEntries, removeEntriesLocally, updateEntryLocally, invalidateAndReload, $reset,
  }
})
