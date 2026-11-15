import { computed, ref, watch, type ShallowRef } from 'vue'
import type { FloodCase } from '../types'

export function usePreparedCollection(base: ShallowRef<FloodCase | null>) {
  const beforeDate = ref(''), afterDate = ref(''), representation = ref('water'), layerId = ref(''), baselineOnly = ref(false)
  const collection = computed(() => base.value?.collection)
  watch(base, (data) => {
    const params = new URLSearchParams(location.search)
    const dates = data?.collection?.observations.map((o) => o.date) ?? []
    const a = params.get('from') ?? '', b = params.get('to') ?? ''
    beforeDate.value = dates.includes(a) && dates.includes(b) && a < b ? a : dates[0] ?? ''
    afterDate.value = dates.includes(a) && dates.includes(b) && a < b ? b : dates.at(-1) ?? ''
    representation.value = ['radar', 'both'].includes(params.get('display') ?? '') ? params.get('display')! : 'water'
    baselineOnly.value = !!data?.collection && params.get('baseline') === 'rare-water' && representation.value !== 'radar'
    layerId.value = data?.collection?.layers.some((l) => l.id === params.get('layer')) ? params.get('layer')! : ''
  }, { immediate: true, flush: 'sync' })
  const layer = computed(() => collection.value?.layers.find((l) => l.id === layerId.value))
  const selectedRecords = computed(() => {
    const records = collection.value?.observations
    return records ? [records.find((o) => o.date === beforeDate.value) ?? records[0]!, records.find((o) => o.date === afterDate.value) ?? records.at(-1)!] as const : undefined
  })
  const baselineAvailable = computed(() => !!selectedRecords.value?.every((o) => !!o.unusualImage))
  const selectionError = computed(() => baselineOnly.value && !layer.value && !baselineAvailable.value ? 'Baseline-filtered water is unavailable for one of these dates. Turn off the filter or choose another pair.' : '')
  const lowHighPair = computed(() => {
    const rows = collection.value?.series
    if (!rows?.length) return undefined
    const peak = rows.reduce((a, b) => b.open_water > a.open_water ? b : a)
    const earlier = rows.filter((r) => r.date < peak.date)
    if (!earlier.length) return undefined
    const low = earlier.reduce((a, b) => b.open_water < a.open_water ? b : a)
    return { before: low.date, after: peak.date }
  })
  function compareLowHigh() {
    if (!lowHighPair.value) return
    beforeDate.value = lowHighPair.value.before; afterDate.value = lowHighPair.value.after
    representation.value = 'both'; baselineOnly.value = false; layerId.value = ''
  }
  watch(representation, (value) => { if (value === 'radar') baselineOnly.value = false }, { flush: 'sync' })
  const data = computed(() => {
    const source = base.value, records = collection.value?.observations
    if (!source || !records) return source
    if (selectionError.value) return null
    const first = records.find((o) => o.date === beforeDate.value) ?? records[0]!
    const last = records.find((o) => o.date === afterDate.value) ?? records.at(-1)!
    const radar = representation.value === 'radar', combined = representation.value === 'both', filtered = baselineOnly.value && !layer.value
    const frame = (o: typeof first) => ({ date: o.date,
      image: radar ? o.radarImage : filtered ? o.unusualImage! : o.image,
      ...(combined && !layer.value ? { backgroundImage: o.radarImage } : {}),
      inputId: radar || filtered ? `Team export ${(radar ? o.radarImage : o.unusualImage!).split('/').at(-1)}` : o.inputId,
      label: `${radar ? 'Radar display' : filtered ? 'Baseline-filtered water' : 'Water classes'} · ${o.date}` })
    // The supplied change export describes first-to-last only, never an arbitrary pair.
    const fullPeriod = first.date === records[0]!.date && last.date === records.at(-1)!.date
    const radarLegend = [{ label: 'Low display value', color: '#111111' }, { label: 'High display value', color: '#dddddd' }]
    const waterLegend = filtered ? [{ label: 'Baseline-filtered open water', color: '#ea580c' }] : source.legend
    return { ...source, before: frame(first), after: frame(last), change: fullPeriod && !filtered ? source.change : undefined,
      measurement: filtered ? 'Team open-water classification filtered by historical recurrence; not a seasonal anomaly' : radar ? 'Pre-rendered 8-bit radar display; calibrated backscatter not supplied' : source.measurement,
      units: radar ? '8-bit display values · uncalibrated' : source.units,
      legend: radar ? radarLegend : combined ? [...waterLegend, { label: 'Radar display beneath', color: '#888888' }] : waterLegend }

  })
  watch([beforeDate, afterDate, representation, layerId, baselineOnly], () => {
    if (!base.value) return
    const url = new URL(location.href)
    for (const key of ['from', 'to', 'display', 'layer', 'baseline']) url.searchParams.delete(key)
    if (collection.value) {
      url.searchParams.set('from', beforeDate.value); url.searchParams.set('to', afterDate.value)
      url.searchParams.set('display', representation.value)
      if (baselineOnly.value) url.searchParams.set('baseline', 'rare-water')
      if (layer.value) url.searchParams.set('layer', layer.value.id)
    }
    history.replaceState(null, '', url)
  }, { flush: 'post' })
  return { data, collection, layer, beforeDate, afterDate, representation, layerId, baselineOnly, baselineAvailable, selectionError, lowHighPair, compareLowHigh }
}
