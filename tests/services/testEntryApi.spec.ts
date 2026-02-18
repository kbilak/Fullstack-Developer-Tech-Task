import { describe, it, expect } from 'vitest'
import { fetchEntries, fetchEntriesByStore, createEntry, deleteEntry, fetchEntryStatistics } from '@/services/test/testEntryApi'
import { getTestEntries, testStores } from '@/services/test/testData'

describe('testEntryApi', () => {
  // #region fetchEntries
  describe('fetchEntries', () => {
    it('returns paginated results with correct metadata', async () => {
      const result = await fetchEntries(1, 10)

      expect(result.items).toHaveLength(10)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
      expect(result.totalItems).toBeGreaterThan(0)
      expect(result.status).toBe(true)
    })

    it('enriches items with storeName', async () => {
      const result = await fetchEntries(1, 5)

      for (const item of result.items) {
        expect(item).toHaveProperty('storeName')
        expect(typeof item.storeName).toBe('string')
        expect(item.storeName.length).toBeGreaterThan(0)
      }
    })

    it('filters by storeId', async () => {
      const storeId = testStores[0]!.id
      const result = await fetchEntries(1, 1000, undefined, undefined, storeId)

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.every((e) => e.idStore === storeId)).toBe(true)
    })

    it('filters by date range', async () => {
      const from = '2026-02-01'
      const to = '2026-02-07'
      const result = await fetchEntries(1, 10000, undefined, undefined, undefined, from, to)

      expect(result.items.length).toBeGreaterThan(0)
      for (const item of result.items) {
        const date = item.entryDate.slice(0, 10)
        expect(date >= from).toBe(true)
        expect(date <= to).toBe(true)
      }
    })

    it('searches by store name', async () => {
      const storeName = testStores[0]!.name
      const searchTerm = storeName.split(' ')[0]!.toLowerCase()
      const result = await fetchEntries(1, 1000, undefined, searchTerm)

      expect(result.items.length).toBeGreaterThan(0)
      for (const item of result.items) {
        expect(item.storeName.toLowerCase()).toContain(searchTerm)
      }
    })

    it('sorts by date descending', async () => {
      const result = await fetchEntries(1, 20, 'date:desc')
      const dates = result.items.map((e) => e.entryDate)

      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]! <= dates[i - 1]!).toBe(true)
      }
    })

    it('sorts by id ascending', async () => {
      const result = await fetchEntries(1, 20, 'id:asc')
      const ids = result.items.map((e) => e.id)

      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]! >= ids[i - 1]!).toBe(true)
      }
    })

    it('combines storeId filter with date range', async () => {
      const storeId = testStores[0]!.id
      const from = '2026-02-01'
      const to = '2026-02-14'
      const result = await fetchEntries(1, 10000, undefined, undefined, storeId, from, to)

      for (const item of result.items) {
        expect(item.idStore).toBe(storeId)
        const date = item.entryDate.slice(0, 10)
        expect(date >= from).toBe(true)
        expect(date <= to).toBe(true)
      }
    })
  })
  // #endregion fetchEntries

  // #region fetchEntriesByStore
  describe('fetchEntriesByStore', () => {
    it('returns only entries for the given store', async () => {
      const storeId = testStores[0]!.id
      const result = await fetchEntriesByStore(storeId, 1, 10)

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.status).toBe(true)
      // fetchEntriesByStore returns { id, entryDate } without idStore,
      // but totalItems should match filtered count
      const expected = getTestEntries().filter((e) => e.idStore === storeId).length
      expect(result.totalItems).toBe(expected)
    })
  })
  // #endregion fetchEntriesByStore

  // #region createEntry & deleteEntry
  describe('createEntry / deleteEntry', () => {
    it('creates a new entry and allows deletion', async () => {
      const before = getTestEntries().length
      const storeId = testStores[0]!.id

      const createResult = await createEntry({
        idStore: storeId,
        entryDate: '2026-03-01T10:00:00',
      })
      expect(createResult.status).toBe(true)
      expect(getTestEntries().length).toBe(before + 1)

      // Find the new entry (last one)
      const newEntry = getTestEntries()[getTestEntries().length - 1]!
      expect(newEntry.idStore).toBe(storeId)

      // Delete it
      const deleteResult = await deleteEntry(newEntry.id)
      expect(deleteResult.status).toBe(true)
      expect(getTestEntries().length).toBe(before)
    })
  })
  // #endregion createEntry & deleteEntry

  // #region fetchEntryStatistics
  describe('fetchEntryStatistics', () => {
    it('returns dailyCounts and storeCounts', async () => {
      const result = await fetchEntryStatistics('2026-02-01', '2026-02-07')

      expect(result).toHaveProperty('dailyCounts')
      expect(result).toHaveProperty('storeCounts')
      expect(result.status).toBe(true)
      expect(result.dailyCounts.length).toBeGreaterThan(0)
      expect(result.storeCounts.length).toBeGreaterThan(0)
    })

    it('dailyCounts are sorted by date ascending', async () => {
      const result = await fetchEntryStatistics('2026-01-01', '2026-02-15')
      const dates = result.dailyCounts.map((d) => d.date)

      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]! >= dates[i - 1]!).toBe(true)
      }
    })

    it('dailyCounts dates fall within the requested range', async () => {
      const from = '2026-02-01'
      const to = '2026-02-07'
      const result = await fetchEntryStatistics(from, to)

      for (const dc of result.dailyCounts) {
        expect(dc.date >= from).toBe(true)
        expect(dc.date <= to).toBe(true)
        expect(dc.count).toBeGreaterThan(0)
      }
    })

    it('storeCounts are sorted by count descending', async () => {
      const result = await fetchEntryStatistics('2026-01-01', '2026-02-15')
      const counts = result.storeCounts.map((s) => s.count)

      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]! <= counts[i - 1]!).toBe(true)
      }
    })

    it('storeCounts include storeName', async () => {
      const result = await fetchEntryStatistics('2026-02-01', '2026-02-07')

      for (const sc of result.storeCounts) {
        expect(sc.storeName).toBeTruthy()
        expect(typeof sc.storeName).toBe('string')
      }
    })

    it('returns empty for future date range', async () => {
      const result = await fetchEntryStatistics('2099-01-01', '2099-12-31')

      expect(result.dailyCounts).toHaveLength(0)
      expect(result.storeCounts).toHaveLength(0)
    })
  })
  // #endregion fetchEntryStatistics
})
