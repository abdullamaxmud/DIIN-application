import { describe, expect, it } from 'vitest'
import { formatCountdown, formatMinSec, formatTime, prayerSoon, prayerState, regionFor, timesFor } from './prayer'

const MOG = { lat: 2.0469, lng: 45.3182, zone: 'Africa/Mogadishu' }
const day = { y: 2026, m: 11, d: 18 }

const hhmm = (zone: string, times: Record<string, Date>) =>
  Object.fromEntries(Object.entries(times).map(([k, v]) => [k, formatTime(v, zone)]))

describe('prayer adapter (Adhan.js)', () => {
  it('Muqdisho uses the Egyptian method and matches the reference times', () => {
    expect(regionFor(MOG.zone).methodName).toMatch(/Egyptian/)
    // reference: Adhan.js 4.4 Egyptian/Shafi'i and Aladhan API method=5, 18 Nov 2026 (±1 min rounding)
    const t = hhmm(MOG.zone, timesFor(MOG.lat, MOG.lng, MOG.zone, day))
    expect(t.fajr).toBe('04:24')
    expect(t.sunrise).toBe('05:43')
    expect(['11:44', '11:45']).toContain(t.dhuhr)
    expect(['15:07', '15:08']).toContain(t.asr)
    expect(t.maghrib).toBe('17:45')
    expect(t.isha).toBe('18:55')
  })

  it('picks the regional method and madhab from the time zone', () => {
    expect(regionFor('Asia/Riyadh').methodName).toMatch(/Umm al-Qura/)
    expect(regionFor('America/Chicago').methodName).toMatch(/ISNA/)
    expect(regionFor('Europe/London').methodName).toBe('Muslim World League')
    expect(regionFor('Asia/Karachi').hanafi).toBe(true)
    expect(regionFor('Africa/Mogadishu').hanafi).toBe(false)
    expect(regionFor('Africa/Mogadishu').country).toBe('Soomaaliya')
  })

  it('times are in chronological order in several countries', () => {
    const places = [
      [2.0469, 45.3182, 'Africa/Mogadishu'], [9.56, 44.065, 'Africa/Mogadishu'], [44.9778, -93.265, 'America/Chicago'],
      [51.5074, -0.1278, 'Europe/London'], [59.3293, 18.0686, 'Europe/Stockholm'], [24.7136, 46.6753, 'Asia/Riyadh'],
    ] as const
    for (const [lat, lng, zone] of places) {
      for (const d of [{ y: 2026, m: 6, d: 21 }, { y: 2026, m: 12, d: 21 }]) {
        const t = timesFor(lat, lng, zone, d)
        const seq = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map((x) => x.getTime())
        seq.forEach((v) => expect(Number.isNaN(v)).toBe(false))
        for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeGreaterThan(seq[i - 1])
      }
    }
  })

  it('Stockholm in midsummer still gets a valid Fajr and Isha (high-latitude rule)', () => {
    const t = timesFor(59.3293, 18.0686, 'Europe/Stockholm', { y: 2026, m: 6, d: 21 })
    expect(formatTime(t.fajr, 'Europe/Stockholm')).not.toBe('—')
    expect(formatTime(t.isha, 'Europe/Stockholm')).not.toBe('—')
  })

  it('finds the next prayer and rolls over to tomorrow after Isha', () => {
    // 10:00 local (07:00Z) -> Duhur next
    const morning = prayerState(MOG.lat, MOG.lng, MOG.zone, new Date('2026-11-18T07:00:00Z'))
    expect(morning.next.key).toBe('dhuhr')
    expect(morning.isDaylight).toBe(true)
    // 22:00 local (19:00Z) -> tomorrow's Subax
    const night = prayerState(MOG.lat, MOG.lng, MOG.zone, new Date('2026-11-18T19:00:00Z'))
    expect(night.next.key).toBe('fajr')
    expect(night.next.at.getTime()).toBeGreaterThan(new Date('2026-11-18T19:00:00Z').getTime())
    expect(formatTime(night.next.at, MOG.zone)).toMatch(/^04:2\d$/)
    expect(night.dayFraction).toBe(1)
  })

  it('flags a prayer only in the last 5 minutes before it', () => {
    const day = timesFor(MOG.lat, MOG.lng, MOG.zone, { y: 2026, m: 11, d: 18 })
    const at = (ms: number) => prayerState(MOG.lat, MOG.lng, MOG.zone, new Date(day.dhuhr.getTime() - ms))
    expect(prayerSoon(at(10 * 60_000))).toBeNull()            // 10 min before: nothing
    const s = prayerSoon(at(5 * 60_000))                       // exactly 5 min before: shown
    expect(s?.key).toBe('dhuhr')
    expect(s?.secondsLeft).toBe(300)
    expect(prayerSoon(at(60_000))?.secondsLeft).toBe(60)       // 1 min before
    // sunrise is not a prayer: 3 min before sunrise must not say "salaadda … ayaa soo dhow"
    const beforeSunrise = prayerState(MOG.lat, MOG.lng, MOG.zone, new Date(day.sunrise.getTime() - 3 * 60_000))
    expect(prayerSoon(beforeSunrise)).toBeNull()
  })

  it('formats short countdowns as mm:ss', () => {
    expect(formatMinSec(272)).toBe('04:32')
    expect(formatMinSec(300)).toBe('05:00')
  })

  it('formats the countdown', () => {
    expect(formatCountdown(5076)).toBe('01:24:36')
    expect(formatCountdown(0)).toBe('00:00:00')
  })
})
