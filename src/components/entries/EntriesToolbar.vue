<script setup lang="ts">
/**
 * Toolbar for the entries table — includes search bar, action buttons,
 * and a filter popover with draft/apply pattern (changes are applied
 * only on "Apply" click).
 */

// #region IMPORTS
import { ref } from 'vue'
import type { EntriesSortField } from '@/stores/useUserStore'
import SearchBar from '@/components/common/SearchBar.vue'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
// #endregion IMPORTS

// #region PROPS & EMITS
const search = defineModel<string>('search', { required: true })

const props = defineProps<{
  selectedCount: number
  activeFilterCount: number
  sortField: EntriesSortField
  sortOrder: 'asc' | 'desc'
  storeId: number | null
  dateFrom: string | null
  dateTo: string | null
  storeOptions: { label: string; value: number | null }[]
}>()

/** Filter values emitted when the user clicks "Apply". */
export interface EntriesFilterValues {
  sortField: EntriesSortField
  sortOrder: 'asc' | 'desc'
  storeId: number | null
  dateFrom: string | null
  dateTo: string | null
}

const emit = defineEmits<{
  refresh: []
  add: []
  bulkDelete: []
  applyFilters: [EntriesFilterValues]
  resetFilters: []
}>()
// #endregion PROPS & EMITS

// #region STATE
const filterPopover = ref()

// Draft filter state (applied only on "Apply" click)
const draftSortField = ref<EntriesSortField>(props.sortField)
const draftSortOrder = ref<'asc' | 'desc'>(props.sortOrder)
const draftStoreId = ref<number | null>(props.storeId)
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
// #endregion STATE

// #region METHODS
function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Resets draft state to match the current active filters (called when the popover opens). */
function syncDraftsFromProps() {
  draftSortField.value = props.sortField
  draftSortOrder.value = props.sortOrder
  draftStoreId.value = props.storeId
  draftDateFrom.value = props.dateFrom ? new Date(props.dateFrom + 'T00:00:00') : null
  draftDateTo.value = props.dateTo ? new Date(props.dateTo + 'T00:00:00') : null
}

/** Emits draft filter values to the parent and closes the popover. */
function applyFilters() {
  emit('applyFilters', {
    sortField: draftSortField.value,
    sortOrder: draftSortOrder.value,
    storeId: draftStoreId.value,
    dateFrom: draftDateFrom.value ? toIsoDate(draftDateFrom.value) : null,
    dateTo: draftDateTo.value ? toIsoDate(draftDateTo.value) : null,
  })
  filterPopover.value.hide()
}

function toggleFilters(event: Event) {
  syncDraftsFromProps()
  filterPopover.value.toggle(event)
}

/** Resets all drafts to defaults and immediately applies them. */
function resetFilters() {
  draftSortField.value = 'date'
  draftSortOrder.value = 'desc'
  draftStoreId.value = null
  draftDateFrom.value = null
  draftDateTo.value = null
  applyFilters()
}
// #endregion METHODS
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div class="w-full sm:max-w-70 sm:flex-1">
      <SearchBar v-model="search" placeholder="Search by store name..." />
    </div>
    <div class="flex items-center gap-2 sm:ml-auto">
      <button
        v-if="selectedCount > 0"
        class="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
        @click="emit('bulkDelete')"
      >
        <i class="pi pi-trash" style="font-size: 12px"></i>
        Delete ({{ selectedCount }})
      </button>
      <button
        class="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        title="Refresh"
        @click="emit('refresh')"
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
        @click="emit('add')"
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
</template>
