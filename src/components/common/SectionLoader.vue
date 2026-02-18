<script setup lang="ts">
/**
 * Full-width centered loading spinner with optional message text.
 */

// #region IMPORTS
import ProgressSpinner from 'primevue/progressspinner'
// #endregion IMPORTS

// #region PROPS
defineProps<{
  message?: string
}>()
// #endregion PROPS
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16">
    <ProgressSpinner
      style="width: 40px; height: 40px"
      stroke-width="4"
      animation-duration="0.8s"
      :pt="{ root: { style: { color: '#000' } } }"
    />
    <span class="text-sm text-gray-400">{{ message ?? 'Loading...' }}</span>
  </div>
</template>
