// Pure scheduling logic: given one subscriber's settings and "now", which notifications are due?
// Shared prayer engine with the app (same Adhan.js setup, same per-region method).
import { dateInZone, formatTime, timesFor, type PrayerKey } from '../../src/lib/prayer'

export type FivePrayers = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

export interface KhatmaPrefs {
  on: boolean
  /** minute of the local day, e.g. 330 = 05:30 */
  minute: number
  days: number
  /** ISO start date of the plan */
  start: string
  /** first page of the plan */
  from: number
}

export interface Prefs {
  prayers: Partial<Record<FivePrayers, boolean>>
  morning: boolean
  evening: boolean
  /** minutes after Fajr for the morning adhkar reminder */
  morningOffset: number
  /** minutes after Asr for the evening adhkar reminder */
  eveningOffset: number
  khatma: KhatmaPrefs | null
}

export interface Subscriber {
  lat: number | null
  lng: number | null
  zone: string
  prefs: Prefs
  /** event key -> local date it was already sent */
  sent: Record<string, string>
}

export interface Due {
  key: string
  title: string
  body: string
  url: string
}

const NAMES: Record<FivePrayers, string> = { fajr: 'Subax', dhuhr: 'Duhur', asr: 'Casar', maghrib: 'Maqrib', isha: 'Cishe' }
const JUZ_PAGES = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582]

/** An event is due when its moment fell inside the last `windowSec` seconds (cron runs every minute). */
export const WINDOW_SEC = 150

const iso = (ymd: { y: number; m: number; d: number }) => `${ymd.y}-${String(ymd.m).padStart(2, '0')}-${String(ymd.d).padStart(2, '0')}`

/** UTC instant of a local wall-clock minute in `zone` on the given local date. */
export function zonedInstant(ymd: { y: number; m: number; d: number }, minute: number, zone: string): Date {
  // start with the UTC guess, then correct by the zone's offset at that moment (twice for DST edges)
  let t = Date.UTC(ymd.y, ymd.m - 1, ymd.d, Math.floor(minute / 60), minute % 60)
  for (let k = 0; k < 2; k++) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(t))
    const g = (x: string) => parseInt(parts.find((p) => p.type === x)?.value ?? '0', 10)
    const asLocal = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'))
    const want = Date.UTC(ymd.y, ymd.m - 1, ymd.d, Math.floor(minute / 60), minute % 60)
    t += want - asLocal
  }
  return new Date(t)
}

export function juzOfPage(page: number): number {
  let j = 1
  while (j < 30 && JUZ_PAGES[j] <= page) j++
  return j
}

/** Pages of day i of a plan — identical split to the app (src/lib/khatma.ts dayRange). */
export function dayRange(days: number, from: number, i: number): [number, number] {
  const total = 604 - from + 1
  return [from + Math.floor(((i - 1) * total) / days), from + Math.floor((i * total) / days) - 1]
}

export function dueNotifications(sub: Subscriber, now: Date): Due[] {
  const out: Due[] = []
  const ymd = dateInZone(now, sub.zone)
  const today = iso(ymd)
  const isDue = (at: Date) => {
    const diff = (now.getTime() - at.getTime()) / 1000
    return diff >= 0 && diff < WINDOW_SEC
  }
  const push = (key: string, at: Date, title: string, body: string, url: string) => {
    if (sub.sent[key] === today) return
    if (isDue(at)) out.push({ key, title, body, url })
  }

  if (sub.lat !== null && sub.lng !== null) {
    const t = timesFor(sub.lat, sub.lng, sub.zone, ymd)
    for (const key of Object.keys(NAMES) as FivePrayers[]) {
      if (!sub.prefs.prayers[key]) continue
      push(`p:${key}`, t[key as PrayerKey], `Waqtiga ${NAMES[key]} 🕌`, `Waa waqtigii salaadda ${NAMES[key]} — ${formatTime(t[key as PrayerKey], sub.zone)}`, '/salaadda')
    }
    if (sub.prefs.morning) {
      push('a:subax', new Date(t.fajr.getTime() + sub.prefs.morningOffset * 60000), 'Adkaarta Subaxa ☀️', 'Waa waqtigii Adkaarta Subaxa ☀️', '/adkaarta/subax')
    }
    if (sub.prefs.evening) {
      push('a:fiid', new Date(t.asr.getTime() + sub.prefs.eveningOffset * 60000), 'Adkaarta Fiidka 🌙', 'Waa waqtigii Adkaarta Fiidka 🌙', '/adkaarta/fiid')
    }
  }

  const k = sub.prefs.khatma
  if (k?.on) {
    const [sy, sm, sd] = k.start.split('-').map(Number)
    const day = Math.round((Date.UTC(ymd.y, ymd.m - 1, ymd.d) - Date.UTC(sy, sm - 1, sd)) / 86400000) + 1
    if (day >= 1 && day <= k.days) {
      const [a, b] = dayRange(k.days, k.from, day)
      push('k:read', zonedInstant(ymd, k.minute, sub.zone), 'Akhriska Quraanka 📖', `Waa waqtigii akhriska Quraanka 📖 – Maanta: Juz ${juzOfPage(a)}, bogga ${a} ilaa ${b}.`, '/khatmiga')
    }
  }
  return out
}

/** Reject anything that is not a well-formed settings object. */
export function parsePrefs(raw: unknown): Prefs | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const prayers: Prefs['prayers'] = {}
  if (r.prayers && typeof r.prayers === 'object') {
    for (const key of Object.keys(NAMES) as FivePrayers[]) prayers[key] = !!(r.prayers as Record<string, unknown>)[key]
  }
  const num = (v: unknown, d: number, min: number, max: number) => (typeof v === 'number' && v >= min && v <= max ? Math.round(v) : d)
  let khatma: KhatmaPrefs | null = null
  if (r.khatma && typeof r.khatma === 'object') {
    const k = r.khatma as Record<string, unknown>
    if (typeof k.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k.start)) {
      khatma = { on: !!k.on, minute: num(k.minute, 330, 0, 1439), days: num(k.days, 30, 1, 365), start: k.start, from: num(k.from, 1, 1, 604) }
    }
  }
  return {
    prayers,
    morning: !!r.morning,
    evening: !!r.evening,
    morningOffset: num(r.morningOffset, 30, 0, 240),
    eveningOffset: num(r.eveningOffset, 15, 0, 240),
    khatma,
  }
}
