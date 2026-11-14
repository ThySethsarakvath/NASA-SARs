import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson'

export type Position = [number, number]
export type ImageCorners = [Position, Position, Position, Position]
export type ViewMode = 'before' | 'compare' | 'after'
export type DataKind = 'real-observation' | 'surrogate' | 'synthetic-demo' | 'team-export'
export type Interpretation = 'radar-response-change' | 'possible-inundation' | 'supported-flood-interpretation'
export interface CaseEntry {
  id: string
  title: string
  location: string
  manifest: string
  dataKind: DataKind
}
export interface Observation {
  label: string
  date: string
  image: string
  inputId: string
}
export interface SourceLink { title: string; url: string }
export interface LegendEntry { label: string; color: string }
export interface PreparedObservation { date: string; image: string; radarImage: string; inputId: string }
export interface PreparedLayer { id: 'frequency' | 'water_class' | 'change'; label: string; description: string; image: string; legend: LegendEntry[] }
export interface ReportedArea { date: string; open_water: number; flooded_veg: number; total: number }
export interface PreparedCollection { observations: PreparedObservation[]; layers: PreparedLayer[]; series: ReportedArea[] }
export interface StoryStep {
  title: string
  body: string
  center: Position
  zoom: number
  view: ViewMode
}
export interface FloodCase {
  schemaVersion: 1
  id: string
  title: string
  location: string
  description: string
  dataKind: DataKind
  interpretation: Interpretation
  reviewStatus: 'unreviewed' | 'qualitatively-reviewed' | 'independently-validated'
  instrument: string
  product: string
  measurement: string
  units: string
  method: string
  bounds: [number, number, number, number]
  coordinates: ImageCorners
  coverage: Feature<Polygon | MultiPolygon>
  coverageType?: 'analysis-support' | 'display-extent'
  provenance?: string
  collection?: PreparedCollection
  before: Observation
  after: Observation
  change?: { image: string; label: string; legend?: LegendEntry[] }
  areas?: FeatureCollection<Polygon | MultiPolygon>
  legend: LegendEntry[]
  observed: string
  explanation: string
  limitations: string[]
  sources: SourceLink[]
  story: StoryStep[]
}
