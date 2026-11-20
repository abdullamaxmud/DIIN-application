import { useEffect, useRef, useState } from 'react'
import { useLocation } from '../lib/location'
import { useStored } from '../lib/store'
import { isSubscribed, sync, useNotifyPrefs } from '../lib/push'
import { usePrayer } from '../lib/usePrayer'
import { PRAYERS, prayerName, type PrayerKey } from '../lib/prayer'
import type { Plan } from '../lib/khatma'

/**
 * 1) Keeps the push backend in sync when settings, location or the khatma plan change.
 * 2) In-app fallback: while the app is open, shows a reminder banner at each prayer time
 *    (works even without the push backend, e.g. on iPhone before installing to the Home Screen).
 */
export function NotifySync() {
  const { fix } = useLocation()
  const [prefs, , ready] = useNotifyPrefs()
  const [plan] = useStored<Plan | null>('khatma.plan', null)
  const state = usePrayer()
  const [banner, setBanner] = useState<string | null>(null)
  const shown = useRef(new Set<string>())

  useEffect(() => {
    if (!ready) return
    const id = window.setTimeout(() => {
      isSubscribed().then((on) => { if (on) sync(prefs, fix).catch(() => {}) })
    }, 1500)
    return () => window.clearTimeout(id)
  }, [prefs, fix, plan, ready])

  useEffect(() => {
    if (!state) return
    const now = Date.now()
    for (const p of PRAYERS) {
      if (!p.isPrayer || !prefs.prayers[p.key as keyof typeof prefs.prayers]) continue
      const at = state.today[p.key as PrayerKey].getTime()
      const key = `${p.key}:${new Date(at).toDateString()}`
      if (now >= at && now - at < 60_000 && !shown.current.has(key)) {
        shown.current.add(key)
        setBanner(`Waa waqtigii salaadda ${prayerName(p.key)} 🕌`)
        window.setTimeout(() => setBanner(null), 15_000)
      }
    }
  }, [state, prefs])

  if (!banner) return null
  return (
    <div role="alert" className="fixed inset-x-0 top-3 z-50 mx-auto max-w-[440px] px-3">
      <button type="button" onClick={() => setBanner(null)} className="night flex w-full items-center gap-3 rounded-2xl border border-gold/40 px-4 py-3 text-left shadow-[var(--shadow-float)]">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gold text-night">🕌</span>
        <span className="flex-1 text-sm font-bold">{banner}</span>
        <span aria-hidden="true" className="text-mist">✕</span>
      </button>
    </div>
  )
}
