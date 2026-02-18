import { ref, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'

/**
 * Debounced search input that syncs to a store's search ref,
 * resets page to 1, and calls the load function after a delay.
 */
export function useDebouncedSearch(
  storeSearch: Ref<string>,
  storePage: Ref<number>,
  loadFn: () => void,
  ms = 300,
) {
  const searchInput = ref('')
  let timeout: ReturnType<typeof setTimeout> | null = null

  watch(searchInput, (val) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      storeSearch.value = val
      storePage.value = 1
      loadFn()
    }, ms)
  })

  onUnmounted(() => {
    if (timeout) clearTimeout(timeout)
  })

  return { searchInput }
}
