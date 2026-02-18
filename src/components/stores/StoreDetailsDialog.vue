<script setup lang="ts">
// #region IMPORTS
import type { StoreDetail } from '@/types/store'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
// #endregion IMPORTS

// #region PROPS & EMITS
const visible = defineModel<boolean>('visible', { required: true })

defineProps<{
  store: StoreDetail | null
  loading: boolean
  entryCount: number
}>()

defineEmits<{
  edit: []
  delete: []
}>()
// #endregion PROPS & EMITS

import { dialogPt } from '@/utils/dialog'
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '480px' }" :pt="dialogPt">
    <template #header>
      <span class="text-base font-semibold text-gray-900">Store details</span>
    </template>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
    </div>

    <div v-else-if="store" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Name</span>
        <span class="text-sm text-gray-900">{{ store.name }}</span>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">City</span>
          <span class="text-sm text-gray-900">{{ store.city }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Country</span>
          <span class="text-sm text-gray-900">{{ store.country }}</span>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">ID</span>
          <span class="text-sm text-gray-500">#{{ store.id }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Entries</span>
          <span class="text-sm text-gray-900">{{ entryCount }}</span>
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
