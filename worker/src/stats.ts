// Turns a user's saved progress into the short summary shown in the admin dashboard.
import { currentDay, isFinished, streak, wirdCount, type Plan, type WirdDone } from '../../src/lib/khatma'
import { dateInZone } from '../../src/lib/prayer'
import { todayISO } from '../../src/lib/day'

export interface ProgressSummary {
  /** juz marked read in the 30-juz monthly wird */
  wird: number
  /** consecutive days with a wird juz marked */
  wirdStreak: number
  /** custom khatma plan: current day of total days (null = no plan) */
  plan: { day: number; days: number; finished: boolean } | null
  /** adhkar categories finished today in the user's own time zone */
  adhkarToday: string[]
  lastRead: { name: string; a: number; page: number } | null
}

const parse = (s: string | undefined) => {
  if (s === undefined) return undefined
  try { return JSON.parse(s) } catch { return undefined }
}

/** `values`: stored key -> JSON text, as kept in the progress table. */
export function summarize(values: Record<string, string>, zone: string | null, now = new Date()): ProgressSummary {
  let local: Date
  try {
    const ymd = dateInZone(now, zone || 'UTC')
    local = new Date(ymd.y, ymd.m - 1, ymd.d)
  } catch {
    local = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  }

  const wird = (parse(values['wird.done']) ?? {}) as WirdDone
  const plan = parse(values['khatma.plan']) as Plan | null | undefined
  const adhkar = parse(values['adhkar.done']) as { day?: string; cats?: Record<string, true> } | undefined
  const last = parse(values['quran.last']) as { name?: string; a?: number; page?: number } | null | undefined

  const validPlan = plan && typeof plan.days === 'number' && plan.done && typeof plan.done === 'object'
  return {
    wird: wirdCount(wird),
    wirdStreak: streak(Object.values(wird), local),
    plan: validPlan ? { day: Math.min(currentDay(plan), plan.days), days: plan.days, finished: isFinished(plan) } : null,
    adhkarToday: adhkar?.day === todayISO(local) && adhkar.cats ? Object.keys(adhkar.cats) : [],
    lastRead: last && typeof last.name === 'string' ? { name: last.name, a: Number(last.a) || 1, page: Number(last.page) || 1 } : null,
  }
}
