// Prayer-time engine built on Adhan.js (offline astronomical calculation).
// The calculation method is chosen automatically from the device's time zone, following
// the method Muslims in that region commonly use. Somalia / Africa = Egyptian General Authority
// (confirmed by the product owner). There are deliberately no user settings for this.
import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes, type CalculationParameters } from 'adhan'

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

export const PRAYERS: { key: PrayerKey; so: string; ar: string; isPrayer: boolean }[] = [
  { key: 'fajr', so: 'Subax', ar: 'الفجر', isPrayer: true },
  { key: 'sunrise', so: 'Qorrax-soo-bax', ar: 'الشروق', isPrayer: false },
  { key: 'dhuhr', so: 'Duhur', ar: 'الظهر', isPrayer: true },
  { key: 'asr', so: 'Casar', ar: 'العصر', isPrayer: true },
  { key: 'maghrib', so: 'Maqrib', ar: 'المغرب', isPrayer: true },
  { key: 'isha', so: 'Cishe', ar: 'العشاء', isPrayer: true },
]

export interface Region {
  country: string
  methodName: string
  params: () => CalculationParameters
  hanafi: boolean
}

const COUNTRY: Record<string, string> = {
  'Africa/Mogadishu': 'Soomaaliya', 'Africa/Nairobi': 'Kenya', 'Africa/Addis_Ababa': 'Itoobiya', 'Africa/Djibouti': 'Jabuuti',
  'Africa/Kampala': 'Uganda', 'Africa/Dar_es_Salaam': 'Tansaaniya', 'Africa/Cairo': 'Masar', 'Africa/Khartoum': 'Suudaan',
  'Asia/Riyadh': 'Sacuudi Carabiya', 'Asia/Dubai': 'Imaaraadka Carabta', 'Asia/Qatar': 'Qadar', 'Asia/Kuwait': 'Kuwayt',
  'Asia/Aden': 'Yaman', 'Asia/Muscat': 'Cumaan', 'Asia/Bahrain': 'Baxrayn', 'Asia/Karachi': 'Pakistan', 'Asia/Kolkata': 'Hindiya',
  'Asia/Kuala_Lumpur': 'Malaysia', 'Asia/Singapore': 'Singapore', 'Asia/Jakarta': 'Indoneesiya', 'Europe/Istanbul': 'Turkiga',
  'Europe/London': 'Ingiriiska', 'Europe/Stockholm': 'Iswiidhan', 'Europe/Oslo': 'Noorweey', 'Europe/Helsinki': 'Finland',
  'Europe/Copenhagen': 'Denmark', 'Europe/Amsterdam': 'Holland', 'Europe/Berlin': 'Jarmal', 'Europe/Paris': 'Faransiis',
  'Europe/Rome': 'Talyaani', 'Europe/Dublin': 'Ayrlaand', 'America/New_York': 'Maraykanka', 'America/Chicago': 'Maraykanka',
  'America/Denver': 'Maraykanka', 'America/Phoenix': 'Maraykanka', 'America/Los_Angeles': 'Maraykanka', 'America/Toronto': 'Kanada',
  'America/Vancouver': 'Kanada', 'America/Edmonton': 'Kanada', 'America/Winnipeg': 'Kanada', 'Australia/Sydney': 'Australia',
  'Australia/Melbourne': 'Australia', 'Australia/Perth': 'Australia',
}

/** Region rules: which method the local Muslim community uses, decided from the IANA time zone. */
export function regionFor(zone: string): Region {
  const z = zone || ''
  const country = COUNTRY[z] || z.split('/').pop()?.replace(/_/g, ' ') || ''
  const r = (methodName: string, params: () => CalculationParameters, hanafi = false): Region => ({ country, methodName, params, hanafi })
  if (/^Asia\/(Riyadh|Aden|Muscat|Bahrain)$/.test(z)) return r('Umm al-Qura (Makkah)', CalculationMethod.UmmAlQura)
  if (z === 'Asia/Dubai') return r('Imaaraadka (Dubai)', CalculationMethod.Dubai)
  if (z === 'Asia/Qatar') return r('Qadar', CalculationMethod.Qatar)
  if (z === 'Asia/Kuwait') return r('Kuwayt', CalculationMethod.Kuwait)
  if (/^Asia\/(Karachi|Kolkata|Dhaka|Kabul)$/.test(z)) return r('University of Islamic Sciences, Karachi', CalculationMethod.Karachi, true)
  if (/^Asia\/(Singapore|Kuala_Lumpur|Jakarta|Brunei)$/.test(z)) return r('Singapore / Malaysia', CalculationMethod.Singapore)
  if (z === 'Europe/Istanbul') return r('Diyanet (Turkiga)', CalculationMethod.Turkey, true)
  if (/^America\//.test(z)) return r('ISNA (Waqooyiga Ameerika)', CalculationMethod.NorthAmerica)
  if (/^Africa\//.test(z)) return r('Egyptian General Authority (Afrika)', CalculationMethod.Egyptian)
  return r('Muslim World League', CalculationMethod.MuslimWorldLeague)
}

// Intl formatters are expensive to create on phones; reuse one per zone
const formatters = new Map<string, Intl.DateTimeFormat>()
const fmt = (key: string, make: () => Intl.DateTimeFormat) => {
  let f = formatters.get(key)
  if (!f) { f = make(); formatters.set(key, f) }
  return f
}

/** The calendar date (y, m, d) it currently is in `zone`. */
export function dateInZone(instant: Date, zone: string): { y: number; m: number; d: number } {
  const parts = fmt(`d:${zone}`, () => new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric' })).formatToParts(instant)
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10)
  return { y: get('year'), m: get('month'), d: get('day') }
}

/** "HH:MM" (24h) for an instant, shown in the place's own time zone. */
export function formatTime(instant: Date | null, zone: string): string {
  if (!instant || Number.isNaN(instant.getTime())) return '—'
  return fmt(`t:${zone}`, () => new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })).format(instant)
}

export type DayTimes = Record<PrayerKey, Date>

// a day's times never change, so compute each (place, day) once
const dayCache = new Map<string, DayTimes>()

/** Prayer times for the calendar day `y-m-d` at the given coordinates. */
export function timesFor(lat: number, lng: number, zone: string, ymd: { y: number; m: number; d: number }): DayTimes {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${zone},${ymd.y}-${ymd.m}-${ymd.d}`
  const hit = dayCache.get(key)
  if (hit) return hit
  const result = computeTimes(lat, lng, zone, ymd)
  if (dayCache.size > 32) dayCache.clear()
  dayCache.set(key, result)
  return result
}

function computeTimes(lat: number, lng: number, zone: string, ymd: { y: number; m: number; d: number }): DayTimes {
  const region = regionFor(zone)
  const params = region.params()
  params.madhab = region.hanafi ? Madhab.Hanafi : Madhab.Shafi
  const coords = new Coordinates(lat, lng)
  // far north/south the sun may not go 18° below the horizon; Adhan picks the safe rule
  params.highLatitudeRule = HighLatitudeRule.recommended(coords)
  // Adhan reads the calendar day from the Date's local y/m/d fields
  const pt = new PrayerTimes(coords, new Date(ymd.y, ymd.m - 1, ymd.d, 12), params)
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha }
}

export interface PrayerState {
  region: Region
  today: DayTimes
  /** next of the five prayers (sunrise is not a prayer) */
  next: { key: PrayerKey; at: Date }
  /** seconds until `next` */
  secondsLeft: number
  /** 0..1 position of "now" between today's Fajr and Isha (for the sun-path arc) */
  dayFraction: number
  isDaylight: boolean
}

export function prayerState(lat: number, lng: number, zone: string, now = new Date()): PrayerState {
  const region = regionFor(zone)
  const ymd = dateInZone(now, zone)
  const today = timesFor(lat, lng, zone, ymd)
  const five = PRAYERS.filter((p) => p.isPrayer)
  let next: { key: PrayerKey; at: Date } | undefined
  for (const p of five) {
    if (today[p.key].getTime() > now.getTime()) { next = { key: p.key, at: today[p.key] }; break }
  }
  if (!next) {
    // after Isha: tomorrow's Fajr
    const t = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + 1, 12))
    const tomorrow = timesFor(lat, lng, zone, { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() })
    next = { key: 'fajr', at: tomorrow.fajr }
  }
  const span = today.isha.getTime() - today.fajr.getTime()
  const dayFraction = Math.min(1, Math.max(0, (now.getTime() - today.fajr.getTime()) / span))
  return {
    region,
    today,
    next,
    secondsLeft: Math.max(0, Math.round((next.at.getTime() - now.getTime()) / 1000)),
    dayFraction,
    isDaylight: now >= today.sunrise && now < today.maghrib,
  }
}

/** The next prayer when it is at most `windowSec` away (default 5 minutes), else null. */
export function prayerSoon(state: PrayerState, windowSec = 300): { key: PrayerKey; at: Date; secondsLeft: number } | null {
  return state.secondsLeft > 0 && state.secondsLeft <= windowSec ? { ...state.next, secondsLeft: state.secondsLeft } : null
}

/** "04:32" (minutes:seconds, for short countdowns) */
export function formatMinSec(seconds: number): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(seconds / 60))}:${p(seconds % 60)}`
}

/** "01:24:36" */
export function formatCountdown(seconds: number): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(seconds / 3600))}:${p(Math.floor((seconds % 3600) / 60))}:${p(seconds % 60)}`
}

export function prayerName(key: PrayerKey): string {
  return PRAYERS.find((p) => p.key === key)?.so ?? key
}
