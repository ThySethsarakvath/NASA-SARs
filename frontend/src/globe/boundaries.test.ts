import { describe, expect, it } from 'vitest'
import { boundaryPositions } from './boundaries'

describe('Context country outlines', () => {
  it('keeps interpolated segments above the globe surface', () => {
    const points = boundaryPositions({ lines: [[[100, 10], [110, 15]]] })
    expect(points.length).toBeGreaterThan(6)
    for (let i = 0; i < points.length; i += 3) expect(Math.hypot(points[i]!, points[i + 1]!, points[i + 2]!)).toBeCloseTo(1.003, 5)
  })
  it('rejects malformed or impossible geographic coordinates', () => {
    for (const value of [null, {}, { lines: [[[190, 0], [0, 0]]] }, { lines: [[[0, 'north'], [1, 1]]] }]) expect(() => boundaryPositions(value)).toThrow()
  })
})
