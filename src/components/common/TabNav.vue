<script setup lang="ts">
/**
 * Horizontal tab navigation bar with icon support, optional count badge,
 * and v-model binding.
 */

// #region TYPES
interface Tab {
  id: string
  label: string
  icon?: string
  count?: number
}

interface Props {
  tabs: Tab[]
  modelValue: string
}
// #endregion TYPES

// #region PROPS & EMITS
defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
// #endregion PROPS & EMITS
</script>

<template>
  <div
    class="flex items-stretch gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1.5 scrollbar-none"
    style="height: 54px"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="flex shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg border-none px-5 text-sm font-medium transition-all duration-200 sm:flex-1 sm:justify-center sm:gap-1.5 sm:px-3"
      :class="
        modelValue === tab.id
          ? 'bg-gray-900 text-white'
          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      "
      @click="$emit('update:modelValue', tab.id)"
    >
      <i v-if="tab.icon" :class="tab.icon"></i>
      <span>{{ tab.label }}</span>
      <span
        v-if="tab.count !== undefined"
        class="rounded-lg px-2 py-0.5 text-xs"
        :class="modelValue === tab.id ? 'bg-white/20' : 'bg-black/10'"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>
