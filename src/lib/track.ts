import { api, apiConfigured, deviceId, isInstalled, platform } from './api'
import { todayISO } from './day'
import type { Feature } from './syncKeys'

// Anonymous app statistics for the admin dashboard: which device opened the app today, whether it is
// installed, and which sections were used. At most one request per new section per day.

/** Section of the app for a URL path (+ ?tab= on the Quran screen). */
export function featureFor(pathname: string, search = ''): Feature | null {
  if (pathname.startsWith('/quraanka')) {
    const tab = new URLSearchParams(search).get('tab')
    return tab === 'dhageyso' ? 'listen' : tab === 'akhri' ? 'quran' : 'khatma'
  }
  if (pathname.startsWith('/adkaarta')) return 'adhkar'
  if (pathname.startsWith('/salaadda')) return 'prayer'
  if (pathname.startsWith('/khatmiga')) return 'khatma'
  return null
}

const KEY = 'diin.pinged'

function seenToday(): { day: string; f: string[] } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && v.day === todayISO() && Array.isArray(v.f)) return v
  } catch { /* ignore */ }
  return { day: '', f: [] }
}

/** Count today's visit (first call of the day) and the section, if not counted yet today. */
export async function ping(feature: Feature | null, force = false) {
  if (!apiConfigured()) return
  const seen = seenToday()
  const isNewDay = seen.day !== todayISO()
  const isNewFeature = !!feature && !seen.f.includes(feature)
  if (!force && !isNewDay && !isNewFeature) return
  const features = feature && isNewFeature ? [feature] : []
  try {
    await api('/api/ping', { device: deviceId(), platform: platform(), installed: isInstalled(), features })
    localStorage.setItem(KEY, JSON.stringify({ day: todayISO(), f: [...(isNewDay ? [] : seen.f), ...features] }))
  } catch { /* offline: counted next time */ }
}

if (typeof window !== 'undefined') {
  window.addEventListener('appinstalled', () => {
    try { localStorage.setItem('diin.installed', '1') } catch { /* ignore */ }
    void ping(null, true)
  })
}
