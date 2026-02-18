import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/useUserStore'

describe('useUserStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  // #region defaults
  describe('default values', () => {
    it('has correct defaults when no localStorage data', () => {
      const store = useUserStore()

      expect(store.storesDataSource).toBe('api')
      expect(store.storesChartSort).toBeNull()
      expect(store.storesSortField).toBe('id')
      expect(store.storesSortOrder).toBe('asc')
      expect(store.entriesSortField).toBe('date')
      expect(store.entriesSortOrder).toBe('desc')
    })
  })
  // #endregion defaults

  // #region API switching
  describe('storeApi / entryApi switching', () => {
    it('returns real API module when source is api', () => {
      const store = useUserStore()
      store.storesDataSource = 'api'

      const api = store.storeApi()
      expect(api).toHaveProperty('fetchStores')
      expect(api).toHaveProperty('fetchStore')
      expect(api).toHaveProperty('createStore')
    })

    it('returns test API module when source is test', () => {
      const store = useUserStore()
      store.storesDataSource = 'test'

      const api = store.storeApi()
      expect(api).toHaveProperty('fetchStores')
      expect(api).toHaveProperty('fetchStore')
      expect(api).toHaveProperty('createStore')
    })

    it('entryApi switches based on data source', () => {
      const store = useUserStore()

      store.storesDataSource = 'test'
      const testApi = store.entryApi()
      expect(testApi).toHaveProperty('fetchEntries')

      store.storesDataSource = 'api'
      const realApi = store.entryApi()
      expect(realApi).toHaveProperty('fetchEntries')
    })
  })
  // #endregion API switching

  // #region localStorage persistence
  describe('localStorage persistence', () => {
    it('persists state changes to localStorage', async () => {
      const store = useUserStore()
      store.storesDataSource = 'test'

      // Vue watchers are async, flush manually
      await new Promise((r) => setTimeout(r, 0))

      const saved = JSON.parse(localStorage.getItem('user-preferences') ?? '{}')
      expect(saved.storesDataSource).toBe('test')
    })

    it('restores state from localStorage on creation', async () => {
      // Pre-seed localStorage
      localStorage.setItem(
        'user-preferences',
        JSON.stringify({
          storesDataSource: 'test',
          storesSortField: 'name',
          storesSortOrder: 'desc',
          entriesSortField: 'store',
          entriesSortOrder: 'asc',
        }),
      )

      // Create a fresh Pinia + store
      setActivePinia(createPinia())
      const store = useUserStore()

      expect(store.storesDataSource).toBe('test')
      expect(store.storesSortField).toBe('name')
      expect(store.storesSortOrder).toBe('desc')
      expect(store.entriesSortField).toBe('store')
      expect(store.entriesSortOrder).toBe('asc')
    })

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('user-preferences', '{invalid json')

      setActivePinia(createPinia())
      const store = useUserStore()

      // Should fall back to defaults
      expect(store.storesDataSource).toBe('api')
      expect(store.storesSortField).toBe('id')
    })
  })
  // #endregion localStorage persistence

  // #region sort fields
  describe('sort field types', () => {
    it('accepts entries as store sort field', () => {
      const store = useUserStore()
      store.storesSortField = 'entries'
      expect(store.storesSortField).toBe('entries')
    })

    it('accepts all valid entries sort fields', () => {
      const store = useUserStore()

      store.entriesSortField = 'id'
      expect(store.entriesSortField).toBe('id')

      store.entriesSortField = 'date'
      expect(store.entriesSortField).toBe('date')

      store.entriesSortField = 'store'
      expect(store.entriesSortField).toBe('store')
    })
  })
  // #endregion sort fields
})
