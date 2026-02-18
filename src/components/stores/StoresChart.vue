<script setup lang="ts">
/**
 * Bar chart showing entries per store with hover synchronization
 * to the data table.
 */
// #region IMPORTS
import { computed } from 'vue'
import type { StoreListItem } from '@/types/store'
import type { ChartSort } from '@/stores/useUserStore'
import { Bar } from 'vue-chartjs'
// #endregion IMPORTS

// #region PROPS & EMITS
const props = defineProps<{
  stores: StoreListItem[]
  loading: boolean
  hoveredStoreId: number | null
  chartSort: ChartSort
}>()

const emit = defineEmits<{
  'update:hoveredStoreId': [number | null]
  'update:chartSort': [ChartSort]
}>()
// #endregion PROPS & EMITS

// #region COMPUTED
/** Min/max of non-zero entry counts, used for color scaling across bars. */
const entryCountRange = computed(() => {
  const counts = props.stores.map((s) => s.entryCount).filter((c) => c > 0)
  if (counts.length === 0) return { min: 0, max: 0 }
  return { min: Math.min(...counts), max: Math.max(...counts) }
})

/** Returns a hex color based on the entry count's position within the range (4 tiers + grey for zero). */
function entryBarColor(count: number): string {
  if (count === 0) return '#9ca3af'
  const { min, max } = entryCountRange.value
  if (min === max) return '#059669'
  const ratio = (count - min) / (max - min)
  if (ratio <= 0.25) return '#dc2626'
  if (ratio <= 0.5) return '#d97706'
  if (ratio <= 0.75) return '#2563eb'
  return '#059669'
}

/** Optionally sorts stores by entry count descending for the chart; otherwise preserves server order. */
const chartStores = computed(() => {
  if (!props.chartSort) return props.stores
  return [...props.stores].sort((a, b) => b.entryCount - a.entryCount)
})

const chartData = computed(() => ({
  labels: chartStores.value.map((s) => s.name),
  datasets: [
    {
      label: 'Entries',
      data: chartStores.value.map((s) => s.entryCount),
      backgroundColor: chartStores.value.map((s) => {
        const base = entryBarColor(s.entryCount)
        if (props.hoveredStoreId === null) return base
        return s.id === props.hoveredStoreId ? base : `${base}26`
      }),
      borderRadius: 4,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  onHover: (_event: unknown, elements: { index: number }[]) => {
    emit('update:hoveredStoreId', elements.length > 0 ? chartStores.value[elements[0]!.index]?.id ?? null : null)
  },
  plugins: {
    legend: { display: false },
    title: { display: true, text: 'Entries per store', color: '#374151', font: { size: 14, weight: 'bold' as const } },
    tooltip: { callbacks: { label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} entries` } },
  },
  scales: {
    x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: '#6b7280', font: { size: 11 }, precision: 0 }, grid: { color: '#f3f4f6' } },
  },
}))
// #endregion COMPUTED

// #region METHODS
/** Toggles chart sort between descending and server order. */
function toggleSort() {
  emit('update:chartSort', props.chartSort === 'desc' ? null : 'desc')
}
// #endregion METHODS
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <button
        class="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors"
        :class="chartSort === 'desc' ? 'border-indigo-200 bg-indigo-50 text-indigo-600' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
        @click="toggleSort"
      >
        <i class="pi pi-sort-amount-down" style="font-size: 11px"></i>
        Most → Least
      </button>
    </div>
    <div
      class="relative rounded-lg border border-gray-200 bg-white p-4"
      style="height: 300px"
      @mouseleave="emit('update:hoveredStoreId', null)"
    >
      <Bar :data="chartData" :options="chartOptions" />
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
        <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
      </div>
    </div>
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
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-2.5 w-2.5 rounded-sm" style="background: #9ca3af"></span>
        No data
      </span>
    </div>
  </div>
</template>
