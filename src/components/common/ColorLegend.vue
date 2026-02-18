<script setup lang="ts">
/**
 * Reusable color legend for entry count charts — shows 4 color tiers
 * (Low / Medium / High / Top) with optional "No data" tier.
 */

// #region PROPS
defineProps<{
  showNoData?: boolean
}>()
// #endregion PROPS
</script>

<template>
  <div class="flex items-center justify-center gap-4 text-[11px] text-gray-500">
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #dc2626"></span>
      Low (0–25%)
    </span>
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #d97706"></span>
      Medium (25–50%)
    </span>
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #2563eb"></span>
      High (50–75%)
    </span>
    <span class="flex items-center gap-1.5">
      <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #059669"></span>
      Top (75–100%)
    </span>
    <span v-if="showNoData !== false" class="flex items-center gap-1.5">
      <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #9ca3af"></span>
      No data
    </span>
  </div>
</template>
