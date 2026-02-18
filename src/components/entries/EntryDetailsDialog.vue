<script setup lang="ts">
// #region IMPORTS
import { ref, watch } from 'vue'
import type { EntryListItem } from '@/types/entry'
import { useUserStore } from '@/stores/useUserStore'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
// #endregion IMPORTS

// #region PROPS & EMITS
const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  entry: EntryListItem | null
}>()

defineEmits<{
  edit: []
  delete: []
}>()
// #endregion PROPS & EMITS

// #region STATE
const { storeApi } = useUserStore()
const storeCity = ref('')
const storeCountry = ref('')
const loadingStore = ref(false)
// #endregion STATE

// #region WATCHERS
watch(visible, async (open) => {
  if (open && props.entry) {
    storeCity.value = ''
    storeCountry.value = ''
    loadingStore.value = true
    try {
      const detail = await storeApi().fetchStore(props.entry.idStore)
      storeCity.value = detail.city
      storeCountry.value = detail.country
    } catch {
      storeCity.value = '—'
      storeCountry.value = '—'
    } finally {
      loadingStore.value = false
    }
  }
})
// #endregion WATCHERS

// #region HELPERS
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
// #endregion HELPERS

const dialogPt = {
  root: { class: 'rounded-2xl!' },
  header: { class: 'border-b border-gray-100 px-6! py-4!' },
  content: { class: 'px-6! py-5!' },
  footer: { class: 'border-t border-gray-100 px-6! py-4!' },
}
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '480px' }" :pt="dialogPt">
    <template #header>
      <span class="text-base font-semibold text-gray-900">Entry details</span>
    </template>

    <div v-if="entry" class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">ID</span>
          <span class="text-sm text-gray-500">#{{ entry.id }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Date</span>
          <span class="text-sm text-gray-900">{{ formatDate(entry.entryDate) }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Store</span>
        <span class="text-sm text-gray-900">{{ entry.storeName }}</span>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">City</span>
          <i v-if="loadingStore" class="pi pi-spin pi-spinner text-sm text-gray-400"></i>
          <span v-else class="text-sm text-gray-900">{{ storeCity }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Country</span>
          <i v-if="loadingStore" class="pi pi-spin pi-spinner text-sm text-gray-400"></i>
          <span v-else class="text-sm text-gray-900">{{ storeCountry }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full justify-between">
        <Button
          label="Delete"
          icon="pi pi-trash"
          severity="danger"
          text
          size="small"
          @click="$emit('delete')"
        />
        <Button
          label="Edit"
          icon="pi pi-pencil"
          severity="secondary"
          outlined
          size="small"
          @click="$emit('edit')"
        />
      </div>
    </template>
  </Dialog>
</template>
