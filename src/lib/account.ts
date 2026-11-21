import { api, ApiError, apiConfigured } from './api'
import { getItem, removeItems, setItem, useStored } from './store'
import { applyServerItems, type Items } from './sync'
import { SYNC_KEYS } from './syncKeys'

/**
 * The person using the app. New accounts are 'google' or 'email' (always a verified address).
 * 'guest' only exists for people who started before accounts were required.
 */
export interface Account {
  id: string | null
  kind: 'google' | 'email' | 'guest'
  name: string
  email: string | null
  token: string | null
}

export const firebaseConfigured = () =>
  !!import.meta.env.VITE_FIREBASE_API_KEY && !!import.meta.env.VITE_FIREBASE_APP_ID && apiConfigured()

export const useAccount = () => useStored<Account | null>('account', null)

/** Does this account have to go through the sign-in screen? (Old guests can still use the app offline.) */
export function needsSignIn(acc: Account | null, online = navigator.onLine) {
  if (!acc) return true
  if (acc.kind === 'guest') return online
  return !acc.token
}

interface LoginReply {
  token: string
  user: { id: string; kind: 'google' | 'email'; name: string; email: string | null }
  items: Items
}

export const loadAuth = () => import('./firebaseAuth')

/** Firebase has confirmed who this is: open a DIIN session and restore their saved progress. */
export async function completeSignIn(): Promise<Account> {
  const fb = await loadAuth()
  const prev = await getItem<Account | null>('account', null)
  const r = await api<LoginReply>('/api/auth/firebase', {
    idToken: await fb.freshIdToken(),
    guestToken: prev?.kind === 'guest' ? prev.token : undefined,
  })

  // another person signing in on this phone must not inherit the previous person's progress
  const owner = await getItem<string | null>('account.owner', null)
  if (owner && owner !== r.user.id && prev?.kind !== 'guest') await removeItems(SYNC_KEYS)

  await applyServerItems(r.items)
  await setItem('account.owner', r.user.id)
  const acc: Account = { id: r.user.id, kind: r.user.kind, name: r.user.name, email: r.user.email, token: r.token }
  await setItem('account', acc)
  return acc
}

/** Leaves the account on this phone. */
export async function signOut(acc: Account) {
  if (acc.token) await api('/api/auth/logout', {}, acc.token).catch(() => {})
  if (acc.kind !== 'guest' && firebaseConfigured()) {
    try { await (await loadAuth()).signOutFirebase() } catch { /* already signed out */ }
  }
  await setItem('account', null)
}

/**
 * Deletes the account, everything saved on the server and this phone's copy.
 * Firebase requires a recent login first, so email users may need to enter their password.
 */
export async function deleteAccount(acc: Account, password?: string) {
  const fb = acc.kind === 'guest' ? null : await loadAuth()
  if (fb) await fb.confirmIdentity(acc.kind as 'google' | 'email', acc.id, acc.email, password)

  if (acc.token) {
    try { await api('/api/me/delete', {}, acc.token) } catch (e) {
      // already gone on the server: fine
      if (!(e instanceof ApiError && e.status === 401)) throw e
    }
  }
  if (fb) await fb.deleteFirebaseUser()
  await removeItems([...SYNC_KEYS, 'account.owner'])
  await setItem('account', null)
}
