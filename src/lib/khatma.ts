import type { QuranData } from './data'
import { todayISO } from './day'

// ---------------- monthly wird (30 days = 1 juz a day) ----------------

/** juz number -> ISO date it was marked read (0/absent = not read) */
export type WirdDone = Record<number, string | 0>

/** Today's portion is the first juz not yet marked (1..30). */
export function wirdToday(done: WirdDone): number {
  let n = 1
  while (n < 30 && done[n]) n++
  return n
}

export const wirdCount = (done: WirdDone) => Object.values(done).filter(Boolean).length

/** Consecutive calendar days (ending today, or yesterday if nothing yet today) with at least one completion. */
export function streak(dates: Iterable<string | 0 | undefined>, today = new Date()): number {
  const set = new Set([...dates].filter((d): d is string => typeof d === 'string' && d.length > 0))
  const cur = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (!set.has(todayISO(cur))) cur.setDate(cur.getDate() - 1)
  let n = 0
  while (set.has(todayISO(cur))) { n++; cur.setDate(cur.getDate() - 1) }
  return n
}

// ---------------- custom khatma plan (N days, page based) ----------------

export interface Plan {
  days: number
  /** ISO start date */
  start: string
  /** first page of this plan (1 normally; later after a redistribution) */
  from: number
  /** day index -> ISO date completed */
  done: Record<number, string | 0>
  /** reminder minute of day, e.g. 330 = 05:30 */
  remind: number
  history: string[]
}

export const TOTAL_PAGES = 604
export const PRESETS = [7, 10, 15, 30, 60]

export function newPlan(days: number, start = todayISO(), remind = 330, history: string[] = []): Plan {
  return { days, start, from: 1, done: {}, remind, history }
}

/** Pages of day i (1-based): the remaining pages split as evenly as possible, no gaps or overlaps. */
export function dayRange(plan: Pick<Plan, 'days' | 'from'>, i: number): [number, number] {
  const total = TOTAL_PAGES - plan.from + 1
  const a = plan.from + Math.floor(((i - 1) * total) / plan.days)
  const b = plan.from + Math.floor((i * total) / plan.days) - 1
  return [a, b]
}

/** First day not yet completed. */
export function currentDay(plan: Plan): number {
  let i = 1
  while (i < plan.days && plan.done[i]) i++
  return i
}

export const isFinished = (plan: Plan) => !!plan.done[plan.days]

/** Calendar days since the plan started (day 1 = start date). */
export function elapsedDays(plan: Plan, today = new Date()): number {
  const [y, m, d] = plan.start.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((t.getTime() - start.getTime()) / 86400000) + 1
}

/** True when the calendar is ahead of the reading (a day was missed). */
export function isBehind(plan: Plan, today = new Date()): boolean {
  const e = elapsedDays(plan, today)
  return !isFinished(plan) && e > currentDay(plan) && e <= plan.days
}

/**
 * Spread what is left over the days that are left, keeping the original finish date.
 * Returns a fresh plan starting today from the first unread page.
 */
export function redistribute(plan: Plan, today = new Date()): Plan {
  const from = dayRange(plan, currentDay(plan))[0]
  const daysLeft = Math.max(1, plan.days - elapsedDays(plan, today) + 1)
  return { ...plan, days: daysLeft, start: todayISO(today), from, done: {} }
}

export function markDay(plan: Plan, i: number, today = new Date(), finishLabel?: (p: Plan) => string): Plan {
  const done: Plan['done'] = { ...plan.done, [i]: plan.done[i] ? 0 : todayISO(today) }
  const next: Plan = { ...plan, done }
  if (done[plan.days] && !plan.done[plan.days] && finishLabel) next.history = [...plan.history, finishLabel(plan)]
  return next
}

/** Daily amount for N days, e.g. 30 -> 1 juz · 2 xisbi · ~21 bog */
export function dailyAmount(days: number) {
  const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
  return { juz: f(30 / days), hizb: f(60 / days), pages: Math.ceil(TOTAL_PAGES / days) }
}

// ---------------- pages -> exact ayahs ----------------

/** Juz containing a page. */
export function juzOfPage(q: QuranData, page: number): number {
  let j = 1
  while (j < 30 && q.juz[j].page <= page) j++
  return j
}

/** First ayah printed on a page: "Hud 6". */
export function pageStart(q: QuranData, page: number): string {
  for (const s of q.surahs) {
    const i = s.p.indexOf(page)
    if (i >= 0) return `${s.name} ${i + 1}`
  }
  return ''
}

/** Last ayah printed on a page: "Yusuf 52". */
export function pageEnd(q: QuranData, page: number): string {
  for (let k = q.surahs.length - 1; k >= 0; k--) {
    const s = q.surahs[k]
    const i = s.p.lastIndexOf(page)
    if (i >= 0) return `${s.name} ${i + 1}`
  }
  return ''
}
