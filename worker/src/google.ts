// Verifies a "Sign in with Google" ID token (a JWT signed by Google with RS256).
// Checks: signature against Google's published keys, issuer, audience (our client id) and expiry.

export interface GoogleUser {
  sub: string
  name: string
  email: string | null
}

type Jwk = JsonWebKey & { kid?: string }

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
let cache: { keys: Jwk[]; until: number } | null = null

/** Google's current signing keys (cached for the time Google says, max 6 hours). */
export async function googleKeys(fetcher: typeof fetch = fetch): Promise<Jwk[]> {
  if (cache && cache.until > Date.now()) return cache.keys
  const res = await fetcher(CERTS_URL)
  if (!res.ok) throw new Error('google-certs')
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
export function checkClaims(p: Record<string, unknown>, clientId: string, nowSec = Math.floor(Date.now() / 1000)): GoogleUser {
  if (p.iss !== 'accounts.google.com' && p.iss !== 'https://accounts.google.com') throw new Error('issuer')
  if (!clientId || p.aud !== clientId) throw new Error('audience')
  if (typeof p.exp !== 'number' || p.exp < nowSec - 60) throw new Error('expired')
  if (typeof p.sub !== 'string' || !p.sub) throw new Error('subject')
  const email = typeof p.email === 'string' && p.email_verified !== false ? p.email : null
  const name = (typeof p.name === 'string' && p.name.trim()) || (email ? email.split('@')[0] : 'Isticmaale')
  return { sub: p.sub, name: name.slice(0, 60), email }
}

export async function verifyGoogleToken(token: string, clientId: string, keys: Jwk[], nowSec?: number): Promise<GoogleUser> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('format')
  const header = b64urlJson(parts[0]) as { alg?: string; kid?: string }
  if (header.alg !== 'RS256') throw new Error('alg')
  const jwk = keys.find((k) => k.kid === header.kid)
  if (!jwk) throw new Error('kid')
  const key = await crypto.subtle.importKey('jwk', { ...jwk, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  if (!ok) throw new Error('signature')
  return checkClaims(b64urlJson(parts[1]), clientId, nowSec)
}
