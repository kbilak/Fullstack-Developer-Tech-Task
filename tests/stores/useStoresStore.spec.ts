import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStoresStore } from '@/stores/useStoresStore'
import { useUserStore } from '@/stores/useUserStore'


describe('useStoresStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    // Set to test data source so API calls use the mock
    const userStore = useUserStore()
    userStore.storesDataSource = 'test'
  })

  // #region loadStores
  describe('loadStores', () => {
    it('loads stores from API and updates state', async () => {
      const store = useStoresStore()

      await store.loadStores()

      expect(store.stores.length).toBeGreaterThan(0)
      expect(store.totalRecords).toBeGreaterThan(0)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('respects page and pageSize', async () => {
      const store = useStoresStore()
      store.pageSize = 3

      await store.loadStores()

      expect(store.stores.length).toBeLessThanOrEqual(3)
    })

    it('serves from cache on second call', async () => {
      const store = useStoresStore()
      const userStore = useUserStore()

      const spy = vi.spyOn(userStore.storeApi(), 'fetchStores')

      await store.loadStores()
      await store.loadStores() // second call should hit cache

      expect(spy).toHaveBeenCalledTimes(1)
      spy.mockRestore()
    })

    it('skips cache when force=true', async () => {
      const store = useStoresStore()
      const userStore = useUserStore()

      const spy = vi.spyOn(userStore.storeApi(), 'fetchStores')

      await store.loadStores()
      await store.loadStores(true) // force reload

      expect(spy).toHaveBeenCalledTimes(2)
      spy.mockRestore()
    })

    it('sets error on API failure', async () => {
      const store = useStoresStore()
      const userStore = useUserStore()

      vi.spyOn(userStore.storeApi(), 'fetchStores').mockRejectedValueOnce(new Error('Network error'))

      await store.loadStores(true)

      expect(store.error).toBe('Network error')
      expect(store.loading).toBe(false)
    })
  })
  // #endregion loadStores

  // #region removeStoresLocally
  describe('removeStoresLocally', () => {
    it('removes stores by ids from current list', async () => {
      const store = useStoresStore()
      await store.loadStores()

      const toRemove = store.stores.slice(0, 2).map((s) => s.id)
      const beforeTotal = store.totalRecords
      const beforeLength = store.stores.length

      store.removeStoresLocally(toRemove)

      expect(store.stores.length).toBe(beforeLength - 2)
      expect(store.totalRecords).toBe(beforeTotal - 2)
      expect(store.stores.find((s) => toRemove.includes(s.id))).toBeUndefined()
    })

    it('handles empty id array gracefully', async () => {
      const store = useStoresStore()
      await store.loadStores()

      const before = store.stores.length
      store.removeStoresLocally([])

      expect(store.stores.length).toBe(before)
    })

    it('handles non-existent ids gracefully', async () => {
      const store = useStoresStore()
      await store.loadStores()

      const beforeLength = store.stores.length
      const beforeTotal = store.totalRecords
      store.removeStoresLocally([99999])

      // List unchanged — id doesn't exist in loaded page
      expect(store.stores.length).toBe(beforeLength)
      // totalRecords unchanged — only actually removed items are decremented
      expect(store.totalRecords).toBe(beforeTotal)
    })
  })
  // #endregion removeStoresLocally

  // #region updateStoreLocally
  describe('updateStoreLocally', () => {
    it('patches store name in current list', async () => {
      const store = useStoresStore()
      await store.loadStores()

      const target = store.stores[0]!
      store.updateStoreLocally(target.id, { name: 'Updated Name' })

      expect(store.stores.find((s) => s.id === target.id)?.name).toBe('Updated Name')
    })

    it('does nothing for non-existent id', async () => {
      const store = useStoresStore()
      await store.loadStores()

      const namesBefore = store.stores.map((s) => s.name)
      store.updateStoreLocally(99999, { name: 'Ghost' })

      expect(store.stores.map((s) => s.name)).toEqual(namesBefore)
    })
  })
  // #endregion updateStoreLocally

  // #region incrementEntryCount
  describe('incrementEntryCount', () => {
    it('increments entry count for a store', async () => {
      const store = useStoresStore()
      await store.loadStores()

      const target = store.stores[0]!
      const before = target.entryCount

      store.incrementEntryCount(target.id)

      expect(store.stores.find((s) => s.id === target.id)?.entryCount).toBe(before + 1)
    })
  })
  // #endregion incrementEntryCount

  // #region $reset
  describe('$reset', () => {
    it('resets all state to defaults', async () => {
      const store = useStoresStore()
      await store.loadStores()

      // Verify state is non-default
      expect(store.stores.length).toBeGreaterThan(0)

      store.$reset()

      expect(store.stores).toEqual([])
      expect(store.totalRecords).toBe(0)
      expect(store.page).toBe(1)
      expect(store.pageSize).toBe(10)
      expect(store.search).toBe('')
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })
  })
  // #endregion $reset

  // #region invalidateAndReload
  describe('invalidateAndReload', () => {
    it('clears cache and reloads', async () => {
      const store = useStoresStore()
      const userStore = useUserStore()

      await store.loadStores()
      const spy = vi.spyOn(userStore.storeApi(), 'fetchStores')

      store.invalidateAndReload()
      // Wait for the async reload
      await new Promise((r) => setTimeout(r, 50))

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })
  // #endregion invalidateAndReload
})
