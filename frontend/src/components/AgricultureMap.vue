<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Maximize2, MapPin } from '@lucide/vue'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import type { AgricultureSummary, ProvinceGeometry } from '../agriculture/contract'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

const props = defineProps<{ geometry: ProvinceGeometry; summary: AgricultureSummary; selected: string; crop: 'pure' | 'mixed'; metric: 'radar' | 'rainfall' }>()
const emit = defineEmits<{ select: [province: string] }>()
const container = ref<HTMLDivElement>(), mapError = ref(''), loaded = ref(false)
let map: MapLibreMap | undefined, disposed = false
let resizeObserver: ResizeObserver | undefined
const joined = computed(() => ({ ...props.geometry, features: props.geometry.features.filter((f) => props.summary.provinces.some((p) => p.province === f.properties.province)).map((f) => {
  const p = props.summary.provinces.find((p) => p.province === f.properties.province)!
  return { ...f, properties: { province: p.province, value: props.metric === 'radar' ? p[props.crop].changedPercent : p.rainfallAnomalyMm } }
}) }))
const matchError = computed(() => props.summary.provinces.some((p) => !props.geometry.features.some((f) => f.properties.province === p.province)))
function fit(animate = true) {
  if (!map) return
  const coordinates: number[][] = []
  for (const f of joined.value.features) {
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const p of polygons) for (const ring of p) coordinates.push(...ring)
  }
  if (coordinates.length) map.fitBounds([[Math.min(...coordinates.map((p) => p[0]!)), Math.min(...coordinates.map((p) => p[1]!))], [Math.max(...coordinates.map((p) => p[0]!)), Math.max(...coordinates.map((p) => p[1]!))]], { padding: 48, duration: animate && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 0 })
}
function update() {
  if (!loaded.value || !map) return
  ;(map.getSource('provinces') as GeoJSONSource).setData(joined.value)
  map.setPaintProperty('province-fill', 'fill-color', ['case', ['==', ['get', 'value'], null], '#53646d', props.metric === 'radar'
    ? ['interpolate', ['linear'], ['get', 'value'], 0, '#204d47', 20, '#65b5a0', 50, '#f3c879', 100, '#dc845d']
    : ['interpolate', ['linear'], ['get', 'value'], -150, '#c18055', 0, '#d0d5bb', 150, '#5dafa8']])
  map.setFilter('selected-province', ['==', ['get', 'province'], props.selected])
}
watch(() => [props.selected, props.crop, props.metric, props.summary, props.geometry], update)
onMounted(async () => {
  try {
    const lib = await import('maplibre-gl')
    if (disposed || !container.value) return
    lib.setWorkerUrl(workerUrl)
    // A self-contained province map stays usable without a remote basemap service.
    map = new lib.Map({ container: container.value, style: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#0b1c22' } }] }, center: [104, 13], zoom: 6, attributionControl: false, renderWorldCopies: false, dragRotate: false, pitchWithRotate: false, touchPitch: false })
    map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      if (!map || disposed) return
      map.addSource('provinces', { type: 'geojson', data: joined.value })
      map.addLayer({ id: 'province-fill', type: 'fill', source: 'provinces', paint: { 'fill-opacity': 0.85 } })
      map.addLayer({ id: 'province-outline', type: 'line', source: 'provinces', paint: { 'line-color': '#0b2529', 'line-width': 1.5 } })
      map.addLayer({ id: 'selected-province', type: 'line', source: 'provinces', paint: { 'line-color': '#f3f7df', 'line-width': 3 } })
      loaded.value = true; update(); fit(false)
      resizeObserver = new ResizeObserver(() => { map?.resize(); fit(false) })
      if (container.value) resizeObserver.observe(container.value)
      map.on('click', 'province-fill', (event) => { const province: unknown = event.features?.[0]?.properties?.province; if (typeof province === 'string') emit('select', province) })
      map.on('mouseenter', 'province-fill', () => { if (map) map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'province-fill', () => { if (map) map.getCanvas().style.cursor = '' })
    })
    map.on('error', () => { mapError.value = 'The interactive map could not render. Use the province selector and comparison table below.' })
  } catch { mapError.value = 'Interactive maps are unavailable in this browser. Use the province selector and comparison table below.' }
})
onUnmounted(() => { disposed = true; resizeObserver?.disconnect(); map?.remove() })
</script>

<template>
  <div class="ag-map-frame">
    <div ref="container" class="ag-map-canvas" aria-label="Interactive map of six Tonlé Sap provinces. Use the province selector for keyboard access." />
    <div class="ag-map-label"><MapPin :size="14" /><span>TONLÉ SAP REGION <small>Province averages · not field boundaries</small></span></div>
    <button class="ag-map-fit" aria-label="Fit all agriculture provinces" :disabled="!loaded" @click="fit()"><Maximize2 :size="17" /></button>
    <p v-if="mapError" class="ag-map-error" role="status">{{ mapError }}</p>
    <p v-else-if="matchError" class="ag-map-error" role="status">Some summary provinces have no matching map boundary. Their figures remain available below.</p>
    <div class="ag-map-legend"><span>{{ metric === 'radar' ? 'Radar-change signal · % of valid area' : 'Rainfall anomaly · mm' }}</span><div :class="{ 'is-rainfall': metric === 'rainfall' }" /><span>{{ metric === 'radar' ? '0% → 100%' : '−150 → +150 mm (colours capped)' }} · grey = not supplied</span></div>
  </div>
</template>
