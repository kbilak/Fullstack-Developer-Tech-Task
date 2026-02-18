<script setup lang="ts">
// #region IMPORTS
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import type { EntryDailyCount } from '@/types/entry'
import { today, daysAgo, formatShortDate } from '@/utils/date'
import { fmtNum } from '@/utils/format'
import { dialogPtNoFooter } from '@/utils/dialog'
import Dialog from 'primevue/dialog'
import SelectButton from 'primevue/selectbutton'
import { Line } from 'vue-chartjs'
// #endregion IMPORTS

// #region PROPS
export type QuickStatMetric = 'today' | 'avg' | 'total'

const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  metric: QuickStatMetric
}>()
// #endregion PROPS

// #region STATE
const userStore = useUserStore()
const { entryApi } = userStore
const dailyCounts = ref<EntryDailyCount[]>([])
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
    case 'today': return 'Daily Entry Counts'
    case 'avg': return 'Daily Average Comparison'
    case 'total': return 'Cumulative Weekly Entries'
    default: return ''
  }
})

/** Pads daily counts to period*2 days so both current and previous period have complete data for comparison. Index 0 = oldest day, last index = today. */
const fullData = computed(() => {
  const totalDays = period.value * 2
  const map = new Map(dailyCounts.value.map((d) => [d.date.slice(0, 10), d.count]))
  const result: { date: string; count: number }[] = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = daysAgo(i)
    result.push({ date, count: map.get(date) ?? 0 })
  }
  return result
})

const currentPeriod = computed(() => fullData.value.slice(period.value))
const previousPeriod = computed(() => fullData.value.slice(0, period.value))

const currentTotal = computed(() => currentPeriod.value.reduce((s, d) => s + d.count, 0))
const previousTotal = computed(() => previousPeriod.value.reduce((s, d) => s + d.count, 0))
const currentAvg = computed(() => currentTotal.value > 0 ? Math.round(currentTotal.value / period.value) : 0)
const previousAvg = computed(() => previousTotal.value > 0 ? Math.round(previousTotal.value / period.value) : 0)

const changePercent = computed(() => {
  const prev = props.metric === 'avg' ? previousAvg.value : previousTotal.value
  const curr = props.metric === 'avg' ? currentAvg.value : currentTotal.value
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
})

const currentCounts = computed(() => currentPeriod.value.map((d) => d.count))
const previousCounts = computed(() => previousPeriod.value.map((d) => d.count))

const currentCumulative = computed(() => {
  let sum = 0
  return currentCounts.value.map((v) => (sum += v))
})

const previousCumulative = computed(() => {
  let sum = 0
  return previousCounts.value.map((v) => (sum += v))
})

/** Builds a dual-series line chart: current period (solid) vs previous period (dashed). Uses cumulative running totals when the metric is 'total', raw daily counts otherwise. */
const chartData = computed(() => {
  const isCumulative = props.metric === 'total'
  const currData = isCumulative ? currentCumulative.value : currentCounts.value
  const prevData = isCumulative ? previousCumulative.value : previousCounts.value
  const color = changePercent.value >= 0 ? '#10b981' : '#ef4444'
  const labels = currentPeriod.value.map((d) => formatShortDate(d.date))

  return {
    labels,
    datasets: [
      {
        label: 'Current period',
        data: currData,
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
        data: prevData,
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
// #endregion COMPUTED

// #region METHODS
/** Fetches entry statistics spanning period*2 days so both current and previous periods are covered. */
async function loadData() {
  loading.value = true
  try {
    const totalDays = period.value * 2
    const result = await entryApi().fetchEntryStatistics(daysAgo(totalDays - 1), today())
    dailyCounts.value = result.dailyCounts
  } catch {
    dailyCounts.value = []
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
          <span class="text-sm font-semibold text-gray-900">{{ fmtNum(currentTotal) }} entries</span>
          <span class="text-[11px] text-gray-500">{{ fmtNum(currentAvg) }} / day avg</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] font-medium uppercase tracking-wide text-gray-400">Previous</span>
          <span class="text-sm font-semibold text-gray-900">{{ fmtNum(previousTotal) }} entries</span>
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
