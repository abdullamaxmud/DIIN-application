// Qibla direction and compass maths (pure functions, unit-tested).
import { Coordinates, Qibla } from 'adhan'

/** The Kaaba, Makkah. */
export const KAABA = { lat: 21.4225, lng: 39.8262 }

/** Keep an angle in 0..360. */
export const normalize = (deg: number) => ((deg % 360) + 360) % 360

/** Qibla bearing from true north, clockwise, in degrees (Adhan.js, great-circle). */
export const qiblaBearing = (lat: number, lng: number) => normalize(Qibla(new Coordinates(lat, lng)))

/** Index 0..7 of the nearest compass point: N, NE, E, SE, S, SW, W, NW. */
export const compassPoint = (deg: number) => Math.round(normalize(deg) / 45) % 8

/** Great-circle distance to the Kaaba in km. */
export function distanceToKaaba(lat: number, lng: number) {
  const R = 6371.0088, r = Math.PI / 180
  const dLat = (KAABA.lat - lat) * r, dLng = (KAABA.lng - lng) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat * r) * Math.cos(KAABA.lat * r) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Shortest turn from `from` to `to`, in -180..180. Positive = turn right. */
export function signedDiff(from: number, to: number) {
  const d = normalize(to - from)
  return d > 180 ? d - 360 : d
}

export interface OrientationReading {
  alpha: number | null
  beta: number | null
  gamma: number | null
  /** iPhone/iPad only: heading from magnetic north */
  webkitCompassHeading?: number
  /** iPhone/iPad only: accuracy in degrees; negative = invalid */
  webkitCompassAccuracy?: number
}

/**
 * Magnetic heading of the phone's top edge, from a device-orientation reading.
 * Android: tilt-compensated from alpha/beta/gamma (device-orientation ZXY angles). iPhone: the system's heading.
 * Returns null when the reading has no real north reference.
 */
export function magneticHeading(e: OrientationReading, isAbsolute: boolean, screenAngle = 0): number | null {
  if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
    if (typeof e.webkitCompassAccuracy === 'number' && e.webkitCompassAccuracy < 0) return null
    return normalize(e.webkitCompassHeading + screenAngle)
  }
  if (!isAbsolute || e.alpha === null) return null
  const r = Math.PI / 180
  const x = (e.beta ?? 0) * r, y = (e.gamma ?? 0) * r, z = e.alpha * r
  // held flat or tilted: where the top edge points. Nearly upright: where the back of the phone points.
  const useTopEdge = Math.abs(Math.cos(x)) > 0.42
  const east = useTopEdge ? -Math.sin(z) * Math.cos(x) : -Math.cos(z) * Math.sin(y) - Math.sin(z) * Math.sin(x) * Math.cos(y)
  const north = useTopEdge ? Math.cos(z) * Math.cos(x) : -Math.sin(z) * Math.sin(y) + Math.cos(z) * Math.sin(x) * Math.cos(y)
  return normalize(Math.atan2(east, north) / r + screenAngle)
}

/** Move a continuous heading toward a reading along the shortest way (no jump across 0°/360°). */
export const smoothHeading = (current: number, reading: number, factor = 0.18) => current + signedDiff(current, reading) * factor

/** Aligned within 3°; stays aligned until 6° off, so the state does not flicker at the edge. */
export const nextAligned = (wasAligned: boolean, diff: number) => Math.abs(diff) <= (wasAligned ? 6 : 3)
