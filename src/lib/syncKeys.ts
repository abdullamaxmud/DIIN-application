// Stored values that are saved to the user's account (so progress survives a new phone or a reinstall).
// Shared by the app (src/lib/sync.ts) and the server (worker/src/accounts.ts).
export const SYNC_KEYS = [
  'wird.done',
  'quran.last',
  'quran.bookmark',
  'khatma.plan',
  'adhkar.done',
  'notify.prefs',
  'audio.reciter',
  'quran.theme',
  'quran.fontSize',
  'adhkar.fontSize',
] as const

export type SyncKey = (typeof SYNC_KEYS)[number]

export const isSyncKey = (k: string): k is SyncKey => (SYNC_KEYS as readonly string[]).includes(k)

/** Sections counted in the admin statistics. */
export const FEATURES = ['quran', 'listen', 'adhkar', 'prayer', 'khatma'] as const
export type Feature = (typeof FEATURES)[number]
