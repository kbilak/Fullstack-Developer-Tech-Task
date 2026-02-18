import { ref } from 'vue'
import type { Ref } from 'vue'
import { useStoresStore } from '@/stores/useStoresStore'
import { useEntriesStore } from '@/stores/useEntriesStore'
import type { StoreListItem, StoreDetail } from '@/types/store'
import { useToast } from 'primevue/usetoast'

/**
 * Composable managing all store-related dialog state and event handlers.
 * Extracts dialog visibility refs, opener functions, cross-dialog transitions
 * (details→edit, details→delete, form→delete), and CRUD event handlers
 * (optimistic updates, cache invalidation, toast notifications) from StoresPanel.
 *
 * @param quickStatsRef - Ref to StoreQuickStats component for triggering stat refresh
 * @param selectedRows - Ref to DataTable selection for bulk operations
 */
export function useStoreDialogs(
  quickStatsRef: Ref<{ refresh: () => void } | null>,
  selectedRows: Ref<StoreListItem[]>,
) {
  const storesStore = useStoresStore()
  const entriesStore = useEntriesStore()
  const toast = useToast()
  const {
    getStoreDetail,
    removeStoresLocally,
    updateStoreLocally,
    incrementEntryCount,
    invalidateAndReload,
  } = storesStore

  // #region STATE
  const showDetails = ref(false)
  const detailsLoading = ref(false)
  const selectedStore = ref<StoreDetail | null>(null)
  const detailsEntryCount = ref(0)

  const showForm = ref(false)
  const formDetailLoading = ref(false)
  const editingStore = ref<StoreDetail | null>(null)

  const showDelete = ref(false)
  const deleteTarget = ref<{ id: number; name: string } | null>(null)

  const showBulkDelete = ref(false)

  const showAddEntry = ref(false)
  const addEntryTarget = ref<{ id: number; name: string } | null>(null)

  const showStatistics = ref(false)
  const statisticsTarget = ref<{ id: number; name: string } | null>(null)

  const showCompare = ref(false)
  // #endregion STATE

  // #region OPENERS
  /** Opens the details dialog — shows immediately with spinner while fetching full store data. */
  async function openDetails(store: StoreListItem) {
    showDetails.value = true
    detailsLoading.value = true
    selectedStore.value = null
    detailsEntryCount.value = store.entryCount
    try {
      selectedStore.value = await getStoreDetail(store.id)
    } catch {
      selectedStore.value = null
    } finally {
      detailsLoading.value = false
    }
  }

  function openAdd() {
    editingStore.value = null
    showForm.value = true
  }

  /** Opens the form in edit mode — shows a placeholder immediately, replaces with full data once loaded. */
  async function openEdit(store: StoreListItem) {
    formDetailLoading.value = true
    editingStore.value = { id: store.id, name: store.name, city: '', country: '' } as StoreDetail
    showForm.value = true
    try {
      editingStore.value = await getStoreDetail(store.id)
    } catch {
      showForm.value = false
    } finally {
      formDetailLoading.value = false
    }
  }

  function openDelete(store: StoreListItem) {
    deleteTarget.value = { id: store.id, name: store.name }
    showDelete.value = true
  }

  function openAddEntry(store: StoreListItem) {
    addEntryTarget.value = { id: store.id, name: store.name }
    showAddEntry.value = true
  }

  function openStatistics(store: StoreListItem) {
    statisticsTarget.value = { id: store.id, name: store.name }
    showStatistics.value = true
  }
  // #endregion OPENERS

  // #region TRANSITIONS
  /** Closes details dialog and opens edit form with the already-loaded store data. */
  function editFromDetails() {
    if (!selectedStore.value) return
    showDetails.value = false
    editingStore.value = selectedStore.value
    showForm.value = true
  }

  /** Closes details dialog and opens delete confirmation. */
  function deleteFromDetails() {
    if (!selectedStore.value) return
    showDetails.value = false
    deleteTarget.value = { id: selectedStore.value.id, name: selectedStore.value.name }
    showDelete.value = true
  }

  /** Closes the edit form and opens delete confirmation. */
  function openDeleteFromForm() {
    if (!editingStore.value) return
    showForm.value = false
    deleteTarget.value = { id: editingStore.value.id, name: editingStore.value.name }
    showDelete.value = true
  }
  // #endregion TRANSITIONS

  // #region EVENT HANDLERS
  /** Goes back a page if current page is empty after deletion, then force-refetches. */
  function refetchAfterDelete() {
    if (storesStore.stores.length === 0 && storesStore.page > 1) {
      storesStore.page--
    }
    storesStore.loadStores(true)
  }

  function onStoreCreated() {
    invalidateAndReload()
    entriesStore.storeOptionsCache = null
    quickStatsRef.value?.refresh()
    toast.add({ severity: 'success', summary: 'Store created', life: 3000 })
  }

  function onStoreUpdated(data: { id: number; name: string }) {
    updateStoreLocally(data.id, { name: data.name })
    invalidateAndReload()
    entriesStore.storeOptionsCache = null
    quickStatsRef.value?.refresh()
    toast.add({ severity: 'success', summary: 'Store updated', life: 3000 })
  }

  function onSingleDeleted() {
    if (deleteTarget.value) {
      removeStoresLocally([deleteTarget.value.id])
    }
    refetchAfterDelete()
    entriesStore.storeOptionsCache = null
    quickStatsRef.value?.refresh()
    toast.add({ severity: 'success', summary: 'Store deleted', life: 3000 })
  }

  function onBulkDeleted() {
    const ids = selectedRows.value.map((s) => s.id)
    selectedRows.value = []
    removeStoresLocally(ids)
    refetchAfterDelete()
    entriesStore.storeOptionsCache = null
    quickStatsRef.value?.refresh()
    toast.add({ severity: 'success', summary: `${ids.length} stores deleted`, life: 3000 })
  }

  function onEntryAdded() {
    if (addEntryTarget.value) incrementEntryCount(addEntryTarget.value.id)
    quickStatsRef.value?.refresh()
    toast.add({ severity: 'success', summary: 'Entry added', life: 3000 })
  }
  // #endregion EVENT HANDLERS

  return {
    showDetails, detailsLoading, selectedStore, detailsEntryCount,
    showForm, formDetailLoading, editingStore,
    showDelete, deleteTarget,
    showBulkDelete,
    showAddEntry, addEntryTarget,
    showStatistics, statisticsTarget,
    showCompare,
    openDetails, openAdd, openEdit, openDelete, openAddEntry, openStatistics,
    editFromDetails, deleteFromDetails, openDeleteFromForm,
    onStoreCreated, onStoreUpdated, onSingleDeleted, onBulkDeleted, onEntryAdded,
  }
}
