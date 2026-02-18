<script setup lang="ts">
/**
 * Toolbar for the stores table — includes search bar, action buttons
 * (compare, bulk delete, refresh, add), and a filter popover with
 * sort field/order selects.
 */

// #region IMPORTS
import { ref } from 'vue'
import SearchBar from '@/components/common/SearchBar.vue'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
// #endregion IMPORTS

// #region PROPS & EMITS
const search = defineModel<string>('search', { required: true })
const sortField = defineModel<string>('sortField', { required: true })
const sortOrder = defineModel<string>('sortOrder', { required: true })

defineProps<{
  selectedCount: number
  activeFilterCount: number
}>()

const emit = defineEmits<{
  refresh: []
  add: []
  compare: []
  bulkDelete: []
}>()
// #endregion PROPS & EMITS

// #region STATE
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
// #endregion STATE

// #region METHODS
function toggleFilters(event: Event) {
  filterPopover.value.toggle(event)
}

/** Resets sort settings to defaults (id, asc). */
function resetFilters() {
  sortField.value = 'id'
  sortOrder.value = 'asc'
}
// #endregion METHODS
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div class="w-full sm:max-w-70 sm:flex-1">
      <SearchBar v-model="search" placeholder="Search stores..." />
    </div>
    <div class="flex items-center gap-2 sm:ml-auto">
      <button
        v-if="selectedCount > 0"
        class="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
        @click="emit('compare')"
      >
        <i class="pi pi-chart-line" style="font-size: 12px"></i>
        Compare ({{ selectedCount }})
      </button>
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
</template>
