import { buildPushHTTPRequest } from '@pushforge/builder'
import { dueNotifications, parsePrefs, type Due, type Subscriber } from './schedule'

export interface Env {
  DB: D1Database
  ALLOWED_ORIGIN: string
  ADMIN_CONTACT: string
  VAPID_PRIVATE_JWK: string
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

const json = (data: unknown, status: number, origin: string) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
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

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin') ?? ''
    const allowed = origin === env.ALLOWED_ORIGIN || /^http:\/\/localhost:\d+$/.test(origin) ? origin : env.ALLOWED_ORIGIN
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') return json(null, 204, allowed)
    if (url.pathname === '/api/health') return json({ ok: true }, 200, allowed)
    if (req.method !== 'POST') return json({ error: 'method' }, 405, allowed)
    if (origin && allowed !== origin) return json({ error: 'origin' }, 403, allowed)

    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'json' }, 400, allowed) }
    const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined
    if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000) return json({ error: 'subscription' }, 400, allowed)
    const id = await sha256(sub.endpoint)

    if (url.pathname === '/api/unsubscribe') {
      await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(id).run()
      return json({ ok: true }, 200, allowed)
    }

    if (url.pathname === '/api/subscribe') {
      const prefs = parsePrefs(body.prefs)
      if (!prefs || !sub.keys?.p256dh || !sub.keys?.auth || !validZone(body.zone)) return json({ error: 'fields' }, 400, allowed)
      const round = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null)
      await env.DB.prepare(
        `INSERT INTO subscriptions (id, endpoint, p256dh, auth, lat, lng, zone, prefs)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET p256dh = ?3, auth = ?4, lat = ?5, lng = ?6, zone = ?7, prefs = ?8, updated_at = datetime('now')`,
      ).bind(id, sub.endpoint, sub.keys.p256dh, sub.keys.auth, round(body.lat), round(body.lng), body.zone, JSON.stringify(prefs)).run()
      return json({ ok: true }, 200, allowed)
    }

    if (url.pathname === '/api/test') {
      const row = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM subscriptions WHERE id = ?').bind(id).first<Row>()
      if (!row) return json({ error: 'not-subscribed' }, 404, allowed)
      const res = await send(env, row, { title: 'DIIN 🌙', body: 'Ogeysiisyadu way shaqeynayaan. Alle ha kaa aqbalo.', url: '/', tag: 'test' })
      return json({ ok: res.ok, status: res.status }, res.ok ? 200 : 502, allowed)
    }

    return json({ error: 'not-found' }, 404, allowed)
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
