<script setup lang="ts">
// #region IMPORTS
import { ref, watch, computed } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import type { DailyStatistic, StoreStatistics } from '@/types/store'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)
// #endregion IMPORTS

// #region PROPS & EMITS
const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  stores: { id: number; name: string }[]
}>()
// #endregion PROPS & EMITS

// #region STATE
const { storeApi } = useUserStore()
const storeResults = ref<StoreStatistics[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

function defaultRange(): [Date, Date] {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return [start, end]
}

const dateRange = ref<[Date, Date]>(defaultRange())
const loadedRange = ref<[string, string] | null>(null)
const chartType = ref<'line' | 'bar'>('line')
// #endregion STATE

// #region HELPERS
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Fills gaps so every day in the range has a data point (0 if missing). */
function fillGaps(stats: DailyStatistic[], range: [string, string]): DailyStatistic[] {
  const map = new Map(stats.map((s) => [s.date, s.count]))
  const result: DailyStatistic[] = []
  const current = new Date(range[0])
  const end = new Date(range[1])
  while (current <= end) {
    const key = current.toISOString().split('T')[0]!
    result.push({ date: key, count: map.get(key) ?? 0 })
    current.setDate(current.getDate() + 1)
  }
  return result
}
// #endregion HELPERS

// #region COMPUTED
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

const chartData = computed(() => {
  if (!loadedRange.value || storeResults.value.length === 0) return { labels: [], datasets: [] }

  const range = loadedRange.value
  const labels = fillGaps([], range).map((s) => s.date)

  const datasets = storeResults.value.map((store, i) => {
    const filled = fillGaps(store.statistics, range)
    const color = COLORS[i % COLORS.length]!
    return {
      label: store.name,
      data: filled.map((s) => s.count),
      borderColor: color,
      backgroundColor: chartType.value === 'bar' ? color : color,
      pointRadius: chartType.value === 'line' ? 3 : 0,
      pointHoverRadius: 5,
      tension: 0,
    }
  })

  return { labels, datasets }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: false },
    legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label: string }; parsed: { y: number | null } }) =>
          `${ctx.dataset.label}: ${ctx.parsed.y ?? 0} entries`,
      },
    },
  },
  scales: {
    x: { ticks: { color: '#6b7280', font: { size: 11 }, maxRotation: 45, maxTicksLimit: 8 }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: '#6b7280', font: { size: 11 }, precision: 0 }, grid: { color: '#f3f4f6' } },
  },
}

const totalEntries = computed(() =>
  storeResults.value.reduce((sum, s) => sum + s.statistics.reduce((a, d) => a + d.count, 0), 0),
)

const dateRangeChanged = computed(() => {
  if (!loadedRange.value) return true
  return formatDate(dateRange.value[0]) !== loadedRange.value[0] || formatDate(dateRange.value[1]) !== loadedRange.value[1]
})
// #endregion COMPUTED

// #region METHODS
async function loadAll() {
  if (props.stores.length === 0 || !dateRange.value[0] || !dateRange.value[1]) return
  loading.value = true
  error.value = null
  const start = formatDate(dateRange.value[0])
  const end = formatDate(dateRange.value[1])
  try {
    const results = await Promise.all(
      props.stores.map((s) => storeApi().fetchStatistics(s.id, start, end)),
    )
    storeResults.value = results
    loadedRange.value = [start, end]
  } catch {
    error.value = 'Failed to load statistics'
    storeResults.value = []
  } finally {
    loading.value = false
  }
}
// #endregion METHODS

// #region WATCHERS
watch(visible, (open) => {
  if (open) {
    dateRange.value = defaultRange()
    loadAll()
  } else {
    storeResults.value = []
    error.value = null
    loadedRange.value = null
  }
})
// #endregion WATCHERS

const dialogPt = {
  root: { class: 'rounded-2xl!' },
  header: { class: 'border-b border-gray-100 px-6! py-4!' },
  content: { class: 'px-6! py-5!' },
}
</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '820px' }" :pt="dialogPt">
    <template #header>
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="text-base font-semibold text-gray-900">Compare — {{ stores.length }} stores</span>
          <span v-if="!loading && storeResults.length > 0" class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
            {{ totalEntries }} total entries in range
          </span>
        </div>
        <span class="text-xs text-gray-400">
          {{ stores.map((s) => s.name).join(', ') }}
        </span>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <!-- Date range picker -->
      <div class="flex items-end gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-gray-700">From</label>
          <DatePicker
            v-model="dateRange[0]"
            date-format="dd/mm/yy"
            :max-date="dateRange[1]"
            class="w-44"
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
            class="w-44"
            size="small"
          />
        </div>
        <Button
          label="Load"
          icon="pi pi-search"
          size="small"
          :loading="loading"
          :disabled="!dateRangeChanged"
          @click="loadAll"
        />
        <Button
          :icon="chartType === 'line' ? 'pi pi-chart-bar' : 'pi pi-chart-line'"
          :label="chartType === 'line' ? 'Bar' : 'Line'"
          size="small"
          text
          @click="chartType = chartType === 'line' ? 'bar' : 'line'"
        />
      </div>

      <!-- Loading (initial) -->
      <div v-if="loading && storeResults.length === 0" class="flex items-center justify-center py-12">
        <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <span class="text-sm text-red-600">{{ error }}</span>
      </div>

      <!-- Empty -->
      <div v-else-if="!loading && storeResults.length === 0" class="py-12 text-center">
        <p class="text-sm text-gray-400">No entries in selected range</p>
      </div>

      <!-- Chart -->
      <div v-else>
        <div class="relative" style="height: 340px">
          <Line v-if="chartType === 'line'" :data="chartData" :options="chartOptions" />
          <Bar v-else :data="chartData" :options="chartOptions" />
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
            <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>
