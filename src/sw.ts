/// <reference lib="webworker" />
// DIIN service worker: offline app shell + data, user-downloaded Quran audio, and Web Push.
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { RangeRequestsPlugin } from 'workbox-range-requests'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// single-page app: every navigation gets index.html (works offline too)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// verified Quran / Hisn data: cached on first use, then served offline
registerRoute(({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/data/'), new CacheFirst({ cacheName: 'diin-data' }))

const AUDIO_CACHE = 'diin-audio' // same name as src/lib/audio.ts

// Quran audio: play from the cache when the user downloaded that surah (with seeking support),
// otherwise stream from the network. Streams are NOT stored automatically — only explicit downloads.
registerRoute(
  ({ url }) => url.hostname === 'download.quranicaudio.com',
  new CacheFirst({
    cacheName: AUDIO_CACHE,
    plugins: [new RangeRequestsPlugin(), { cacheWillUpdate: async () => null }],
  }),
)

// ---------- Web Push (phase 7) ----------
interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  let data: PushPayload = { title: 'DIIN', body: '' }
  try {
    data = { ...data, ...(event.data?.json() as PushPayload) }
  } catch {
    data.body = event.data?.text() ?? ''
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      lang: 'so',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string })?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) {
        open.navigate(url)
        return open.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
