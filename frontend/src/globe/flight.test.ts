import { describe, expect, it } from 'vitest'
import { PerspectiveCamera } from 'three'
import { CAMBODIA, facingOrientation, geographicPoint } from './geography'
import { CAMBODIA_FLIGHT_MS, GLOBE_EXPANSION_MS, flightCameraDistance } from './flight'
import cambodia from '../../public/globe/cambodia.json'

describe('full-screen Cambodia arrival', () => {
  it('leaves camera zoom until the globe has expanded, then moves continuously toward Earth', () => {
    expect(flightCameraDistance(0, 1.6)).toBe(3.8)
    expect(flightCameraDistance(GLOBE_EXPANSION_MS, 1.6)).toBe(3.8)
    const distances = [1000, 1500, 2000, CAMBODIA_FLIGHT_MS].map((time) => flightCameraDistance(time, 1.6))
    expect(distances.every((value, i) => i === 0 || value < distances[i - 1]!)).toBe(true)
  })
  for (const [width, height] of [[1440, 900], [1043, 831], [390, 844]]) {
    it(`fills the viewport and keeps Cambodia's outline visible at ${width}x${height}`, () => {
      const aspect = width! / height!
      const distance = flightCameraDistance(CAMBODIA_FLIGHT_MS, aspect)
      const camera = new PerspectiveCamera(35, aspect, .1, 30)
      camera.position.z = distance
      camera.updateMatrixWorld()
      const rotation = facingOrientation(CAMBODIA.latitude, CAMBODIA.longitude)
      for (const ring of cambodia.lines) for (const [longitude, latitude] of ring) {
        const screen = geographicPoint(latitude!, longitude!, 1.003).applyQuaternion(rotation).project(camera)
        expect(Math.abs(screen.x)).toBeLessThan(1)
        expect(Math.abs(screen.y)).toBeLessThan(1)
        expect(screen.z).toBeLessThan(1)
      }
      // Even the viewport's corner ray must hit Earth, leaving no circular edge visible.
      const cornerAngle = Math.atan(Math.tan(35 * Math.PI / 360) * Math.hypot(1, aspect))
      expect(cornerAngle).toBeLessThan(Math.asin(1 / distance))
    })
  }
})
