import { describe, expect, it } from 'vitest'
import { t, tList } from './index'
import { formatGregorian, formatHijri } from '../lib/dates'

describe('i18n', () => {
  it('looks up nested keys and fills placeholders', () => {
    expect(t('nav.home')).toBe('Hoyga')
    expect(t('common.comingSoon', { phase: 3 })).toContain('marxaladda 3')
  })
  it('returns the key when a string is missing', () => {
    expect(t('nope.missing')).toBe('nope.missing')
  })
  it('has 7 Somali day names and 12 month names', () => {
    expect(tList('date.days')).toHaveLength(7)
    expect(tList('date.months')).toHaveLength(12)
    expect(tList('date.hijriMonths')).toHaveLength(12)
  })
})

describe('dates', () => {
  it('formats the Gregorian date in Somali', () => {
    expect(formatGregorian(new Date(2026, 10, 19))).toBe('Khamiis, 19 Nofembar 2026')
  })
  it('formats the Hijri date with Somali month names', () => {
    expect(formatHijri(new Date(Date.UTC(2026, 10, 19, 12)), 'UTC')).toMatch(/^\d{1,2} Jumaadal Aakhira 1448$/)
  })
})
