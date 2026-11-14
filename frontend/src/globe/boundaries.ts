import { geographicPoint } from './geography'

export function boundaryPositions(value: unknown): Float32Array {
  if (!value || typeof value !== 'object' || !('lines' in value) || !Array.isArray(value.lines)) throw new Error('Country outlines unavailable.')
  const vertices: number[] = []
  for (const ring of value.lines) {
    if (!Array.isArray(ring) || ring.length < 2) throw new Error('Invalid country outline.')
    const points = ring.map((point: unknown) => {
      if (!Array.isArray(point) || point.length !== 2 || !point.every((n) => typeof n === 'number' && Number.isFinite(n)) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) throw new Error('Invalid outline coordinate.')
      return geographicPoint(point[1], point[0], 1.003)
    })
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1]!, to = points[i]!
      // Densify long segments so a straight chord never sinks under the sphere.
      const segments = Math.max(1, Math.ceil(from.angleTo(to) / .009))
      for (let j = 0; j < segments; j++) {
        vertices.push(...from.clone().lerp(to, j / segments).normalize().multiplyScalar(1.003).toArray())
        vertices.push(...from.clone().lerp(to, (j + 1) / segments).normalize().multiplyScalar(1.003).toArray())
      }
    }
  }
  return new Float32Array(vertices)
}
