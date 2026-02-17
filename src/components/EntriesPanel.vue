<script setup lang="ts">
// #region IMPORTS
import { ref, onMounted } from 'vue'
import { fetchEntries } from '@/services/api/entryApi'
import type { EntryListItem } from '@/types/entry'
import SectionLoader from '@/components/common/SectionLoader.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { DataTablePageEvent } from 'primevue/datatable'
// #endregion IMPORTS

// #region STATE
const entries = ref<EntryListItem[]>([])
const totalRecords = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const error = ref<string | null>(null)
// #endregion STATE

// #region METHODS
async function loadEntries() {
  loading.value = true
  error.value = null
  try {
    const result = await fetchEntries(page.value, pageSize.value)
    entries.value = result.items
    totalRecords.value = result.totalItems
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load entries'
  } finally {
    loading.value = false
  }
}

function onPage(event: DataTablePageEvent) {
  page.value = event.page + 1
  pageSize.value = event.rows
  loadEntries()
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
// #endregion METHODS

// #region LIFECYCLE
onMounted(() => {
  loadEntries()
})
// #endregion LIFECYCLE
</script>

<template>
  <div>
    <SectionLoader v-if="loading && entries.length === 0" message="Loading entries..." />

    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <span class="text-sm text-red-600">{{ error }}</span>
    </div>

    <div v-else-if="!loading && entries.length === 0" class="py-12 text-center">
      <p class="text-sm text-gray-400">No entries found</p>
    </div>

    <DataTable
      v-else
      :value="entries"
      :loading="loading"
      lazy
      paginator
      :rows="pageSize"
      :total-records="totalRecords"
      :rows-per-page-options="[10, 20, 50]"
      @page="onPage"
      striped-rows
    >
      <Column field="id" header="ID" style="width: 80px" />
      <Column field="idStore" header="Store ID" style="width: 120px" />
      <Column field="entryDate" header="Date">
        <template #body="{ data }">
          {{ formatDate(data.entryDate) }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>
