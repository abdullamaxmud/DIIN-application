import { buildPushHTTPRequest } from '@pushforge/builder'
import { dueNotifications, parsePrefs, type Due, type Subscriber } from './schedule'
import { cleanFeatures, cleanItems, cleanPlatform, newToken, sameHex, validDevice } from './accounts'
import { firebaseKeys, verifyFirebaseToken, type FirebaseUser } from './firebase'
import { summarize } from './stats'
import { SYNC_KEYS } from '../../src/lib/syncKeys'

export interface Env {
  DB: D1Database
  ALLOWED_ORIGIN: string
  ADMIN_CONTACT: string
  VAPID_PRIVATE_JWK: string
  /** Firebase project that signs users in (public; a var in wrangler.toml) */
  FIREBASE_PROJECT_ID?: string
  /** password for the /admin dashboard (secret: `npx wrangler secret put ADMIN_KEY`) */
  ADMIN_KEY?: string
}

interface Row {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  lat: number | null
  lng: number | null
  zone: string
  prefs: string
  sent: string
}

interface UserRow {
  id: string
  kind: 'google' | 'email' | 'guest'
  name: string
  email: string | null
  city: string | null
  country: string | null
  zone: string | null
  platform: string | null
  installed: number
  push: number
  created_at: string
  last_seen: string
}

const json = (data: unknown, status: number, origin: string) =>
  new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-max-age': '86400',
      'cache-control': 'no-store',
      vary: 'origin',
    },
  })

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const validZone = (z: unknown): z is string => {
  if (typeof z !== 'string' || z.length > 64) return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true } catch { return false }
}

/** City and country of the visitor from Cloudflare's network data (approximate; no GPS involved). */
function place(req: Request) {
  const cf = (req as Request & { cf?: { city?: string; country?: string } }).cf
  return { city: typeof cf?.city === 'string' ? cf.city.slice(0, 60) : null, country: typeof cf?.country === 'string' ? cf.country.slice(0, 2) : null }
}

async function send(env: Env, row: Pick<Row, 'endpoint' | 'p256dh' | 'auth'>, n: Pick<Due, 'title' | 'body' | 'url'> & { tag?: string }) {
  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK: JSON.parse(env.VAPID_PRIVATE_JWK),
    subscription: { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
    message: {
      payload: { title: n.title, body: n.body, url: n.url, tag: n.tag ?? 'diin' },
      adminContact: env.ADMIN_CONTACT,
      options: { ttl: 60 * 60, urgency: 'high' },
    },
  })
  return fetch(endpoint, { method: 'POST', headers, body })
}

const bearer = (req: Request) => /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')?.[1] ?? null

async function sessionUser(req: Request, env: Env): Promise<string | null> {
  const token = bearer(req)
  if (!token || token.length > 128) return null
  const row = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ?').bind(await sha256(token)).first<{ user_id: string }>()
  return row?.user_id ?? null
}

async function startSession(env: Env, userId: string) {
  const token = newToken()
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id) VALUES (?, ?)').bind(await sha256(token), userId).run()
  return token
}

async function progressOf(env: Env, userId: string) {
  const { results } = await env.DB.prepare('SELECT key, value, t FROM progress WHERE user_id = ?').bind(userId).all<{ key: string; value: string; t: number }>()
  const items: Record<string, { v: unknown; t: number }> = {}
  for (const r of results ?? []) {
    try { items[r.key] = { v: JSON.parse(r.value), t: r.t } } catch { /* skip broken row */ }
  }
  return items
}

const userJson = (u: Pick<UserRow, 'id' | 'kind' | 'name' | 'email'>) => ({ id: u.id, kind: u.kind, name: u.name, email: u.email })

// ---------------- route handlers ----------------

type Ctx = { req: Request; env: Env; body: Record<string, unknown>; ok: (d: unknown, s?: number) => Response }

/** App opened / section used: counts visitors, installs, countries and sections (no personal data). */
async function ping({ req, env, body, ok }: Ctx) {
  if (!validDevice(body.device)) return ok({ error: 'device' }, 400)
  const { city, country } = place(req)
  const platform = cleanPlatform(body.platform)
  const installed = body.installed === true ? 1 : 0
  const day = new Date().toISOString().slice(0, 10)
  const stmts = [
    env.DB.prepare(
      `INSERT INTO devices (id, platform, installed, country, city, first_seen, last_seen) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
       ON CONFLICT(id) DO UPDATE SET platform = COALESCE(?2, platform), installed = MAX(installed, ?3),
         country = COALESCE(?4, country), city = COALESCE(?5, city), last_seen = ?6`,
    ).bind(body.device, platform, installed, country, city, day),
    env.DB.prepare('INSERT OR IGNORE INTO visits (day, device) VALUES (?, ?)').bind(day, body.device),
    ...cleanFeatures(body.features).map((f) => env.DB.prepare('INSERT OR IGNORE INTO usage (day, device, feature) VALUES (?, ?, ?)').bind(day, body.device, f)),
  ]
  await env.DB.batch(stmts)
  return ok({ ok: true })
}

/**
 * Exchange a Firebase ID token for a DIIN session. Only a verified email gets in.
 * A former guest's saved progress is moved to the new account (newest change per key wins).
 */
async function firebaseLogin({ req, env, body, ok }: Ctx) {
  if (!env.FIREBASE_PROJECT_ID) return ok({ error: 'auth-not-configured' }, 503)
  if (typeof body.idToken !== 'string' || body.idToken.length > 4096) return ok({ error: 'token' }, 400)
  let keys
  try { keys = await firebaseKeys() } catch { return ok({ error: 'auth-unavailable' }, 503) }
  let u: FirebaseUser
  try {
    u = await verifyFirebaseToken(body.idToken, env.FIREBASE_PROJECT_ID, keys)
  } catch (e) {
    return e instanceof Error && e.message === 'email-not-verified' ? ok({ error: 'email-not-verified' }, 403) : ok({ error: 'token' }, 401)
  }
  const { city, country } = place(req)
  const id = 'f:' + u.uid
  await env.DB.prepare(
    `INSERT INTO users (id, kind, name, email, city, country) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(id) DO UPDATE SET kind = ?2, name = ?3, email = ?4, city = COALESCE(?5, city), country = COALESCE(?6, country), last_seen = datetime('now')`,
  ).bind(id, u.kind, u.name, u.email, city, country).run()

  if (typeof body.guestToken === 'string' && body.guestToken.length <= 128) {
    const row = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ?').bind(await sha256(body.guestToken)).first<{ user_id: string }>()
    if (row?.user_id.startsWith('d:')) {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO progress (user_id, key, value, t) SELECT ?1, key, value, t FROM progress WHERE user_id = ?2
           ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, t = excluded.t WHERE excluded.t > progress.t`,
        ).bind(id, row.user_id),
        env.DB.prepare('DELETE FROM progress WHERE user_id = ?').bind(row.user_id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id),
        env.DB.prepare('DELETE FROM users WHERE id = ?').bind(row.user_id),
      ])
    }
  }
  return ok({ token: await startSession(env, id), user: { id, kind: u.kind, name: u.name, email: u.email }, items: await progressOf(env, id) })
}

/** Save the app's changed progress (newest change per key wins) and return everything saved. */
async function syncProgress({ req, env, body, ok }: Ctx) {
  const userId = await sessionUser(req, env)
  if (!userId) return ok({ error: 'auth' }, 401)
  const items = cleanItems(body.items)
  if (!items) return ok({ error: 'too-big' }, 413)
  const { city, country } = place(req)
  const stmts = Object.entries(items).map(([key, it]) =>
    env.DB.prepare(
      `INSERT INTO progress (user_id, key, value, t) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(user_id, key) DO UPDATE SET value = ?3, t = ?4 WHERE ?4 > progress.t`,
    ).bind(userId, key, it.value, it.t),
  )
  stmts.push(
    env.DB.prepare(
      `UPDATE users SET last_seen = datetime('now'), city = COALESCE(?2, city), country = COALESCE(?3, country),
         zone = COALESCE(?4, zone), platform = COALESCE(?5, platform), installed = MAX(installed, ?6), push = ?7 WHERE id = ?1`,
    ).bind(userId, city, country, validZone(body.zone) ? body.zone : null, cleanPlatform(body.platform), body.installed === true ? 1 : 0, body.push === true ? 1 : 0),
  )
  await env.DB.batch(stmts)
  const user = await env.DB.prepare('SELECT id, kind, name, email FROM users WHERE id = ?').bind(userId).first<UserRow>()
  if (!user) return ok({ error: 'auth' }, 401)
  return ok({ user: userJson(user), items: await progressOf(env, userId) })
}

async function deleteMe({ req, env, ok }: Ctx) {
  const userId = await sessionUser(req, env)
  if (!userId) return ok({ error: 'auth' }, 401)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM progress WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ])
  return ok({ ok: true })
}

async function logout({ req, env, ok }: Ctx) {
  const token = bearer(req)
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run()
  return ok({ ok: true })
}

/** Everything the admin dashboard shows. */
async function adminStats({ req, env, body, ok }: Ctx) {
  if (!env.ADMIN_KEY) return ok({ error: 'admin-not-configured' }, 503)
  const given = bearer(req) ?? ''
  if (!sameHex(await sha256(given), await sha256(env.ADMIN_KEY))) return ok({ error: 'auth' }, 401)

  const days = body.range === 'today' ? 1 : body.range === 'month' ? 30 : 7
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
  const first14 = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10)
  const keys = SYNC_KEYS.filter((k) => k === 'wird.done' || k === 'khatma.plan' || k === 'adhkar.done' || k === 'quran.last')

  const [visitors, active, installed, kinds, push, daily, platforms, countries, features, users, progress] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(DISTINCT device) AS n FROM visits WHERE day >= ?').bind(since),
    env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE last_seen >= ?').bind(since),
    env.DB.prepare('SELECT COUNT(*) AS n FROM devices WHERE installed = 1'),
    env.DB.prepare('SELECT kind, COUNT(*) AS n FROM users GROUP BY kind'),
    env.DB.prepare('SELECT COUNT(*) AS n FROM subscriptions'),
    env.DB.prepare('SELECT day, COUNT(*) AS n FROM visits WHERE day >= ? GROUP BY day').bind(first14),
    env.DB.prepare('SELECT platform, COUNT(*) AS n FROM devices WHERE installed = 1 GROUP BY platform'),
    env.DB.prepare('SELECT country, COUNT(*) AS n FROM devices WHERE last_seen >= ? GROUP BY country ORDER BY n DESC LIMIT 8').bind(since),
    env.DB.prepare('SELECT feature, COUNT(DISTINCT device) AS n FROM usage WHERE day >= ? GROUP BY feature').bind(since),
    env.DB.prepare('SELECT * FROM users ORDER BY last_seen DESC LIMIT 500'),
    env.DB.prepare(`SELECT user_id, key, value FROM progress WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys),
  ])

  const n = (r: D1Result) => Number((r.results?.[0] as { n?: number } | undefined)?.n ?? 0)
  const byUser = new Map<string, Record<string, string>>()
  for (const r of (progress.results ?? []) as { user_id: string; key: string; value: string }[]) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, {})
    byUser.get(r.user_id)![r.key] = r.value
  }
  const dayCounts = new Map(((daily.results ?? []) as { day: string; n: number }[]).map((r) => [r.day, r.n]))
  const now = new Date()

  return ok({
    range: days === 1 ? 'today' : days === 30 ? 'month' : 'week',
    visitors: n(visitors),
    active: n(active),
    installed: n(installed),
    accounts: Object.fromEntries(((kinds.results ?? []) as { kind: string; n: number }[]).map((r) => [r.kind, r.n])),
    push: n(push),
    daily: Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10)
      return { day: d, n: dayCounts.get(d) ?? 0 }
    }),
    platforms: (platforms.results ?? []) as { platform: string | null; n: number }[],
    countries: (countries.results ?? []) as { country: string | null; n: number }[],
    features: (features.results ?? []) as { feature: string; n: number }[],
    users: ((users.results ?? []) as UserRow[]).map((u) => ({
      id: u.id, kind: u.kind, name: u.name, email: u.email, city: u.city, country: u.country,
      platform: u.platform, installed: !!u.installed, push: !!u.push, joined: u.created_at, lastSeen: u.last_seen,
      progress: summarize(byUser.get(u.id) ?? {}, u.zone, now),
    })),
  })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin') ?? ''
    const allowed = origin === env.ALLOWED_ORIGIN || /^http:\/\/localhost:\d+$/.test(origin) ? origin : env.ALLOWED_ORIGIN
    const ok = (d: unknown, s = 200) => json(d, s, allowed)
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') return ok(null, 204)
    if (url.pathname === '/api/health') return ok({ ok: true })
    if (req.method !== 'POST') return ok({ error: 'method' }, 405)
    if (origin && allowed !== origin) return ok({ error: 'origin' }, 403)

    let body: Record<string, unknown>
    try { body = (await req.json()) ?? {} } catch { return ok({ error: 'json' }, 400) }
    if (typeof body !== 'object' || Array.isArray(body)) return ok({ error: 'json' }, 400)
    const ctx: Ctx = { req, env, body, ok }

    switch (url.pathname) {
      case '/api/ping': return ping(ctx)
      case '/api/auth/firebase': return firebaseLogin(ctx)
      case '/api/auth/logout': return logout(ctx)
      case '/api/sync': return syncProgress(ctx)
      case '/api/me/delete': return deleteMe(ctx)
      case '/api/admin/stats': return adminStats(ctx)
    }

    // ---- push subscriptions ----
    const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined
    if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) return ok({ error: 'subscription' }, 400)
    const id = await sha256(sub.endpoint)

    if (url.pathname === '/api/unsubscribe') {
      await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(id).run()
      return ok({ ok: true })
    }

    if (url.pathname === '/api/subscribe') {
      const prefs = parsePrefs(body.prefs)
      if (!prefs || !sub.keys?.p256dh || !sub.keys?.auth || !validZone(body.zone)) return ok({ error: 'fields' }, 400)
      const round = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null)
      await env.DB.prepare(
        `INSERT INTO subscriptions (id, endpoint, p256dh, auth, lat, lng, zone, prefs)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET p256dh = ?3, auth = ?4, lat = ?5, lng = ?6, zone = ?7, prefs = ?8, updated_at = datetime('now')`,
      ).bind(id, sub.endpoint, sub.keys.p256dh, sub.keys.auth, round(body.lat), round(body.lng), body.zone, JSON.stringify(prefs)).run()
      return ok({ ok: true })
    }

    if (url.pathname === '/api/test') {
      const row = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM subscriptions WHERE id = ?').bind(id).first<Row>()
      if (!row) return ok({ error: 'not-subscribed' }, 404)
      const res = await send(env, row, { title: 'DIIN 🌙', body: 'Ogeysiisyadu way shaqeynayaan. Alle ha kaa aqbalo.', url: '/', tag: 'test' })
      return ok({ ok: res.ok, status: res.status }, res.ok ? 200 : 502)
    }

    return ok({ error: 'not-found' }, 404)
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date()
    const { results } = await env.DB.prepare('SELECT * FROM subscriptions').all<Row>()
    const jobs = (results ?? []).map(async (row) => {
      let sub: Subscriber
      try {
        sub = { lat: row.lat, lng: row.lng, zone: row.zone, prefs: JSON.parse(row.prefs), sent: JSON.parse(row.sent || '{}') }
      } catch { return }
      const due = dueNotifications(sub, now)
      if (!due.length) return
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: row.zone }).format(now) // YYYY-MM-DD
      for (const n of due) {
        try {
          const res = await send(env, row, { ...n, tag: n.key })
          if (res.status === 404 || res.status === 410) {
            // the browser unsubscribed — forget this endpoint
            await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(row.id).run()
            return
          }
          sub.sent[n.key] = today
        } catch { /* retried on the next run while still inside the window */ }
      }
      await env.DB.prepare('UPDATE subscriptions SET sent = ? WHERE id = ?').bind(JSON.stringify(sub.sent), row.id).run()
    })
    ctx.waitUntil(Promise.all(jobs))
  },
} satisfies ExportedHandler<Env>
