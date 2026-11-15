<script setup lang="ts">
import { ref } from 'vue'
import ExposureSummary from './ExposureSummary.vue'
import { ArrowUpRight, CircleHelp, Info, ShieldCheck, X } from '@lucide/vue'
import type { FloodCase, PreparedLayer, ViewMode } from '../types'
withDefaults(defineProps<{ data: FloodCase | null; layer?: PreparedLayer; mode?: ViewMode; baselineOnly?: boolean; open: boolean; loading: boolean }>(), { mode: 'compare', baselineOnly: false })
defineEmits<{ close: []; sources: [] }>()
const tab = ref<'overview' | 'method'>('overview')
const dateLabel = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(date))
</script>

<template>
  <aside id="evidence" class="evidence-panel" :class="{ 'panel-open': open }" tabindex="-1" aria-label="Evidence and interpretation">
    <div class="evidence-heading"><span class="eyebrow">02 / THE EVIDENCE</span><button class="icon-button panel-close" aria-label="Close evidence panel" @click="$emit('close')"><X :size="18" /></button><ShieldCheck class="desktop-only" :size="17" /></div>
    <div class="evidence-tabs" role="group" aria-label="Evidence sections"><button :class="{ active: tab === 'overview' }" :aria-pressed="tab === 'overview'" @click="tab = 'overview'">Overview</button><button :class="{ active: tab === 'method' }" :aria-pressed="tab === 'method'" @click="tab = 'method'">Data & method</button></div>
    <div v-if="data" class="evidence-body">
      <span class="pill"><span class="status-dot" />{{ data.dataKind === 'synthetic-demo' ? 'DEVELOPMENT VIEW' : data.reviewStatus.replaceAll('-', ' ').toUpperCase() }}</span>
      <h2>{{ data.title }}</h2>
      <ExposureSummary v-if="tab === 'overview' && data.collection?.exposure" :data="data" :mode="mode" :baseline-only="baselineOnly" :aggregate="!!layer" />
      <details v-if="data.collection?.exposure" class="case-summary"><summary>About this case</summary><p class="case-description">{{ data.description }}</p></details><p v-else class="case-description">{{ data.description }}</p>
      <section v-if="layer" class="evidence-section"><h3>{{ layer.label }}</h3><p>{{ layer.description }}</p><p>Sampled period: {{ data.collection?.observations[0]?.date }} – {{ data.collection?.observations.at(-1)?.date }}</p></section>
      <div v-else class="observation-pair"><div><span class="date-dot" /><span class="eyebrow">BEFORE</span><strong>{{ dateLabel(data.before.date) }}</strong></div><span class="date-connector" /><div><span class="date-dot after" /><span class="eyebrow">AFTER</span><strong>{{ dateLabel(data.after.date) }}</strong></div></div>
      <p class="date-context">{{ data.dataKind === 'synthetic-demo' ? 'Illustrative dates, not satellite acquisitions.' : data.dataKind === 'team-export' ? 'Supplied date labels; exact acquisition times and time zone were not provided.' : 'Acquisition dates shown in UTC.' }}</p>
      <template v-if="tab === 'overview'">
        <section class="evidence-section"><h3><span>01</span>What is shown</h3><p>{{ data.observed }}</p></section>
        <section class="evidence-section"><h3><span>02</span>How to read it</h3><p>{{ data.explanation }}</p></section>
        <section class="limitations"><h3><CircleHelp :size="15" />What remains uncertain</h3><ul><li v-for="limitation in data.limitations" :key="limitation">{{ limitation }}</li></ul></section>
      </template>
      <template v-else>
        <dl class="method-list"><div><dt>Instrument</dt><dd>{{ data.instrument }}</dd></div><div><dt>Product</dt><dd>{{ data.product }}</dd></div><div><dt>Measurement</dt><dd>{{ data.measurement }}</dd></div><div><dt>Units</dt><dd>{{ data.units }}</dd></div><div><dt>Interpretation</dt><dd>{{ data.interpretation.replaceAll('-', ' ') }}</dd></div><div><dt>Before input</dt><dd>{{ data.before.inputId }}</dd></div><div><dt>After input</dt><dd>{{ data.after.inputId }}</dd></div><div v-if="data.before.backgroundImage"><dt>Before radar context</dt><dd>{{ data.before.backgroundImage.split('/').at(-1) }}</dd></div><div v-if="data.after.backgroundImage"><dt>After radar context</dt><dd>{{ data.after.backgroundImage.split('/').at(-1) }}</dd></div></dl>
        <section class="evidence-section"><h3>Processing method</h3><p>{{ data.method }}</p></section>
        <details v-if="data.collection" class="reported-series"><summary>Team-reported classified areas (km²)</summary><p>Imported estimates, not reproduced or independently validated. Total combines the two supplied classes; it is not the open-water area alone.</p><div class="series-scroll"><table><caption>Values from the teammate export</caption><thead><tr><th>Date</th><th>Open water</th><th>Flooded veg.</th><th>Total</th></tr></thead><tbody><tr v-for="row in data.collection.series" :key="row.date"><th>{{ row.date }}</th><td>{{ row.open_water.toLocaleString('en', { maximumFractionDigits: 1 }) }}</td><td>{{ row.flooded_veg.toLocaleString('en', { maximumFractionDigits: 1 }) }}</td><td>{{ row.total.toLocaleString('en', { maximumFractionDigits: 1 }) }}</td></tr></tbody></table></div></details>
        <details v-if="data.collection?.exposure" class="reported-series exposure-sources"><summary>Exposure sources & baseline</summary><dl><dt>Population files</dt><dd>{{ data.collection.exposure.sources.population.join(', ') || 'Not supplied' }}</dd><dt>Cropland files</dt><dd>{{ data.collection.exposure.sources.cropland.join(', ') || 'Not supplied' }}</dd><dt>Land-cover class</dt><dd>{{ data.collection.exposure.sources.cropClass ?? 'Not supplied' }}</dd><dt>Road file / filter</dt><dd>{{ data.collection.exposure.sources.roads ?? 'Not supplied' }} / {{ data.collection.exposure.sources.roadsFilter ?? 'Not supplied' }}</dd><dt>Baseline file</dt><dd>{{ data.collection.exposure.sources.baseline ?? 'Not supplied' }}</dd><dt>Recurrence threshold</dt><dd>{{ data.collection.exposure.sources.recurrenceBelowPct == null ? 'Not supplied' : `Below ${data.collection.exposure.sources.recurrenceBelowPct}%` }}</dd></dl><p>{{ data.collection.exposure.sources.method }}</p></details>
        <p class="quiet-note">This interface displays prepared assets. It does not calculate flood extent from image colors.</p>
      </template>
      <button class="source-link" @click="$emit('sources')">View sources & provenance<ArrowUpRight :size="15" /></button>
    </div>
    <p v-else class="empty-state">{{ loading ? 'Loading evidence…' : 'Choose an available case to read its evidence.' }}</p>
    <div class="evidence-footer"><Info :size="14" /><span>Observation is the beginning.<br />Interpretation needs evidence.</span></div>
  </aside>
</template>

<style scoped>
.reported-series { margin-block: 18px; font-size: 11px; color: #bed2d8; }
.reported-series summary { cursor: pointer; }
.reported-series p { font-size: 10px; line-height: 1.7; margin-block: 10px; }
.series-scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 9px; white-space: nowrap; }
th, td { padding: 7px 5px; border-bottom: 1px solid #375363; text-align: right; }
th:first-child { text-align: left; }
caption { text-align: left; color: #8eaab5; padding-bottom: 8px; }
.case-summary { font-size: 11px; color: #a8c3c9; margin-block: 15px; }
.case-summary summary { cursor: pointer; }
.exposure-sources dd { overflow-wrap: anywhere; margin: 4px 0 12px; color: #a8c1c9; font-size: 10px; line-height: 1.7; }
.exposure-sources dt { font-size: 10px; color: #d2e0e2; }
</style>
