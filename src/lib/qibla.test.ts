import { describe, expect, it } from 'vitest'
import { distanceToKaaba, magneticHeading, nextAligned, normalize, qiblaBearing, signedDiff, smoothHeading } from './qibla'
import { declinationAt } from './declination'

describe('Qibla direction', () => {
  it('matches published bearings for cities around the world', () => {
    const cities: [number, number, number][] = [
      [38.9072, -77.0369, 56.56], // Washington DC
      [40.7128, -74.0059, 58.48], // New York
      [51.5074, -0.1278, 118.99], // London
      [-33.8688, 151.2093, 277.5], // Sydney
      [35.6895, 139.6917, 293.02], // Tokyo
    ]
    for (const [lat, lng, bearing] of cities) expect(qiblaBearing(lat, lng)).toBeCloseTo(bearing, 1)
  })
  it('points slightly west of north from Mogadishu', () => {
    const b = qiblaBearing(2.0469, 45.3182)
    expect(b).toBeGreaterThan(340)
    expect(b).toBeLessThan(350)
  })
  it('measures the distance to the Kaaba', () => {
    expect(distanceToKaaba(21.4225, 39.8262)).toBeCloseTo(0, 3)
    const km = distanceToKaaba(2.0469, 45.3182)
    expect(km).toBeGreaterThan(2150)
    expect(km).toBeLessThan(2250)
  })
})

describe('compass maths', () => {
  it('finds the shortest turn across north', () => {
    expect(signedDiff(350, 10)).toBe(20)
    expect(signedDiff(10, 350)).toBe(-20)
    expect(signedDiff(90, 90)).toBe(0)
    expect(normalize(-10)).toBe(350)
    expect(normalize(370)).toBe(10)
  })
  it('smooths across 0°/360° without spinning the long way', () => {
    const next = smoothHeading(359, 1, 0.5)
    expect(next).toBeCloseTo(360, 5)
  })
  it('reads an Android heading when flat, tilted and upright', () => {
    expect(magneticHeading({ alpha: 90, beta: 0, gamma: 0 }, true)).toBeCloseTo(270, 5)
    expect(magneticHeading({ alpha: 90, beta: 40, gamma: 20 }, true)).toBeCloseTo(270, 5)
    expect(magneticHeading({ alpha: 90, beta: 90, gamma: 0 }, true)).toBeCloseTo(270, 5)
    expect(magneticHeading({ alpha: 0, beta: 0, gamma: 0 }, true)).toBeCloseTo(0, 5)
  })
  it('refuses a reading with no real north', () => {
    expect(magneticHeading({ alpha: 90, beta: 0, gamma: 0 }, false)).toBeNull()
    expect(magneticHeading({ alpha: null, beta: null, gamma: null }, true)).toBeNull()
    expect(magneticHeading({ alpha: 1, beta: 0, gamma: 0, webkitCompassHeading: 40, webkitCompassAccuracy: -1 }, false)).toBeNull()
  })
  it('uses the iPhone heading', () => {
    expect(magneticHeading({ alpha: 1, beta: 0, gamma: 0, webkitCompassHeading: 123, webkitCompassAccuracy: 10 }, false)).toBe(123)
  })
  it('does not flicker at the edge of alignment', () => {
    expect(nextAligned(false, 3)).toBe(true)
    expect(nextAligned(false, 4)).toBe(false)
    expect(nextAligned(true, 5)).toBe(true)
    expect(nextAligned(true, -7)).toBe(false)
  })
  it('corrects magnetic north to true north', () => {
    const d = new Date('2026-11-22')
    expect(declinationAt(47.6, -122.33, d)).toBeCloseTo(14.85, 0)
    expect(declinationAt(43.65, -79.38, d)).toBeCloseTo(-10.13, 0)
    expect(Math.abs(declinationAt(2.05, 45.32, d))).toBeLessThan(2)
    expect(Number.isFinite(declinationAt(2.05, 45.32, new Date('2035-01-01')))).toBe(true)
  })
})
