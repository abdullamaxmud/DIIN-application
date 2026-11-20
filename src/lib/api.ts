import { PUSH_API } from './push'

// The DIIN server (Cloudflare Worker in /worker) also handles accounts, saved progress and statistics.
export const apiConfigured = () => !!PUSH_API

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

export async function api<T>(path: string, body: unknown, token?: string | null, keepalive = false): Promise<T> {
  if (!PUSH_API) throw new ApiError(0, 'not-configured')
  let res: Response
  try {
    res = await fetch(`${PUSH_API}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      keepalive,
    })
  } catch {
    throw new ApiError(0, 'offline')
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new ApiError(res.status, data?.error ?? String(res.status))
  return data
}

/** Random id for this phone/browser (no personal data); kept in localStorage. */
export function deviceId(): string {
  const make = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`).toLowerCase()
  try {
    let id = localStorage.getItem('diin.device')
    if (!id || !/^[a-z0-9-]{16,64}$/.test(id)) { id = make(); localStorage.setItem('diin.device', id) }
    return id
  } catch {
    return (memoryId ??= make())
  }
}
let memoryId: string | undefined

export function platform(): 'android' | 'ios' | 'desktop' {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

/** True when DIIN runs as an installed app (home-screen / APK), or was installed from this browser. */
export function isInstalled(): boolean {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return true
  try { return localStorage.getItem('diin.installed') === '1' } catch { return false }
}
