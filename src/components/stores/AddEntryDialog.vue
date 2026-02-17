<script setup lang="ts">
// #region IMPORTS
import { ref, watch } from 'vue'
import { createEntry } from '@/services/api/entryApi'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
// #endregion IMPORTS

// #region PROPS & EMITS
const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  storeId: number | null
  storeName: string
}>()

const emit = defineEmits<{
  added: []
}>()
// #endregion PROPS & EMITS

// #region STATE
const entryDate = ref<Date>(new Date())
const submitting = ref(false)
const error = ref<string | null>(null)
// #endregion STATE

// #region WATCHERS
watch(visible, (open) => {
  if (open) {
    entryDate.value = new Date()
    error.value = null
  }
})
// #endregion WATCHERS

// #region METHODS
async function submit() {
  if (!props.storeId) return
  submitting.value = true
  error.value = null
  try {
    await createEntry({
      idStore: props.storeId,
      entryDate: entryDate.value.toISOString(),
    })
    visible.value = false
    emit('added')
  } catch {
    error.value = 'Failed to add entry. Try again.'
  } finally {
    submitting.value = false
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
      <span class="text-base font-semibold text-gray-900">Add entry</span>
    </template>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-gray-400">Store</span>
        <span class="text-sm text-gray-900">{{ storeName }}</span>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-gray-700">
          Entry date <span class="text-red-500">*</span>
        </label>
        <DatePicker
          v-model="entryDate"
          show-time
          hour-format="24"
          date-format="dd/mm/yy"
          class="w-full"
          :max-date="new Date()"
        />
      </div>
      <span v-if="error" class="text-xs text-red-500">{{ error }}</span>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          text
          severity="secondary"
          size="small"
          :disabled="submitting"
          @click="visible = false"
        />
        <Button
          label="Add entry"
          icon="pi pi-plus"
          size="small"
          :loading="submitting"
          @click="submit"
        />
      </div>
    </template>
  </Dialog>
</template>
