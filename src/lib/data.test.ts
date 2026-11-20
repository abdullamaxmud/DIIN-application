import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { HisnData, QuranData } from './data'

// Guards the integrity of the verified data files that ship with the app.
const quran: QuranData = JSON.parse(readFileSync('data/quran.json', 'utf8'))
const hisn: HisnData = JSON.parse(readFileSync('data/hisn.json', 'utf8'))

describe('quran.json', () => {
  it('has 114 surahs and 6236 ayahs, each with Arabic, Somali and a page', () => {
    expect(quran.surahs).toHaveLength(114)
    const total = quran.surahs.reduce((sum, s) => sum + s.v.length, 0)
    expect(total).toBe(6236)
    for (const s of quran.surahs) {
      expect(s.v).toHaveLength(s.ayahs)
      expect(s.p).toHaveLength(s.ayahs)
      for (const [ar, so] of s.v) {
        expect(ar.length).toBeGreaterThan(0)
        expect(so.length).toBeGreaterThan(0)
      }
    }
  })
  it('pages run 1..604 and every juz starts on its Madani page', () => {
    expect(quran.surahs[0].p[0]).toBe(1)
    expect(quran.surahs[113].p.at(-1)).toBe(604)
    for (const j of quran.juz) {
      const [s, a] = j.key.split(':').map(Number)
      expect(quran.surahs[s - 1].p[a - 1]).toBe(j.page)
    }
  })
})

describe('hisn.json', () => {
  it('has all 132 chapters and 267 adhkar with Arabic and a positive count', () => {
    expect(hisn.chapters).toHaveLength(132)
    const items = hisn.chapters.flatMap((c) => c.items)
    expect(items).toHaveLength(267)
    for (const d of items) {
      expect(d.t.length).toBeGreaterThan(0)
      expect(d.c).toBeGreaterThan(0)
    }
  })
  it('uses the counts stated in the book text', () => {
    const byN = new Map(hisn.chapters.flatMap((c) => c.items).map((d) => [d.n, d]))
    expect(byN.get(83)?.c).toBe(7) // حسبي الله … (سبع مرات)
    expect(byN.get(91)?.c).toBe(100) // سبحان الله وبحمده مائة مرة
  })
  it('Somali meanings carry no leftover PDF numbering, headings or brackets', () => {
    for (const d of hisn.chapters.flatMap((c) => c.items)) {
      if (!d.so) continue
      expect(d.so, `#${d.n}`).not.toMatch(/\d\s*$/)
      expect(d.so, `#${d.n}`).not.toMatch(/[{}<>]|\(\(|\)\)/)
      expect(d.so, `#${d.n}`).not.toMatch(/(\s|^)\d{1,3}\s*[-.]?\s*(Ducada|Ducooyinka|Ducda|Adkaarta|Fadliga|Faafinta)/)
    }
  })
  it('has the Somali meaning for 262 adhkar (the 5 Quran passages are not translated in the book)', () => {
    const missing = hisn.chapters.flatMap((c) => c.items).filter((d) => !d.so).map((d) => d.n).sort((a, b) => a - b)
    expect(missing).toEqual([4, 75, 76, 100, 101])
  })
})
