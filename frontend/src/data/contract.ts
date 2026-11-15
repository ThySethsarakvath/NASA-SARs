import type { CaseEntry, DataKind, FloodCase, ImageCorners, Interpretation, Position, PreparedCollection, ExposureValues, LegendEntry, ViewMode } from '../types'

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object.`)
  return value as Record<string, unknown>
}
function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required.`)
  return value
}
function number(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${name} must be finite.`)
  return value
}
function array(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array.`)
  return value
}
function choice<T extends string>(value: unknown, choices: readonly T[], name: string): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new Error(`${name} is not supported.`)
  return value as T
}
function asset(value: unknown, name: string): string {
  const url = text(value, name)
  // All display assets are shipped together; authentication belongs in the data pipeline.
  if (!url.startsWith('/data/') || url.includes('..') || /[?#\\]/.test(url)) throw new Error(`${name} must be a public /data/ path without credentials or query strings.`)
  return url
}
function position(value: unknown, name: string): Position {
  const parts = array(value, name)
  if (parts.length !== 2) throw new Error(`${name} must be [longitude, latitude].`)
  const x = number(parts[0], name), y = number(parts[1], name)
  if (x < -180 || x > 180 || y < -85 || y > 85) throw new Error(`${name} is outside map bounds.`)
  return [x, y]
}
const kinds: DataKind[] = ['real-observation', 'surrogate', 'synthetic-demo', 'team-export']
const views: ViewMode[] = ['before', 'compare', 'after']
const meanings: Interpretation[] = ['radar-response-change', 'possible-inundation', 'supported-flood-interpretation']

function geometry(value: unknown, name: string): FloodCase['coverage']['geometry'] {
  const item = object(value, name)
  const type = choice(item.type, ['Polygon', 'MultiPolygon'] as const, `${name}.type`)
  function ring(value: unknown): Position[] {
    const points = array(value, name).map((p) => position(p, name))
    const first = points[0], last = points.at(-1)
    if (points.length < 4 || !first || !last || first[0] !== last[0] || first[1] !== last[1]) throw new Error(`${name} rings must be closed with at least four positions.`)
    return points
  }
  const polygon = (value: unknown) => {
    const rings = array(value, name)
    if (!rings.length) throw new Error(`${name} must contain a polygon ring.`)
    return rings.map(ring)
  }
  if (type === 'Polygon') return { type, coordinates: polygon(item.coordinates) }
  const polygons = array(item.coordinates, name)
  if (!polygons.length) throw new Error(`${name} cannot be empty.`)
  return { type, coordinates: polygons.map(polygon) }
}
function feature(value: unknown, name: string): FloodCase['coverage'] {
  const f = object(value, name)
  if (f.type !== 'Feature') throw new Error(`${name} must be a GeoJSON Feature.`)
  return { type: 'Feature', properties: f.properties ? object(f.properties, `${name}.properties`) : {}, geometry: geometry(f.geometry, name) }
}

export function parseIndex(value: unknown): CaseEntry[] {
  const root = object(value, 'Case index')
  const entries = array(root.cases, 'cases').map((value) => {
    const item = object(value, 'case')
    return { id: text(item.id, 'id'), title: text(item.title, 'title'), location: text(item.location, 'location'), manifest: asset(item.manifest, 'manifest'), dataKind: choice(item.dataKind, kinds, 'dataKind') }
  })
  if (new Set(entries.map((e) => e.id)).size !== entries.length) throw new Error('Case IDs must be unique.')
  return entries
}

function calendarDate(value: unknown, name: string): string {
  const date = text(value, name)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error(`${name} must be a real calendar date.`)
  return date
}
function parseLegend(value: unknown): LegendEntry[] {
  const entries = array(value, 'legend').map((value) => {
    const item = object(value, 'legend entry'), color = text(item.color, 'legend color')
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Legend colors must use #RRGGBB.')
    return { label: text(item.label, 'legend label'), color }
  })
  if (!entries.length) throw new Error('A measurement legend is required.')
  return entries
}
function parseCollection(value: unknown): PreparedCollection {
  const item = object(value, 'collection')
  const observations = array(item.observations, 'observations').map((value) => {
    const o = object(value, 'prepared observation')
    return { ...(o.unusualImage === undefined ? {} : { unusualImage: asset(o.unusualImage, 'unusualImage') }), date: calendarDate(o.date, 'prepared date'), image: asset(o.image, 'image'), radarImage: asset(o.radarImage, 'radarImage'), inputId: text(o.inputId, 'inputId') }
  })
  if (observations.length < 2 || observations.length > 50 || observations.some((o, i) => i > 0 && o.date <= observations[i - 1]!.date)) throw new Error('Prepared dates must be unique and chronological (2–50 dates).')
  const layers = array(item.layers, 'layers').map((value) => {
    const layer = object(value, 'prepared layer')
    return { id: choice(layer.id, ['frequency', 'water_class', 'change'] as const, 'layer.id'), label: text(layer.label, 'layer.label'), description: text(layer.description, 'layer.description'), image: asset(layer.image, 'layer.image'), legend: parseLegend(layer.legend) }
  })
  if (new Set(layers.map((l) => l.id)).size !== layers.length) throw new Error('Prepared layer IDs must be unique.')
  const series = array(item.series, 'series').map((value, i) => {
    const row = object(value, 'area row')
    const date = calendarDate(row.date, 'series.date')
    const open_water = number(row.open_water, 'open_water'), flooded_veg = number(row.flooded_veg, 'flooded_veg'), total = number(row.total, 'total')
    if (date !== observations[i]?.date || Math.min(open_water, flooded_veg, total) < 0 || Math.abs(open_water + flooded_veg - total) > .15) throw new Error('Reported area rows must match prepared dates and class totals.')
    return { date, open_water, flooded_veg, total }
  })
  if (series.length !== observations.length) throw new Error('Reported series must match prepared dates.')
  const exposure = item.exposure === undefined ? undefined : parseExposure(item.exposure, observations.map((o) => o.date), series)
  return { observations, layers, series, ...(exposure ? { exposure } : {}) }
}

function parseExposure(value: unknown, dates: string[], series: PreparedCollection['series']): NonNullable<PreparedCollection['exposure']> {
  const root = object(value, 'exposure')
  const nullableNumber = (value: unknown, name: string) => {
    if (value === null) return null
    const n = number(value, name)
    if (n < 0) throw new Error(`${name} cannot be negative.`)
    return n
  }
  const values = (value: unknown): ExposureValues => {
    const r = object(value, 'exposure values')
    return { areaKm2: nullableNumber(r.areaKm2, 'areaKm2'), population: nullableNumber(r.population, 'population'), roadKm: nullableNumber(r.roadKm, 'roadKm'), croplandHa: nullableNumber(r.croplandHa, 'croplandHa') }
  }
  const records = array(root.records, 'exposure records').map((value) => {
    const row = object(value, 'exposure record'), date = calendarDate(row.date, 'exposure.date')
    if (!dates.includes(date)) throw new Error('Exposure date must match a supplied observation.')
    const classifiedWater = values(row.classifiedWater), baselineFiltered = values(row.baselineFiltered)
    if (classifiedWater.areaKm2 !== null && Math.abs(classifiedWater.areaKm2 - series.find((r) => r.date === date)!.total) > .15) throw new Error('Exposure area must match the reported classified-water total.')
    if (baselineFiltered.areaKm2 !== null && classifiedWater.areaKm2 !== null && baselineFiltered.areaKm2 > classifiedWater.areaKm2 + .15) throw new Error('Baseline-filtered area exceeds the reported total.')
    return { date, classifiedWater, baselineFiltered }
  })
  if (records.length > dates.length || records.some((r, i) => i > 0 && r.date <= records[i - 1]!.date)) throw new Error('Exposure records must be unique and chronological.')
  const meta = object(root.sources, 'exposure sources')
  const names = (value: unknown) => array(value, 'source filenames').map((v) => text(v, 'source filename'))
  const nullableText = (value: unknown, name: string) => value === null ? null : text(value, name)
  const recurrenceBelowPct = nullableNumber(meta.recurrenceBelowPct, 'recurrenceBelowPct')
  if (recurrenceBelowPct !== null && recurrenceBelowPct > 100) throw new Error('Recurrence threshold must be 0–100 percent.')
  return { records, sources: { population: names(meta.population), cropland: names(meta.cropland),
    cropClass: nullableNumber(meta.cropClass, 'cropClass'), roads: nullableText(meta.roads, 'roads'), roadsFilter: nullableText(meta.roadsFilter, 'roadsFilter'), baseline: nullableText(meta.baseline, 'baseline'), recurrenceBelowPct, method: text(meta.method, 'exposure method') } }
}

export function parseCase(value: unknown): FloodCase {
  const r = object(value, 'Case manifest')
  if (r.schemaVersion !== 1) throw new Error('Unsupported case schema version.')
  const dataKind = choice(r.dataKind, kinds, 'dataKind')
  const bounds = array(r.bounds, 'bounds').map((n) => number(n, 'bounds'))
  if (bounds.length !== 4 || bounds[0]! >= bounds[2]! || bounds[1]! >= bounds[3]!) throw new Error('bounds must be [west, south, east, north].')
  position(bounds.slice(0, 2), 'bounds'); position(bounds.slice(2), 'bounds')
  const corners = array(r.coordinates, 'coordinates').map((p) => position(p, 'coordinates'))
  if (corners.length !== 4) throw new Error('Exactly four image corners are required.')
  const expectedCorners = [[bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]], [bounds[0], bounds[1]]]
  if (corners.some((p, i) => p.some((coordinate, j) => Math.abs(coordinate - expectedCorners[i]![j]!) > 0.000001))) throw new Error('Image corners must match bounds in top-left, top-right, bottom-right, bottom-left order.')
  const observation = (value: unknown, name: string) => {
    const o = object(value, name), date = text(o.date, `${name}.date`)
    if (dataKind === 'team-export' && /^\d{4}-\d{2}-\d{2}$/.test(date)) calendarDate(date, name)
    else if (!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(date) || !Number.isFinite(Date.parse(date))) throw new Error(`${name}.date must be a valid UTC timestamp.`)
    if (new Date(date).toISOString().slice(0, 10) !== date.slice(0, 10)) throw new Error(`${name}.date must be a real calendar date.`)
    return { ...(o.backgroundImage === undefined ? {} : { backgroundImage: asset(o.backgroundImage, `${name}.backgroundImage`) }), label: text(o.label, `${name}.label`), date, image: asset(o.image, `${name}.image`), inputId: text(o.inputId, `${name}.inputId`) }
  }
  const before = observation(r.before, 'before'), after = observation(r.after, 'after')
  if (Date.parse(before.date) >= Date.parse(after.date)) throw new Error('The after observation must follow the before observation.')
  const change = r.change === undefined ? undefined : object(r.change, 'change')
  const areas = r.areas === undefined ? undefined : object(r.areas, 'areas')
  if (areas && areas.type !== 'FeatureCollection') throw new Error('areas must be a GeoJSON FeatureCollection.')
  const legend = parseLegend(r.legend)
  const story = array(r.story, 'story').map((value) => {
    const s = object(value, 'story step'), zoom = number(s.zoom, 'story.zoom')
    if (zoom < 0 || zoom > 18) throw new Error('Story zoom is outside 0–18.')
    return { title: text(s.title, 'story.title'), body: text(s.body, 'story.body'), center: position(s.center, 'story.center'), zoom, view: choice(s.view, views, 'story.view') }
  })
  const reviewStatus = choice(r.reviewStatus, ['unreviewed', 'qualitatively-reviewed', 'independently-validated'] as const, 'reviewStatus')
  if (dataKind === 'synthetic-demo' && reviewStatus !== 'unreviewed') throw new Error('Synthetic fixtures cannot claim scientific validation.')
  if (dataKind === 'team-export' && reviewStatus !== 'unreviewed') throw new Error('Team exports with pending provenance must remain unreviewed.')
  const coverageType = r.coverageType === undefined ? undefined : choice(r.coverageType, ['analysis-support', 'display-extent'] as const, 'coverageType')
  if (dataKind === 'team-export' && coverageType !== 'display-extent') throw new Error('Team exports require explicit display-extent context.')
  const collection = r.collection === undefined ? undefined : parseCollection(r.collection)
  if (collection && dataKind !== 'team-export') throw new Error('Prepared export collections require the team-export label.')
  if (collection && ![before, after].every((frame) => collection.observations.some((o) => o.date === frame.date && o.image === frame.image && o.inputId === frame.inputId))) throw new Error('Default pair must match prepared observations.')
  return {
    schemaVersion: 1, id: text(r.id, 'id'), title: text(r.title, 'title'), location: text(r.location, 'location'), description: text(r.description, 'description'),
    dataKind, reviewStatus, interpretation: choice(r.interpretation, meanings, 'interpretation'),
    instrument: text(r.instrument, 'instrument'), product: text(r.product, 'product'), measurement: text(r.measurement, 'measurement'), units: text(r.units, 'units'), method: text(r.method, 'method'),
    ...(coverageType ? { coverageType } : {}),
    ...(collection ? { collection } : {}),
    ...(r.provenance === undefined ? {} : { provenance: asset(r.provenance, 'provenance') }),
    bounds: bounds as FloodCase['bounds'], coordinates: corners as ImageCorners, coverage: feature(r.coverage, 'coverage'), before, after,
    ...(change ? { change: { image: asset(change.image, 'change.image'), label: text(change.label, 'change.label'), ...(change.legend === undefined ? {} : { legend: parseLegend(change.legend) }) } } : {}),
    ...(areas ? { areas: { type: 'FeatureCollection' as const, features: array(areas.features, 'areas.features').map((f) => feature(f, 'area')) } } : {}),
    legend, observed: text(r.observed, 'observed'), explanation: text(r.explanation, 'explanation'), limitations: array(r.limitations, 'limitations').map((l) => text(l, 'limitation')),
    sources: array(r.sources, 'sources').map((value) => {
      const s = object(value, 'source'), url = text(s.url, 'source.url')
      if (!url.startsWith('https://') || new URL(url).username || new URL(url).password) throw new Error('Sources require public HTTPS URLs.')
      return { title: text(s.title, 'source.title'), url }
    }), story,
  }
}

export async function readJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Could not load case data (HTTP ${response.status}).`)
  return response.json() as Promise<unknown>
}
