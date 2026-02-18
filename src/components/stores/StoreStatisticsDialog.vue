<script setup lang="ts">
// #region IMPORTS
import { ref, watch, computed } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import type { DailyStatistic } from '@/types/statistics'
import { toISODate, fillDailyGaps } from '@/utils/date'
import { useStatisticsStore } from '@/stores/useStatisticsStore'
import { entryColor } from '@/utils/chart'
import { dialogPtNoFooter } from '@/utils/dialog'
import ColorLegend from '@/components/common/ColorLegend.vue'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import { Line, Bar } from 'vue-chartjs'
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
const statsStore = useStatisticsStore()
const statistics = ref<DailyStatistic[]>([])
const storeInfo = ref<{ city: string; country: string } | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const startDate = computed({
  get: () => new Date(statsStore.startDate + 'T00:00:00'),
  set: (val: Date) => { statsStore.startDate = toISODate(val) },
})
const endDate = computed({
  get: () => new Date(statsStore.endDate + 'T00:00:00'),
  set: (val: Date) => { statsStore.endDate = toISODate(val) },
})
const loadedRange = ref<[string, string] | null>(null)
const chartType = ref<'line' | 'bar'>('line')
// #endregion STATE

// #region COMPUTED
/** Fills gaps so every day in the range has a data point (0 if missing). */
const filledStatistics = computed(() => {
  if (statistics.value.length === 0 || !loadedRange.value) return []
  return fillDailyGaps(statistics.value, loadedRange.value[0], loadedRange.value[1])
})

/**
 * Builds chart data with per-point colors derived from each day's entry count
 * relative to the min/max range. Low-count days appear cool-toned while
 * high-count days appear warm-toned, giving an at-a-glance heat indication.
 */
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
  return statsStore.startDate !== loadedRange.value[0] || statsStore.endDate !== loadedRange.value[1]
})
// #endregion COMPUTED

// #region METHODS
/** Fetches daily entry statistics for a single store within the selected date range. */
async function loadStatistics() {
  if (!props.storeId) return
  loading.value = true
  error.value = null
  try {
    const start = statsStore.startDate
    const end = statsStore.endDate
    const result = await storeApi().fetchStatistics(props.storeId, start, end)
    statistics.value = result.statistics
    storeInfo.value = { city: result.city, country: result.country }
    loadedRange.value = [start, end]
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
    loadStatistics()
  } else {
    statistics.value = []
    storeInfo.value = null
    error.value = null
  }
})

// #endregion WATCHERS

</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '720px' }" :pt="dialogPtNoFooter">
    <template #header>
      <div class="flex flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
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
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-gray-700">From</label>
          <DatePicker
            v-model="startDate"
            date-format="dd/mm/yy"
            :max-date="endDate"
            class="w-full sm:w-44"
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
            class="w-full sm:w-44"
            size="small"
          />
        </div>
        <div class="flex gap-2">
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
        <ColorLegend class="mt-2" />
      </div>
    </div>
  </Dialog>
</template>
