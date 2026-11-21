import { api } from './api'
import { getItem, getStamps, setItem } from './store'
import { SYNC_KEYS, type SyncKey } from './syncKeys'

/** key -> { value, time it changed } */
export type Items = Partial<Record<SyncKey, { v: unknown; t: number }>>

const MISSING = Symbol('missing')

/** This device's synced values. Values saved before syncing existed get time 1, so any server copy wins. */
export async function collectLocal(only?: Iterable<string>): Promise<Items> {
  const stamps = await getStamps()
  const keys = only ? SYNC_KEYS.filter((k) => new Set(only).has(k)) : SYNC_KEYS
  const out: Items = {}
  for (const key of keys) {
    const v = await getItem<unknown>(key, MISSING)
    if (v !== MISSING) out[key] = { v, t: stamps[key] ?? 1 }
  }
  return out
}

/** Take every server value that is newer than this device's copy. */
export async function applyServerItems(items: Items | undefined) {
  if (!items) return
  const stamps = await getStamps()
  for (const key of SYNC_KEYS) {
    const it = items[key]
    if (it && typeof it.t === 'number' && it.t > (stamps[key] ?? 0)) await setItem(key, it.v, { t: it.t })
  }
}

export interface SyncExtras { zone: string; platform: string; installed: boolean; push: boolean }

export interface SyncReply {
  user: { id: string; kind: 'google' | 'email' | 'guest'; name: string; email: string | null }
  items: Items
}

/** Send local changes (all keys, or just `only`) and take newer server values back. */
export async function syncWith(token: string, extras: SyncExtras, only?: Iterable<string>, keepalive = false): Promise<SyncReply> {
  const reply = await api<SyncReply>('/api/sync', { items: await collectLocal(only), ...extras }, token, keepalive)
  await applyServerItems(reply.items)
  return reply
}
