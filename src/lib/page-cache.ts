/**
 * Page Cache — generiek persistent (IndexedDB) stale-while-revalidate
 * cache voor tab-pagina's (workout, progress, nutrition).
 *
 * Zelfde patroon als dashboard-cache.ts, maar generiek:
 *   - Bij mount: laatst bekende data ONMIDDELLIJK tonen (uit IDB, ~5-15ms)
 *   - Verse fetch loopt in de achtergrond en swapt stil in
 *   - Overleeft app-restart / PWA cold start (i.t.t. cachedFetch's
 *     in-memory Map die elke launch leeg begint)
 *
 * Key-conventie: `<page>:<userId>[:<extra>]` — user-scoped zodat een
 * shared device nooit andermans data toont.
 *
 * Extra in-memory laag: binnen dezelfde sessie is een tab-switch terug
 * een pure sync hit (0ms, geen IDB roundtrip nodig).
 */

const DB_NAME = 'move-offline'
const DB_VERSION = 1
const STORE = 'cache'
const KEY_PREFIX = 'page:'
const NEVER_EXPIRE = Number.MAX_SAFE_INTEGER

interface PageCacheEntry {
  key: string
  data: unknown
  timestamp: number
  maxAge: number
}

// In-memory laag — overleeft route-wissels binnen één sessie.
const memCache = new Map<string, { data: unknown; timestamp: number }>()

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    // Spiegelt offline-store.ts / dashboard-cache.ts zodat stand-alone
    // gebruik ook alle stores aanmaakt.
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('workoutState')) {
        db.createObjectStore('workoutState', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Lees laatst-bekende data voor een pagina.
 * Returnt null bij geen cache of IDB-failure (private browsing etc.).
 */
export async function readPageCache<T>(
  key: string,
): Promise<{ data: T; ageMs: number } | null> {
  // Sync-pad: in-memory hit (zelfde sessie)
  const mem = memCache.get(key)
  if (mem) {
    return { data: mem.data as T, ageMs: Date.now() - mem.timestamp }
  }

  if (!isBrowser()) return null
  try {
    const db = await openDB()
    const entry = await new Promise<PageCacheEntry | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY_PREFIX + key)
      req.onsuccess = () => resolve(req.result as PageCacheEntry | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    if (!entry) return null
    memCache.set(key, { data: entry.data, timestamp: entry.timestamp })
    return { data: entry.data as T, ageMs: Date.now() - entry.timestamp }
  } catch {
    return null
  }
}

/** Schrijf verse data weg (in-memory + IDB). Best-effort, faalt stil. */
export async function writePageCache(key: string, data: unknown): Promise<void> {
  memCache.set(key, { data, timestamp: Date.now() })
  if (!isBrowser()) return
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const entry: PageCacheEntry = {
        key: KEY_PREFIX + key,
        data,
        timestamp: Date.now(),
        maxAge: NEVER_EXPIRE,
      }
      tx.objectStore(STORE).put(entry)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    /* private browsing / quota — cache is optioneel */
  }
}
