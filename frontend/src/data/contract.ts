import type { CaseEntry, DataKind, FloodCase, ImageCorners, Interpretation, Position, ViewMode } from '../types'

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
const kinds: DataKind[] = ['real-observation', 'surrogate', 'synthetic-demo']
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

export function parseCase(value: unknown): FloodCase {
  const r = object(value, 'Case manifest')
  if (r.schemaVersion !== 1) throw new Error('Unsupported case schema version.')
  const bounds = array(r.bounds, 'bounds').map((n) => number(n, 'bounds'))
  if (bounds.length !== 4 || bounds[0]! >= bounds[2]! || bounds[1]! >= bounds[3]!) throw new Error('bounds must be [west, south, east, north].')
  position(bounds.slice(0, 2), 'bounds'); position(bounds.slice(2), 'bounds')
  const corners = array(r.coordinates, 'coordinates').map((p) => position(p, 'coordinates'))
  if (corners.length !== 4) throw new Error('Exactly four image corners are required.')
  const expectedCorners = [[bounds[0], bounds[3]], [bounds[2], bounds[3]], [bounds[2], bounds[1]], [bounds[0], bounds[1]]]
  if (corners.some((p, i) => p.some((coordinate, j) => Math.abs(coordinate - expectedCorners[i]![j]!) > 0.000001))) throw new Error('Image corners must match bounds in top-left, top-right, bottom-right, bottom-left order.')
  const observation = (value: unknown, name: string) => {
    const o = object(value, name), date = text(o.date, `${name}.date`)
    if (!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(date) || !Number.isFinite(Date.parse(date))) throw new Error(`${name}.date must be a valid UTC timestamp.`)
    if (new Date(date).toISOString().slice(0, 10) !== date.slice(0, 10)) throw new Error(`${name}.date must be a real calendar date.`)
    return { label: text(o.label, `${name}.label`), date, image: asset(o.image, `${name}.image`), inputId: text(o.inputId, `${name}.inputId`) }
  }
  const before = observation(r.before, 'before'), after = observation(r.after, 'after')
  if (Date.parse(before.date) >= Date.parse(after.date)) throw new Error('The after observation must follow the before observation.')
  const change = r.change === undefined ? undefined : object(r.change, 'change')
  const areas = r.areas === undefined ? undefined : object(r.areas, 'areas')
  if (areas && areas.type !== 'FeatureCollection') throw new Error('areas must be a GeoJSON FeatureCollection.')
  const legend = array(r.legend, 'legend').map((value) => {
    const l = object(value, 'legend entry'), color = text(l.color, 'legend color')
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Legend colors must use #RRGGBB.')
    return { label: text(l.label, 'legend label'), color }
  })
  if (!legend.length) throw new Error('A measurement legend is required.')
  const story = array(r.story, 'story').map((value) => {
    const s = object(value, 'story step'), zoom = number(s.zoom, 'story.zoom')
    if (zoom < 0 || zoom > 18) throw new Error('Story zoom is outside 0–18.')
    return { title: text(s.title, 'story.title'), body: text(s.body, 'story.body'), center: position(s.center, 'story.center'), zoom, view: choice(s.view, views, 'story.view') }
  })
  const dataKind = choice(r.dataKind, kinds, 'dataKind')
  const reviewStatus = choice(r.reviewStatus, ['unreviewed', 'qualitatively-reviewed', 'independently-validated'] as const, 'reviewStatus')
  if (dataKind === 'synthetic-demo' && reviewStatus !== 'unreviewed') throw new Error('Synthetic fixtures cannot claim scientific validation.')
  return {
    schemaVersion: 1, id: text(r.id, 'id'), title: text(r.title, 'title'), location: text(r.location, 'location'), description: text(r.description, 'description'),
    dataKind, reviewStatus, interpretation: choice(r.interpretation, meanings, 'interpretation'),
    instrument: text(r.instrument, 'instrument'), product: text(r.product, 'product'), measurement: text(r.measurement, 'measurement'), units: text(r.units, 'units'), method: text(r.method, 'method'),
    bounds: bounds as FloodCase['bounds'], coordinates: corners as ImageCorners, coverage: feature(r.coverage, 'coverage'), before, after,
    ...(change ? { change: { image: asset(change.image, 'change.image'), label: text(change.label, 'change.label') } } : {}),
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
