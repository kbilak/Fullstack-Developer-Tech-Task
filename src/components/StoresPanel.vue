<script setup lang="ts">
// #region IMPORTS
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useStoresStore } from '@/stores/useStoresStore'
import { useUserStore } from '@/stores/useUserStore'
import type { StoreListItem, StoreDetail } from '@/types/store'
import { useToast } from 'primevue/usetoast'
import SectionLoader from '@/components/common/SectionLoader.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import StoreDetailsDialog from '@/components/stores/StoreDetailsDialog.vue'
import StoreFormDialog from '@/components/stores/StoreFormDialog.vue'
import DeleteConfirmDialog from '@/components/stores/DeleteConfirmDialog.vue'
import BulkDeleteDialog from '@/components/stores/BulkDeleteDialog.vue'
import AddEntryDialog from '@/components/stores/AddEntryDialog.vue'
import StoreStatisticsDialog from '@/components/stores/StoreStatisticsDialog.vue'
import StoreCompareDialog from '@/components/stores/StoreCompareDialog.vue'
import StoreQuickStats from '@/components/stores/StoreQuickStats.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import type { DataTablePageEvent, DataTableRowClickEvent } from 'primevue/datatable'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)
// #endregion IMPORTS

// #region STATE
// Pinia stores
const storesStore = useStoresStore()
const userStore = useUserStore()
const { stores, totalRecords, page, pageSize, sortField, sortOrder, search, loading, error } =
  storeToRefs(storesStore)
const { storesChartSort: chartSort } = storeToRefs(userStore)
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
const quickStatsRef = ref<InstanceType<typeof StoreQuickStats> | null>(null)
const searchInput = ref('')
const selectedRows = ref<StoreListItem[]>([])
const filterPopover = ref()
const sortFieldOptions = [
  { label: 'ID', value: 'id' },
  { label: 'Name', value: 'name' },
  { label: 'Entries', value: 'entries' },
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

const showStatistics = ref(false)
const statisticsTarget = ref<{ id: number; name: string } | null>(null)

const showCompare = ref(false)

// Chart ↔ table hover sync (by store ID so it works regardless of chart sort order)
const hoveredStoreId = ref<number | null>(null)
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

/** Returns a hex color for an entry count based on its position in the min–max range. */
function entryBarColor(count: number): string {
  if (count === 0) return '#9ca3af'
  const { min, max } = entryCountRange.value
  if (min === max) return '#059669'
  const ratio = (count - min) / (max - min)
  if (ratio <= 0.25) return '#dc2626'
  if (ratio <= 0.5) return '#d97706'
  if (ratio <= 0.75) return '#2563eb'
  return '#059669'
}

/** Stores ordered for the chart (optionally sorted by entry count). */
const chartStores = computed(() => {
  if (!chartSort.value) return stores.value
  return [...stores.value].sort((a, b) => b.entryCount - a.entryCount)
})

const chartData = computed(() => ({
  labels: chartStores.value.map((s) => s.name),
  datasets: [
    {
      label: 'Entries',
      data: chartStores.value.map((s) => s.entryCount),
      backgroundColor: chartStores.value.map((s) => {
        const base = entryBarColor(s.entryCount)
        if (hoveredStoreId.value === null) return base
        return s.id === hoveredStoreId.value ? base : `${base}26`
      }),
      borderRadius: 4,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  onHover: (_event: unknown, elements: { index: number }[]) => {
    hoveredStoreId.value = elements.length > 0 ? chartStores.value[elements[0]!.index]?.id ?? null : null
  },
  plugins: {
    legend: { display: false },
    title: { display: true, text: 'Entries per store', color: '#374151', font: { size: 14, weight: 'bold' as const } },
    tooltip: { callbacks: { label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} entries` } },
  },
  scales: {
    x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: '#6b7280', font: { size: 11 }, precision: 0 }, grid: { color: '#f3f4f6' } },
  },
}))

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
  quickStatsRef.value?.refresh()
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

// Opens form in edit mode — sets placeholder so dialog shows "Edit store" + spinner
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
  quickStatsRef.value?.refresh()
  toast.add({ severity: 'success', summary: 'Store created', life: 3000 })
}

// Optimistically patches the name, then refetches to get correct server ordering
function onStoreUpdated(data: { id: number; name: string }) {
  updateStoreLocally(data.id, { name: data.name })
  invalidateAndReload()
  quickStatsRef.value?.refresh()
  toast.add({ severity: 'success', summary: 'Store updated', life: 3000 })
}

// Optimistically removes the deleted store, then backfills from server
function onSingleDeleted() {
  if (deleteTarget.value) {
    removeStoresLocally([deleteTarget.value.id])
  }
  refetchAfterDelete()
  quickStatsRef.value?.refresh()
  toast.add({ severity: 'success', summary: 'Store deleted', life: 3000 })
}

// Bulk variant — clears selection first, then removes and backfills
function onBulkDeleted() {
  const ids = selectedRows.value.map((s) => s.id)
  selectedRows.value = []
  removeStoresLocally(ids)
  refetchAfterDelete()
  quickStatsRef.value?.refresh()
  toast.add({ severity: 'success', summary: `${ids.length} stores deleted`, life: 3000 })
}

function onEntryAdded() {
  if (addEntryTarget.value) incrementEntryCount(addEntryTarget.value.id)
  quickStatsRef.value?.refresh()
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

function openStatistics(store: StoreListItem) {
  statisticsTarget.value = { id: store.id, name: store.name }
  showStatistics.value = true
}

function openDelete(store: StoreListItem) {
  deleteTarget.value = { id: store.id, name: store.name }
  showDelete.value = true
}

// Highlights table row matching the hovered chart bar (and vice versa)
function rowHighlightClass(data: StoreListItem) {
  return data.id === hoveredStoreId.value ? 'chart-hovered-row' : ''
}

// Event delegation: resolves hovered store ID from mouseover on tbody rows
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

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})
// #endregion LIFECYCLE
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- #region QUICK STATS -->
    <StoreQuickStats ref="quickStatsRef" />
    <!-- #endregion QUICK STATS -->

    <!-- #region TOOLBAR -->
    <div class="flex items-center gap-2">
      <div class="max-w-70 flex-1">
        <SearchBar v-model="searchInput" placeholder="Search stores..." />
      </div>
      <div class="ml-auto flex items-center gap-2">
        <button
          v-if="selectedRows.length > 0"
          class="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
          @click="showCompare = true"
        >
          <i class="pi pi-chart-line" style="font-size: 12px"></i>
          Compare ({{ selectedRows.length }})
        </button>
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
      <Column header="Actions" style="width: 184px">
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
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              title="View entries"
              @click.stop="openStatistics(data)"
            >
              <i class="pi pi-chart-bar" style="font-size: 13px"></i>
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

    <!-- #region CHART -->
    <div v-if="stores.length > 0" class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <button
          class="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors"
          :class="chartSort === 'desc' ? 'border-indigo-200 bg-indigo-50 text-indigo-600' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
          @click="chartSort = chartSort === 'desc' ? null : 'desc'"
        >
          <i class="pi pi-sort-amount-down" style="font-size: 11px"></i>
          Most → Least
        </button>
      </div>
      <div
        class="relative rounded-lg border border-gray-200 bg-white p-4"
        style="height: 300px"
        @mouseleave="hoveredStoreId = null"
      >
        <Bar :data="chartData" :options="chartOptions" />
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
          <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
        </div>
      </div>
      <div class="flex items-center justify-center gap-4 text-[11px] text-gray-500">
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #dc2626"></span>
          Low (0–25%)
        </span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #d97706"></span>
          Medium (25–50%)
        </span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #2563eb"></span>
          High (50–75%)
        </span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #059669"></span>
          Top (75–100%)
        </span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #9ca3af"></span>
          No data
        </span>
      </div>
    </div>
    <!-- #endregion CHART -->

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
    <StoreStatisticsDialog
      v-model:visible="showStatistics"
      :store-id="statisticsTarget?.id ?? null"
      :store-name="statisticsTarget?.name ?? ''"
    />
    <StoreCompareDialog
      v-model:visible="showCompare"
      :stores="selectedRows.map((s) => ({ id: s.id, name: s.name }))"
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
.stores-table :deep(.chart-hovered-row > td) {
  background-color: #eef2ff !important;
}
</style>
