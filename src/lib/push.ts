import { useStored, getItem } from './store'
import type { Plan } from './khatma'
import type { Fix } from './location'

// Web Push client. The backend is the Cloudflare Worker in /worker.
// Configure at build time (see README):  VITE_PUSH_API=https://diin-push.<you>.workers.dev
//                                         VITE_VAPID_PUBLIC_KEY=<public key from `npx @pushforge/builder vapid`>
export const PUSH_API = (import.meta.env.VITE_PUSH_API as string | undefined)?.replace(/\/$/, '') ?? ''
export const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''
export const pushConfigured = () => !!PUSH_API && !!VAPID_PUBLIC

export type FivePrayers = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

export interface NotifyPrefs {
  prayers: Record<FivePrayers, boolean>
  morning: boolean
  evening: boolean
  morningOffset: number
  eveningOffset: number
  khatma: boolean
}

export const DEFAULT_PREFS: NotifyPrefs = {
  prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  morning: true,
  evening: true,
  morningOffset: 30,
  eveningOffset: 15,
  khatma: true,
}

export const useNotifyPrefs = () => useStored<NotifyPrefs>('notify.prefs', DEFAULT_PREFS)

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

function keyBytes(base64url: string) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function isSubscribed() {
  if (!pushSupported()) return false
  try { return !!(await currentSubscription()) } catch { return false }
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${PUSH_API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json()
}

/** Settings as the server expects them (see worker/src/schedule.ts Prefs). */
async function serverPrefs(p: NotifyPrefs) {
  const plan = await getItem<Plan | null>('khatma.plan', null)
  return {
    prayers: p.prayers,
    morning: p.morning,
    evening: p.evening,
    morningOffset: p.morningOffset,
    eveningOffset: p.eveningOffset,
    khatma: plan ? { on: p.khatma, minute: plan.remind, days: plan.days, start: plan.start, from: plan.from } : null,
  }
}

/** Ask permission, subscribe this browser and register it with the backend. */
export async function subscribe(prefs: NotifyPrefs, fix: Fix | null): Promise<'ok' | 'denied' | 'unsupported' | 'not-configured'> {
  if (!pushSupported()) return 'unsupported'
  if (!pushConfigured()) return 'not-configured'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) }))
  await sync(prefs, fix, sub)
  return 'ok'
}

/** Push the latest settings / location to the backend (called when they change). */
export async function sync(prefs: NotifyPrefs, fix: Fix | null, sub?: PushSubscription | null) {
  if (!pushConfigured()) return
  const s = sub ?? (await currentSubscription())
  if (!s) return
  await post('/api/subscribe', {
    subscription: s.toJSON(),
    prefs: await serverPrefs(prefs),
    lat: fix?.lat ?? null,
    lng: fix?.lng ?? null,
    zone: fix?.zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}

export async function unsubscribe() {
  const s = await currentSubscription()
  if (!s) return
  if (pushConfigured()) await post('/api/unsubscribe', { subscription: s.toJSON() }).catch(() => {})
  await s.unsubscribe()
}

export async function sendTest() {
  const s = await currentSubscription()
  if (!s) throw new Error('not-subscribed')
  return post('/api/test', { subscription: s.toJSON() })
}
