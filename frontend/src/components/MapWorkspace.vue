<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Map, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import type { ImageSource, StyleSpecification } from 'maplibre-gl'
import Compare from '@maplibre/maplibre-gl-compare'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { LocateFixed, Minus, Plus, Compass, AlertTriangle, RotateCcw } from '@lucide/vue'
import type { FloodCase, StoryStep, ViewMode } from '../types'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@maplibre/maplibre-gl-compare/style.css'

const props = defineProps<{ data: FloodCase | null; mode: ViewMode; changeVisible: boolean; opacity: number; focused: boolean; focusVersion: number; storyStep: StoryStep | null }>()
const emit = defineEmits<{ ready: [value: boolean]; overlayReady: [value: boolean]; singleViewNeeded: [] }>()
setWorkerUrl(workerUrl)
const wrapper = ref<HTMLElement>(), beforeEl = ref<HTMLElement>(), afterEl = ref<HTMLElement>()
const isMobile = ref(false), fallback = ref(false), baseFailed = ref(false), imageError = ref(false), assetsReady = ref(false), split = ref(50)
const rendered = ref(false)
const changeError = ref(false), changeReady = ref(false)
watch(() => changeReady.value && !changeError.value && !fallback.value, (ready) => emit('overlayReady', ready), { immediate: true })
const unavailable = computed(() => imageError.value || !assetsReady.value)
watch(unavailable, (value) => emit('ready', !value), { immediate: true })
const fallbackImage = computed(() => props.mode === 'before' ? props.data?.before.image : props.data?.after.image)
let maps: Map[] = [], comparison: Compare | undefined, resizeObserver: ResizeObserver | undefined
const stylesReady = new Set<Map>()
let media: MediaQueryList, disposed = false, generation = 0
const styleController = new AbortController()
const blankStyle = (): StyleSpecification => ({ version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#0b1922' } }] })
let basemap: StyleSpecification | undefined
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function removeData(map: Map) {
  for (const id of ['change-areas', 'change-image', 'observation', 'coverage-line', 'coverage-fill']) if (map.getLayer(id)) map.removeLayer(id)
  for (const id of ['change-areas', 'change-image', 'observation', 'coverage']) if (map.getSource(id)) map.removeSource(id)
}
function applyData() {
  maps.forEach((map, index) => {
    // style.load allows source updates even while basemap tiles are still loading.
    if (!stylesReady.has(map)) return
    removeData(map)
    const data = props.data
    if (!data) return
    map.addSource('coverage', { type: 'geojson', data: data.coverage })
    map.addLayer({ id: 'coverage-fill', type: 'fill', source: 'coverage', paint: { 'fill-color': '#46d4e8', 'fill-opacity': 0.035 } })
    if (assetsReady.value && !imageError.value) {
      const frame = props.mode === 'compare' ? (isMobile.value || index === 1 ? data.after : data.before) : data[props.mode]
      map.addSource('observation', { type: 'image', url: frame.image, coordinates: data.coordinates })
      map.addLayer({ id: 'observation', type: 'raster', source: 'observation', paint: { 'raster-opacity': props.opacity / 100, 'raster-fade-duration': 0 } })
      if (data.change && changeReady.value && !changeError.value) {
        map.addSource('change-image', { type: 'image', url: data.change.image, coordinates: data.coordinates })
        map.addLayer({ id: 'change-image', type: 'raster', source: 'change-image', layout: { visibility: props.changeVisible ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0 } })
      }
      if (data.areas && changeReady.value && !changeError.value) {
        map.addSource('change-areas', { type: 'geojson', data: data.areas })
        map.addLayer({ id: 'change-areas', type: 'fill', source: 'change-areas', layout: { visibility: props.changeVisible ? 'visible' : 'none' }, paint: { 'fill-color': data.legend[0]!.color, 'fill-opacity': 0.28, 'fill-outline-color': data.legend[0]!.color } })
      }
    }
    map.addLayer({ id: 'coverage-line', type: 'line', source: 'coverage', paint: { 'line-color': '#7ed8dc', 'line-width': 1, 'line-dasharray': [3, 3], 'line-opacity': 0.65 } })
  })
}
function updateFrame() {
  const data = props.data
  if (!data) return
  maps.forEach((map, index) => {
    const source = map.getSource('observation') as ImageSource | undefined
    const frame = props.mode === 'compare' ? (isMobile.value || index === 1 ? data.after : data.before) : data[props.mode]
    source?.updateImage({ url: frame.image, coordinates: data.coordinates })
  })
  updateSplit()
}
function updateSplit() {
  if (!wrapper.value || !comparison) return
  const value = props.mode === 'before' ? 100 : props.mode === 'after' ? 0 : split.value
  comparison.setSlider(wrapper.value.clientWidth * value / 100)
}
function focus(instant = false) {
  if (!props.data) return
  const [west, south, east, north] = props.data.bounds
  maps[0]?.fitBounds([[west, south], [east, north]], { padding: isMobile.value ? 35 : 75, duration: instant || reducedMotion() ? 0 : 1100, maxZoom: 11 })
}
function overview() { maps[0]?.flyTo({ center: [104.85, 12.7], zoom: isMobile.value ? 5.6 : 6.2, pitch: 0, bearing: 0, duration: reducedMotion() ? 0 : 900 }) }
function zoom(amount: number) { maps[0]?.zoomTo((maps[0]?.getZoom() ?? 6) + amount, { duration: reducedMotion() ? 0 : 250 }) }
function destroyMaps() {
  comparison?.remove(); comparison = undefined
  for (const map of maps) map.remove()
  maps = []
  stylesReady.clear()
  rendered.value = false
}
async function setupMaps() {
  destroyMaps()
  await nextTick()
  if (disposed || !beforeEl.value || !afterEl.value) return
  fallback.value = false
  if (isMobile.value && props.mode === 'compare') emit('singleViewNeeded')
  try {
    const elements = isMobile.value ? [beforeEl.value] : [beforeEl.value, afterEl.value]
    for (const container of elements) {
      const map = new Map({ container, style: basemap ?? blankStyle(), center: [104.85, 12.7], zoom: isMobile.value ? 5.6 : 6.2, attributionControl: { compact: true }, maxZoom: 15, minZoom: 4, pitchWithRotate: false, dragRotate: false, touchPitch: false, renderWorldCopies: false })
      maps.push(map)
      map.on('load', () => { if (props.focused) focus() })
      map.on('style.load', () => { stylesReady.add(map); applyData() })
      map.on('render', () => {
        rendered.value = maps.length > 0 && maps.every((m) => stylesReady.has(m) && !!m.getSource('observation') && m.isSourceLoaded('observation'))
      })
      map.on('webglcontextlost', () => { fallback.value = true; emit('singleViewNeeded') })
      map.on('error', (event) => {
        const sourceId = 'sourceId' in event ? event.sourceId : undefined
        if (sourceId === 'observation') imageError.value = true
        else if (sourceId === 'change-image' || sourceId === 'change-areas') changeError.value = true
        else baseFailed.value = true
      })
    }
    maps[0]?.addControl(new ScaleControl({ unit: 'metric', maxWidth: 90 }), 'bottom-left')
    if (!isMobile.value && maps[0] && maps[1] && wrapper.value) {
      comparison = new Compare(maps[0], maps[1], wrapper.value, { mousemove: false, orientation: 'vertical' })
      comparison.on('slideend', (event) => { if (wrapper.value) split.value = event.currentPosition / wrapper.value.clientWidth * 100 })
      // Native range below provides the keyboard equivalent to the plugin's drag handle.
      wrapper.value.querySelector('.maplibregl-compare')?.setAttribute('aria-hidden', 'true')
      updateSplit()
    }
    // Rebuilding at a responsive breakpoint must retain the selected study view.
    if (props.focused) focus(true)
  } catch { destroyMaps(); fallback.value = true; emit('singleViewNeeded') }
}
function probeImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Display image unavailable.'))
    image.src = url
  })
}
async function loadImages() {
  const current = ++generation, data = props.data
  imageError.value = false; assetsReady.value = false; rendered.value = false
  changeError.value = false; changeReady.value = false
  applyData()
  if (!data) return
  const overlay = data.change ? probeImage(data.change.image) : Promise.resolve()
  void overlay.then(() => {
    if (current === generation && !disposed) { changeReady.value = !!(data.change || data.areas); applyData() }
  }).catch(() => { if (current === generation && !disposed) changeError.value = true })
  try {
    await Promise.all([data.before.image, data.after.image].map(probeImage))
    if (current === generation && !disposed) { assetsReady.value = true; applyData() }
  } catch { if (current === generation && !disposed) imageError.value = true }
}
function onMediaChange() { isMobile.value = media.matches; void setupMaps() }
watch(() => props.data, () => { void loadImages(); if (props.focused) focus() })
watch(() => props.mode, () => { if ((isMobile.value || fallback.value) && props.mode === 'compare') emit('singleViewNeeded'); else updateFrame() })
watch(split, updateSplit)
watch(() => props.opacity, () => maps.forEach((map) => { if (map.getLayer('observation')) map.setPaintProperty('observation', 'raster-opacity', props.opacity / 100) }))
watch(() => props.changeVisible, () => maps.forEach((map) => { for (const id of ['change-image', 'change-areas']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', props.changeVisible ? 'visible' : 'none') }))
watch(() => props.focusVersion, () => focus())
watch(() => props.storyStep, (step) => { if (step) maps[0]?.flyTo({ center: step.center, zoom: step.zoom, duration: reducedMotion() ? 0 : 1000 }) })
onMounted(async () => {
  media = matchMedia('(max-width: 767px)'); isMobile.value = media.matches; media.addEventListener('change', onMediaChange)
  await setupMaps(); void loadImages()
  resizeObserver = new ResizeObserver(() => { maps.forEach((map) => map.resize()); updateSplit() })
  if (wrapper.value) resizeObserver.observe(wrapper.value)
  try {
    const response = await fetch('https://tiles.openfreemap.org/styles/dark', { signal: styleController.signal })
    if (!response.ok) throw new Error('Basemap unavailable')
    basemap = await response.json() as StyleSpecification
    if (!disposed) maps.forEach((map) => { stylesReady.delete(map); map.setStyle(basemap!) })
  } catch { if (!disposed) baseFailed.value = true }
})
onUnmounted(() => { disposed = true; generation++; styleController.abort(); media?.removeEventListener('change', onMediaChange); resizeObserver?.disconnect(); destroyMaps() })
</script>

<template>
  <div ref="wrapper" class="map-workspace" :data-map-state="fallback ? 'static' : rendered ? 'ready' : 'loading'" :class="{ 'single-view': mode !== 'compare', 'map-fallback': fallback }" aria-label="Interactive observation comparison map">
    <div ref="beforeEl" class="map-surface map-before" />
    <div ref="afterEl" class="map-surface map-after" :class="{ 'mobile-hidden': isMobile }" />
    <div class="map-vignette" />
    <div v-if="fallback && data" class="static-comparison">
      <p><AlertTriangle :size="16" /> Interactive map unavailable. Static observation view.</p>
      <img v-if="!imageError" :src="fallbackImage" :style="{ opacity: opacity / 100 }" :alt="`${mode === 'before' ? data.before.label : data.after.label} — ${data.dataKind}`" />
      <p>Use the Before and After buttons to compare. Map coordinates and placement cannot be inspected in this view.</p>
    </div>
    <div class="map-location-label"><span class="tiny-square" /> CAMBODIA <span>/ FLOOD EXPLORER</span></div>
    <div v-if="data && (mode !== 'compare' || isMobile)" class="single-frame-label">{{ mode === 'before' ? data.before.label : data.after.label }}<span>{{ data[mode === 'before' ? 'before' : 'after'].date.slice(0, 10) }} {{ data.dataKind === 'synthetic-demo' ? '· illustrative date' : 'UTC' }}</span></div>
    <div v-if="data" class="frame-labels" :class="{ 'hide-compare-label': mode !== 'compare' || isMobile }">
      <span><i />{{ data.before.label }}<small>{{ data.dataKind === 'synthetic-demo' ? 'ILLUSTRATIVE FRAME' : data.before.date.slice(0, 10) + ' UTC' }}</small></span>
      <span>{{ data.after.label }}<i /><small>{{ data.dataKind === 'synthetic-demo' ? 'ILLUSTRATIVE FRAME' : data.after.date.slice(0, 10) + ' UTC' }}</small></span>
    </div>
    <div v-if="baseFailed && !fallback" class="map-notice" role="status">Basemap unavailable or incomplete · case overlays remain available</div>
    <div v-if="imageError" class="map-notice image-notice" role="alert"><AlertTriangle :size="14" /> Observation image unavailable. Comparison is disabled. <button @click="loadImages"><RotateCcw :size="14" />Retry</button></div>
    <div v-else-if="changeError" class="map-notice image-notice" role="alert">Change layer unavailable. Observation comparison remains available.<button @click="loadImages">Retry</button></div>
    <div class="map-tools" aria-label="Map controls">
      <button title="Zoom in" aria-label="Zoom in" :disabled="fallback" @click="zoom(1)"><Plus :size="18" /></button>
      <button title="Zoom out" aria-label="Zoom out" :disabled="fallback" @click="zoom(-1)"><Minus :size="18" /></button>
      <span />
      <button title="Fit study window" aria-label="Fit study window" :disabled="fallback || !data" @click="focus()"><LocateFixed :size="18" /></button>
      <button title="Cambodia overview" aria-label="Cambodia overview" :disabled="fallback" @click="overview"><Compass :size="18" /></button>
    </div>
    <label v-if="mode === 'compare' && !isMobile && !fallback" class="accessible-split">Comparison position<input v-model.number="split" type="range" min="0" max="100" :disabled="unavailable" aria-label="Comparison divider position" /></label>
    <div class="map-coordinate">104° 51′ E <span>12° 42′ N</span><small>OVERVIEW CENTER · NOT A MEASUREMENT</small></div>
    <div class="extra-attribution">Basemap: <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a></div>
  </div>
</template>
