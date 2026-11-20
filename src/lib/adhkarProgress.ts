import { useEffect, useState } from 'react'
import { todayISO, useStored } from './store'
import { useLocation } from './location'
import { dateInZone, timesFor } from './prayer'
import { adhkarTimeFor } from './adhkar'

export type DoneToday = { day: string; cats: Record<string, true> }

/** Adhkar categories finished today (resets automatically the next day). */
export function useDoneToday() {
  const [done, setDone] = useStored<DoneToday>('adhkar.done', { day: todayISO(), cats: {} })
  const cats = done.day === todayISO() ? done.cats : {}
  const mark = (key: string) => setDone({ day: todayISO(), cats: { ...cats, [key]: true } })
  return { cats, mark }
}

/** 'subax' or 'fiid' for the current moment, re-checked every 30 s (uses real prayer times when GPS is on). */
export function useAdhkarTime(): 'subax' | 'fiid' {
  const { fix } = useLocation()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  const today = fix ? timesFor(fix.lat, fix.lng, fix.zone, dateInZone(now, fix.zone)) : null
  return adhkarTimeFor(now, today)
}
