import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { defaultDateRange, toISODate } from '@/utils/date'

const STORAGE_KEY = 'statistics-date-range'

interface PersistedRange {
  startDate: string
  endDate: string
}

function loadFromStorage(): Partial<PersistedRange> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * @summary Store holding the shared statistics date range, persisted to localStorage.
 * All datepicker-based statistics views read from and write to this store.
 */
export const useStatisticsStore = defineStore('statistics', () => {
  const saved = loadFromStorage()
  const [defaultStart, defaultEnd] = defaultDateRange()

  const startDate = ref<string>(saved.startDate ?? toISODate(defaultStart))
  const endDate = ref<string>(saved.endDate ?? toISODate(defaultEnd))

  watch([startDate, endDate], () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startDate: startDate.value, endDate: endDate.value }),
    )
  })

  /** Returns the current date range as Date objects (for DatePicker v-model). */
  function getDateRange(): [Date, Date] {
    return [
      new Date(startDate.value + 'T00:00:00'),
      new Date(endDate.value + 'T00:00:00'),
    ]
  }

  /** Updates the stored date range from Date objects. */
  function setDateRange(start: Date, end: Date) {
    startDate.value = toISODate(start)
    endDate.value = toISODate(end)
  }

  return { startDate, endDate, getDateRange, setDateRange }
})
