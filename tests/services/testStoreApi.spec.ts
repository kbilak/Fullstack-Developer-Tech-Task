import { describe, it, expect, beforeEach } from 'vitest'
import { fetchStores, fetchStore, createStore, deleteStore, fetchStatistics } from '@/services/testStoreApi'
import { testStores } from '@/services/testData'

describe('testStoreApi', () => {
  // Save original length to detect mutations
  let originalLength: number

  beforeEach(() => {
    originalLength = testStores.length
  })

  // #region fetchStores
  describe('fetchStores', () => {
    it('returns paginated results with correct metadata', async () => {
      const result = await fetchStores(1, 5)

      expect(result.items).toHaveLength(5)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(5)
      expect(result.totalItems).toBe(testStores.length)
      expect(result.totalPages).toBe(Math.ceil(testStores.length / 5))
      expect(result.status).toBe(true)
    })

    it('returns second page correctly', async () => {
      const page1 = await fetchStores(1, 5)
      const page2 = await fetchStores(2, 5)

      expect(page2.items).toHaveLength(5)
      expect(page2.page).toBe(2)
      // Items should be different from page 1
      expect(page2.items[0]!.id).not.toBe(page1.items[0]!.id)
    })

    it('returns items with id, name, and entryCount', async () => {
      const result = await fetchStores(1, 1)
      const item = result.items[0]!

      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('entryCount')
      expect(typeof item.id).toBe('number')
      expect(typeof item.name).toBe('string')
      expect(typeof item.entryCount).toBe('number')
    })

    it('sorts by name ascending', async () => {
      const result = await fetchStores(1, 100, 'name:asc')
      const names = result.items.map((s) => s.name.toLowerCase())

      for (let i = 1; i < names.length; i++) {
        expect(names[i]! >= names[i - 1]!).toBe(true)
      }
    })

    it('sorts by name descending', async () => {
      const result = await fetchStores(1, 100, 'name:desc')
      const names = result.items.map((s) => s.name.toLowerCase())

      for (let i = 1; i < names.length; i++) {
        expect(names[i]! <= names[i - 1]!).toBe(true)
      }
    })

    it('sorts by entries descending', async () => {
      const result = await fetchStores(1, 100, 'entries:desc')
      const counts = result.items.map((s) => s.entryCount)

      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]! <= counts[i - 1]!).toBe(true)
      }
    })

    it('filters by search query (case-insensitive)', async () => {
      const result = await fetchStores(1, 100, undefined, 'tokyo')

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every((s) => s.name.toLowerCase().includes('tokyo'))).toBe(true)
      expect(result.totalItems).toBe(result.items.length)
    })

    it('returns empty results for non-matching search', async () => {
      const result = await fetchStores(1, 100, undefined, 'zzz_nonexistent_zzz')

      expect(result.items).toHaveLength(0)
      expect(result.totalItems).toBe(0)
    })

    it('combines sort and search', async () => {
      const result = await fetchStores(1, 100, 'name:asc', 'store')

      expect(result.items.length).toBeGreaterThan(0)
      const names = result.items.map((s) => s.name.toLowerCase())
      for (let i = 1; i < names.length; i++) {
        expect(names[i]! >= names[i - 1]!).toBe(true)
      }
    })
  })
  // #endregion fetchStores

  // #region fetchStore
  describe('fetchStore', () => {
    it('returns store details by id', async () => {
      const result = await fetchStore(1)

      expect(result.id).toBe(1)
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('city')
      expect(result).toHaveProperty('country')
      expect(result.status).toBe(true)
    })

    it('throws for non-existent store', async () => {
      await expect(fetchStore(99999)).rejects.toThrow()
    })
  })
  // #endregion fetchStore

  // #region createStore
  describe('createStore', () => {
    it('adds a new store and returns new id', async () => {
      const before = testStores.length
      const result = await createStore({ name: 'Test Store', city: 'Test City', country: 'Test Country' })

      expect(result.status).toBe(true)
      expect(result.id).toBeGreaterThan(0)
      expect(testStores.length).toBe(before + 1)

      // Clean up: remove added store
      const idx = testStores.findIndex((s) => s.id === result.id)
      if (idx !== -1) testStores.splice(idx, 1)
    })
  })
  // #endregion createStore

  // #region deleteStore
  describe('deleteStore', () => {
    it('removes a store by id', async () => {
      // Add a store to delete
      await createStore({ name: 'To Delete', city: 'X', country: 'X' })
      const toDelete = testStores[testStores.length - 1]!
      const before = testStores.length

      const result = await deleteStore(toDelete.id)

      expect(result.status).toBe(true)
      expect(testStores.length).toBe(before - 1)
      expect(testStores.find((s) => s.id === toDelete.id)).toBeUndefined()
    })
  })
  // #endregion deleteStore

  // #region fetchStatistics
  describe('fetchStatistics', () => {
    it('returns statistics with date and count arrays', async () => {
      const result = await fetchStatistics(1, '2026-02-01', '2026-02-07')

      expect(result.id).toBe(1)
      expect(result.name).toBeTruthy()
      expect(result.statistics).toBeInstanceOf(Array)
      expect(result.status).toBe(true)

      for (const stat of result.statistics) {
        expect(stat).toHaveProperty('date')
        expect(stat).toHaveProperty('count')
        expect(stat.date >= '2026-02-01').toBe(true)
        expect(stat.date <= '2026-02-07').toBe(true)
      }
    })

    it('returns empty statistics for future date range', async () => {
      const result = await fetchStatistics(1, '2099-01-01', '2099-01-07')

      expect(result.statistics).toHaveLength(0)
    })

    it('throws for non-existent store', async () => {
      await expect(fetchStatistics(99999, '2026-01-01', '2026-01-07')).rejects.toThrow()
    })
  })
  // #endregion fetchStatistics
})
