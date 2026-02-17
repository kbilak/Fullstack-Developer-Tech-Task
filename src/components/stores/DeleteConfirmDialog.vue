<script setup lang="ts">
// #region IMPORTS
import { ref } from 'vue'
import { deleteStore } from '@/services/api/storeApi'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
// #endregion IMPORTS

// #region PROPS & EMITS
const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  storeId: number | null
  storeName: string
}>()

const emit = defineEmits<{
  deleted: []
}>()
// #endregion PROPS & EMITS

// #region STATE
const loading = ref(false)
// #endregion STATE

// #region METHODS
/**
 * @method handleDelete
 * @summary Deletes a single store by ID and closes dialog on success
 */
async function handleDelete() {
  if (!props.storeId) return
  loading.value = true
  try {
    await deleteStore(props.storeId)
    visible.value = false
    emit('deleted')
  } catch {
    // noop — keep dialog open so user can retry
  } finally {
    loading.value = false
  }
}
// #endregion METHODS

const dialogPt = {
  root: { class: 'rounded-2xl!' },
  header: { class: 'border-b border-gray-100 px-6! py-4!' },
  content: { class: 'px-6! py-5!' },
  footer: { class: 'border-t border-gray-100 px-6! py-4!' },
}
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '400px' }" :pt="dialogPt">
    <template #header>
      <span class="text-base font-semibold text-gray-900">Delete store</span>
    </template>

    <div class="flex flex-col items-center gap-3 py-2 text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <i class="pi pi-exclamation-triangle text-xl"></i>
      </div>
      <p class="text-sm text-gray-700">
        Delete <strong>{{ storeName }}</strong>? This can't be undone.
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          text
          severity="secondary"
          size="small"
          :disabled="loading"
          @click="visible = false"
        />
        <Button
          label="Delete"
          severity="danger"
          size="small"
          :loading="loading"
          @click="handleDelete"
        />
      </div>
    </template>
  </Dialog>
</template>
