import { describe, expect, it } from 'vitest'
import rawFixture from '../../public/data/synthetic-tonle-sap/case.json?raw'
import { parseCase, parseIndex } from './contract'

const fixture = () => parseCase(JSON.parse(rawFixture) as unknown)
describe('Public data handoff contract', () => {
  it('retains the fixture label, explicit units, footprint, and chronological pair', () => {
    const data = fixture()
    expect(data.dataKind).toBe('synthetic-demo')
    expect(data.units).toBe('Not a scientific measurement')
    expect(data.coverage.geometry.type).toBe('Polygon')
    expect(data.story).toHaveLength(3)
  })
  it('accepts a case without optional analysis output', () => {
    expect(parseCase({ ...fixture(), change: undefined, areas: undefined }).change).toBeUndefined()
  })
  it('rejects dates that are missing, reversed, or not real calendar days', () => {
    const data = fixture()
    for (const date of ['', '2027-01-01T00:00:00Z', '2026-02-30T00:00:00Z']) {
      expect(() => parseCase({ ...data, before: { ...data.before, date } })).toThrow()
    }
  })
  it('rejects invalid coordinates and incorrect corner order', () => {
    expect(() => parseCase({ ...fixture(), bounds: [190, 12, 191, 13] })).toThrow(/bounds/)
    expect(() => parseCase({ ...fixture(), coordinates: [...fixture().coordinates].reverse() })).toThrow(/corners/)
  })
  it('rejects synthetic validation claims', () => {
    expect(() => parseCase({ ...fixture(), reviewStatus: 'independently-validated' })).toThrow(/Synthetic/)
  })
  it('rejects external asset paths and embedded access queries', () => {
    const data = fixture()
    for (const image of ['https://example.com/file.png', '/data/a.png?token=private', '/data/../private.png']) {
      expect(() => parseCase({ ...data, before: { ...data.before, image } })).toThrow(/public/)
    }
  })
  it('rejects malformed geometry, colors, and non-HTTPS sources', () => {
    expect(() => parseCase({ ...fixture(), coverage: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } } })).toThrow()
    expect(() => parseCase({ ...fixture(), legend: [{ color: 'red', label: 'Change' }] })).toThrow(/colors/)
    expect(() => parseCase({ ...fixture(), sources: [{ title: 'Unsafe', url: 'javascript:alert(1)' }] })).toThrow(/HTTPS/)
  })
  it('rejects duplicate IDs in the case index', () => {
    const entry = { id: 'a', title: 'A', location: 'Cambodia', manifest: '/data/a.json', dataKind: 'synthetic-demo' }
    expect(() => parseIndex({ cases: [entry, entry] })).toThrow(/unique/)
    expect(parseIndex({ cases: [] })).toEqual([])
  })
})
