<script setup lang="ts">
import { computed, useId } from 'vue'

export interface ChartRow { date: string; value: number | null; reference?: number | null }
const props = defineProps<{ title: string; unit: string; rows: ChartRow[]; referenceLabel?: string }>()
const titleId = useId()
const W = 640, H = 195, left = 50, right = 18, top = 18, bottom = 32
const plot = computed(() => {
  const values = props.rows.flatMap((r) => [r.value, r.reference]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const min = Math.min(0, ...values), max = Math.max(0.1, ...values), range = max - min
  const times = props.rows.map((r) => Date.parse(r.date)), start = times[0] ?? 0, end = times.at(-1) ?? start
  const x = (time: number) => left + (time - start) / (end - start || 1) * (W - left - right)
  const y = (value: number) => top + (max - value) / range * (H - top - bottom)
  function paths(key: 'value' | 'reference') {
    let previous: ChartRow | undefined
    return props.rows.map((r) => {
      const v = r[key]
      if (v === null || v === undefined) { previous = undefined; return '' }
      const gap = previous ? Date.parse(r.date) - Date.parse(previous.date) > 40 * 86400000 : true
      previous = r
      return `${gap ? 'M' : 'L'}${x(Date.parse(r.date)).toFixed(1)},${y(v).toFixed(1)}`
    }).join(' ')
  }
  return { min, max, y, x, primary: paths('value'), reference: paths('reference') }
})
const format = (value: number | null | undefined) => value === null || value === undefined ? 'Not supplied' : value.toLocaleString('en', { maximumFractionDigits: props.unit === 'mm' ? 1 : 3 })
</script>

<template>
  <div class="ag-chart">
    <svg v-if="rows.some((r) => r.value !== null)" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-labelledby="titleId">
      <title :id="titleId">{{ title }}. {{ rows[0]?.date }} to {{ rows.at(-1)?.date }}. Values in {{ unit }}. Full values in the data table.</title>
      <g v-for="fraction in [0, .5, 1]" :key="fraction"><line :x1="left" :x2="W - right" :y1="top + fraction * (H - top - bottom)" :y2="top + fraction * (H - top - bottom)" stroke="#294047" /><text :x="left - 10" :y="top + fraction * (H - top - bottom) + 4" text-anchor="end">{{ format(plot.max - fraction * (plot.max - plot.min)) }}</text></g>
      <path v-if="referenceLabel" :d="plot.reference" fill="none" stroke="#dcba7a" stroke-width="2" stroke-dasharray="5 5" />
      <path :d="plot.primary" fill="none" stroke="#a5ddca" stroke-width="2.5" />
      <circle v-for="r in rows.filter((r) => r.value !== null)" :key="r.date" :cx="plot.x(Date.parse(r.date))" :cy="plot.y(r.value!)" r="2.4" fill="#a5ddca"><title>{{ r.date }}: {{ format(r.value) }} {{ unit }}</title></circle>
      <text :x="left" :y="H - 5">{{ rows[0]?.date }}</text><text :x="W - right" :y="H - 5" text-anchor="end">{{ rows.at(-1)?.date }}</text>
    </svg>
    <p v-else class="ag-empty">No numeric values supplied for this selection.</p>
    <div class="ag-chart-key"><span>━━ {{ unit === 'mm' ? 'Monthly rainfall' : title }}</span><span v-if="referenceLabel">┄┄ {{ referenceLabel }}</span></div>
    <details class="ag-values"><summary>View data table · {{ rows.length }} records</summary><div class="ag-table-scroll"><table><caption>{{ title }} · {{ unit }}</caption><thead><tr><th scope="col">Date</th><th scope="col">Value ({{ unit }})</th><th v-if="referenceLabel" scope="col">{{ referenceLabel }} ({{ unit }})</th></tr></thead><tbody><tr v-for="r in rows" :key="r.date"><th scope="row">{{ r.date }}</th><td>{{ format(r.value) }}</td><td v-if="referenceLabel">{{ format(r.reference) }}</td></tr></tbody></table></div></details>
  </div>
</template>
