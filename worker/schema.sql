-- DIIN push subscriptions. Apply with:
--   npx wrangler d1 execute diin --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id         TEXT PRIMARY KEY,          -- sha-256 of the endpoint
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  lat        REAL,                      -- rounded to 2 decimals (~1 km) for privacy
  lng        REAL,
  zone       TEXT NOT NULL,             -- IANA time zone, e.g. Africa/Mogadishu
  prefs      TEXT NOT NULL,             -- JSON, see src/schedule.ts (Prefs)
  sent       TEXT NOT NULL DEFAULT '{}',-- JSON: event key -> local date already sent
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------- accounts, saved progress and app statistics ----------------

-- one row per person: signed in with Google ('g:<google sub>') or a guest who typed a name ('d:<random>')
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,             -- 'google' | 'guest'
  name       TEXT NOT NULL,
  email      TEXT,                      -- Google only
  city       TEXT,                      -- from Cloudflare's network location (no GPS)
  country    TEXT,                      -- ISO code, e.g. SO
  zone       TEXT,                      -- IANA time zone of the phone
  platform   TEXT,                      -- android | ios | desktop
  installed  INTEGER NOT NULL DEFAULT 0,
  push       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- login sessions: only the SHA-256 of the token is stored
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

-- saved progress, one row per stored key (wird.done, quran.last, khatma.plan, …); newest `t` wins
CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT NOT NULL,
  key     TEXT NOT NULL,
  value   TEXT NOT NULL,
  t       INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);

-- every phone/browser that opened the app (random id, no personal data)
CREATE TABLE IF NOT EXISTS devices (
  id         TEXT PRIMARY KEY,
  platform   TEXT,
  installed  INTEGER NOT NULL DEFAULT 0,
  country    TEXT,
  city       TEXT,
  first_seen TEXT NOT NULL DEFAULT (date('now')),
  last_seen  TEXT NOT NULL DEFAULT (date('now'))
);

-- one row per device per day it opened the app (UTC day)
CREATE TABLE IF NOT EXISTS visits (
  day    TEXT NOT NULL,
  device TEXT NOT NULL,
  PRIMARY KEY (day, device)
);

-- one row per device per day per section used (quran, listen, adhkar, prayer, khatma)
CREATE TABLE IF NOT EXISTS usage (
  day     TEXT NOT NULL,
  device  TEXT NOT NULL,
  feature TEXT NOT NULL,
  PRIMARY KEY (day, device, feature)
);
