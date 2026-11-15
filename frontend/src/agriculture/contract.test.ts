import { describe, expect, it } from 'vitest'
import { parseSummary, parseVegetation, parseGeometry, parseRainfall, parseChanges } from './contract'
import { summaryFixture, vegetationFixture, rainfallFixture, geometryFixture } from '../../tests/fixtures/agriculture'

describe('Agriculture API contracts', () => {
  it('retains valid-coverage denominators, units and missing values', () => {
    const raw = summaryFixture()
    const result = parseSummary({ ...raw, provinces: raw.provinces.map((p) => ({ ...p, pure_radar_change_percent: null })) })
    expect(result.provinces[0]?.pure).toEqual({ areaHa: 200, validHa: 100, changedHa: 25, changedPercent: null })
    expect(result.provinces[0]?.rainfallAnomalyMm).toBe(-20)
    expect(result.comparison.before).toBe('2026-07-01')
  })
  it('rejects invalid coverage, percentages, dates and inconsistent counts', () => {
    const raw = summaryFixture(); raw.provinces[0]!.pure_radar_change_area_ha = 101
    expect(() => parseSummary(raw)).toThrow('exceeds valid')
    const badPercent = summaryFixture(); badPercent.provinces[0]!.pure_radar_change_percent = 120
    expect(() => parseSummary(badPercent)).toThrow('numeric')
    expect(() => parseSummary({ ...summaryFixture(), province_count: 3 })).toThrow('count')
    const badDate = summaryFixture(); badDate.nisar_comparison.after = '2026-02-30'
    expect(() => parseSummary(badDate)).toThrow('date')
  })
  it('preserves empty historical samples and rejects wrong-province or duplicate chart rows', () => {
    expect(parseVegetation([], 'Battambang')).toEqual([])
    expect(parseVegetation(vegetationFixture('Siem Reap'), 'Siem Reap')[0]?.coverageStatus).toBe('partial_sample')
    expect(() => parseVegetation(vegetationFixture('Siem Reap'), 'Battambang')).toThrow('selected province')
    expect(() => parseVegetation([...vegetationFixture('Siem Reap'), ...vegetationFixture('Siem Reap')], 'Siem Reap')).toThrow('Duplicate')
    expect(parseRainfall(rainfallFixture('Siem Reap'), 'Siem Reap')[0]?.referenceMm).toBe(220)
  })
  it('accepts geographic province polygons and rejects invalid or open rings', () => {
    expect(parseGeometry(geometryFixture()).features[0]?.id).toBe('Siem Reap')
    const raw = geometryFixture(); raw.features[0]!.geometry.coordinates[0]![0] = [999, 12]
    expect(() => parseGeometry(raw)).toThrow('numeric')
    const open = geometryFixture(); open.features[0]!.geometry.coordinates[0]!.pop()
    expect(() => parseGeometry(open)).toThrow('ring')
  })
  it('rejects unsupported crop classes instead of assigning a meaning', () => {
    expect(() => parseChanges([{ province: 'Siem Reap', crop_class: 40, threshold_db: 3 }])).toThrow('class')
  })
})
