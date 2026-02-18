import { ref } from 'vue'
import type { Ref } from 'vue'
import { useEntriesStore } from '@/stores/useEntriesStore'
import { useStoresStore } from '@/stores/useStoresStore'
import type { EntryListItem } from '@/types/entry'
import { useToast } from 'primevue/usetoast'

/**
 * Composable managing all entry-related dialog state and event handlers.
 * Extracts dialog visibility refs, opener functions, cross-dialog transitions
 * (details→edit, details→delete), and CRUD event handlers (optimistic updates,
 * cache invalidation, toast notifications) from EntriesPanel.
 *
 * @param quickStatsRef  - Ref to EntryQuickStats component for triggering stat refresh
 * @param statisticsRef  - Ref to EntryStatisticsSection for triggering chart refresh
 * @param selectedRows   - Ref to DataTable selection for bulk operations
 */
export function useEntryDialogs(
  quickStatsRef: Ref<{ refresh: () => void } | null>,
  statisticsRef: Ref<{ refresh: () => void } | null>,
  selectedRows: Ref<EntryListItem[]>,
) {
  const entriesStore = useEntriesStore()
  const storesStore = useStoresStore()
  const toast = useToast()
  const { removeEntriesLocally, updateEntryLocally, invalidateAndReload } = entriesStore

  // #region STATE
  const showDetails = ref(false)
  const selectedEntry = ref<EntryListItem | null>(null)

  const showForm = ref(false)
  const editingEntry = ref<EntryListItem | null>(null)

  const showDelete = ref(false)
  const deleteTarget = ref<{ id: number } | null>(null)

  const showBulkDelete = ref(false)
  // #endregion STATE

  // #region HELPERS
  /** Refreshes both quick stats cards and the statistics chart section. */
  function refreshStats() {
    quickStatsRef.value?.refresh()
    statisticsRef.value?.refresh()
  }

  /** Goes back a page if current page is empty after deletion, then force-refetches. */
  function refetchAfterDelete() {
    if (entriesStore.entries.length === 0 && entriesStore.page > 1) {
      entriesStore.page--
    }
    entriesStore.loadEntries(true)
  }
  // #endregion HELPERS

  // #region OPENERS
  function openDetails(entry: EntryListItem) {
    selectedEntry.value = entry
    showDetails.value = true
  }

  function openAdd() {
    editingEntry.value = null
    showForm.value = true
  }

  function openEdit(entry: EntryListItem) {
    editingEntry.value = entry
    showForm.value = true
  }

  function openDelete(entry: EntryListItem) {
    deleteTarget.value = { id: entry.id }
    showDelete.value = true
  }
  // #endregion OPENERS

  // #region TRANSITIONS
  /** Closes details dialog and opens edit form with the selected entry data. */
  function editFromDetails() {
    if (!selectedEntry.value) return
    showDetails.value = false
    editingEntry.value = selectedEntry.value
    showForm.value = true
  }

  /** Closes details dialog and opens delete confirmation. */
  function deleteFromDetails() {
    if (!selectedEntry.value) return
    showDetails.value = false
    deleteTarget.value = { id: selectedEntry.value.id }
    showDelete.value = true
  }
  // #endregion TRANSITIONS

  // #region EVENT HANDLERS
  function onEntryCreated() {
    invalidateAndReload()
    storesStore.invalidateAndReload()
    refreshStats()
    toast.add({ severity: 'success', summary: 'Entry created', life: 3000 })
  }

  function onEntryUpdated(data: { id: number; entryDate: string }) {
    updateEntryLocally(data.id, { entryDate: data.entryDate })
    invalidateAndReload()
    refreshStats()
    toast.add({ severity: 'success', summary: 'Entry updated', life: 3000 })
  }

  function onSingleDeleted() {
    if (deleteTarget.value) {
      removeEntriesLocally([deleteTarget.value.id])
    }
    refetchAfterDelete()
    storesStore.invalidateAndReload()
    refreshStats()
    toast.add({ severity: 'success', summary: 'Entry deleted', life: 3000 })
  }

  function onBulkDeleted() {
    const ids = selectedRows.value.map((e) => e.id)
    selectedRows.value = []
    removeEntriesLocally(ids)
    refetchAfterDelete()
    storesStore.invalidateAndReload()
    refreshStats()
    toast.add({ severity: 'success', summary: `${ids.length} entries deleted`, life: 3000 })
  }
  // #endregion EVENT HANDLERS

  return {
    showDetails, selectedEntry,
    showForm, editingEntry,
    showDelete, deleteTarget,
    showBulkDelete,
    openDetails, openAdd, openEdit, openDelete,
    editFromDetails, deleteFromDetails,
    onEntryCreated, onEntryUpdated, onSingleDeleted, onBulkDeleted,
  }
}
