import { computed, onMounted, onUnmounted, ref, shallowReactive, watch } from 'vue'
import { request } from '../agriculture/api'
import { parseSummary, parseGeometry, parseChanges, parseVegetation, parseRainfall } from '../agriculture/contract'
import type { AgricultureSummary, ProvinceGeometry, RadarChange, VegetationRecord, RainfallRecord } from '../agriculture/contract'

interface Resource<T> { data: T | null; loading: boolean; error: string }
const resource = <T>() => shallowReactive<Resource<T>>({ data: null, loading: false, error: '' })
async function load<T>(state: Resource<T>, path: string, parser: (v: unknown) => T, signal: AbortSignal) {
  state.data = null; state.loading = true; state.error = ''
  try { const data = await request(path, parser, signal); if (!signal.aborted) state.data = data }
  catch (error) { if (!signal.aborted) state.error = error instanceof Error ? error.message : 'Unable to load this dataset.' }
  finally { if (!signal.aborted) state.loading = false }
}
export function useAgriculture() {
  const summary = resource<AgricultureSummary>(), geometry = resource<ProvinceGeometry>(), changes = resource<RadarChange[]>()
  const vegetation = resource<VegetationRecord[]>(), rainfall = resource<RainfallRecord[]>()
  const selectedProvince = ref(new URLSearchParams(location.search).get('province') ?? '')
  const selected = computed(() => summary.data?.provinces.find((p) => p.province === selectedProvince.value) ?? null)
  let mainController: AbortController | undefined, chartController: AbortController | undefined
  function loadCharts() {
    chartController?.abort()
    if (!selected.value) return
    chartController = new AbortController()
    const signal = chartController.signal, province = selectedProvince.value, query = new URLSearchParams({ province })
    void load(vegetation, `/api/agriculture/vegetation?${query}`, (v) => parseVegetation(v, province), signal)
    void load(rainfall, `/api/agriculture/rainfall?${query}`, (v) => parseRainfall(v, province), signal)
  }
  async function reload() {
    mainController?.abort(); chartController?.abort()
    mainController = new AbortController()
    const signal = mainController.signal
    await Promise.all([
      load(summary, '/api/agriculture/summary', parseSummary, signal).then(() => {
        if (signal.aborted || !summary.data) return
        if (!summary.data.provinces.some((p) => p.province === selectedProvince.value)) selectedProvince.value = summary.data.provinces[0]!.province
        else loadCharts()
      }),
      load(geometry, '/api/agriculture/layers/agriculture.geojson', parseGeometry, signal),
      load(changes, '/api/agriculture/changes', parseChanges, signal),
    ])
  }
  watch(selectedProvince, (province) => {
    if (!selected.value) return
    const url = new URL(location.href); url.searchParams.set('province', province); history.replaceState(null, '', url)
    loadCharts()
  })
  onMounted(reload)
  onUnmounted(() => { mainController?.abort(); chartController?.abort() })
  return { summary, geometry, changes, vegetation, rainfall, selectedProvince, selected, reload, loadCharts }
}
