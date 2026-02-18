<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ApiResult } from '@/types/api'
import { dialogPt } from '@/utils/dialog'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const visible = defineModel<boolean>('visible', { required: true })

const props = withDefaults(defineProps<{
  title?: string
  message: string
  confirmLabel?: string
  deleteFn: () => Promise<ApiResult>
}>(), {
  title: 'Confirm delete',
  confirmLabel: 'Delete',
})

const emit = defineEmits<{
  deleted: []
}>()

const loading = ref(false)
const error = ref<string | null>(null)

watch(visible, (open) => {
  if (open) error.value = null
})

async function handleDelete() {
  loading.value = true
  error.value = null
  try {
    const result = await props.deleteFn()
    if (!result.status) {
      error.value = result.message ?? 'Delete failed'
      return
    }
    visible.value = false
    emit('deleted')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Delete failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '400px' }" :pt="dialogPt">
    <template #header>
      <span class="text-base font-semibold text-gray-900">{{ title }}</span>
    </template>

    <div class="flex flex-col items-center gap-3 py-2 text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <i class="pi pi-exclamation-triangle text-xl"></i>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p class="text-sm text-gray-700" v-html="message"></p>
      <p v-if="error" class="mt-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ error }}
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
          :label="confirmLabel"
          severity="danger"
          size="small"
          :loading="loading"
          @click="handleDelete"
        />
      </div>
    </template>
  </Dialog>
</template>
