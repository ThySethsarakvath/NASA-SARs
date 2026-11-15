import type { FeatureCollection, Polygon, MultiPolygon, Position } from 'geojson'

export interface CropMetrics { areaHa: number | null; validHa: number | null; changedHa: number | null; changedPercent: number | null }
export interface ProvinceSummary { province: string; pure: CropMetrics; mixed: CropMetrics; rainfallDate: string; rainfallMm: number | null; rainfallAnomalyMm: number | null }
export interface AgricultureSummary {
  region: string; provinces: ProvinceSummary[]; status: Record<string, string>
  comparison: { before: string; after: string; track: string; frame: string; mode: string; polarization: string }
  interpretation: string
}
export interface VegetationRecord { date: string; province: string; ndvi: number | null; evi: number | null; validPixels: number | null; source: string; coverageStatus: string }
export interface RainfallRecord { date: string; province: string; rainfallMm: number | null; referenceMm: number | null; anomalyMm: number | null; source: string }
export interface RadarChange { province: string; cropClass: 12 | 14; thresholdDb: number | null }
export type ProvinceGeometry = FeatureCollection<Polygon | MultiPolygon, { province: string }>

function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Expected an object in the agriculture response.')
  return v as Record<string, unknown>
}
function list(v: unknown): unknown[] { if (!Array.isArray(v)) throw new Error('Expected an agriculture record list.'); return v }
function text(v: unknown): string { if (typeof v !== 'string' || !v.trim()) throw new Error('Missing agriculture text field.'); return v }
function num(v: unknown, min = -Infinity, max = Infinity): number | null {
  if (v === null) return null
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error('Invalid agriculture numeric field.')
  return v
}
function date(v: unknown): string {
  const s = text(v)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0, 10) !== s) throw new Error('Invalid agriculture date.')
  return s
}
function unique(values: string[]) { if (new Set(values).size !== values.length) throw new Error('Duplicate agriculture records.') }
function metrics(row: Record<string, unknown>, prefix: 'pure' | 'mixed'): CropMetrics {
  const result = { areaHa: num(row[`${prefix}_cropland_ha`], 0), validHa: num(row[`${prefix}_valid_radar_area_ha`], 0), changedHa: num(row[`${prefix}_radar_change_area_ha`], 0), changedPercent: num(row[`${prefix}_radar_change_percent`], 0, 100) }
  if (result.changedHa !== null && result.validHa !== null && result.changedHa > result.validHa) throw new Error('Changed area exceeds valid radar coverage.')
  if (result.validHa !== null && result.areaHa !== null && result.validHa > result.areaHa) throw new Error('Valid radar coverage exceeds the reported class area.')
  return result
}
export function parseSummary(value: unknown): AgricultureSummary {
  const root = obj(value), comparison = obj(root.nisar_comparison)
  const provinces = list(root.provinces).map((v): ProvinceSummary => {
    const r = obj(v)
    return { province: text(r.province), pure: metrics(r, 'pure'), mixed: metrics(r, 'mixed'), rainfallDate: date(r.rainfall_date), rainfallMm: num(r.rainfall_mm, 0), rainfallAnomalyMm: num(r.rainfall_anomaly_mm) }
  })
  if (!provinces.length || root.province_count !== provinces.length) throw new Error('Province count does not match the agriculture summary.')
  unique(provinces.map((p) => p.province))
  const before = date(comparison.before), after = date(comparison.after)
  if (before >= after) throw new Error('Invalid radar comparison order.')
  return { region: text(root.region), provinces, status: Object.fromEntries(Object.entries(obj(root.data_status)).map(([k, v]) => [k, text(v)])), comparison: { before, after, track: text(comparison.track), frame: text(comparison.frame), mode: text(comparison.mode), polarization: text(comparison.polarization) }, interpretation: text(root.interpretation) }
}
export function parseVegetation(value: unknown, province: string): VegetationRecord[] {
  const rows = list(value).map((v): VegetationRecord => {
    const r = obj(v)
    if (r.province !== province) throw new Error('Vegetation response does not match the selected province.')
    const validPixels = num(r.valid_pixels, 0)
    if (validPixels !== null && !Number.isInteger(validPixels)) throw new Error('Invalid vegetation pixel count.')
    return { date: date(r.date), province, ndvi: num(r.ndvi, -1, 1), evi: num(r.evi, -1, 1), validPixels, source: text(r.source), coverageStatus: text(r.coverage_status) }
  })
  unique(rows.map((r) => r.date))
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}
export function parseRainfall(value: unknown, province: string): RainfallRecord[] {
  const rows = list(value).map((v): RainfallRecord => {
    const r = obj(v)
    if (r.province !== province) throw new Error('Rainfall response does not match the selected province.')
    return { date: date(r.date), province, rainfallMm: num(r.chirps_mm, 0), referenceMm: num(r.monthly_climatology_mm, 0), anomalyMm: num(r.rainfall_anomaly_mm), source: text(r.source) }
  })
  unique(rows.map((r) => r.date))
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}
export function parseChanges(value: unknown): RadarChange[] {
  const rows = list(value).map((v): RadarChange => {
    const r = obj(v)
    if (r.crop_class !== 12 && r.crop_class !== 14) throw new Error('Unsupported cropland class.')
    return { province: text(r.province), cropClass: r.crop_class, thresholdDb: num(r.threshold_db, 0) }
  })
  unique(rows.map((r) => `${r.province}:${r.cropClass}`))
  return rows
}
function ring(v: unknown): Position[] {
  const points = list(v).map((p) => { const xy = list(p), x = num(xy[0], -180, 180), y = num(xy[1], -85, 85); if (x === null || y === null) throw new Error('Missing map coordinate.'); return [x, y] })
  if (points.length < 4 || points[0]?.[0] !== points.at(-1)?.[0] || points[0]?.[1] !== points.at(-1)?.[1]) throw new Error('Invalid province polygon ring.')
  return points
}
export function parseGeometry(value: unknown): ProvinceGeometry {
  const root = obj(value)
  if (root.type !== 'FeatureCollection') throw new Error('Expected province GeoJSON.')
  const features = list(root.features).map((v) => {
    const f = obj(v), g = obj(f.geometry), province = text(obj(f.properties).province)
    if (f.type !== 'Feature') throw new Error('Invalid province feature.')
    let geometry: Polygon | MultiPolygon
    const polygon = (v: unknown) => { const rings = list(v).map(ring); if (!rings.length) throw new Error('Empty province polygon.'); return rings }
    if (g.type === 'Polygon') geometry = { type: 'Polygon', coordinates: polygon(g.coordinates) }
    else if (g.type === 'MultiPolygon') { const coordinates = list(g.coordinates).map(polygon); if (!coordinates.length) throw new Error('Empty province geometry.'); geometry = { type: 'MultiPolygon', coordinates } }
    else throw new Error('Unsupported province geometry.')
    return { type: 'Feature' as const, id: province, properties: { province }, geometry }
  })
  if (!features.length) throw new Error('No province boundaries supplied.')
  unique(features.map((f) => f.properties.province))
  return { type: 'FeatureCollection', features }
}
