<script setup lang="ts">
// #region IMPORTS
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import { useEntriesStore } from '@/stores/useEntriesStore'
import type { EntryDailyCount, EntryStoreCount } from '@/types/entry'
import { toISODate, fillDailyGaps } from '@/utils/date'
import { useStatisticsStore } from '@/stores/useStatisticsStore'
import { fmtNum } from '@/utils/format'
import { entryColor, CHART_COLORS } from '@/utils/chart'
import ColorLegend from '@/components/common/ColorLegend.vue'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { Bar, Doughnut } from 'vue-chartjs'
// #endregion IMPORTS

// #region STATE
const userStore = useUserStore()
const { entryApi } = userStore
const entriesStore = useEntriesStore()
const dailyCounts = ref<EntryDailyCount[]>([])
const storeCounts = ref<EntryStoreCount[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const viewMode = ref<'daily' | 'store'>('daily')
const viewOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'By Store', value: 'store' },
]

const statsStore = useStatisticsStore()
const startDate = computed({
  get: () => new Date(statsStore.startDate + 'T00:00:00'),
  set: (val: Date) => { statsStore.startDate = toISODate(val) },
})
const endDate = computed({
  get: () => new Date(statsStore.endDate + 'T00:00:00'),
  set: (val: Date) => { statsStore.endDate = toISODate(val) },
})
const loadedRange = ref<[string, string] | null>(null)

const isMobile = ref(window.innerWidth < 640)
function onResize() { isMobile.value = window.innerWidth < 640 }
window.addEventListener('resize', onResize)
// #endregion STATE

// #region COMPUTED
const totalEntries = computed(() => dailyCounts.value.reduce((sum, d) => sum + d.count, 0))

const dateRangeChanged = computed(() => {
  if (!loadedRange.value) return true
  return (
    statsStore.startDate !== loadedRange.value[0] ||
    statsStore.endDate !== loadedRange.value[1]
  )
})

/** Fills date gaps so every day in the loaded range has a data point (count defaults to 0), ensuring the bar chart has no missing days. */
const filledDailyCounts = computed(() => {
  if (dailyCounts.value.length === 0 || !loadedRange.value) return []
  return fillDailyGaps(dailyCounts.value, loadedRange.value[0], loadedRange.value[1])
})

/** Builds bar chart data from filled daily counts, with color intensity mapped to the count range (low = cool, high = warm). */
const barChartData = computed(() => {
  const data = filledDailyCounts.value
  const counts = data.map((d) => d.count).filter((c) => c > 0)
  const min = counts.length ? Math.min(...counts) : 0
  const max = counts.length ? Math.max(...counts) : 0
  const colors = data.map((d) => entryColor(d.count, min, max))

  return {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: 'Entries',
        data: data.map((d) => d.count),
        backgroundColor: colors,
      },
    ],
  }
})

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number | null } }) => `${fmtNum(ctx.parsed.y ?? 0)} entries`,
      },
    },
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: '#6b7280', font: { size: 11 }, maxRotation: 45, maxTicksLimit: 12 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#6b7280', font: { size: 11 }, precision: 0 },
      grid: { color: '#f3f4f6' },
    },
  },
}

/** Builds a doughnut chart dataset from aggregated per-store entry counts, each store assigned a distinct color. */
const doughnutChartData = computed(() => {
  const data = storeCounts.value
  return {
    labels: data.map((s) => s.storeName ?? `Store #${s.idStore}`),
    datasets: [
      {
        data: data.map((s) => s.count),
        backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }
})

const doughnutChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: false },
    legend: {
      position: (isMobile.value ? 'bottom' : 'right') as 'bottom' | 'right',
      labels: { boxWidth: 12, font: { size: 12 }, color: '#374151' },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { label: string; parsed: number }) => {
          const total = storeCounts.value.reduce((s, d) => s + d.count, 0)
          const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
          return ` ${ctx.label}: ${fmtNum(ctx.parsed)} (${pct}%)`
        },
      },
    },
  },
}))

const hasData = computed(() => dailyCounts.value.length > 0 || storeCounts.value.length > 0)
// #endregion COMPUTED

// #region METHODS
/** Fetches entry statistics for the selected date range and persists results to the Pinia cache. */
async function loadStatistics() {
  loading.value = true
  error.value = null
  try {
    const start = statsStore.startDate
    const end = statsStore.endDate
    const result = await entryApi().fetchEntryStatistics(start, end)
    dailyCounts.value = result.dailyCounts
    storeCounts.value = result.storeCounts
    loadedRange.value = [start, end]

    // Persist to store cache
    entriesStore.statisticsCache = {
      dailyCounts: result.dailyCounts,
      storeCounts: result.storeCounts,
      loadedRange: loadedRange.value,
      viewMode: viewMode.value,
    }
  } catch {
    error.value = 'Failed to load statistics'
    dailyCounts.value = []
    storeCounts.value = []
  } finally {
    loading.value = false
  }
}
// #endregion METHODS

// #region LIFECYCLE
onMounted(() => {
  const cached = entriesStore.statisticsCache
  if (cached) {
    dailyCounts.value = cached.dailyCounts
    storeCounts.value = cached.storeCounts
    loadedRange.value = cached.loadedRange
    viewMode.value = cached.viewMode
  } else {
    loadStatistics()
  }
})

onUnmounted(() => window.removeEventListener('resize', onResize))

defineExpose({ refresh: loadStatistics })
// #endregion LIFECYCLE
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white">
    <!-- Header -->
    <div class="flex flex-col gap-2 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <i class="pi pi-chart-bar text-sm text-gray-400"></i>
        <span class="text-sm font-semibold text-gray-900">Entry Statistics</span>
        <span
          v-if="!loading && hasData"
          class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600"
        >
          {{ fmtNum(totalEntries) }} entries
        </span>
      </div>
      <SelectButton
        v-model="viewMode"
        :options="viewOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
      />
    </div>

    <!-- Content -->
    <div class="flex flex-col gap-4 px-5 py-4">
      <!-- Date range controls -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-gray-700">From</label>
          <DatePicker
            v-model="startDate"
            date-format="dd/mm/yy"
            :max-date="endDate"
            class="w-full sm:w-40"
            size="small"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-gray-700">To</label>
          <DatePicker
            v-model="endDate"
            date-format="dd/mm/yy"
            :min-date="startDate"
            :max-date="new Date()"
            class="w-full sm:w-40"
            size="small"
          />
        </div>
        <Button
          label="Load"
          icon="pi pi-search"
          size="small"
          :loading="loading"
          :disabled="!dateRangeChanged"
          @click="loadStatistics"
        />
      </div>

      <!-- Loading -->
      <div v-if="loading && !hasData" class="flex items-center justify-center py-10">
        <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <span class="text-sm text-red-600">{{ error }}</span>
      </div>

      <!-- Empty -->
      <div v-else-if="!loading && !hasData" class="py-10 text-center">
        <p class="text-sm text-gray-400">No entries in selected range</p>
      </div>

      <!-- Charts -->
      <div v-else>
        <div class="relative" style="height: 300px">
          <Bar v-if="viewMode === 'daily'" :data="barChartData" :options="barChartOptions" />
          <Doughnut v-else :data="doughnutChartData" :options="doughnutChartOptions" />
          <div
            v-if="loading"
            class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70"
          >
            <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
          </div>
        </div>
        <ColorLegend v-if="viewMode === 'daily'" class="mt-2" />
      </div>
    </div>
  </div>
</template>
