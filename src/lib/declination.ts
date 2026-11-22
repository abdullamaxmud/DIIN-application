import { model } from 'geomagnetism'

/**
 * A compass points to magnetic north, but the Qibla bearing is from true north.
 * The difference (declination) comes from the World Magnetic Model; east is positive.
 * Example: about 15° in Seattle, -10° in Toronto, under 1° in Mogadishu.
 */
export function declinationAt(lat: number, lng: number, date = new Date()) {
  try {
    const value = model(date, { allowOutOfBoundsModel: true }).point([lat, lng]).decl
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}
