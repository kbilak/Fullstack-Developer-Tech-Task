<script setup lang="ts">
// #region IMPORTS
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useStoresStore } from '@/stores/useStoresStore'
import { useUserStore } from '@/stores/useUserStore'
import type { StoreListItem } from '@/types/store'
import { useToast } from 'primevue/usetoast'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import { useStoreDialogs } from '@/composables/useStoreDialogs'
import { entryBadgeClasses } from '@/utils/chart'
import SectionLoader from '@/components/common/SectionLoader.vue'
import StoresToolbar from '@/components/stores/StoresToolbar.vue'
import StoresChart from '@/components/stores/StoresChart.vue'
import StoreDetailsDialog from '@/components/stores/StoreDetailsDialog.vue'
import StoreFormDialog from '@/components/stores/StoreFormDialog.vue'
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog.vue'
import AddEntryDialog from '@/components/stores/AddEntryDialog.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { DataTablePageEvent, DataTableRowClickEvent } from 'primevue/datatable'

// Chart.js dialogs — lazy-loaded to reduce initial bundle size
const StoreStatisticsDialog = defineAsyncComponent(
  () => import('@/components/stores/StoreStatisticsDialog.vue'),
)
const StoreCompareDialog = defineAsyncComponent(
  () => import('@/components/stores/StoreCompareDialog.vue'),
)
const StoreQuickStats = defineAsyncComponent(
  () => import('@/components/stores/StoreQuickStats.vue'),
)
// #endregion IMPORTS

// #region STATE
const storesStore = useStoresStore()
const userStore = useUserStore()
const { stores, totalRecords, page, pageSize, sortField, sortOrder, search, loading, error } =
  storeToRefs(storesStore)
const { storesChartSort: chartSort } = storeToRefs(userStore)
const { loadStores, invalidateAndReload } = storesStore

const toast = useToast()

const quickStatsRef = ref<InstanceType<typeof StoreQuickStats> | null>(null)
const selectedRows = ref<StoreListItem[]>([])
const hoveredStoreId = ref<number | null>(null)

const { searchInput } = useDebouncedSearch(search, page, loadStores)
const dialogs = useStoreDialogs(quickStatsRef, selectedRows)
// #endregion STATE

// #region COMPUTED
/** Counts non-default sort settings (field, order) to display a badge number on the filter button. */
const activeFilterCount = computed(() => {
  let count = 0
  if (sortField.value !== 'id') count++
  if (sortOrder.value !== 'asc') count++
  return count
})

const entryCountRange = computed(() => {
  const counts = stores.value.map((s) => s.entryCount).filter((c) => c > 0)
  if (counts.length === 0) return { min: 0, max: 0 }
  return { min: Math.min(...counts), max: Math.max(...counts) }
})
// #endregion COMPUTED

// #region WATCHERS
watch([sortField, sortOrder], () => {
  page.value = 1
  loadStores()
})

watch(error, (msg) => {
  if (msg) {
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  }
})

watch(() => userStore.storesDataSource, () => {
  quickStatsRef.value?.refresh()
})
// #endregion WATCHERS

// #region METHODS
/** Full reset: clears search query and selection, invalidates the page cache, and refreshes quick stats. */
function refresh() {
  searchInput.value = ''
  search.value = ''
  page.value = 1
  selectedRows.value = []
  invalidateAndReload()
  quickStatsRef.value?.refresh()
}

/** Handles DataTable pagination — converts PrimeVue's 0-indexed page to our 1-indexed store value. */
function onPage(event: DataTablePageEvent) {
  page.value = event.page + 1
  pageSize.value = event.rows
  selectedRows.value = []
  loadStores()
}

/** Opens the store details dialog when a table row is clicked. */
function onRowClick(event: DataTableRowClickEvent) {
  dialogs.openDetails(event.data as StoreListItem)
}

function rowNumber(index: number): number {
  return (page.value - 1) * pageSize.value + index + 1
}

/** Returns a CSS class that highlights the table row whose store ID matches the currently hovered chart bar. */
function rowHighlightClass(data: StoreListItem) {
  return data.id === hoveredStoreId.value ? 'chart-hovered-row' : ''
}

/**
 * Resolves the hovered store ID from a mouseover event on the table body.
 * Uses event delegation: walks up to the closest `<tr>`, determines its index
 * among siblings, and maps that to the corresponding store in the data array.
 */
function onTableHover(e: Event) {
  const tr = (e.target as HTMLElement).closest('.p-datatable-tbody > tr')
  if (!tr) return
  const index = Array.from(tr.parentElement!.children).indexOf(tr)
  hoveredStoreId.value = stores.value[index]?.id ?? null
}
// #endregion METHODS

// #region LIFECYCLE
onMounted(() => {
  page.value = 1
  loadStores()
})
// #endregion LIFECYCLE
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- QUICK STATS -->
    <StoreQuickStats ref="quickStatsRef" />

    <!-- TOOLBAR -->
    <StoresToolbar
      v-model:search="searchInput"
      v-model:sort-field="sortField"
      v-model:sort-order="sortOrder"
      :selected-count="selectedRows.length"
      :active-filter-count="activeFilterCount"
      @refresh="refresh"
      @add="dialogs.openAdd"
      @compare="dialogs.showCompare.value = true"
      @bulk-delete="dialogs.showBulkDelete.value = true"
    />

    <!-- TABLE -->
    <SectionLoader v-if="loading && stores.length === 0" message="Loading stores..." />

    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <span class="text-sm text-red-600">{{ error }}</span>
    </div>

    <div v-else-if="!loading && stores.length === 0" class="py-12 text-center">
      <p class="text-sm text-gray-400">No stores found</p>
    </div>

    <DataTable
      v-else
      v-model:selection="selectedRows"
      :value="stores"
      :loading="loading"
      data-key="id"
      lazy
      paginator
      :rows="pageSize"
      :total-records="totalRecords"
      :rows-per-page-options="[5, 10, 20, 50]"
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      @page="onPage"
      @row-click="onRowClick"
      :row-class="rowHighlightClass"
      class="stores-table"
      @mouseover="onTableHover"
      @mouseleave="hoveredStoreId = null"
    >
      <template #paginatorstart>
        <span class="text-xs text-gray-400">Total: {{ totalRecords }} stores</span>
      </template>
      <Column selection-mode="multiple" class="col-checkbox" />
      <Column header="#" class="col-num">
        <template #body="{ index }">
          <span class="text-xs font-medium text-gray-400">{{ rowNumber(index) }}</span>
        </template>
      </Column>
      <Column field="id" header="ID" class="col-id" />
      <Column field="name" header="Name" />
      <Column header="Entries" class="col-entries">
        <template #body="{ data }">
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="entryBadgeClasses(data.entryCount, entryCountRange.min, entryCountRange.max)"
          >
            {{ data.entryCount }}
          </span>
        </template>
      </Column>
      <Column header="Actions" style="width: 184px">
        <template #body="{ data }">
          <div class="flex items-center gap-1">
            <button
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
              title="View details"
              @click.stop="dialogs.openDetails(data)"
            >
              <i class="pi pi-eye" style="font-size: 13px"></i>
            </button>
            <button
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
              title="Edit"
              @click.stop="dialogs.openEdit(data)"
            >
              <i class="pi pi-pencil" style="font-size: 13px"></i>
            </button>
            <button
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              title="Add entry"
              @click.stop="dialogs.openAddEntry(data)"
            >
              <i class="pi pi-sign-in" style="font-size: 13px"></i>
            </button>
            <button
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              title="View entries"
              @click.stop="dialogs.openStatistics(data)"
            >
              <i class="pi pi-chart-bar" style="font-size: 13px"></i>
            </button>
            <button
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Delete"
              @click.stop="dialogs.openDelete(data)"
            >
              <i class="pi pi-trash" style="font-size: 13px"></i>
            </button>
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- CHART -->
    <StoresChart
      v-if="stores.length > 0"
      :stores="stores"
      :loading="loading"
      v-model:hovered-store-id="hoveredStoreId"
      v-model:chart-sort="chartSort"
    />

    <!-- DIALOGS -->
    <StoreDetailsDialog
      v-model:visible="dialogs.showDetails.value"
      :store="dialogs.selectedStore.value"
      :loading="dialogs.detailsLoading.value"
      :entry-count="dialogs.detailsEntryCount.value"
      @edit="dialogs.editFromDetails"
      @delete="dialogs.deleteFromDetails"
    />

    <StoreFormDialog
      v-model:visible="dialogs.showForm.value"
      :store="dialogs.editingStore.value"
      :detail-loading="dialogs.formDetailLoading.value"
      @created="dialogs.onStoreCreated"
      @updated="dialogs.onStoreUpdated"
      @delete="dialogs.openDeleteFromForm"
    />

    <ConfirmDeleteDialog
      v-model:visible="dialogs.showDelete.value"
      title="Delete store"
      :message="`Delete <strong>${dialogs.deleteTarget.value?.name ?? ''}</strong>? This can't be undone.`"
      :delete-fn="() => userStore.storeApi().deleteStore(dialogs.deleteTarget.value!.id)"
      @deleted="dialogs.onSingleDeleted"
    />

    <ConfirmDeleteDialog
      v-model:visible="dialogs.showBulkDelete.value"
      title="Delete stores"
      :message="`Delete <strong>${selectedRows.length}</strong> selected ${selectedRows.length === 1 ? 'store' : 'stores'}? This can't be undone.`"
      confirm-label="Delete all"
      :delete-fn="() => userStore.storeApi().deleteStores(selectedRows.map((s) => s.id))"
      @deleted="dialogs.onBulkDeleted"
    />

    <AddEntryDialog
      v-model:visible="dialogs.showAddEntry.value"
      :store-id="dialogs.addEntryTarget.value?.id ?? null"
      :store-name="dialogs.addEntryTarget.value?.name ?? ''"
      @added="dialogs.onEntryAdded"
    />

    <StoreStatisticsDialog
      v-model:visible="dialogs.showStatistics.value"
      :store-id="dialogs.statisticsTarget.value?.id ?? null"
      :store-name="dialogs.statisticsTarget.value?.name ?? ''"
    />

    <StoreCompareDialog
      v-model:visible="dialogs.showCompare.value"
      :stores="selectedRows.map((s) => ({ id: s.id, name: s.name }))"
    />
  </div>
</template>

<style scoped>
.stores-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
  transition: background-color 0.15s;
}
.stores-table :deep(.p-datatable-tbody > tr:hover > td) {
  background-color: #f3f4f6 !important;
}
.stores-table :deep(.p-checkbox) {
  display: flex;
  align-items: center;
  vertical-align: middle;
}
.stores-table :deep(.chart-hovered-row > td) {
  background-color: #eef2ff !important;
}
.stores-table :deep(.col-checkbox) { width: 40px; }
.stores-table :deep(.col-num) { width: 56px; }
.stores-table :deep(.col-id) { width: 72px; }
.stores-table :deep(.col-entries) { width: 100px; }
@media (max-width: 639px) {
  .stores-table :deep(.col-checkbox) { width: 32px; }
  .stores-table :deep(.col-num) { width: 36px; }
  .stores-table :deep(.col-id) { width: 48px; }
  .stores-table :deep(.col-entries) { width: 64px; }
}
</style>
