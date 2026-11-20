import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { QuranData } from './data'
import {
  TOTAL_PAGES, currentDay, dailyAmount, dayRange, elapsedDays, isBehind, isFinished, juzOfPage, markDay,
  newPlan, pageEnd, pageStart, redistribute, streak, wirdCount, wirdToday,
} from './khatma'

const q: QuranData = JSON.parse(readFileSync('data/quran.json', 'utf8'))
const d = (s: string) => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd) }

describe('khatma calculation', () => {
  it.each([7, 10, 15, 30, 45, 60, 1, 365])('%i days cover pages 1..604 exactly once', (days) => {
    const plan = newPlan(days, '2026-11-20')
    let expected = 1
    for (let i = 1; i <= days; i++) {
      const [a, b] = dayRange(plan, i)
      expect(a).toBe(expected)
      if (days <= TOTAL_PAGES) expect(b).toBeGreaterThanOrEqual(a)
      expected = b + 1
    }
    expect(expected - 1).toBe(TOTAL_PAGES)
  })

  it('daily amounts for the presets', () => {
    expect(dailyAmount(30)).toEqual({ juz: '1', hizb: '2', pages: 21 })
    expect(dailyAmount(7)).toEqual({ juz: '4.3', hizb: '8.6', pages: 87 })
    expect(dailyAmount(60)).toEqual({ juz: '0.5', hizb: '1', pages: 11 })
  })

  it('tracks the current day and finishing', () => {
    let plan = newPlan(3, '2026-11-20')
    expect(currentDay(plan)).toBe(1)
    plan = markDay(plan, 1, d('2026-11-20'))
    plan = markDay(plan, 2, d('2026-11-21'))
    expect(currentDay(plan)).toBe(3)
    plan = markDay(plan, 3, d('2026-11-22'), () => '3 maalmood')
    expect(isFinished(plan)).toBe(true)
    expect(plan.history).toEqual(['3 maalmood'])
    // un-marking toggles back
    expect(markDay(plan, 3, d('2026-11-22')).done[3]).toBe(0)
  })

  it('detects a missed day and redistributes without moving the finish date', () => {
    const plan = newPlan(30, '2026-11-01')
    const today = d('2026-11-10') // day 10 of the calendar, nothing read yet
    expect(elapsedDays(plan, today)).toBe(10)
    expect(isBehind(plan, today)).toBe(true)
    const re = redistribute(plan, today)
    expect(re.days).toBe(21) // days 10..30 remain
    expect(re.from).toBe(1)
    expect(re.start).toBe('2026-11-10')
    // finish date unchanged: 1 Nov + 29 = 30 Nov; 10 Nov + 20 = 30 Nov
    expect(dayRange(re, re.days)[1]).toBe(604)
    expect(isBehind(re, today)).toBe(false)
  })

  it('maps pages to exact ayahs and juz', () => {
    expect(pageStart(q, 222)).toBe('Hud 6')
    expect(pageEnd(q, 241)).toBe('Yusuf 52')
    expect(pageStart(q, 1)).toBe('Al-Fatihah 1')
    expect(pageEnd(q, 604)).toBe('An-Nas 6')
    expect(juzOfPage(q, 222)).toBe(12)
    expect(juzOfPage(q, 221)).toBe(11)
    expect(juzOfPage(q, 604)).toBe(30)
  })
})

describe('monthly wird', () => {
  it('today is the first unread juz', () => {
    expect(wirdToday({})).toBe(1)
    expect(wirdToday({ 1: '2026-11-19', 2: '2026-11-20' })).toBe(3)
    expect(wirdCount({ 1: '2026-11-19', 2: 0, 3: '2026-11-20' })).toBe(2)
  })
  it('counts consecutive days, allowing today to be still open', () => {
    const today = d('2026-11-20')
    expect(streak(['2026-11-18', '2026-11-19', '2026-11-20'], today)).toBe(3)
    expect(streak(['2026-11-18', '2026-11-19'], today)).toBe(2) // not read yet today
    expect(streak(['2026-11-17', '2026-11-19'], today)).toBe(1)
    expect(streak([], today)).toBe(0)
  })
})
