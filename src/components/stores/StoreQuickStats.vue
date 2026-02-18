<script setup lang="ts">
// #region IMPORTS
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import type { EntryDailyCount } from '@/types/entry'
import type { DailyStatistic } from '@/types/store'
import { Line } from 'vue-chartjs'
import StoreQuickStatDetailDialog from './StoreQuickStatDetailDialog.vue'
import type { StoreQuickStatMetric } from './StoreQuickStatDetailDialog.vue'
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
const { storeApi, entryApi } = userStore
const loading = ref(false)

const totalStoreCount = ref(0)
const allDailyCounts = ref<EntryDailyCount[]>([])
const topStore = ref<{ id: number; name: string; entryCount: number } | null>(null)
const topStoreDailyCounts = ref<DailyStatistic[]>([])

const showDetail = ref(false)
const detailMetric = ref<StoreQuickStatMetric>('stores')
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
/** All-store daily entries: 14-day padded array. Index 0 = 13 days ago, index 13 = today. */
const fullData = computed(() => {
  const map = new Map(allDailyCounts.value.map((d) => [d.date.slice(0, 10), d.count]))
  const result: number[] = []
  for (let i = 13; i >= 0; i--) {
    result.push(map.get(daysAgo(i)) ?? 0)
  }
  return result
})

const currentWeek = computed(() => fullData.value.slice(7))
const previousWeek = computed(() => fullData.value.slice(0, 7))

// — Card 1: Total Stores (sparkline = all-store daily traffic)
const currentWeekTotal = computed(() => currentWeek.value.reduce((s, v) => s + v, 0))
const previousWeekTotal = computed(() => previousWeek.value.reduce((s, v) => s + v, 0))
const totalChange = computed(() => {
  if (previousWeekTotal.value === 0) return currentWeekTotal.value > 0 ? 100 : 0
  return Math.round(
    ((currentWeekTotal.value - previousWeekTotal.value) / previousWeekTotal.value) * 100,
  )
})

// — Card 2: Avg. Entries / Store / Day
const currentAvgPerStore = computed(() => {
  if (totalStoreCount.value === 0) return 0
  return Math.round(currentWeekTotal.value / totalStoreCount.value / 7)
})
const previousAvgPerStore = computed(() => {
  if (totalStoreCount.value === 0) return 0
  return Math.round(previousWeekTotal.value / totalStoreCount.value / 7)
})
const avgChange = computed(() => {
  if (previousAvgPerStore.value === 0) return currentAvgPerStore.value > 0 ? 100 : 0
  return Math.round(
    ((currentAvgPerStore.value - previousAvgPerStore.value) / previousAvgPerStore.value) * 100,
  )
})
const avgPerStoreCurrent = computed(() => {
  if (totalStoreCount.value === 0) return currentWeek.value
  return currentWeek.value.map((v) => Math.round(v / totalStoreCount.value))
})
const avgPerStorePrevious = computed(() => {
  if (totalStoreCount.value === 0) return previousWeek.value
  return previousWeek.value.map((v) => Math.round(v / totalStoreCount.value))
})

// — Card 3: Top Performer
const topFullData = computed(() => {
  const map = new Map(topStoreDailyCounts.value.map((d) => [d.date.slice(0, 10), d.count]))
  const result: number[] = []
  for (let i = 13; i >= 0; i--) {
    result.push(map.get(daysAgo(i)) ?? 0)
  }
  return result
})
const topCurrentWeek = computed(() => topFullData.value.slice(7))
const topPreviousWeek = computed(() => topFullData.value.slice(0, 7))
const topCurrentTotal = computed(() => topCurrentWeek.value.reduce((s, v) => s + v, 0))
const topPreviousTotal = computed(() => topPreviousWeek.value.reduce((s, v) => s + v, 0))
const topChange = computed(() => {
  if (topPreviousTotal.value === 0) return topCurrentTotal.value > 0 ? 100 : 0
  return Math.round(
    ((topCurrentTotal.value - topPreviousTotal.value) / topPreviousTotal.value) * 100,
  )
})

// Sparklines
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

const storesSparkline = computed(() => {
  const color = totalChange.value >= 0 ? '#10b981' : '#ef4444'
  return makeDualSparkline(currentWeek.value, previousWeek.value, color)
})

const avgSparkline = computed(() => {
  const color = avgChange.value >= 0 ? '#10b981' : '#ef4444'
  return makeDualSparkline(avgPerStoreCurrent.value, avgPerStorePrevious.value, color)
})

const topSparkline = computed(() => {
  const color = topChange.value >= 0 ? '#10b981' : '#ef4444'
  return makeDualSparkline(topCurrentWeek.value, topPreviousWeek.value, color)
})

function changeText(val: number): string {
  return (val > 0 ? '+' : '') + val + '%'
}
// #endregion COMPUTED

// #region METHODS
async function loadStats() {
  loading.value = true
  try {
    const [storeResult, entryResult] = await Promise.all([
      storeApi().fetchStores(1, 1000),
      entryApi().fetchEntryStatistics(daysAgo(13), today()),
    ])

    totalStoreCount.value = storeResult.totalItems
    allDailyCounts.value = entryResult.dailyCounts

    // Find top store by entryCount
    const sorted = [...storeResult.items].sort((a, b) => b.entryCount - a.entryCount)
    const top = sorted[0] ?? null
    topStore.value = top ? { id: top.id, name: top.name, entryCount: top.entryCount } : null

    // Fetch top store's daily statistics for sparkline
    if (top) {
      const topResult = await storeApi().fetchStatistics(top.id, daysAgo(13), today())
      topStoreDailyCounts.value = topResult.statistics
    }
  } catch {
    /* silent — tiles just show 0 */
  } finally {
    loading.value = false
  }
}

function openDetail(metric: StoreQuickStatMetric) {
  detailMetric.value = metric
  showDetail.value = true
}
// #endregion METHODS

// #region LIFECYCLE
onMounted(() => loadStats())

watch(
  () => userStore.storesDataSource,
  () => loadStats(),
)

defineExpose({ refresh: loadStats })
// #endregion LIFECYCLE
</script>

<template>
  <div class="grid grid-cols-3 gap-4">
    <!-- Total Stores -->
    <div
      class="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 transition-shadow hover:shadow-md"
      @click="openDetail('stores')"
    >
      <div class="flex items-center justify-between">
        <span class="text-[13px] font-medium text-gray-500">Total Stores</span>
        <i class="pi pi-shop text-xs text-gray-300"></i>
      </div>
      <div class="mt-2 flex items-end justify-between">
        <span class="text-[28px] leading-none font-bold text-gray-900">
          <template v-if="loading">—</template>
          <template v-else>{{ totalStoreCount }}</template>
        </span>
        <div class="h-10 w-24">
          <Line
            v-if="!loading && currentWeek.some((v) => v > 0)"
            :data="storesSparkline"
            :options="sparklineOptions"
          />
        </div>
      </div>
      <span v-if="!loading" class="mt-1.5 inline-block text-xs">
        <span :class="totalChange >= 0 ? 'text-emerald-500' : 'text-red-500'">
          {{ changeText(totalChange) }}
        </span>
        <span class="text-gray-400"> traffic vs last week</span>
      </span>
    </div>

    <!-- Avg. Entries / Store -->
    <div
      class="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 transition-shadow hover:shadow-md"
      @click="openDetail('avg')"
    >
      <div class="flex items-center justify-between">
        <span class="text-[13px] font-medium text-gray-500">Avg. Entries / Store</span>
        <i class="pi pi-chart-line text-xs text-gray-300"></i>
      </div>
      <div class="mt-2 flex items-end justify-between">
        <span class="text-[28px] leading-none font-bold text-gray-900">
          <template v-if="loading">—</template>
          <template v-else>{{ fmtNum(currentAvgPerStore) }}</template>
        </span>
        <div class="h-10 w-24">
          <Line
            v-if="!loading && avgPerStoreCurrent.some((v) => v > 0)"
            :data="avgSparkline"
            :options="sparklineOptions"
          />
        </div>
      </div>
      <span v-if="!loading" class="mt-1.5 inline-block text-xs">
        <span :class="avgChange >= 0 ? 'text-emerald-500' : 'text-red-500'">
          {{ changeText(avgChange) }}
        </span>
        <span class="text-gray-400"> per day vs last week</span>
      </span>
    </div>

    <!-- Top Performer -->
    <div
      class="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 transition-shadow hover:shadow-md"
      @click="openDetail('top')"
    >
      <div class="flex items-center justify-between">
        <span class="text-[13px] font-medium text-gray-500">Top Performer</span>
        <i class="pi pi-trophy text-xs text-gray-300"></i>
      </div>
      <div class="mt-2 flex items-end justify-between">
        <div class="min-w-0 flex-1">
          <span v-if="loading" class="text-[28px] leading-none font-bold text-gray-900">—</span>
          <template v-else-if="topStore">
            <span class="block truncate pr-2 text-lg leading-tight font-bold text-gray-900">
              {{ topStore.name }}
            </span>
            <span class="text-xs text-gray-400"
              >{{ fmtNum(topStore.entryCount) }} total entries</span
            >
          </template>
          <span v-else class="text-lg font-bold text-gray-400">No data</span>
        </div>
        <div class="h-10 w-24 shrink-0">
          <Line
            v-if="!loading && topCurrentWeek.some((v) => v > 0)"
            :data="topSparkline"
            :options="sparklineOptions"
          />
        </div>
      </div>
      <span v-if="!loading && topStore" class="mt-1.5 inline-block text-xs">
        <span :class="topChange >= 0 ? 'text-emerald-500' : 'text-red-500'">
          {{ changeText(topChange) }}
        </span>
        <span class="text-gray-400"> this week</span>
      </span>
    </div>
  </div>

  <!-- Detail dialog -->
  <StoreQuickStatDetailDialog
    v-model:visible="showDetail"
    :metric="detailMetric"
    :store-count="totalStoreCount"
    :top-store-id="topStore?.id ?? null"
    :top-store-name="topStore?.name ?? ''"
  />
</template>
