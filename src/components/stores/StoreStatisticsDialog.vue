<script setup lang="ts">
// #region IMPORTS
import { ref, watch, computed } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import type { DailyStatistic } from '@/types/store'
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
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip)
// #endregion IMPORTS

// #region PROPS & EMITS
const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  storeId: number | null
  storeName: string
}>()
// #endregion PROPS & EMITS

// #region STATE
const { storeApi } = useUserStore()
const statistics = ref<DailyStatistic[]>([])
const storeInfo = ref<{ city: string; country: string } | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Default range: last 30 days
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

// #region COMPUTED
/** Fills gaps so every day in the range has a data point (0 if missing). */
const filledStatistics = computed(() => {
  if (statistics.value.length === 0 || !loadedRange.value) return []
  const map = new Map(statistics.value.map((s) => [s.date, s.count]))
  const result: DailyStatistic[] = []
  const current = new Date(loadedRange.value[0])
  const end = new Date(loadedRange.value[1])
  while (current <= end) {
    const key = current.toISOString().split('T')[0]!
    result.push({ date: key, count: map.get(key) ?? 0 })
    current.setDate(current.getDate() + 1)
  }
  return result
})

/** Returns a hex color based on value's position in min–max range (red→amber→blue→emerald). */
function entryColor(count: number, min: number, max: number): string {
  if (count === 0) return '#9ca3af' // gray-400
  if (min === max) return '#059669' // emerald-600
  const ratio = (count - min) / (max - min)
  if (ratio <= 0.25) return '#dc2626' // red-600
  if (ratio <= 0.5) return '#d97706' // amber-600
  if (ratio <= 0.75) return '#2563eb' // blue-600
  return '#059669' // emerald-600
}

const chartData = computed(() => {
  const data = filledStatistics.value
  const counts = data.map((s) => s.count).filter((c) => c > 0)
  const min = counts.length ? Math.min(...counts) : 0
  const max = counts.length ? Math.max(...counts) : 0
  const colors = data.map((s) => entryColor(s.count, min, max))

  return {
    labels: data.map((s) => s.date),
    datasets: [
      {
        label: 'Entries',
        data: data.map((s) => s.count),
        borderColor: colors,
        backgroundColor: colors,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: { display: false },
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} entries`,
      },
    },
  },
  scales: {
    x: { ticks: { color: '#6b7280', font: { size: 11 }, maxRotation: 45, maxTicksLimit: 8 }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: '#6b7280', font: { size: 11 }, precision: 0 }, grid: { color: '#f3f4f6' } },
  },
}

const totalEntries = computed(() => statistics.value.reduce((sum, s) => sum + s.count, 0))

const dateRangeChanged = computed(() => {
  if (!loadedRange.value) return true
  return formatDate(dateRange.value[0]) !== loadedRange.value[0] || formatDate(dateRange.value[1]) !== loadedRange.value[1]
})
// #endregion COMPUTED

// #region METHODS
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadStatistics() {
  if (!props.storeId || !dateRange.value[0] || !dateRange.value[1]) return
  loading.value = true
  error.value = null
  try {
    const result = await storeApi().fetchStatistics(
      props.storeId,
      formatDate(dateRange.value[0]),
      formatDate(dateRange.value[1]),
    )
    statistics.value = result.statistics
    storeInfo.value = { city: result.city, country: result.country }
    loadedRange.value = [formatDate(dateRange.value[0]), formatDate(dateRange.value[1])]
  } catch {
    error.value = 'Failed to load statistics'
    statistics.value = []
  } finally {
    loading.value = false
  }
}
// #endregion METHODS

// #region WATCHERS
// Load statistics when dialog opens or date range changes
watch(visible, (open) => {
  if (open) {
    dateRange.value = defaultRange()
    loadStatistics()
  } else {
    statistics.value = []
    storeInfo.value = null
    error.value = null
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
  <Dialog v-model:visible="visible" modal :style="{ width: '720px' }" :pt="dialogPt">
    <template #header>
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="text-base font-semibold text-gray-900">Entries — {{ storeName }}</span>
          <span v-if="!loading && statistics.length > 0" class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
            {{ totalEntries }} entries in range
          </span>
        </div>
        <span v-if="storeInfo" class="text-xs text-gray-400">
          ID: {{ storeId }} · {{ storeInfo.city }}, {{ storeInfo.country }}
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
          @click="loadStatistics"
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
      <div v-if="loading && statistics.length === 0" class="flex items-center justify-center py-12">
        <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <span class="text-sm text-red-600">{{ error }}</span>
      </div>

      <!-- Empty -->
      <div v-else-if="!loading && statistics.length === 0" class="py-12 text-center">
        <p class="text-sm text-gray-400">No entries in selected range</p>
      </div>

      <!-- Chart -->
      <div v-else>
        <div class="relative" style="height: 280px">
          <Line v-if="chartType === 'line'" :data="chartData" :options="chartOptions" />
          <Bar v-else :data="chartData" :options="chartOptions" />
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
            <i class="pi pi-spin pi-spinner text-lg text-gray-400"></i>
          </div>
        </div>
        <div class="mt-2 flex items-center justify-center gap-4 text-[11px] text-gray-500">
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
  </Dialog>
</template>
