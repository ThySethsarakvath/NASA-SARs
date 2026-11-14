export const GLOBE_EXPANSION_MS = 850
export const CAMBODIA_FLIGHT_MS = 2600
export const MAP_REVEAL_MS = 650

export function easeFlight(progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  return t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
}

export function flightCameraDistance(elapsed: number, aspect: number) {
  // Let the globe occupy the viewport before diving toward the surface.
  const zoom = easeFlight((elapsed - GLOBE_EXPANSION_MS) / (CAMBODIA_FLIGHT_MS - GLOBE_EXPANSION_MS))
  // Keep the country in view on narrow portrait screens as well as desktop.
  const destination = 1 + .19 / Math.min(Math.max(aspect, .2), 1)
  return 3.8 + (destination - 3.8) * zoom
}
