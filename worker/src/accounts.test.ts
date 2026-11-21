import { describe, expect, it } from 'vitest'
import { cleanFeatures, cleanItems, cleanPlatform, MAX_ITEM, sameHex, validDevice } from './accounts'
import { checkClaims, verifyFirebaseToken } from './firebase'
import { summarize } from './stats'

const b64url = (bytes: Uint8Array | string) => {
  const s = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('input cleaning', () => {
  it('accepts only real progress keys with sane times and sizes', () => {
    const now = 1_800_000_000_000
    const out = cleanItems({
      'wird.done': { v: { 1: '2026-11-20' }, t: now - 1000 },
      'quran.last': { v: { s: 18, a: 45 }, t: now },
      'evil.key': { v: 1, t: now },                          // unknown key
      'khatma.plan': { v: null, t: -5 },                      // bad time
      'adhkar.done': { v: 'x'.repeat(MAX_ITEM + 10), t: now }, // too big
      'audio.reciter': { t: now },                            // no value
    }, now)
    expect(Object.keys(out!).sort()).toEqual(['quran.last', 'wird.done'])
    expect(JSON.parse(out!['wird.done'].value)).toEqual({ 1: '2026-11-20' })
  })
  it('rejects a payload that is too large overall', () => {
    const big = 'x'.repeat(30_000)
    const items = Object.fromEntries(['wird.done', 'quran.last', 'quran.bookmark', 'khatma.plan', 'adhkar.done', 'notify.prefs', 'audio.reciter', 'quran.theme'].map((k) => [k, { v: big, t: 1 }]))
    expect(cleanItems(items)).toBeNull()
  })
  it('checks device ids, platforms and sections', () => {
    expect(validDevice('k3j4h5g6f7d8s9a0-x1')).toBe(true)
    expect(validDevice('short')).toBe(false)
    expect(validDevice("x'; DROP TABLE users;--xxxxxxxx")).toBe(false)
    expect(cleanPlatform('ios')).toBe('ios')
    expect(cleanPlatform('windows')).toBeNull()
    expect(cleanFeatures(['quran', 'quran', 'hack', 'prayer'])).toEqual(['quran', 'prayer'])
  })
  it('compares admin key hashes exactly', () => {
    expect(sameHex('abc123', 'abc123')).toBe(true)
    expect(sameHex('abc123', 'abc124')).toBe(false)
    expect(sameHex('abc', 'abc123')).toBe(false)
  })
})

describe('Firebase sign-in token', () => {
  const PROJECT = 'diin-test'
  const NOW = 1_900_000_000

  async function signedToken(claims: Record<string, unknown>, kid = 'k1') {
    const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as CryptoKeyPair
    const jwk = { ...((await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey), kid }
    const head = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }))
    const body = b64url(JSON.stringify(claims))
    const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(`${head}.${body}`)))
    return { token: `${head}.${body}.${b64url(sig)}`, keys: [jwk] }
  }
  const good = {
    iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: 'uid1', name: 'Cabdi Xasan', email: 'c@example.com',
    email_verified: true, iat: NOW - 10, auth_time: NOW - 10, exp: NOW + 3600, firebase: { sign_in_provider: 'password' },
  }

  it('accepts a correctly signed token with a verified email', async () => {
    const { token, keys } = await signedToken(good)
    expect(await verifyFirebaseToken(token, PROJECT, keys, NOW)).toEqual({ uid: 'uid1', name: 'Cabdi Xasan', email: 'c@example.com', kind: 'email' })
  })
  it('recognises Google sign-in', () => {
    expect(checkClaims({ ...good, firebase: { sign_in_provider: 'google.com' } }, PROJECT, NOW).kind).toBe('google')
  })
  it('refuses an email that has not been verified', async () => {
    const { token, keys } = await signedToken({ ...good, email_verified: false })
    await expect(verifyFirebaseToken(token, PROJECT, keys, NOW)).rejects.toThrow('email-not-verified')
  })
  it('rejects a token whose content was changed after signing', async () => {
    const { token, keys } = await signedToken({ ...good, email_verified: false })
    const [h, , s] = token.split('.')
    const forged = `${h}.${b64url(JSON.stringify(good))}.${s}`
    await expect(verifyFirebaseToken(forged, PROJECT, keys, NOW)).rejects.toThrow('signature')
  })
  it('rejects other projects, expired tokens, unknown keys and other providers', async () => {
    const { token, keys } = await signedToken(good)
    await expect(verifyFirebaseToken(token, 'other-project', keys, NOW)).rejects.toThrow('audience')
    await expect(verifyFirebaseToken(token, PROJECT, keys, NOW + 7200)).rejects.toThrow('expired')
    await expect(verifyFirebaseToken(token, PROJECT, [{ ...keys[0], kid: 'k2' }], NOW)).rejects.toThrow('kid')
    expect(() => checkClaims({ ...good, iss: 'https://evil.example' }, PROJECT, NOW)).toThrow('issuer')
    expect(() => checkClaims({ ...good, firebase: { sign_in_provider: 'anonymous' } }, PROJECT, NOW)).toThrow('provider')
  })
})

describe('admin progress summary', () => {
  it('summarises wird, plan, today’s adhkar and last read in the user’s time zone', () => {
    // 2026-11-21 06:00 UTC = 09:00 in Mogadishu
    const now = new Date('2026-11-21T06:00:00Z')
    const s = summarize({
      'wird.done': JSON.stringify({ 1: '2026-11-19', 2: '2026-11-20', 3: '2026-11-21' }),
      'khatma.plan': JSON.stringify({ days: 30, start: '2026-11-10', from: 1, done: { 1: '2026-11-10', 2: '2026-11-11' }, remind: 330, history: [] }),
      'adhkar.done': JSON.stringify({ day: '2026-11-21', cats: { subax: true } }),
      'quran.last': JSON.stringify({ s: 18, a: 45, page: 298, name: 'Al-Kahf', ar: 'الكهف', at: 1 }),
    }, 'Africa/Mogadishu', now)
    expect(s.wird).toBe(3)
    expect(s.wirdStreak).toBe(3)
    expect(s.plan).toEqual({ day: 3, days: 30, finished: false })
    expect(s.adhkarToday).toEqual(['subax'])
    expect(s.lastRead).toEqual({ name: 'Al-Kahf', a: 45, page: 298 })
  })
  it('treats yesterday’s adhkar as not done today and survives broken data', () => {
    const s = summarize({ 'adhkar.done': JSON.stringify({ day: '2026-11-20', cats: { fiid: true } }), 'wird.done': '{broken' }, null, new Date('2026-11-21T06:00:00Z'))
    expect(s.adhkarToday).toEqual([])
    expect(s.wird).toBe(0)
    expect(s.plan).toBeNull()
    expect(s.lastRead).toBeNull()
  })
})
