// Verifies a Firebase Authentication ID token (a JWT signed by Google with RS256).
// Checks: signature against Google's published keys, issuer, audience, times, and a verified email.

export interface FirebaseUser {
  uid: string
  name: string
  email: string
  kind: 'google' | 'email'
}

type Jwk = JsonWebKey & { kid?: string }

const KEYS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
let cache: { keys: Jwk[]; until: number } | null = null

/** Firebase's current signing keys (cached for the time Google says, max 6 hours). */
export async function firebaseKeys(fetcher: typeof fetch = fetch): Promise<Jwk[]> {
  if (cache && cache.until > Date.now()) return cache.keys
  const res = await fetcher(KEYS_URL)
  if (!res.ok) throw new Error('firebase-keys')
  const { keys } = (await res.json()) as { keys: Jwk[] }
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600)
  cache = { keys, until: Date.now() + Math.min(maxAge, 21600) * 1000 }
  return keys
}

function b64urlBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const b64urlJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)))

/** Claim checks, separated so they can be tested without a signature. */
export function checkClaims(p: Record<string, unknown>, projectId: string, nowSec = Math.floor(Date.now() / 1000)): FirebaseUser {
  if (!projectId || p.aud !== projectId) throw new Error('audience')
  if (p.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('issuer')
  if (typeof p.exp !== 'number' || p.exp <= nowSec - 30) throw new Error('expired')
  if (typeof p.iat !== 'number' || p.iat > nowSec + 300) throw new Error('issued')
  if (typeof p.auth_time !== 'number' || p.auth_time > nowSec + 300) throw new Error('auth-time')
  if (typeof p.sub !== 'string' || !p.sub || p.sub.length > 128) throw new Error('subject')
  if (typeof p.email !== 'string' || !p.email) throw new Error('email')
  if (p.email_verified !== true) throw new Error('email-not-verified')

  const provider = (p.firebase as { sign_in_provider?: unknown } | undefined)?.sign_in_provider
  if (provider !== 'password' && provider !== 'google.com') throw new Error('provider')
  const name = (typeof p.name === 'string' && p.name.trim()) || p.email.split('@')[0]
  return { uid: p.sub, name: name.slice(0, 60), email: p.email.slice(0, 254), kind: provider === 'google.com' ? 'google' : 'email' }
}

export async function verifyFirebaseToken(token: string, projectId: string, keys: Jwk[], nowSec?: number): Promise<FirebaseUser> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('format')
  const header = b64urlJson(parts[0]) as { alg?: string; kid?: string }
  if (header.alg !== 'RS256') throw new Error('alg')
  const jwk = keys.find((k) => k.kid === header.kid)
  if (!jwk) throw new Error('kid')
  const key = await crypto.subtle.importKey('jwk', { ...jwk, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  if (!ok) throw new Error('signature')
  return checkClaims(b64urlJson(parts[1]), projectId, nowSec)
}
