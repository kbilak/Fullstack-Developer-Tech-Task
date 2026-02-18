<script setup lang="ts">
// #region IMPORTS
import { ref, computed, watch } from 'vue'
import type { StoreDetail, StorePayload } from '@/types/store'
import { useUserStore } from '@/stores/useUserStore'
import { dialogPt } from '@/utils/dialog'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
// #endregion IMPORTS

// #region PROPS & EMITS
const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  store: StoreDetail | null
  detailLoading: boolean
}>()

const emit = defineEmits<{
  created: []
  updated: [data: { id: number; name: string }]
  delete: []
}>()
// #endregion PROPS & EMITS

// #region STATE
const { storeApi } = useUserStore()
const formData = ref<StorePayload>({ name: '', city: '', country: '' })
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

const isEditing = computed(() => props.store !== null)
const title = computed(() => (isEditing.value ? 'Edit store' : 'Add store'))
const hasChanges = computed(() => {
  if (!props.store) return true
  const { name, city, country } = formData.value
  return name !== props.store.name || city !== props.store.city || country !== props.store.country
})
// #endregion STATE

// #region WATCHERS
watch(
  () => props.store,
  (val) => {
    formData.value = val
      ? { name: val.name, city: val.city, country: val.country }
      : { name: '', city: '', country: '' }
    errors.value = {}
  },
)

watch(visible, (open) => {
  if (open && !props.store) {
    formData.value = { name: '', city: '', country: '' }
  }
  if (!open) {
    errors.value = {}
    submitting.value = false
  }
})
// #endregion WATCHERS

// #region METHODS
const NAME_PATTERN = /^[\p{L}\p{N}\s\-'.&]+$/u
const MIN_LENGTH = 2
const MAX_LENGTH = 100

function validate(): boolean {
  errors.value = {}

  for (const [field, label] of [
    ['name', 'Name'],
    ['city', 'City'],
    ['country', 'Country'],
  ] as const) {
    const val = formData.value[field].trim()
    if (!val) {
      errors.value[field] = `${label} is required`
    } else if (val.length < MIN_LENGTH) {
      errors.value[field] = `${label} must be at least ${MIN_LENGTH} characters`
    } else if (val.length > MAX_LENGTH) {
      errors.value[field] = `${label} must be at most ${MAX_LENGTH} characters`
    } else if (!NAME_PATTERN.test(val)) {
      errors.value[field] = `${label} contains invalid characters`
    }
  }

  return !Object.keys(errors.value).length
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    if (isEditing.value && props.store) {
      await storeApi().updateStore(props.store.id, formData.value)
      visible.value = false
      emit('updated', { id: props.store.id, name: formData.value.name })
    } else {
      await storeApi().createStore(formData.value)
      visible.value = false
      emit('created')
    }
  } catch {
    errors.value.general = 'Something went wrong, try again.'
  } finally {
    submitting.value = false
  }
}
// #endregion METHODS
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '480px' }" :pt="dialogPt">
    <template #header>
      <span class="text-base font-semibold text-gray-900">{{ title }}</span>
    </template>

    <div v-if="detailLoading && isEditing" class="flex items-center justify-center py-8">
      <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
    </div>

    <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-gray-700">
          Name <span class="text-red-500">*</span>
        </label>
        <InputText
          v-model="formData.name"
          :invalid="!!errors.name"
          placeholder="Store name"
          size="small"
          :maxlength="MAX_LENGTH"
        />
        <span v-if="errors.name" class="text-xs text-red-500">{{ errors.name }}</span>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-gray-700">
            City <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="formData.city"
            :invalid="!!errors.city"
            placeholder="City"
            size="small"
            :maxlength="MAX_LENGTH"
          />
          <span v-if="errors.city" class="text-xs text-red-500">{{ errors.city }}</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-gray-700">
            Country <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="formData.country"
            :invalid="!!errors.country"
            placeholder="Country"
            size="small"
            :maxlength="MAX_LENGTH"
          />
          <span v-if="errors.country" class="text-xs text-red-500">{{ errors.country }}</span>
        </div>
      </div>

      <span v-if="errors.general" class="text-xs text-red-500">{{ errors.general }}</span>
    </form>

    <template #footer>
      <div class="flex w-full items-center justify-between">
        <div>
          <Button
            v-if="isEditing"
            label="Delete"
            icon="pi pi-trash"
            text
            severity="danger"
            size="small"
            @click="$emit('delete')"
          />
        </div>
        <div class="flex gap-2">
          <Button label="Cancel" text severity="secondary" size="small" @click="visible = false" />
          <Button
            :label="isEditing ? 'Save' : 'Add'"
            icon="pi pi-check"
            size="small"
            :loading="submitting"
            :disabled="!hasChanges"
            @click="submit"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>
