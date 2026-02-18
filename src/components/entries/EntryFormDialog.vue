<script setup lang="ts">
// #region IMPORTS
import { ref, computed, watch } from 'vue'
import type { EntryListItem } from '@/types/entry'
import { useUserStore } from '@/stores/useUserStore'
import type { StoreListItem } from '@/types/store'
import { dialogPt } from '@/utils/dialog'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Button from 'primevue/button'
// #endregion IMPORTS

// #region PROPS & EMITS
const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  entry: EntryListItem | null
  storeName: string
}>()

const emit = defineEmits<{
  created: []
  updated: [data: { id: number; entryDate: string }]
}>()
// #endregion PROPS & EMITS

// #region STATE
const { storeApi, entryApi } = useUserStore()
const entryDate = ref<Date>(new Date())
const selectedStoreId = ref<number | null>(null)
const storeOptions = ref<{ label: string; value: number }[]>([])
const loadingStores = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)

const isEditing = computed(() => props.entry !== null)
const title = computed(() => (isEditing.value ? 'Edit entry' : 'Add entry'))
const hasChanges = computed(() => {
  if (!isEditing.value || !props.entry) return true
  return entryDate.value.getTime() !== new Date(props.entry.entryDate).getTime()
})
// #endregion STATE

// #region WATCHERS
watch(visible, async (open) => {
  if (open) {
    error.value = null
    if (isEditing.value && props.entry) {
      entryDate.value = new Date(props.entry.entryDate)
      selectedStoreId.value = props.entry.idStore
    } else {
      entryDate.value = new Date()
      selectedStoreId.value = null
      await loadStoreOptions()
    }
  }
})
// #endregion WATCHERS

// #region METHODS
async function loadStoreOptions() {
  loadingStores.value = true
  try {
    const result = await storeApi().fetchStores(1, 100)
    storeOptions.value = result.items.map((s: StoreListItem) => ({ label: s.name, value: s.id }))
  } catch {
    storeOptions.value = []
  } finally {
    loadingStores.value = false
  }
}

function validate(): boolean {
  if (!isEditing.value && !selectedStoreId.value) {
    error.value = 'Please select a store'
    return false
  }
  if (!entryDate.value) {
    error.value = 'Please select a date'
    return false
  }
  if (entryDate.value > new Date()) {
    error.value = 'Entry date cannot be in the future'
    return false
  }
  return true
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  error.value = null
  try {
    if (isEditing.value && props.entry) {
      const isoDate = entryDate.value.toISOString()
      await entryApi().updateEntry(props.entry.id, { entryDate: isoDate })
      visible.value = false
      emit('updated', { id: props.entry.id, entryDate: isoDate })
    } else {
      await entryApi().createEntry({
        idStore: selectedStoreId.value!,
        entryDate: entryDate.value.toISOString(),
      })
      visible.value = false
      emit('created')
    }
  } catch {
    error.value = 'Something went wrong, try again.'
  } finally {
    submitting.value = false
  }
}
// #endregion METHODS
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '420px' }" :pt="dialogPt">
    <template #header>
      <span class="text-base font-semibold text-gray-900">{{ title }}</span>
    </template>

    <div class="flex flex-col gap-4">
      <!-- Store: editable (dropdown) when adding, read-only when editing -->
      <div v-if="isEditing" class="flex flex-col gap-1">
        <span class="text-xs font-medium tracking-wide text-gray-400 uppercase">Store</span>
        <span class="text-sm text-gray-900">{{ storeName }}</span>
      </div>
      <div v-else class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-gray-700">
          Store <span class="text-red-500">*</span>
        </label>
        <Select
          v-model="selectedStoreId"
          :options="storeOptions"
          option-label="label"
          option-value="value"
          placeholder="Select a store"
          :loading="loadingStores"
          filter
          class="w-full"
          size="small"
        />
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
          :label="isEditing ? 'Save' : 'Add entry'"
          :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'"
          size="small"
          :loading="submitting"
          :disabled="!hasChanges"
          @click="submit"
        />
      </div>
    </template>
  </Dialog>
</template>
