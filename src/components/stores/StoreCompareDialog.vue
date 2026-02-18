<script setup lang="ts">
// #region IMPORTS
import { ref, watch, computed } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import type { StoreStatistics } from '@/types/statistics'
import { toISODate, defaultDateRange, fillDailyGaps } from '@/utils/date'
import { CHART_COLORS } from '@/utils/chart'
import { dialogPtNoFooter } from '@/utils/dialog'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import { Line, Bar } from 'vue-chartjs'
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

const dateRange = ref<[Date, Date]>(defaultDateRange())
const loadedRange = ref<[string, string] | null>(null)
const chartType = ref<'line' | 'bar'>('line')
// #endregion STATE

// #region COMPUTED
/**
 * Builds multi-series chart data from all selected stores' daily statistics.
 * Each store becomes a separate dataset with a distinct color. Days missing
 * from the API response are gap-filled with zero so every series shares
 * the same continuous label axis.
 */
const chartData = computed(() => {
  if (!loadedRange.value || storeResults.value.length === 0) return { labels: [], datasets: [] }

  const range = loadedRange.value
  const labels = fillDailyGaps([], range[0], range[1]).map((s) => s.date)

  const datasets = storeResults.value.map((store, i) => {
    const filled = fillDailyGaps(store.statistics, range[0], range[1])
    const color = CHART_COLORS[i % CHART_COLORS.length]!
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
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
          `${ctx.dataset.label ?? ''}: ${ctx.parsed.y ?? 0} entries`,
      },
    },
  },
  scales: {
    x: { ticks: { color: '#6b7280', font: { size: 11 }, maxRotation: 45, maxTicksLimit: 8 }, grid: { display: false } },
    y: { beginAtZero: true, ticks: { color: '#6b7280', font: { size: 11 }, precision: 0 }, grid: { color: '#f3f4f6' } },
  },
}

/** Sums all entry counts across every loaded store within the current date range. */
const totalEntries = computed(() =>
  storeResults.value.reduce((sum, s) => sum + s.statistics.reduce((a, d) => a + d.count, 0), 0),
)

/** True when the date-picker values differ from the last fetched range, enabling the Load button. */
const dateRangeChanged = computed(() => {
  if (!loadedRange.value) return true
  return toISODate(dateRange.value[0]) !== loadedRange.value[0] || toISODate(dateRange.value[1]) !== loadedRange.value[1]
})
// #endregion COMPUTED

// #region METHODS
/**
 * Fetches daily statistics for every selected store in parallel via Promise.all,
 * then stores the results and records the loaded date range for cache comparison.
 */
async function loadAll() {
  if (props.stores.length === 0 || !dateRange.value[0] || !dateRange.value[1]) return
  loading.value = true
  error.value = null
  const start = toISODate(dateRange.value[0])
  const end = toISODate(dateRange.value[1])
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
    dateRange.value = defaultDateRange()
    loadAll()
  } else {
    storeResults.value = []
    error.value = null
    loadedRange.value = null
  }
})
// #endregion WATCHERS

</script>

<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '820px' }" :pt="dialogPtNoFooter">
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
