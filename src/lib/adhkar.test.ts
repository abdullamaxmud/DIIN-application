import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { HisnData } from './data'
import { adhkarTimeFor, CATEGORY_SO, GROUPS, itemsFor } from './adhkar'

const h: HisnData = JSON.parse(readFileSync('data/hisn.json', 'utf8'))

describe('adhkar categories', () => {
  it('splits morning/evening by the book’s own markers', () => {
    const subax = itemsFor(h, 'subax').map((i) => i.n)
    const fiid = itemsFor(h, 'fiid').map((i) => i.n)
    expect(subax).toHaveLength(23)
    expect(fiid).toHaveLength(21)
    expect(subax).not.toContain(97) // "إذا أمسى" only
    for (const n of [93, 94, 95]) expect(fiid).not.toContain(n) // "إذا أصبح" only
  })
  it('picks morning from Fajr until Asr and evening from Asr until Fajr', () => {
    const today = { fajr: new Date('2026-11-18T01:25:00Z'), asr: new Date('2026-11-18T12:00:00Z') }
    expect(adhkarTimeFor(new Date('2026-11-18T01:24:00Z'), today)).toBe('fiid')  // just before Fajr
    expect(adhkarTimeFor(new Date('2026-11-18T01:25:00Z'), today)).toBe('subax') // Fajr
    expect(adhkarTimeFor(new Date('2026-11-18T09:00:00Z'), today)).toBe('subax') // late morning
    expect(adhkarTimeFor(new Date('2026-11-18T12:00:00Z'), today)).toBe('fiid')  // Asr
    expect(adhkarTimeFor(new Date('2026-11-18T20:00:00Z'), today)).toBe('fiid')  // night
  })
  it('without GPS uses 04:00–15:00 for morning', () => {
    expect(adhkarTimeFor(new Date(2026, 10, 18, 3, 59))).toBe('fiid')
    expect(adhkarTimeFor(new Date(2026, 10, 18, 4, 0))).toBe('subax')
    expect(adhkarTimeFor(new Date(2026, 10, 18, 14, 59))).toBe('subax')
    expect(adhkarTimeFor(new Date(2026, 10, 18, 15, 0))).toBe('fiid')
  })
  it('every grouped chapter exists and has a Somali label', () => {
    for (const [, ids] of GROUPS) {
      for (const id of ids) {
        expect(itemsFor(h, String(id)).length).toBeGreaterThan(0)
        expect(CATEGORY_SO[id]).toBeTruthy()
      }
    }
  })
})
