import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { CAMBODIA, facingOrientation, geographicPoint } from './geography'

describe('Earth texture orientation', () => {
  it('matches SphereGeometry UV longitude without mirroring east and west', () => {
    expect(geographicPoint(0, 0).distanceTo(new Vector3(1, 0, 0))).toBeLessThan(1e-10)
    expect(geographicPoint(0, 90).distanceTo(new Vector3(0, 0, -1))).toBeLessThan(1e-10)
    expect(geographicPoint(90, 0).distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-10)
  })
  it('centers Cambodia toward the viewer while keeping north up', () => {
    const orientation = facingOrientation(CAMBODIA.latitude, CAMBODIA.longitude)
    const center = geographicPoint(CAMBODIA.latitude, CAMBODIA.longitude).applyQuaternion(orientation)
    expect(center.distanceTo(new Vector3(0, 0, 1))).toBeLessThan(1e-10)
    const north = geographicPoint(CAMBODIA.latitude + 1, CAMBODIA.longitude).applyQuaternion(orientation)
    expect(north.y).toBeGreaterThan(center.y)
    expect(Math.abs(north.x)).toBeLessThan(1e-10)
  })
})
