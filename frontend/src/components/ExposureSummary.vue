<script setup lang="ts">
import { computed } from 'vue'
import type { ExposureValues, FloodCase, ViewMode } from '../types'

const props = defineProps<{ data: FloodCase; mode: ViewMode; baselineOnly: boolean; aggregate: boolean }>()
const date = computed(() => props.mode === 'before' ? props.data.before.date : props.data.after.date)
const records = computed(() => props.data.collection?.exposure?.records)
const selected = computed(() => records.value?.find((r) => r.date === date.value))
const before = computed(() => props.mode === 'compare' ? records.value?.find((r) => r.date === props.data.before.date) : undefined)
const current = computed(() => props.baselineOnly ? selected.value?.baselineFiltered : selected.value?.classifiedWater)
const prior = computed(() => props.baselineOnly ? before.value?.baselineFiltered : before.value?.classifiedWater)
const fields: { key: keyof ExposureValues; label: string; unit: string }[] = [
  { key: 'areaKm2', label: 'Mapped water area', unit: 'km²' },
  { key: 'population', label: 'Estimated population overlap', unit: 'people' },
  { key: 'roadKm', label: 'Road length overlap', unit: 'km' },
  { key: 'croplandHa', label: 'Cropland overlap', unit: 'ha' },
]
function format(value: number, key: keyof ExposureValues) {
  return new Intl.NumberFormat('en', key === 'population' || key === 'croplandHa' ? { maximumSignificantDigits: 3 } : { maximumFractionDigits: 1 }).format(value)
}
function difference(key: keyof ExposureValues) {
  const now = current.value?.[key], earlier = prior.value?.[key]
  if (now == null || earlier == null) return ''
  const delta = now - earlier
  return `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${format(Math.abs(delta), key)}`
}
</script>

<template>
  <section class="exposure-summary" aria-label="Team-reported exposure estimates">
    <div class="exposure-heading"><h3>Exposure estimates</h3><span>TEAM-REPORTED</span></div>
    <p v-if="aggregate" class="exposure-note">Season-wide map selected. Choose a dated view to see exposure estimates for a specific date.</p>
    <template v-else-if="current">
      <p class="exposure-date">{{ date }} <span>{{ baselineOnly ? 'Baseline-filtered open water' : 'All supplied water classes' }}</span></p>
      <div class="exposure-grid">
        <div v-for="field in fields" :key="field.key" class="exposure-metric" :data-metric="field.key">
          <strong>{{ current[field.key] == null ? 'Not supplied' : `${field.key === 'population' || field.key === 'croplandHa' ? '≈ ' : ''}${format(current[field.key]!, field.key)}` }}<small v-if="current[field.key] != null">{{ field.unit }}</small></strong>
          <span>{{ field.key === 'areaKm2' && baselineOnly ? 'Baseline-filtered open-water area' : field.label }}</span>
          <small v-if="difference(field.key)" class="exposure-difference">{{ difference(field.key) }} {{ field.unit }} vs {{ data.before.date }}</small>
        </div>
      </div>
      <p class="exposure-note">Overlap estimates are unreviewed. They do not establish confirmed affected people, road closures, crop damage or rice-specific losses.</p>
      <p v-if="baselineOnly" class="exposure-note baseline-note">Open water where the reported historical JRC recurrence is below {{ data.collection?.exposure?.sources.recurrenceBelowPct ?? 'an unspecified threshold' }}{{ data.collection?.exposure?.sources.recurrenceBelowPct != null ? '%' : '' }}. This proxy excludes flooded vegetation and is not a season-matched anomaly or an alert.</p>
    </template>
    <p v-else class="exposure-note">No exposure figures were supplied for {{ date }}.</p>
  </section>
</template>

<style scoped>
.exposure-summary { margin: 18px 0 24px; padding: 15px; background: #142c35; border: 1px solid #598c9055; border-radius: 7px; }
.exposure-heading { display: flex; flex-wrap: wrap; gap: 7px; justify-content: space-between; align-items: center; }
.exposure-heading h3 { font-size: 13px; font-weight: 550; }
.exposure-heading > span { color: #d6bd8b; font-size: 7px; letter-spacing: 1px; }
.exposure-date { font-size: 11px; margin-top: 12px; color: #c6e0e0; }
.exposure-date > span { display: block; margin-top: 4px; font-size: 9px; color: #a1bfc4; }
.exposure-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 12px; margin-block: 16px; }
.exposure-metric { min-width: 0; }
.exposure-metric strong { display: block; color: #bce8dc; font-size: 18px; line-height: 1.35; font-weight: 550; overflow-wrap: anywhere; }
.exposure-metric strong small { font-size: 9px; margin-left: 4px; font-weight: 400; }
.exposure-metric > span { display: block; color: #b6ced0; font-size: 9px; line-height: 1.6; margin-top: 4px; }
.exposure-difference { display: block; color: #9fc7cb; font-size: 8px; line-height: 1.6; margin-top: 5px; }
.exposure-note { color: #a9c1c4; font-size: 10px; line-height: 1.7; margin-top: 12px; }
.baseline-note { border-top: 1px solid #839c8e33; padding-top: 10px; color: #e0ba97; }
</style>
