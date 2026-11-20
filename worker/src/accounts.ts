// Input checks for accounts, progress sync and visit statistics (pure functions, unit-tested).
import { FEATURES, isSyncKey, type Feature } from '../../src/lib/syncKeys'

export const MAX_ITEM = 32 * 1024
export const MAX_TOTAL = 200 * 1024

/** A random device id from the app: lowercase letters, digits and dashes. */
export const validDevice = (d: unknown): d is string => typeof d === 'string' && /^[a-z0-9-]{16,64}$/.test(d)

export function cleanPlatform(p: unknown): 'android' | 'ios' | 'desktop' | null {
  return p === 'android' || p === 'ios' || p === 'desktop' ? p : null
}

export function cleanFeatures(f: unknown): Feature[] {
  if (!Array.isArray(f)) return []
  return [...new Set(f.filter((x): x is Feature => (FEATURES as readonly unknown[]).includes(x)))]
}

/** A display name typed by a guest: trimmed, single spaces, no control characters, 1–40 characters. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  // eslint-disable-next-line no-control-regex
  const s = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim()
  return s.length >= 1 && s.length <= 40 ? s : null
}

export interface CleanItem { value: string; t: number }

/**
 * Progress items sent by the app: { "wird.done": { v: …, t: 1700000000000 }, … }.
 * Unknown keys, bad times and oversized values are dropped; returns null if the whole payload is too big.
 */
export function cleanItems(raw: unknown, now = Date.now()): Record<string, CleanItem> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, CleanItem> = {}
  let total = 0
  for (const [key, item] of Object.entries(raw as Record<string, unknown>)) {
    if (!isSyncKey(key) || !item || typeof item !== 'object') continue
    const { v, t } = item as { v?: unknown; t?: unknown }
    if (typeof t !== 'number' || !Number.isFinite(t) || t <= 0 || t > now + 86_400_000) continue
    if (v === undefined) continue
    const value = JSON.stringify(v)
    if (value.length > MAX_ITEM) continue
    total += value.length
    if (total > MAX_TOTAL) return null
    out[key] = { value, t: Math.round(t) }
  }
  return out
}

/** 32 random bytes as hex — the session token given to the app (only its hash is stored). */
export function newToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Random id for a guest account. */
export const newGuestId = () => 'd:' + newToken().slice(0, 24)

/** Compare two equal-length hex strings without leaking where they differ. */
export function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
