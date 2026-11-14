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
})
