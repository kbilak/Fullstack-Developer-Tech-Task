<script setup lang="ts">
// #region IMPORTS
import { ref, onUnmounted } from 'vue'
import TabNav from '@/components/common/TabNav.vue'
import { useStoresStore } from '@/stores/useStoresStore'
import StoresPanel from '@/components/StoresPanel.vue'
import EntriesPanel from '@/components/EntriesPanel.vue'
// #endregion IMPORTS

// #region STATE
const storesStore = useStoresStore()

const activeTab = ref('stores')

const tabs = [
  { id: 'stores', label: 'Stores' },
  { id: 'entries', label: 'Entries' },
]
// #endregion STATE

// #region LIFECYCLE
onUnmounted(() => storesStore.$reset())
// #endregion LIFECYCLE
</script>

<template>
  <div class="min-h-screen bg-white">
    <header class="border-b border-gray-200 px-8 py-5">
      <h1 class="text-xl font-semibold tracking-tight text-gray-900">Store Analytics</h1>
      <p class="mt-1 text-sm text-gray-500">Visitor statistics across all locations</p>
    </header>

    <main class="mx-auto max-w-5xl px-8 py-8">
      <TabNav v-model="activeTab" :tabs="tabs" />

      <div class="pt-4">
        <StoresPanel v-if="activeTab === 'stores'" />
        <EntriesPanel v-if="activeTab === 'entries'" />
      </div>
    </main>
  </div>
</template>
