<script setup lang="ts">
// #region IMPORTS
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import type { EntryDailyCount } from '@/types/entry'
import { Line } from 'vue-chartjs'
import QuickStatDetailDialog from './QuickStatDetailDialog.vue'
import type { QuickStatMetric } from './QuickStatDetailDialog.vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler)
// #endregion IMPORTS

// #region STATE
const userStore = useUserStore()
const { entryApi } = userStore
const dailyCounts = ref<EntryDailyCount[]>([])
const loading = ref(false)

const showDetail = ref(false)
const detailMetric = ref<QuickStatMetric>('today')
// #endregion STATE

// #region HELPERS
function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function today(): string {
  return toLocalDate(new Date())
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalDate(d)
}

function fmtNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
// #endregion HELPERS

// #region COMPUTED
/** Full 14 days padded: index 0 = 13 days ago, index 13 = today. */
const fullData = computed(() => {
  const map = new Map(dailyCounts.value.map((d) => [d.date.slice(0, 10), d.count]))
  const result: number[] = []
  for (let i = 13; i >= 0; i--) {
    result.push(map.get(daysAgo(i)) ?? 0)
  }
  return result
})

/** Current week = last 7 days (indices 7..13). */
const currentWeek = computed(() => fullData.value.slice(7))

/** Previous week = prior 7 days (indices 0..6). */
const previousWeek = computed(() => fullData.value.slice(0, 7))

const todayCount = computed(() => currentWeek.value[6] ?? 0)
const yesterdayCount = computed(() => currentWeek.value[5] ?? 0)

const todayChange = computed(() => {
  if (yesterdayCount.value === 0) return todayCount.value > 0 ? 100 : 0
  return Math.round(((todayCount.value - yesterdayCount.value) / yesterdayCount.value) * 100)
})

const currentWeekTotal = computed(() => currentWeek.value.reduce((s, v) => s + v, 0))
const previousWeekTotal = computed(() => previousWeek.value.reduce((s, v) => s + v, 0))

const weeklyChange = computed(() => {
  if (previousWeekTotal.value === 0) return currentWeekTotal.value > 0 ? 100 : 0
  return Math.round(
    ((currentWeekTotal.value - previousWeekTotal.value) / previousWeekTotal.value) * 100,
  )
})

const currentWeekAvg = computed(() => {
  const sum = currentWeekTotal.value
  return sum > 0 ? Math.round(sum / 7) : 0
})

const previousWeekAvg = computed(() => {
  const sum = previousWeekTotal.value
  return sum > 0 ? Math.round(sum / 7) : 0
})

const avgChange = computed(() => {
  if (previousWeekAvg.value === 0) return currentWeekAvg.value > 0 ? 100 : 0
  return Math.round(((currentWeekAvg.value - previousWeekAvg.value) / previousWeekAvg.value) * 100)
})

const sparklineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    x: { display: false },
    y: { display: false, beginAtZero: true },
  },
}

function makeDualSparkline(current: number[], previous: number[], color: string) {
  return {
    labels: current.map((_, i) => String(i)),
    datasets: [
      {
        data: current,
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
      },
      {
        data: previous,
        borderColor: '#9ca3af',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        tension: 0.4,
        fill: false,
      },
    ],
  }
}

/** Sparkline: current week daily counts + previous week dashed overlay. */
const todaySparkline = computed(() => {
  const color = todayChange.value >= 0 ? '#10b981' : '#ef4444'
  return makeDualSparkline(currentWeek.value, previousWeek.value, color)
})

/** Sparkline: current week daily counts + previous week overlay for avg comparison. */
const avgSparkline = computed(() => {
  const color = avgChange.value >= 0 ? '#10b981' : '#ef4444'
  return makeDualSparkline(currentWeek.value, previousWeek.value, color)
})

/** Sparkline: cumulative running total over the current 7 days + previous week overlay. */
const cumulativeWeek = computed(() => {
  let sum = 0
  return currentWeek.value.map((v) => (sum += v))
})

const cumulativePrevWeek = computed(() => {
  let sum = 0
  return previousWeek.value.map((v) => (sum += v))
})

const totalSparkline = computed(() => {
  const color = weeklyChange.value >= 0 ? '#10b981' : '#ef4444'
  return makeDualSparkline(cumulativeWeek.value, cumulativePrevWeek.value, color)
})

function changeText(val: number): string {
  return (val > 0 ? '+' : '') + val + '%'
}
// #endregion COMPUTED

// #region METHODS
async function loadStats() {
  loading.value = true
  try {
    const result = await entryApi().fetchEntryStatistics(daysAgo(13), today())
    dailyCounts.value = result.dailyCounts
  } catch {
    /* silent — tiles just show 0 */
  } finally {
    loading.value = false
  }
}

function openDetail(metric: QuickStatMetric) {
  detailMetric.value = metric
  showDetail.value = true
}
// #endregion METHODS

// #region LIFECYCLE
onMounted(() => {
  loadStats()
})

watch(() => userStore.storesDataSource, () => loadStats())

defineExpose({ refresh: loadStats })
// #endregion LIFECYCLE
</script>

<template>
  <div class="grid grid-cols-3 gap-4">
    <!-- Today's Entries -->
    <div
      class="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 transition-shadow hover:shadow-md"
      @click="openDetail('today')"
    >
      <div class="flex items-center justify-between">
        <span class="text-[13px] font-medium text-gray-500">Today's Entries</span>
        <i class="pi pi-calendar text-xs text-gray-300"></i>
      </div>
      <div class="mt-2 flex items-end justify-between">
        <span class="text-[28px] leading-none font-bold text-gray-900">
          <template v-if="loading">—</template>
          <template v-else>{{ fmtNum(todayCount) }}</template>
        </span>
        <div class="h-10 w-24">
          <Line
            v-if="!loading && currentWeek.some((v) => v > 0)"
            :data="todaySparkline"
            :options="sparklineOptions"
          />
        </div>
      </div>
      <span v-if="!loading" class="mt-1.5 inline-block text-xs">
        <span :class="todayChange >= 0 ? 'text-emerald-500' : 'text-red-500'">
          {{ changeText(todayChange) }}
        </span>
        <span class="text-gray-400"> vs yesterday</span>
      </span>
    </div>

    <!-- Daily Average -->
    <div
      class="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 transition-shadow hover:shadow-md"
      @click="openDetail('avg')"
    >
      <div class="flex items-center justify-between">
        <span class="text-[13px] font-medium text-gray-500">Daily Avg. Entries</span>
        <i class="pi pi-chart-line text-xs text-gray-300"></i>
      </div>
      <div class="mt-2 flex items-end justify-between">
        <span class="text-[28px] leading-none font-bold text-gray-900">
          <template v-if="loading">—</template>
          <template v-else>{{ fmtNum(currentWeekAvg) }}</template>
        </span>
        <div class="h-10 w-24">
          <Line
            v-if="!loading && currentWeek.some((v) => v > 0)"
            :data="avgSparkline"
            :options="sparklineOptions"
          />
        </div>
      </div>
      <span v-if="!loading" class="mt-1.5 inline-block text-xs">
        <span :class="avgChange >= 0 ? 'text-emerald-500' : 'text-red-500'">
          {{ changeText(avgChange) }}
        </span>
        <span class="text-gray-400"> vs last week</span>
      </span>
    </div>

    <!-- Weekly Total -->
    <div
      class="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 transition-shadow hover:shadow-md"
      @click="openDetail('total')"
    >
      <div class="flex items-center justify-between">
        <span class="text-[13px] font-medium text-gray-500">Weekly Total</span>
        <i class="pi pi-hashtag text-xs text-gray-300"></i>
      </div>
      <div class="mt-2 flex items-end justify-between">
        <span class="text-[28px] leading-none font-bold text-gray-900">
          <template v-if="loading">—</template>
          <template v-else>{{ fmtNum(currentWeekTotal) }}</template>
        </span>
        <div class="h-10 w-24">
          <Line
            v-if="!loading && cumulativeWeek.some((v) => v > 0)"
            :data="totalSparkline"
            :options="sparklineOptions"
          />
        </div>
      </div>
      <span v-if="!loading" class="mt-1.5 inline-block text-xs">
        <span :class="weeklyChange >= 0 ? 'text-emerald-500' : 'text-red-500'">
          {{ changeText(weeklyChange) }}
        </span>
        <span class="text-gray-400"> vs last week</span>
      </span>
    </div>
  </div>

  <!-- Detail dialog -->
  <QuickStatDetailDialog v-model:visible="showDetail" :metric="detailMetric" />
</template>
