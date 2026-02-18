<script setup lang="ts">
// #region IMPORTS
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useEntriesStore } from '@/stores/useEntriesStore'
import { useUserStore } from '@/stores/useUserStore'
import type { EntryListItem } from '@/types/entry'
import { useToast } from 'primevue/usetoast'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import { useEntryDialogs } from '@/composables/useEntryDialogs'
import SectionLoader from '@/components/common/SectionLoader.vue'
import EntriesToolbar from '@/components/entries/EntriesToolbar.vue'
import type { EntriesFilterValues } from '@/components/entries/EntriesToolbar.vue'
import EntryDetailsDialog from '@/components/entries/EntryDetailsDialog.vue'
import EntryFormDialog from '@/components/entries/EntryFormDialog.vue'
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { DataTablePageEvent } from 'primevue/datatable'

// Chart.js components — lazy-loaded to reduce initial bundle size
const EntryStatisticsSection = defineAsyncComponent(
  () => import('@/components/entries/EntryStatisticsSection.vue'),
)
const EntryQuickStats = defineAsyncComponent(
  () => import('@/components/entries/EntryQuickStats.vue'),
)
// #endregion IMPORTS

// #region STATE
const entriesStore = useEntriesStore()
const userStore = useUserStore()
const {
  entries,
  totalRecords,
  page,
  pageSize,
  sortField,
  sortOrder,
  search,
  storeId,
  dateFrom,
  dateTo,
  loading,
  error,
} = storeToRefs(entriesStore)
const { loadEntries, invalidateAndReload } = entriesStore

const toast = useToast()

const quickStatsRef = ref<InstanceType<typeof EntryQuickStats> | null>(null)
const statisticsRef = ref<InstanceType<typeof EntryStatisticsSection> | null>(null)
const selectedRows = ref<EntryListItem[]>([])
const storeOptions = ref<{ label: string; value: number | null }[]>([
  { label: 'All stores', value: null },
])

const { searchInput } = useDebouncedSearch(search, page, loadEntries)
const dialogs = useEntryDialogs(quickStatsRef, statisticsRef, selectedRows)
// #endregion STATE

// #region COMPUTED
/** Counts non-default filter settings (sort field/order, storeId, date range) to display a badge on the filter button. */
const activeFilterCount = computed(() => {
  let count = 0
  if (sortField.value !== 'date') count++
  if (sortOrder.value !== 'desc') count++
  if (storeId.value) count++
  if (dateFrom.value) count++
  if (dateTo.value) count++
  return count
})
// #endregion COMPUTED

// #region WATCHERS
watch(error, (msg) => {
  if (msg) {
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  }
})

watch(
  () => userStore.storesDataSource,
  () => {
    loadStoreOptions()
    quickStatsRef.value?.refresh()
    statisticsRef.value?.refresh()
  },
)
// #endregion WATCHERS

// #region METHODS
/** Formats an ISO datetime string for display in table cells (e.g. "18 Feb 2026, 14:30"). */
function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Formats a number with space as the thousands separator (e.g. 12345 -> "12 345"). */
function fmtNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function rowNumber(index: number): number {
  return (page.value - 1) * pageSize.value + index + 1
}

/** Full reset: clears all filters (search, sort, store, dates), selection, invalidates page cache, and refreshes stats/charts. */
function refresh() {
  searchInput.value = ''
  search.value = ''
  sortField.value = 'date'
  sortOrder.value = 'desc'
  storeId.value = null
  dateFrom.value = null
  dateTo.value = null
  page.value = 1
  selectedRows.value = []
  invalidateAndReload()
  quickStatsRef.value?.refresh()
  statisticsRef.value?.refresh()
}

/** Handles DataTable pagination — converts PrimeVue's 0-indexed page to our 1-indexed store value. */
function onPage(event: DataTablePageEvent) {
  page.value = event.page + 1
  pageSize.value = event.rows
  selectedRows.value = []
  loadEntries()
}

/** Applies filter values emitted from the EntriesToolbar popover to Pinia state and reloads from page 1. */
function onApplyFilters(filters: EntriesFilterValues) {
  sortField.value = filters.sortField
  sortOrder.value = filters.sortOrder
  storeId.value = filters.storeId
  dateFrom.value = filters.dateFrom
  dateTo.value = filters.dateTo
  page.value = 1
  loadEntries()
}

/** Resets all filter values (sort, store, dates) back to their defaults and reloads from page 1. */
function onResetFilters() {
  sortField.value = 'date'
  sortOrder.value = 'desc'
  storeId.value = null
  dateFrom.value = null
  dateTo.value = null
  page.value = 1
  loadEntries()
}

/**
 * Loads store dropdown options for the filter popover.
 * Returns cached options when available unless `force` is true,
 * avoiding redundant API calls on repeated tab switches.
 */
async function loadStoreOptions(force = false) {
  if (!force && entriesStore.storeOptionsCache) {
    storeOptions.value = entriesStore.storeOptionsCache
    return
  }
  try {
    const result = await userStore.storeApi().fetchStores(1, 1000)
    storeOptions.value = [
      { label: 'All stores', value: null },
      ...result.items.map((s) => ({ label: s.name, value: s.id })),
    ]
    entriesStore.storeOptionsCache = storeOptions.value
  } catch {
    // noop
  }
}
// #endregion METHODS

// #region LIFECYCLE
onMounted(() => {
  page.value = 1
  loadEntries()
  loadStoreOptions()
})
// #endregion LIFECYCLE
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- QUICK STATS -->
    <EntryQuickStats ref="quickStatsRef" />

    <!-- TOOLBAR -->
    <EntriesToolbar
      v-model:search="searchInput"
      :selected-count="selectedRows.length"
      :active-filter-count="activeFilterCount"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :store-id="storeId"
      :date-from="dateFrom"
      :date-to="dateTo"
      :store-options="storeOptions"
      @refresh="refresh"
      @add="dialogs.openAdd"
      @bulk-delete="dialogs.showBulkDelete.value = true"
      @apply-filters="onApplyFilters"
      @reset-filters="onResetFilters"
    />

    <!-- TABLE -->
    <SectionLoader v-if="loading && entries.length === 0" message="Loading entries..." />

    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <span class="text-sm text-red-600">{{ error }}</span>
    </div>

    <div v-else-if="!loading && entries.length === 0" class="py-12 text-center">
      <p class="text-sm text-gray-400">No entries found</p>
    </div>

    <DataTable
      v-else
      v-model:selection="selectedRows"
      :value="entries"
      :loading="loading"
      data-key="id"
      lazy
      paginator
      :rows="pageSize"
      :total-records="totalRecords"
      :rows-per-page-options="[5, 10, 20, 50]"
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      @page="onPage"
      @row-click="(e: { data: EntryListItem }) => dialogs.openDetails(e.data)"
      class="entries-table"
    >
      <template #paginatorstart>
        <span class="text-xs text-gray-400">Total: {{ fmtNum(totalRecords) }} entries</span>
      </template>
      <Column selection-mode="multiple" class="col-checkbox" />
      <Column header="#" class="col-num">
        <template #body="{ index }">
          <span class="text-xs font-medium whitespace-nowrap text-gray-400">{{
            fmtNum(rowNumber(index))
          }}</span>
        </template>
      </Column>
      <Column field="id" header="ID" class="col-id" />
      <Column header="Store">
        <template #body="{ data }">
          <span class="text-sm text-gray-900">{{ data.storeName }}</span>
        </template>
      </Column>
      <Column header="Date">
        <template #body="{ data }">
          <span class="text-sm text-gray-700">{{ formatDate(data.entryDate) }}</span>
        </template>
      </Column>
      <Column header="Actions" style="width: 120px">
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

    <!-- DIALOGS -->
    <EntryDetailsDialog
      v-model:visible="dialogs.showDetails.value"
      :entry="dialogs.selectedEntry.value"
      @edit="dialogs.editFromDetails"
      @delete="dialogs.deleteFromDetails"
    />

    <EntryFormDialog
      v-model:visible="dialogs.showForm.value"
      :entry="dialogs.editingEntry.value"
      :store-name="dialogs.editingEntry.value?.storeName ?? ''"
      @created="dialogs.onEntryCreated"
      @updated="dialogs.onEntryUpdated"
    />

    <ConfirmDeleteDialog
      v-model:visible="dialogs.showDelete.value"
      title="Delete entry"
      :message="`Delete entry <strong>#${dialogs.deleteTarget.value?.id ?? ''}</strong>? This can't be undone.`"
      :delete-fn="() => userStore.entryApi().deleteEntry(dialogs.deleteTarget.value!.id)"
      @deleted="dialogs.onSingleDeleted"
    />

    <ConfirmDeleteDialog
      v-model:visible="dialogs.showBulkDelete.value"
      title="Delete entries"
      :message="`Delete <strong>${selectedRows.length}</strong> selected ${selectedRows.length === 1 ? 'entry' : 'entries'}? This can't be undone.`"
      confirm-label="Delete all"
      :delete-fn="() => userStore.entryApi().deleteEntries(selectedRows.map((e) => e.id))"
      @deleted="dialogs.onBulkDeleted"
    />

    <!-- CHARTS -->
    <EntryStatisticsSection ref="statisticsRef" />
  </div>
</template>

<style scoped>
.entries-table :deep(.p-datatable-tbody > tr) {
  transition: background-color 0.15s;
  cursor: pointer;
}
.entries-table :deep(.p-datatable-tbody > tr:hover > td) {
  background-color: #f3f4f6 !important;
}
.entries-table :deep(.p-checkbox) {
  display: flex;
  align-items: center;
  vertical-align: middle;
}
.entries-table :deep(.col-checkbox) { width: 40px; }
.entries-table :deep(.col-num) { width: 72px; }
.entries-table :deep(.col-id) { width: 72px; }
@media (max-width: 639px) {
  .entries-table :deep(.col-checkbox) { width: 32px; }
  .entries-table :deep(.col-num) { width: 36px; }
  .entries-table :deep(.col-id) { width: 48px; }
}
</style>
