import { useCallback, useEffect, useState } from 'react'

// All personal data (bookmarks, last-read, khatma progress, adhkar progress, preferences)
// stays on the device in IndexedDB. No account, nothing sent anywhere.
// A tiny key-value wrapper is used instead of a library to keep the app's start-up small.

const DB_NAME = 'diin'
const STORE = 'kv'
let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      // v1 was written by Dexie (rows shaped {key, value} with keyPath "key");
      // v2 stores the value directly under its key. The upgrade moves existing data across.
      const req = indexedDB.open(DB_NAME, 2)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) { db.createObjectStore(STORE); return }
        const tx = req.transaction!
        const old = tx.objectStore(STORE)
        if (old.keyPath !== 'key') return
        const all = old.getAll()
        all.onsuccess = () => {
          const rows = (all.result ?? []) as { key: string; value: unknown }[]
          db.deleteObjectStore(STORE)
          const fresh = db.createObjectStore(STORE)
          for (const r of rows) if (r && typeof r.key === 'string') fresh.put(r.value, r.key)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = op(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await run<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>)
    return v === undefined ? fallback : v
  } catch {
    return fallback
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(value, key))
  } catch {
    /* private mode / storage blocked: the app keeps working for this session */
  }
  listeners.get(key)?.forEach((fn) => fn(value))
}

const listeners = new Map<string, Set<(v: unknown) => void>>()

/**
 * React state backed by IndexedDB. `ready` is false until the stored value has loaded,
 * and every component using the same key stays in sync.
 */
export function useStored<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(fallback)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    getItem(key, fallback).then((v) => {
      if (alive) { setValue(v); setReady(true) }
    })
    const fn = (v: unknown) => setValue(v as T)
    if (!listeners.has(key)) listeners.set(key, new Set())
    listeners.get(key)!.add(fn)
    return () => {
      alive = false
      listeners.get(key)?.delete(fn)
    }
    // fallback is a default, not an input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        void setItem(key, v)
        return v
      })
    },
    [key],
  )

  return [value, update, ready]
}

/** Local calendar day "2026-11-20". */
export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
