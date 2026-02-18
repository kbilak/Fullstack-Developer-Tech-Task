<script setup lang="ts">
// #region IMPORTS
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import type { EntryDailyCount } from '@/types/entry'
import type { DailyStatistic } from '@/types/statistics'
import { today, daysAgo, formatShortDate } from '@/utils/date'
import { fmtNum } from '@/utils/format'
import { dialogPtNoFooter } from '@/utils/dialog'
import Dialog from 'primevue/dialog'
import SelectButton from 'primevue/selectbutton'
import { Line } from 'vue-chartjs'
// #endregion IMPORTS

// #region PROPS
export type StoreQuickStatMetric = 'stores' | 'avg' | 'top'

const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  metric: StoreQuickStatMetric
  storeCount: number
  topStoreId: number | null
  topStoreName: string
}>()
// #endregion PROPS

// #region STATE
const userStore = useUserStore()
const { storeApi, entryApi } = userStore
const dailyCounts = ref<EntryDailyCount[]>([])
const topStoreDailyCounts = ref<DailyStatistic[]>([])
const loading = ref(false)

const period = ref(7)
const periodOptions = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
]
// #endregion STATE

// #region COMPUTED
const title = computed(() => {
  switch (props.metric) {
    case 'stores': return 'Total Store Traffic'
    case 'avg': return 'Average Entries per Store'
    case 'top': return `Top Performer — ${props.topStoreName}`
    default: return ''
  }
})

const isTopMetric = computed(() => props.metric === 'top')

/**
 * Selects the data source based on the active metric:
 * - 'top' uses the top store's own daily statistics
 * - 'stores' / 'avg' use the global all-entries daily counts
 */
const rawCounts = computed(() => {
  const source = isTopMetric.value ? topStoreDailyCounts.value : dailyCounts.value
  return source.map((d) => ({ date: d.date.slice(0, 10), count: d.count }))
})

/**
 * Pads the raw daily counts to a window of period*2 days (index 0 = oldest, last = today).
 * The first half represents the "previous" comparison period, the second half is "current".
 * Missing days are filled with zero.
 */
const fullData = computed(() => {
  const totalDays = period.value * 2
  const map = new Map(rawCounts.value.map((d) => [d.date, d.count]))
  const result: { date: string; count: number }[] = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = daysAgo(i)
    result.push({ date, count: map.get(date) ?? 0 })
  }
  return result
})

const currentPeriod = computed(() => fullData.value.slice(period.value))
const previousPeriod = computed(() => fullData.value.slice(0, period.value))

/**
 * Divisor applied to raw counts before display.
 * For 'avg' metric this equals the total store count (producing per-store averages);
 * for all other metrics it is 1 (identity -- no scaling).
 */
const divisor = computed(() => (props.metric === 'avg' && props.storeCount > 0) ? props.storeCount : 1)

const currentTotal = computed(() => currentPeriod.value.reduce((s, d) => s + d.count, 0))
const previousTotal = computed(() => previousPeriod.value.reduce((s, d) => s + d.count, 0))

const displayCurrentTotal = computed(() => Math.round(currentTotal.value / divisor.value))
const displayPreviousTotal = computed(() => Math.round(previousTotal.value / divisor.value))

const currentAvg = computed(() =>
  displayCurrentTotal.value > 0 ? Math.round(displayCurrentTotal.value / period.value) : 0,
)
const previousAvg = computed(() =>
  displayPreviousTotal.value > 0 ? Math.round(displayPreviousTotal.value / period.value) : 0,
)

const changePercent = computed(() => {
  const prev = displayPreviousTotal.value
  const curr = displayCurrentTotal.value
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
})

const currentCounts = computed(() =>
  currentPeriod.value.map((d) => Math.round(d.count / divisor.value)),
)
const previousCounts = computed(() =>
  previousPeriod.value.map((d) => Math.round(d.count / divisor.value)),
)

const chartData = computed(() => {
  const color = changePercent.value >= 0 ? '#10b981' : '#ef4444'
  const labels = currentPeriod.value.map((d) => formatShortDate(d.date))

  return {
    labels,
    datasets: [
      {
        label: 'Current period',
        data: currentCounts.value,
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Previous period',
        data: previousCounts.value,
        borderColor: '#9ca3af',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: false,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: { boxWidth: 12, font: { size: 11 }, color: '#6b7280', usePointStyle: true },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
          ` ${ctx.dataset.label ?? ''}: ${fmtNum(ctx.parsed.y ?? 0)}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#9ca3af', font: { size: 10 }, maxRotation: 45, maxTicksLimit: period.value <= 14 ? period.value : 15 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#9ca3af', font: { size: 10 }, precision: 0 },
      grid: { color: '#f3f4f6' },
    },
  },
}))

const unitLabel = computed(() => {
  switch (props.metric) {
    case 'stores': return 'entries'
    case 'avg': return 'entries / store'
    case 'top': return 'entries'
    default: return ''
  }
})
// #endregion COMPUTED

// #region METHODS
/**
 * Fetches daily counts for the full comparison window (period * 2 days).
 * For 'top' metric, fetches the top store's own statistics via storeApi;
 * for 'stores' and 'avg', fetches global entry statistics via entryApi.
 */
async function loadData() {
  loading.value = true
  try {
    const totalDays = period.value * 2
    const start = daysAgo(totalDays - 1)
    const end = today()

    if (isTopMetric.value && props.topStoreId) {
      const result = await storeApi().fetchStatistics(props.topStoreId, start, end)
      topStoreDailyCounts.value = result.statistics
    } else {
      const result = await entryApi().fetchEntryStatistics(start, end)
      dailyCounts.value = result.dailyCounts
    }
  } catch {
    dailyCounts.value = []
    topStoreDailyCounts.value = []
  } finally {
    loading.value = false
  }
}
// #endregion METHODS

// #region WATCHERS
watch(visible, (open) => {
  if (open) loadData()
})

watch(period, () => {
  if (visible.value) loadData()
})
// #endregion WATCHERS
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '640px' }" :pt="dialogPtNoFooter">
    <template #header>
      <div class="flex w-full items-center justify-between pr-2">
        <span class="text-base font-semibold text-gray-900">{{ title }}</span>
        <SelectButton
          v-model="period"
          :options="periodOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          size="small"
        />
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <!-- Chart -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
      </div>
      <div v-else class="relative" style="height: 280px">
        <Line :data="chartData" :options="chartOptions" />
      </div>

      <!-- Summary -->
      <div class="grid grid-cols-3 gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Current</span>
          <span class="text-sm font-semibold text-gray-900">{{ fmtNum(displayCurrentTotal) }} {{ unitLabel }}</span>
          <span class="text-[11px] text-gray-500">{{ fmtNum(currentAvg) }} / day avg</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Previous</span>
          <span class="text-sm font-semibold text-gray-900">{{ fmtNum(displayPreviousTotal) }} {{ unitLabel }}</span>
          <span class="text-[11px] text-gray-500">{{ fmtNum(previousAvg) }} / day avg</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Change</span>
          <span
            class="text-sm font-semibold"
            :class="changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'"
          >
            {{ changePercent > 0 ? '+' : '' }}{{ changePercent }}%
          </span>
          <span class="text-[11px] text-gray-500">vs previous {{ period }}d</span>
        </div>
      </div>
    </div>
  </Dialog>
</template>
