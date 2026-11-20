import { describe, expect, it } from 'vitest'
import { dayRange, dueNotifications, juzOfPage, parsePrefs, zonedInstant, type Subscriber } from './schedule'

const base = (): Subscriber => ({
  lat: 2.0469,
  lng: 45.3182,
  zone: 'Africa/Mogadishu',
  sent: {},
  prefs: {
    prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    morning: true,
    evening: true,
    morningOffset: 30,
    eveningOffset: 15,
    khatma: { on: true, minute: 330, days: 30, start: '2026-11-18', from: 1 },
  },
})

// Muqdisho 18 Nov 2026 (Egyptian): Subax 04:24, Duhur 11:44/45, Casar 15:07/08, Maqrib 17:45, Cishe 18:55 (EAT = UTC+3)
const at = (hhmm: string, seconds = 30) => new Date(`2026-11-18T${hhmm}:${String(seconds).padStart(2, '0')}+03:00`)

describe('notification scheduling', () => {
  it('sends Maqrib at its minute, once', () => {
    const due = dueNotifications(base(), at('17:45'))
    expect(due.map((d) => d.key)).toEqual(['p:maghrib'])
    expect(due[0].body).toBe('Waa waqtigii salaadda Maqrib — 17:45')
    // already sent today -> nothing
    const sub = { ...base(), sent: { 'p:maghrib': '2026-11-18' } }
    expect(dueNotifications(sub, at('17:46'))).toEqual([])
  })

  it('does not fire before the time or long after it', () => {
    expect(dueNotifications(base(), at('17:44', 0))).toEqual([])
    expect(dueNotifications(base(), at('17:50'))).toEqual([])
  })

  it('respects the per-prayer switches', () => {
    const sub = base()
    sub.prefs.prayers.maghrib = false
    expect(dueNotifications(sub, at('17:45'))).toEqual([])
  })

  it('morning adhkar 30 min after Fajr, evening adhkar 15 min after Asr', () => {
    expect(dueNotifications(base(), at('04:54')).map((d) => d.key)).toEqual(['a:subax'])
    const ev = dueNotifications(base(), new Date('2026-11-18T15:23:30+03:00'))
    const ev2 = dueNotifications(base(), new Date('2026-11-18T15:22:30+03:00'))
    expect([...ev, ...ev2].map((d) => d.key)).toContain('a:fiid')
    expect([...ev, ...ev2].find((d) => d.key === 'a:fiid')?.body).toBe('Waa waqtigii Adkaarta Fiidka 🌙')
  })

  it('khatma reminder at the chosen time with that day’s portion', () => {
    // plan started 18 Nov -> day 1 = pages 1–20, juz 1
    const due = dueNotifications(base(), at('05:30'))
    const k = due.find((d) => d.key === 'k:read')
    expect(k?.body).toBe('Waa waqtigii akhriska Quraanka 📖 – Maanta: Juz 1, bogga 1 ilaa 20.')
    // plan over -> no reminder
    const sub = base()
    sub.prefs.khatma = { on: true, minute: 330, days: 3, start: '2026-11-01', from: 1 }
    expect(dueNotifications(sub, at('05:30')).find((d) => d.key === 'k:read')).toBeUndefined()
  })

  it('works in other time zones (Minneapolis, DST-aware conversion)', () => {
    const sub: Subscriber = { ...base(), lat: 44.9778, lng: -93.265, zone: 'America/Chicago' }
    sub.prefs.khatma = { on: true, minute: 6 * 60, days: 30, start: '2026-11-18', from: 1 }
    const six = zonedInstant({ y: 2026, m: 11, d: 18 }, 360, 'America/Chicago')
    expect(six.toISOString()).toBe('2026-11-18T12:00:00.000Z') // CST = UTC-6
    expect(dueNotifications(sub, new Date(six.getTime() + 20000)).map((d) => d.key)).toContain('k:read')
  })

  it('without a location only the khatma reminder can fire', () => {
    const sub = { ...base(), lat: null, lng: null }
    expect(dueNotifications(sub, at('17:45'))).toEqual([])
    expect(dueNotifications(sub, at('05:30')).map((d) => d.key)).toEqual(['k:read'])
  })
})

describe('helpers', () => {
  it('day ranges and juz lookup match the app', () => {
    expect(dayRange(30, 1, 1)).toEqual([1, 20])
    expect(dayRange(30, 1, 30)[1]).toBe(604)
    expect(juzOfPage(222)).toBe(12)
  })
  it('parsePrefs rejects junk and clamps numbers', () => {
    expect(parsePrefs(null)).toBeNull()
    const p = parsePrefs({ prayers: { fajr: 1, bogus: true }, morning: true, morningOffset: 9999, khatma: { on: true, start: 'x' } })!
    expect(p.prayers).toEqual({ fajr: true, dhuhr: false, asr: false, maghrib: false, isha: false })
    expect(p.morningOffset).toBe(30)
    expect(p.khatma).toBeNull()
  })
})
