import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { QuranData } from './data'
import { arabicDigits, juzEnd, juzPages, juzStart, lastReadFor, searchSurahs, showsBasmala } from './quran'

const q: QuranData = JSON.parse(readFileSync('data/quran.json', 'utf8'))

describe('quran helpers', () => {
  it('searches by number, Latin name and Arabic name', () => {
    expect(searchSurahs(q.surahs, '18').map((s) => s.n)).toEqual([18])
    expect(searchSurahs(q.surahs, 'kahf').map((s) => s.n)).toEqual([18])
    expect(searchSurahs(q.surahs, "al-baqarah").map((s) => s.n)).toEqual([2])
    expect(searchSurahs(q.surahs, 'الكهف').map((s) => s.n)).toEqual([18])
    expect(searchSurahs(q.surahs, '')).toHaveLength(114)
    expect(searchSurahs(q.surahs, 'zzzz')).toHaveLength(0)
  })
  it('knows where each juz starts and ends', () => {
    expect(juzStart(q, 12).label).toBe('Hud 6')
    expect(juzEnd(q, 12)).toBe('Yusuf 52')
    expect(juzEnd(q, 1)).toBe('Al-Baqarah 141')
    expect(juzEnd(q, 30)).toBe('An-Nas 6')
    expect(juzPages(q, 12)).toEqual([222, 241])
    expect(juzPages(q, 30)).toEqual([582, 604])
  })
  it('basmala rule and Arabic digits', () => {
    expect(showsBasmala(1)).toBe(false)
    expect(showsBasmala(9)).toBe(false)
    expect(showsBasmala(2)).toBe(true)
    expect(arabicDigits(286)).toBe('٢٨٦')
  })
  it('last-read carries the real page of the ayah', () => {
    expect(lastReadFor(q, 12, 53).page).toBe(242)
    expect(lastReadFor(q, 1, 1).page).toBe(1)
  })
})
