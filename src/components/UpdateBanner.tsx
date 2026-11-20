import { useEffect, useState } from 'react'
import { t } from '../i18n'

/**
 * "A new version of DIIN is ready — tap to update".
 * The service worker (src/sw.ts) installs new versions in the background and takes over at once;
 * the open screen keeps running the old code until it reloads, so we offer that reload here.
 * Also checks for a new version whenever the app comes back to the foreground.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const sw = navigator.serviceWorker
    // the very first install also "changes controller" — that is not an update
    let hadController = !!sw.controller
    const onChange = () => {
      if (hadController) setReady(true)
      hadController = true
    }
    sw.addEventListener('controllerchange', onChange)

    const check = () => {
      if (document.visibilityState !== 'visible') return
      sw.getRegistration().then((reg) => reg?.update()).catch(() => { /* offline */ })
    }
    document.addEventListener('visibilitychange', check)
    const id = window.setInterval(check, 30 * 60_000) // long-open app: look again every 30 min
    return () => {
      sw.removeEventListener('controllerchange', onChange)
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(id)
    }
  }, [])

  if (!ready) return null
  return (
    <div className="fixed inset-x-0 bottom-[92px] z-50 mx-auto max-w-[440px] px-3" role="status" aria-live="polite">
      <div className="night flex items-center gap-3 rounded-2xl border border-gold/45 py-2.5 pr-2.5 pl-3.5 shadow-[var(--shadow-float)]">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gold text-night" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
        </span>
        <span className="min-w-0 flex-1 text-[13px] leading-snug font-bold text-ivory">{t('update.ready')}</span>
        <button type="button" onClick={() => window.location.reload()} className="h-10 flex-none rounded-xl bg-gold px-3.5 text-[13px] font-extrabold text-night">
          {t('update.action')}
        </button>
        <button type="button" onClick={() => setReady(false)} aria-label={t('update.later')} className="flex h-10 w-8 flex-none items-center justify-center text-mist">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
    </div>
  )
}
