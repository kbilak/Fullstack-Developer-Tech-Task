<script setup lang="ts">
// #region IMPORTS
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useStoresStore } from '@/stores/useStoresStore'
import type { StoreListItem, StoreDetail } from '@/types/store'
import { useToast } from 'primevue/usetoast'
import SectionLoader from '@/components/common/SectionLoader.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import StoreDetailsDialog from '@/components/stores/StoreDetailsDialog.vue'
import StoreFormDialog from '@/components/stores/StoreFormDialog.vue'
import DeleteConfirmDialog from '@/components/stores/DeleteConfirmDialog.vue'
import BulkDeleteDialog from '@/components/stores/BulkDeleteDialog.vue'
import AddEntryDialog from '@/components/stores/AddEntryDialog.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import type { DataTablePageEvent, DataTableRowClickEvent } from 'primevue/datatable'
// #endregion IMPORTS

// #region STATE
// Pinia store — reactive refs for list data, pagination, sort & search
const storesStore = useStoresStore()
const { stores, totalRecords, page, pageSize, sortField, sortOrder, search, loading, error } =
  storeToRefs(storesStore)
const {
  loadStores,
  getStoreDetail,
  removeStoresLocally,
  updateStoreLocally,
  incrementEntryCount,
  invalidateAndReload,
} = storesStore

const toast = useToast()
const SEARCH_DEBOUNCE_MS = 300

// Local UI state (not shared with other components)
const searchInput = ref('')
const selectedRows = ref<StoreListItem[]>([])
const filterPopover = ref()
const sortFieldOptions = [
  { label: 'ID', value: 'id' },
  { label: 'Name', value: 'name' },
]
const sortOrderOptions = [
  { label: 'Ascending', value: 'asc' },
  { label: 'Descending', value: 'desc' },
]

// Dialog visibility & data
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
// #endregion STATE

// #region COMPUTED
/** @computed activeFilterCount — Number of non-default filter settings (for badge display) */
const activeFilterCount = computed(() => {
  let count = 0
  if (sortField.value !== 'id') count++
  if (sortOrder.value !== 'asc') count++
  return count
})

/** @computed entryCountRange — Min/max entry counts across stores for badge color scaling */
const entryCountRange = computed(() => {
  const counts = stores.value.map((s) => s.entryCount).filter((c) => c > 0)
  if (counts.length === 0) return { min: 0, max: 0 }
  return { min: Math.min(...counts), max: Math.max(...counts) }
})
// #endregion COMPUTED

// #region WATCHERS
// Debounce search input — avoids firing API calls on every keystroke
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    search.value = val
    page.value = 1
    loadStores()
  }, SEARCH_DEBOUNCE_MS)
})

// Reset to first page whenever sort changes
watch([sortField, sortOrder], () => {
  page.value = 1
  loadStores()
})

// Show toast notification when the store reports an error
watch(error, (msg) => {
  if (msg) {
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  }
})
// #endregion WATCHERS

// #region METHODS
/** Returns Tailwind color classes for entry count badge based on relative range. */
function entryBadgeClasses(count: number): string {
  if (count === 0) return 'bg-gray-100 text-gray-500'
  const { min, max } = entryCountRange.value
  if (min === max) return 'bg-emerald-50 text-emerald-600'
  const ratio = (count - min) / (max - min)
  if (ratio <= 0.25) return 'bg-red-50 text-red-600'
  if (ratio <= 0.5) return 'bg-amber-50 text-amber-600'
  if (ratio <= 0.75) return 'bg-blue-50 text-blue-600'
  return 'bg-emerald-50 text-emerald-600'
}

// Clears all filters, resets pagination and reloads from server
function refresh() {
  searchInput.value = ''
  search.value = ''
  page.value = 1
  selectedRows.value = []
  invalidateAndReload()
}

// Handles DataTable pagination events (0-indexed → 1-indexed)
function onPage(event: DataTablePageEvent) {
  page.value = event.page + 1
  pageSize.value = event.rows
  selectedRows.value = []
  loadStores()
}

// Opens details dialog on row click (except when clicking action buttons, which have their own handlers)
function onRowClick(event: DataTableRowClickEvent) {
  openDetails(event.data as StoreListItem)
}

// Opens the details dialog and fetches full store data in the background
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

// Opens the form dialog in add mode — no data fetching needed, so shows immediately
function openAdd() {
  editingStore.value = null
  showForm.value = true
}

// Opens form in edit mode — shows dialog immediately while detail loads
async function openEdit(store: StoreListItem) {
  formDetailLoading.value = true
  editingStore.value = null
  showForm.value = true
  try {
    editingStore.value = await getStoreDetail(store.id)
  } catch {
    showForm.value = false
  } finally {
    formDetailLoading.value = false
  }
}

// Transitions between dialogs: details → edit form
function editFromDetails() {
  if (!selectedStore.value) return
  showDetails.value = false
  editingStore.value = selectedStore.value
  showForm.value = true
}

// Transitions between dialogs: details → delete confirmation
function deleteFromDetails() {
  if (!selectedStore.value) return
  showDetails.value = false
  deleteTarget.value = { id: selectedStore.value.id, name: selectedStore.value.name }
  showDelete.value = true
}

// Transitions between dialogs: edit form → delete confirmation
function openDeleteFromForm() {
  if (!editingStore.value) return
  showForm.value = false
  deleteTarget.value = { id: editingStore.value.id, name: editingStore.value.name }
  showDelete.value = true
}

function onStoreCreated() {
  invalidateAndReload()
  toast.add({ severity: 'success', summary: 'Store created', life: 3000 })
}

// Optimistically patches the name, then refetches to get correct server ordering
function onStoreUpdated(data: { id: number; name: string }) {
  updateStoreLocally(data.id, { name: data.name })
  invalidateAndReload()
  toast.add({ severity: 'success', summary: 'Store updated', life: 3000 })
}

// Optimistically removes the deleted store, then backfills from server
function onSingleDeleted() {
  if (deleteTarget.value) {
    removeStoresLocally([deleteTarget.value.id])
  }
  refetchAfterDelete()
  toast.add({ severity: 'success', summary: 'Store deleted', life: 3000 })
}

// Bulk variant — clears selection first, then removes and backfills
function onBulkDeleted() {
  const ids = selectedRows.value.map((s) => s.id)
  selectedRows.value = []
  removeStoresLocally(ids)
  refetchAfterDelete()
  toast.add({ severity: 'success', summary: `${ids.length} stores deleted`, life: 3000 })
}

function onEntryAdded() {
  if (addEntryTarget.value) incrementEntryCount(addEntryTarget.value.id)
  toast.add({ severity: 'success', summary: 'Entry added', life: 3000 })
}

// After optimistic removal: go back a page if current page is empty, then refetch
function refetchAfterDelete() {
  if (stores.value.length === 0 && page.value > 1) {
    page.value--
  }
  loadStores(true)
}

function toggleFilters(event: Event) {
  filterPopover.value.toggle(event)
}

// Resets sort to defaults — watcher will trigger refetch automatically
function resetFilters() {
  sortField.value = 'id'
  sortOrder.value = 'asc'
}

// Computes global row number from page offset + local index
function rowNumber(index: number): number {
  return (page.value - 1) * pageSize.value + index + 1
}

function openAddEntry(store: StoreListItem) {
  addEntryTarget.value = { id: store.id, name: store.name }
  showAddEntry.value = true
}

function openDelete(store: StoreListItem) {
  deleteTarget.value = { id: store.id, name: store.name }
  showDelete.value = true
}
// #endregion METHODS

// #region LIFECYCLE
onMounted(() => {
  page.value = 1
  loadStores()
})

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})
// #endregion LIFECYCLE
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- #region TOOLBAR -->
    <div class="flex items-center gap-2">
      <div class="max-w-70 flex-1">
        <SearchBar v-model="searchInput" placeholder="Search stores..." />
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
          Add store
        </button>
      </div>
    </div>

    <Popover ref="filterPopover">
      <div class="flex w-60 flex-col gap-3 p-1">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-gray-500">Sort by</label>
          <Select
            v-model="sortField"
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
            v-model="sortOrder"
            :options="sortOrderOptions"
            option-label="label"
            option-value="value"
            size="small"
            class="w-full"
          />
        </div>
        <button
          v-if="activeFilterCount > 0"
          class="mt-1 cursor-pointer rounded-md border-none bg-transparent px-0 py-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
          @click="resetFilters"
        >
          Reset filters
        </button>
      </div>
    </Popover>
    <!-- #endregion TOOLBAR -->

    <!-- #region TABLE -->
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
      :rows-per-page-options="[10, 20, 50]"
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      @page="onPage"
      @row-click="onRowClick"
      class="stores-table"
    >
      <template #paginatorstart>
        <span class="text-xs text-gray-400">Total: {{ totalRecords }} stores</span>
      </template>
      <Column selection-mode="multiple" style="width: 40px" />
      <Column header="#" style="width: 56px">
        <template #body="{ index }">
          <span class="text-xs font-medium text-gray-400">{{ rowNumber(index) }}</span>
        </template>
      </Column>
      <Column field="id" header="ID" style="width: 72px" />
      <Column field="name" header="Name" />
      <Column header="Entries" style="width: 100px">
        <template #body="{ data }">
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="entryBadgeClasses(data.entryCount)"
          >
            {{ data.entryCount }}
          </span>
        </template>
      </Column>
      <Column header="Actions" style="width: 152px">
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
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              title="Add entry"
              @click.stop="openAddEntry(data)"
            >
              <i class="pi pi-sign-in" style="font-size: 13px"></i>
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
    <StoreDetailsDialog
      v-model:visible="showDetails"
      :store="selectedStore"
      :loading="detailsLoading"
      :entry-count="detailsEntryCount"
      @edit="editFromDetails"
      @delete="deleteFromDetails"
    />

    <StoreFormDialog
      v-model:visible="showForm"
      :store="editingStore"
      :detail-loading="formDetailLoading"
      @created="onStoreCreated"
      @updated="onStoreUpdated"
      @delete="openDeleteFromForm"
    />

    <DeleteConfirmDialog
      v-model:visible="showDelete"
      :store-id="deleteTarget?.id ?? null"
      :store-name="deleteTarget?.name ?? ''"
      @deleted="onSingleDeleted"
    />

    <BulkDeleteDialog
      v-model:visible="showBulkDelete"
      :store-ids="selectedRows.map((s) => s.id)"
      @deleted="onBulkDeleted"
    />
    <AddEntryDialog
      v-model:visible="showAddEntry"
      :store-id="addEntryTarget?.id ?? null"
      :store-name="addEntryTarget?.name ?? ''"
      @added="onEntryAdded"
    />
    <!-- #endregion DIALOGS -->
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
</style>
