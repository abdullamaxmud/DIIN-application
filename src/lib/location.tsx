import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// Location is GPS-only by design (product decision): there is no manual city picker.
// Prayer times appear only once a real fix is available, and the app re-tries on its own
// when the user turns location on (permission change or returning to the app).

export interface Fix {
  lat: number
  lng: number
  zone: string
  at: number
}

export type LocStatus = 'idle' | 'searching' | 'ready' | 'denied' | 'unsupported'

interface LocationCtx {
  fix: Fix | null
  status: LocStatus
  request: () => void
}

const Ctx = createContext<LocationCtx>({ fix: null, status: 'idle', request: () => {} })

const LAST_KEY = 'diin.lastFix'

/** Distance in km between two coordinates (for deciding whether a fix moved far enough to matter). */
function kmBetween(a: Fix, b: Fix) {
  const R = 6371, r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [fix, setFix] = useState<Fix | null>(null)
  const [status, setStatus] = useState<LocStatus>(() => ('geolocation' in navigator ? 'idle' : 'unsupported'))
  const busy = useRef(false)

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) { setStatus('unsupported'); return }
    if (busy.current) return
    busy.current = true
    setStatus('searching')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        busy.current = false
        const next: Fix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          at: Date.now(),
        }
        setFix((prev) => (prev && prev.zone === next.zone && kmBetween(prev, next) < 1 ? prev : next))
        setStatus('ready')
        try { localStorage.setItem(LAST_KEY, JSON.stringify(next)) } catch { /* storage may be unavailable */ }
      },
      () => {
        busy.current = false
        setStatus((s) => (s === 'ready' ? s : 'denied'))
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  useEffect(() => {
    let perm: PermissionStatus | null = null
    // if location was already allowed, connect silently on every open
    navigator.permissions?.query({ name: 'geolocation' }).then(
      (p) => {
        perm = p
        if (p.state === 'granted') request()
        p.onchange = () => {
          if (p.state === 'granted') request()
          else if (p.state === 'denied') { setFix(null); setStatus('denied') }
        }
      },
      () => {},
    )
    // coming back to the app (e.g. after switching location on in Settings) retries automatically
    const onVisible = () => { if (document.visibilityState === 'visible') request() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (perm) perm.onchange = null
    }
  }, [request])

  return <Ctx.Provider value={{ fix, status, request }}>{children}</Ctx.Provider>
}

export const useLocation = () => useContext(Ctx)
