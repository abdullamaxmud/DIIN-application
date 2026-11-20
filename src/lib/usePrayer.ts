import { useEffect, useState } from 'react'
import { useLocation } from './location'
import { prayerState, type PrayerState } from './prayer'

/** Live prayer state for the current GPS fix; re-computed every second (countdown). */
export function usePrayer(): PrayerState | null {
  const { fix } = useLocation()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  if (!fix) return null
  return prayerState(fix.lat, fix.lng, fix.zone, now)
}
