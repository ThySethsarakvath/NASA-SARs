import { computed, ref, watch, type ShallowRef } from 'vue'
import type { FloodCase } from '../types'

export function usePreparedCollection(base: ShallowRef<FloodCase | null>) {
  const beforeDate = ref(''), afterDate = ref(''), representation = ref('water'), layerId = ref('')
  const collection = computed(() => base.value?.collection)
  watch(base, (data) => {
    const params = new URLSearchParams(location.search)
    const dates = data?.collection?.observations.map((o) => o.date) ?? []
    const a = params.get('from') ?? '', b = params.get('to') ?? ''
    beforeDate.value = dates.includes(a) && dates.includes(b) && a < b ? a : dates[0] ?? ''
    afterDate.value = dates.includes(a) && dates.includes(b) && a < b ? b : dates.at(-1) ?? ''
    representation.value = params.get('display') === 'radar' ? 'radar' : 'water'
    layerId.value = data?.collection?.layers.some((l) => l.id === params.get('layer')) ? params.get('layer')! : ''
  }, { immediate: true, flush: 'sync' })
  const layer = computed(() => collection.value?.layers.find((l) => l.id === layerId.value))
  const data = computed(() => {
    const source = base.value, records = collection.value?.observations
    if (!source || !records) return source
    const first = records.find((o) => o.date === beforeDate.value) ?? records[0]!
    const last = records.find((o) => o.date === afterDate.value) ?? records.at(-1)!
    const radar = representation.value === 'radar'
    const frame = (o: typeof first) => ({ date: o.date, image: radar ? o.radarImage : o.image,
      inputId: radar ? `Team export ${o.radarImage.split('/').at(-1)}` : o.inputId,
      label: `${radar ? 'Radar display' : 'Water classes'} · ${o.date}` })
    // The supplied change export describes first-to-last only, never an arbitrary pair.
    const fullPeriod = first.date === records[0]!.date && last.date === records.at(-1)!.date
    return { ...source, before: frame(first), after: frame(last), change: fullPeriod ? source.change : undefined,
      measurement: radar ? 'Pre-rendered 8-bit radar display; calibrated backscatter not supplied' : source.measurement,
      units: radar ? '8-bit display values · uncalibrated' : source.units,
      legend: radar ? [{ label: 'Low display value', color: '#111111' }, { label: 'High display value', color: '#dddddd' }] : source.legend }
  })
  watch([beforeDate, afterDate, representation, layerId], () => {
    if (!base.value) return
    const url = new URL(location.href)
    for (const key of ['from', 'to', 'display', 'layer']) url.searchParams.delete(key)
    if (collection.value) {
      url.searchParams.set('from', beforeDate.value); url.searchParams.set('to', afterDate.value)
      url.searchParams.set('display', representation.value)
      if (layer.value) url.searchParams.set('layer', layer.value.id)
    }
    history.replaceState(null, '', url)
  }, { flush: 'post' })
  return { data, collection, layer, beforeDate, afterDate, representation, layerId }
}
