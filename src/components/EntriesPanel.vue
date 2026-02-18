<script setup lang="ts">
// #region IMPORTS
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useEntriesStore } from '@/stores/useEntriesStore'
import { useStoresStore } from '@/stores/useStoresStore'
import { useUserStore } from '@/stores/useUserStore'
import type { EntryListItem } from '@/types/entry'
import type { EntriesSortField } from '@/stores/useUserStore'
import { useToast } from 'primevue/usetoast'
import SectionLoader from '@/components/common/SectionLoader.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import EntryDetailsDialog from '@/components/entries/EntryDetailsDialog.vue'
import EntryFormDialog from '@/components/entries/EntryFormDialog.vue'
import EntryDeleteConfirmDialog from '@/components/entries/EntryDeleteConfirmDialog.vue'
import EntryBulkDeleteDialog from '@/components/entries/EntryBulkDeleteDialog.vue'
import EntryStatisticsSection from '@/components/entries/EntryStatisticsSection.vue'
import EntryQuickStats from '@/components/entries/EntryQuickStats.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import type { DataTablePageEvent } from 'primevue/datatable'
// #endregion IMPORTS

// #region STATE
// Pinia stores
const entriesStore = useEntriesStore()
const storesStore = useStoresStore()
const userStore = useUserStore()
const { entries, totalRecords, page, pageSize, sortField, sortOrder, search, storeId, dateFrom, dateTo, loading, error } =
  storeToRefs(entriesStore)
const { loadEntries, removeEntriesLocally, updateEntryLocally, invalidateAndReload } =
  entriesStore

const toast = useToast()
const SEARCH_DEBOUNCE_MS = 300

// Local UI state
const searchInput = ref('')
const selectedRows = ref<EntryListItem[]>([])
const filterPopover = ref()
const quickStatsRef = ref<InstanceType<typeof EntryQuickStats> | null>(null)

// Store options for dropdown
const storeOptions = ref<{ label: string; value: number | null }[]>([{ label: 'All stores', value: null }])

// Draft filter state (applied only on "Apply" click)
const draftSortField = ref<EntriesSortField>(sortField.value)
const draftSortOrder = ref<'asc' | 'desc'>(sortOrder.value)
const draftStoreId = ref<number | null>(storeId.value)
const draftDateFrom = ref<Date | null>(null)
const draftDateTo = ref<Date | null>(null)

const sortFieldOptions = [
  { label: 'ID', value: 'id' },
  { label: 'Date', value: 'date' },
  { label: 'Store', value: 'store' },
]
const sortOrderOptions = [
  { label: 'Ascending', value: 'asc' },
  { label: 'Descending', value: 'desc' },
]

// Dialog visibility & data
const showDetails = ref(false)
const selectedEntry = ref<EntryListItem | null>(null)

const showForm = ref(false)
const editingEntry = ref<EntryListItem | null>(null)

const showDelete = ref(false)
const deleteTarget = ref<{ id: number } | null>(null)

const showBulkDelete = ref(false)
// #endregion STATE

// #region COMPUTED
function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    search.value = val
    page.value = 1
    loadEntries()
  }, SEARCH_DEBOUNCE_MS)
})

watch(error, (msg) => {
  if (msg) {
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  }
})

watch(() => userStore.storesDataSource, () => {
  loadStoreOptions()
})
// #endregion WATCHERS

// #region METHODS
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

function refresh() {
  searchInput.value = ''
  search.value = ''
  sortField.value = 'date'
  sortOrder.value = 'desc'
  storeId.value = null
  dateFrom.value = null
  dateTo.value = null
  syncDraftsFromStore()
  page.value = 1
  selectedRows.value = []
  invalidateAndReload()
}

function onPage(event: DataTablePageEvent) {
  page.value = event.page + 1
  pageSize.value = event.rows
  selectedRows.value = []
  loadEntries()
}

function rowNumber(index: number): number {
  return (page.value - 1) * pageSize.value + index + 1
}

function fmtNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// --- Filters ---
function syncDraftsFromStore() {
  draftSortField.value = sortField.value
  draftSortOrder.value = sortOrder.value
  draftStoreId.value = storeId.value
  draftDateFrom.value = dateFrom.value ? new Date(dateFrom.value + 'T00:00:00') : null
  draftDateTo.value = dateTo.value ? new Date(dateTo.value + 'T00:00:00') : null
}

function applyFilters() {
  sortField.value = draftSortField.value
  sortOrder.value = draftSortOrder.value
  storeId.value = draftStoreId.value
  dateFrom.value = draftDateFrom.value ? toIsoDate(draftDateFrom.value) : null
  dateTo.value = draftDateTo.value ? toIsoDate(draftDateTo.value) : null
  page.value = 1
  loadEntries()
  filterPopover.value.hide()
}

function toggleFilters(event: Event) {
  syncDraftsFromStore()
  filterPopover.value.toggle(event)
}

function resetFilters() {
  draftSortField.value = 'date'
  draftSortOrder.value = 'desc'
  draftStoreId.value = null
  draftDateFrom.value = null
  draftDateTo.value = null
  applyFilters()
}

async function loadStoreOptions() {
  try {
    const result = await userStore.storeApi().fetchStores(1, 1000)
    storeOptions.value = [
      { label: 'All stores', value: null },
      ...result.items.map((s) => ({ label: s.name, value: s.id })),
    ]
  } catch {
    /* silent */
  }
}

// --- Dialog openers ---
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

// --- Dialog transitions ---
function editFromDetails() {
  if (!selectedEntry.value) return
  showDetails.value = false
  editingEntry.value = selectedEntry.value
  showForm.value = true
}

function deleteFromDetails() {
  if (!selectedEntry.value) return
  showDetails.value = false
  deleteTarget.value = { id: selectedEntry.value.id }
  showDelete.value = true
}

// --- Event handlers ---
function refreshQuickStats() {
  quickStatsRef.value?.refresh()
}

function onEntryCreated() {
  invalidateAndReload()
  storesStore.invalidateAndReload()
  refreshQuickStats()
  toast.add({ severity: 'success', summary: 'Entry created', life: 3000 })
}

function onEntryUpdated(data: { id: number; entryDate: string }) {
  updateEntryLocally(data.id, { entryDate: data.entryDate })
  invalidateAndReload()
  refreshQuickStats()
  toast.add({ severity: 'success', summary: 'Entry updated', life: 3000 })
}

function onSingleDeleted() {
  if (deleteTarget.value) {
    removeEntriesLocally([deleteTarget.value.id])
  }
  refetchAfterDelete()
  storesStore.invalidateAndReload()
  refreshQuickStats()
  toast.add({ severity: 'success', summary: 'Entry deleted', life: 3000 })
}

function onBulkDeleted() {
  const ids = selectedRows.value.map((e) => e.id)
  selectedRows.value = []
  removeEntriesLocally(ids)
  refetchAfterDelete()
  storesStore.invalidateAndReload()
  refreshQuickStats()
  toast.add({ severity: 'success', summary: `${ids.length} entries deleted`, life: 3000 })
}

function refetchAfterDelete() {
  if (entries.value.length === 0 && page.value > 1) {
    page.value--
  }
  loadEntries(true)
}
// #endregion METHODS

// #region LIFECYCLE
onMounted(() => {
  page.value = 1
  loadEntries()
  loadStoreOptions()
})

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})
// #endregion LIFECYCLE
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- #region QUICK STATS -->
    <EntryQuickStats ref="quickStatsRef" />
    <!-- #endregion QUICK STATS -->

    <!-- #region TOOLBAR -->
    <div class="flex items-center gap-2">
      <div class="max-w-70 flex-1">
        <SearchBar v-model="searchInput" placeholder="Search by store name..." />
      </div>
      <div class="ml-auto flex items-center gap-2">
        <button
          v-if="selectedRows.length > 0"
          class="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          @click="showBulkDelete = true"
        >
          <i class="pi pi-trash" style="font-size: 12px"></i>
          Delete ({{ selectedRows.length }})
        </button>
        <button
          class="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          title="Refresh"
          @click="refresh"
        >
          <i class="pi pi-refresh" style="font-size: 12px"></i>
        </button>
        <button
          class="relative flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          @click="toggleFilters"
        >
          <i class="pi pi-filter" style="font-size: 12px"></i>
          Filters
          <span
            v-if="activeFilterCount > 0"
            class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[10px] font-semibold text-white"
          >
            {{ activeFilterCount }}
          </span>
        </button>
        <button
          class="flex h-9 cursor-pointer items-center gap-2 rounded-lg border-none bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          @click="openAdd"
        >
          <i class="pi pi-plus" style="font-size: 12px"></i>
          Add entry
        </button>
      </div>
    </div>

    <Popover ref="filterPopover">
      <div class="flex w-60 flex-col gap-3 p-1">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-gray-500">Sort by</label>
          <Select
            v-model="draftSortField"
            :options="sortFieldOptions"
            option-label="label"
            option-value="value"
            size="small"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-gray-500">Order</label>
          <Select
            v-model="draftSortOrder"
            :options="sortOrderOptions"
            option-label="label"
            option-value="value"
            size="small"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-gray-500">Store</label>
          <Select
            v-model="draftStoreId"
            :options="storeOptions"
            option-label="label"
            option-value="value"
            size="small"
            class="w-full"
            filter
            filter-placeholder="Search stores..."
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-gray-500">Date from</label>
          <DatePicker
            v-model="draftDateFrom"
            date-format="dd/mm/yy"
            :max-date="draftDateTo ?? undefined"
            placeholder="Select date"
            showButtonBar
            size="small"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-gray-500">Date to</label>
          <DatePicker
            v-model="draftDateTo"
            date-format="dd/mm/yy"
            :min-date="draftDateFrom ?? undefined"
            :max-date="new Date()"
            placeholder="Select date"
            showButtonBar
            size="small"
            class="w-full"
          />
        </div>
        <div class="mt-1 flex items-center gap-2">
          <button
            class="flex-1 cursor-pointer rounded-lg border-none bg-gray-900 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
            @click="applyFilters"
          >
            Apply
          </button>
          <button
            v-if="activeFilterCount > 0"
            class="cursor-pointer rounded-md border-none bg-transparent px-0 py-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
            @click="resetFilters"
          >
            Reset
          </button>
        </div>
      </div>
    </Popover>
    <!-- #endregion TOOLBAR -->

    <!-- #region TABLE -->
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
      @row-click="(e: { data: EntryListItem }) => openDetails(e.data)"
      class="entries-table"
    >
      <template #paginatorstart>
        <span class="text-xs text-gray-400">Total: {{ fmtNum(totalRecords) }} entries</span>
      </template>
      <Column selection-mode="multiple" style="width: 40px" />
      <Column header="#" style="width: 72px">
        <template #body="{ index }">
          <span class="whitespace-nowrap text-xs font-medium text-gray-400">{{ fmtNum(rowNumber(index)) }}</span>
        </template>
      </Column>
      <Column field="id" header="ID" style="width: 72px" />
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
              @click.stop="openDetails(data)"
            >
              <i class="pi pi-eye" style="font-size: 13px"></i>
            </button>
            <button
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
              title="Edit"
              @click.stop="openEdit(data)"
            >
              <i class="pi pi-pencil" style="font-size: 13px"></i>
            </button>
            <button
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Delete"
              @click.stop="openDelete(data)"
            >
              <i class="pi pi-trash" style="font-size: 13px"></i>
            </button>
          </div>
        </template>
      </Column>
    </DataTable>
    <!-- #endregion TABLE -->

    <!-- #region DIALOGS -->
    <EntryDetailsDialog
      v-model:visible="showDetails"
      :entry="selectedEntry"
      @edit="editFromDetails"
      @delete="deleteFromDetails"
    />

    <EntryFormDialog
      v-model:visible="showForm"
      :entry="editingEntry"
      :store-name="editingEntry?.storeName ?? ''"
      @created="onEntryCreated"
      @updated="onEntryUpdated"
    />

    <EntryDeleteConfirmDialog
      v-model:visible="showDelete"
      :entry-id="deleteTarget?.id ?? null"
      @deleted="onSingleDeleted"
    />

    <EntryBulkDeleteDialog
      v-model:visible="showBulkDelete"
      :entry-ids="selectedRows.map((e) => e.id)"
      @deleted="onBulkDeleted"
    />
    <!-- #endregion DIALOGS -->

    <!-- #region CHARTS -->
    <EntryStatisticsSection />
    <!-- #endregion CHARTS -->
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
</style>
