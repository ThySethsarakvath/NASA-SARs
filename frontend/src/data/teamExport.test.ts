import { describe, expect, it } from 'vitest'
import raw from '../../public/data/tonle-sap-2026/case.json?raw'
import { parseCase } from './contract'

const fixture = () => JSON.parse(raw) as Record<string, unknown>
describe('Imported team export contract', () => {
  it('preserves eleven calendar dates, three season layers, and unreviewed display bounds', () => {
    const data = parseCase(fixture())
    expect(data.dataKind).toBe('team-export')
    expect(data.reviewStatus).toBe('unreviewed')
    expect(data.coverageType).toBe('display-extent')
    expect(data.before.date).toBe('2026-06-19')
    expect(data.after.date).toBe('2026-10-29')
    expect(data.collection?.observations).toHaveLength(11)
    expect(data.collection?.layers).toHaveLength(3)
    expect(data.collection?.series[8]).toMatchObject({ open_water: 9514, total: 10003.3 })
  })
  it('rejects promotion to validated observations, false support and a mismatching default frame', () => {
    expect(() => parseCase({ ...fixture(), reviewStatus: 'independently-validated' })).toThrow(/unreviewed/)
    expect(() => parseCase({ ...fixture(), coverageType: 'analysis-support' })).toThrow(/display-extent/)
    const data = parseCase(fixture())
    expect(() => parseCase({ ...data, before: { ...data.before, image: '/data/wrong.png' } })).toThrow(/match prepared/)
  })
  it('rejects inconsistent, unordered and unsafe collection metadata', () => {
    const data = parseCase(fixture()), collection = data.collection!
    expect(() => parseCase({ ...data, collection: { ...collection, observations: [...collection.observations].reverse() } })).toThrow(/chronological/)
    expect(() => parseCase({ ...data, collection: { ...collection, series: collection.series.map((r, i) => i ? r : { ...r, total: 0 }) } })).toThrow(/totals/)
    expect(() => parseCase({ ...data, provenance: '/data/../secret.json' })).toThrow(/public/)
  })
  it('retains exposure estimates and source versions without elevating review status', () => {
    const data = parseCase(fixture()), exposure = data.collection!.exposure!
    expect(exposure.records).toHaveLength(11)
    expect(exposure.records[8]!.classifiedWater.areaKm2).toBe(10003.3)
    expect(exposure.records[8]!.baselineFiltered.population).toBe(12644)
    expect(exposure.sources.baseline).toBe('recurrence_100E_20Nv1_4_2021.tif')
    expect(exposure.sources.recurrenceBelowPct).toBe(25)
    expect(data.reviewStatus).toBe('unreviewed')
  })
  it('rejects invalid exposure dates, negative values, bad thresholds and unsafe proxy paths', () => {
    const data = parseCase(fixture()), collection = data.collection!, exposure = collection.exposure!
    const withExposure = (change: Partial<typeof exposure>) => ({ ...data, collection: { ...collection, exposure: { ...exposure, ...change } } })
    expect(() => parseCase(withExposure({ sources: { ...exposure.sources, recurrenceBelowPct: 101 } }))).toThrow(/threshold/)
    expect(() => parseCase(withExposure({ records: [{ ...exposure.records[0]!, date: '2026-01-01' }] }))).toThrow(/date/)
    expect(() => parseCase(withExposure({ records: [{ ...exposure.records[0]!, classifiedWater: { ...exposure.records[0]!.classifiedWater, population: -1 } }] }))).toThrow(/negative/)
    expect(() => parseCase({ ...data, collection: { ...collection, observations: collection.observations.map((o, i) => i ? o : { ...o, unusualImage: 'https://example.com/private.png' }) } })).toThrow(/public/)
  })

})
