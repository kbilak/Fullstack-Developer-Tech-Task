<script setup lang="ts">
// #region IMPORTS
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import type { EntryDailyCount, EntryStoreCount } from '@/types/entry'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)
// #endregion IMPORTS

// #region STATE
const userStore = useUserStore()
const { entryApi } = userStore
const dailyCounts = ref<EntryDailyCount[]>([])
const storeCounts = ref<EntryStoreCount[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const viewMode = ref<'daily' | 'store'>('daily')
const viewOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'By Store', value: 'store' },
]

function defaultRange(): [Date, Date] {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return [start, end]
}

const dateRange = ref<[Date, Date]>(defaultRange())
const loadedRange = ref<[string, string] | null>(null)
// #endregion STATE

// #region COMPUTED
const totalEntries = computed(() => dailyCounts.value.reduce((sum, d) => sum + d.count, 0))

const dateRangeChanged = computed(() => {
  if (!loadedRange.value) return true
  return (
    formatDate(dateRange.value[0]) !== loadedRange.value[0] ||
    formatDate(dateRange.value[1]) !== loadedRange.value[1]
  )
})

/** Fills gaps so every day in the range has a data point (0 if missing). */
const filledDailyCounts = computed(() => {
  if (dailyCounts.value.length === 0 || !loadedRange.value) return []
  const map = new Map(dailyCounts.value.map((d) => [d.date.slice(0, 10), d.count]))
  const result: EntryDailyCount[] = []
  const current = new Date(loadedRange.value[0] + 'T00:00:00')
  const end = new Date(loadedRange.value[1] + 'T00:00:00')
  while (current <= end) {
    const key = formatDate(current)
    result.push({ date: key, count: map.get(key) ?? 0 })
    current.setDate(current.getDate() + 1)
  }
  return result
})

/** Color based on value position in min-max range. */
function entryColor(count: number, min: number, max: number): string {
  if (count === 0) return '#9ca3af'
  if (min === max) return '#059669'
  const ratio = (count - min) / (max - min)
  if (ratio <= 0.25) return '#dc2626'
  if (ratio <= 0.5) return '#d97706'
  if (ratio <= 0.75) return '#2563eb'
  return '#059669'
}

const STORE_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7',
  '#84cc16', '#e11d48',
]

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

const doughnutChartData = computed(() => {
  const data = storeCounts.value
  return {
    labels: data.map((s) => s.storeName ?? `Store #${s.idStore}`),
    datasets: [
      {
        data: data.map((s) => s.count),
        backgroundColor: data.map((_, i) => STORE_COLORS[i % STORE_COLORS.length]),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }
})

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: false },
    legend: { position: 'right' as const, labels: { boxWidth: 12, font: { size: 12 }, color: '#374151' } },
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
}

const hasData = computed(() => dailyCounts.value.length > 0 || storeCounts.value.length > 0)

function fmtNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
// #endregion COMPUTED

// #region METHODS
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadStatistics() {
  if (!dateRange.value[0] || !dateRange.value[1]) return
  loading.value = true
  error.value = null
  try {
    const result = await entryApi().fetchEntryStatistics(
      formatDate(dateRange.value[0]),
      formatDate(dateRange.value[1]),
    )
    dailyCounts.value = result.dailyCounts
    storeCounts.value = result.storeCounts
    loadedRange.value = [formatDate(dateRange.value[0]), formatDate(dateRange.value[1])]
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
  loadStatistics()
})

watch(() => userStore.storesDataSource, () => {
  dateRange.value = defaultRange()
  loadStatistics()
})
// #endregion LIFECYCLE
</script>

<template>
  <div class="rounded-xl border border-gray-200 bg-white">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
      <div class="flex items-center gap-2">
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
      <div class="flex items-end gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-gray-700">From</label>
          <DatePicker
            v-model="dateRange[0]"
            date-format="dd/mm/yy"
            :max-date="dateRange[1]"
            class="w-40"
            size="small"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-gray-700">To</label>
          <DatePicker
            v-model="dateRange[1]"
            date-format="dd/mm/yy"
            :min-date="dateRange[0]"
            :max-date="new Date()"
            class="w-40"
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
        <div v-if="viewMode === 'daily'" class="mt-2 flex items-center justify-center gap-4 text-[11px] text-gray-500">
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
    </div>
  </div>
</template>
