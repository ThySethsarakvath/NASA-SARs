import { Euler, Quaternion, Vector3 } from 'three'

export const CAMBODIA = { latitude: 12.5657, longitude: 104.991 }

// SphereGeometry's UV origin is the left edge of an equirectangular world map.
// Longitude zero lies on +X; east runs toward -Z. Keep NASA's texture unmirrored.
export function geographicPoint(latitude: number, longitude: number, radius = 1) {
  const lat = latitude * Math.PI / 180, lon = longitude * Math.PI / 180
  return new Vector3(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon))
}

export function facingOrientation(latitude: number, longitude: number) {
  return new Quaternion().setFromEuler(new Euler(latitude * Math.PI / 180, -Math.PI / 2 - longitude * Math.PI / 180, 0, 'XYZ'))
}
