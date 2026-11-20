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
