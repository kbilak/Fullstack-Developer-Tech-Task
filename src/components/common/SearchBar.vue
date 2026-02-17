<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="relative flex items-center">
    <i class="pi pi-search absolute left-3 text-xs text-gray-400"></i>
    <input
      type="text"
      :value="modelValue"
      :placeholder="placeholder ?? 'Search...'"
      class="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="modelValue"
      class="absolute right-2.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-none bg-gray-200 text-xs text-gray-500 transition-colors hover:bg-gray-300 hover:text-gray-700"
      @click="$emit('update:modelValue', '')"
    >
      <i class="pi pi-times" style="font-size: 8px"></i>
    </button>
  </div>
</template>
