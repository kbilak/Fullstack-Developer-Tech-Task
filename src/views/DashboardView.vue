<script setup lang="ts">
// #region IMPORTS
import { computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabNav from '@/components/common/TabNav.vue'
import SelectButton from 'primevue/selectbutton'
import { useStoresStore } from '@/stores/useStoresStore'
import { useEntriesStore } from '@/stores/useEntriesStore'
import { useUserStore } from '@/stores/useUserStore'
import StoresPanel from '@/components/StoresPanel.vue'
import EntriesPanel from '@/components/EntriesPanel.vue'
// #endregion IMPORTS

// #region STATE
const route = useRoute()
const router = useRouter()
const storesStore = useStoresStore()
const entriesStore = useEntriesStore()
const userStore = useUserStore()

const validTabs = ['stores', 'entries']
/**
 * Writable computed that syncs the active tab with the URL query parameter `?tab=stores|entries`.
 * Defaults to 'stores' when the query value is missing or invalid.
 */
const activeTab = computed({
  get: () => {
    const tab = route.query.tab as string
    return validTabs.includes(tab) ? tab : 'stores'
  },
  set: (val: string) => {
    router.replace({ query: { ...route.query, tab: val } })
  },
})

const dataSourceOptions = [
  { label: 'API', value: 'api' },
  { label: 'Test data', value: 'test' },
]

const tabs = [
  { id: 'stores', label: 'Stores', icon: 'pi pi-shop' },
  { id: 'entries', label: 'Entries', icon: 'pi pi-list' },
]
// #endregion STATE

// #region WATCHERS
/** Resets both stores and entries Pinia stores when the user switches data source (API <-> test data). */
watch(() => userStore.storesDataSource, () => {
  storesStore.$reset()
  storesStore.loadStores()
  entriesStore.$reset()
  entriesStore.loadEntries()
})
// #endregion WATCHERS

// #region LIFECYCLE
onUnmounted(() => {
  storesStore.$reset()
  entriesStore.$reset()
})
// #endregion LIFECYCLE
</script>

<template>
  <div class="min-h-screen bg-white">
    <header class="flex items-center justify-between border-b border-gray-200 px-4 py-5 sm:px-8">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-gray-900">Store Analytics</h1>
        <p class="mt-1 text-sm text-gray-500">Visitor statistics across all locations</p>
      </div>
      <SelectButton
        v-model="userStore.storesDataSource"
        :options="dataSourceOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
      />
    </header>

    <main class="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <TabNav v-model="activeTab" :tabs="tabs" />

      <div class="pt-4">
        <StoresPanel v-if="activeTab === 'stores'" />
        <EntriesPanel v-if="activeTab === 'entries'" />
      </div>
    </main>
  </div>
</template>
