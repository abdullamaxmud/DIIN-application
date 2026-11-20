import { useEffect, useRef } from 'react'
import { useLocation as useRoute } from 'react-router-dom'
import { ApiError, apiConfigured, isInstalled, platform } from '../lib/api'
import { registerGuest, useAccount } from '../lib/account'
import { isSubscribed } from '../lib/push'
import { onLocalChange, setItem } from '../lib/store'
import { syncWith } from '../lib/sync'
import { featureFor, ping } from '../lib/track'

/**
 * Background work with no UI:
 *  - counts today's visit and the sections used (anonymous statistics)
 *  - saves the user's progress to their account a few seconds after it changes,
 *    when the app goes to the background, and takes newer progress back when it returns
 */
export function AppServices() {
  const [acc] = useAccount()
  const { pathname, search } = useRoute()
  const accRef = useRef(acc)
  accRef.current = acc

  // statistics: after the screen has settled, so it never slows the first paint
  useEffect(() => {
    const id = window.setTimeout(() => void ping(featureFor(pathname, search)), 2500)
    return () => window.clearTimeout(id)
  }, [pathname, search])

  const signedIn = !!acc
  useEffect(() => {
    if (!signedIn || !apiConfigured()) return
    let pending = new Set<string>()
    let timer: number | undefined

    const run = async (only?: Set<string>, keepalive = false) => {
      let a = accRef.current
      if (!a) return
      try {
        if (!a.token && a.kind === 'guest') { a = await registerGuest(a); only = undefined }
        if (!a.token) return
        const extras = { zone: Intl.DateTimeFormat().resolvedOptions().timeZone, platform: platform(), installed: isInstalled(), push: await isSubscribed() }
        const reply = await syncWith(a.token, extras, only, keepalive)
        if (reply.user.name !== a.name) await setItem('account', { ...a, name: reply.user.name })
      } catch (e) {
        // the session no longer exists on the server (e.g. account deleted elsewhere)
        if (e instanceof ApiError && e.status === 401) await setItem('account', { ...a, token: null, id: a.kind === 'guest' ? null : a.id })
        else if (only) only.forEach((k) => pending.add(k)) // offline: retry with the next change
      }
    }

    void run()
    const flush = (keepalive = false) => {
      window.clearTimeout(timer)
      if (!pending.size) return
      const only = pending
      pending = new Set()
      void run(only, keepalive)
    }
    const off = onLocalChange((key) => {
      pending.add(key)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => flush(), 3000)
    })
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush(true)
      else void run()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      off()
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [signedIn, acc?.token, acc?.kind])

  return null
}
