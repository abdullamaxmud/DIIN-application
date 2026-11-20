import { api, ApiError, apiConfigured } from './api'
import { setItem, useStored } from './store'
import { applyServerItems, type Items } from './sync'

/** The person using the app. `token` is null for a guest whose registration has not reached the server yet. */
export interface Account {
  id: string | null
  kind: 'google' | 'guest'
  name: string
  email: string | null
  token: string | null
}

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
export const googleConfigured = () => !!GOOGLE_CLIENT_ID && apiConfigured()

export const useAccount = () => useStored<Account | null>('account', null)

interface LoginReply {
  token: string
  user: { id: string; kind: 'google' | 'guest'; name: string; email: string | null }
  items: Items
}

const fromReply = (r: LoginReply): Account => ({ id: r.user.id, kind: r.user.kind, name: r.user.name, email: r.user.email, token: r.token })

/** Guest: just a name. Works offline too — the server registration is retried later by the sync. */
export async function loginGuest(name: string): Promise<Account> {
  let acc: Account = { id: null, kind: 'guest', name, email: null, token: null }
  if (apiConfigured()) {
    try { acc = fromReply(await api<LoginReply>('/api/auth/guest', { name })) } catch { /* offline: keep local guest */ }
  }
  await setItem('account', acc)
  return acc
}

/** Google: `credential` is the ID token from Google's sign-in button. Restores progress saved earlier. */
export async function loginGoogle(credential: string): Promise<Account> {
  const r = await api<LoginReply>('/api/auth/google', { credential })
  await applyServerItems(r.items)
  const acc = fromReply(r)
  await setItem('account', acc)
  return acc
}

/** Register a guest that was created offline (called by the sync). */
export async function registerGuest(acc: Account): Promise<Account> {
  const r = await api<LoginReply>('/api/auth/guest', { name: acc.name })
  const next = fromReply(r)
  await setItem('account', next)
  return next
}

/** Leaves the account on this phone; progress stays on the device. */
export async function signOut(acc: Account) {
  if (acc.token) await api('/api/auth/logout', {}, acc.token).catch(() => {})
  await setItem('account', null)
}

/** Deletes the account and everything saved on the server. */
export async function deleteAccount(acc: Account) {
  if (acc.token) {
    try { await api('/api/me/delete', {}, acc.token) } catch (e) {
      // already gone on the server: fine
      if (!(e instanceof ApiError && e.status === 401)) throw e
    }
  }
  await setItem('account', null)
}
