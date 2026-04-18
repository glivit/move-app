/**
 * Dashboard Cache — persistent (IndexedDB) cache voor de home dashboard data.
 *
 * Offline-first doel: bij elke app-open de laatst bekende dashboard-data
 * onmiddellijk kunnen tonen (uit IDB), terwijl een verse fetch in de
 * achtergrond loopt. Overleeft tab-close, app-restart, reloads.
 *
 * Implementatie:
 *   - Hergebruikt de `cache` store van offline-store.ts (geen schema-migratie)
 *   - Key-namespace `dashboard:${userId}` → voorkomt user-leakage op shared device
 *   - maxAge-veld van CacheEntry wordt bewust op MAX gezet; wij beslissen zelf
 *     over staleness via `age` (lees-moment − write-moment). offline-store's
 *     generic `getCacheEntry` zou expired entries droppen — voor offline-first
 *     willen we ze JUIST nog tonen met "verouderd"-indicator.
 *
 * Leesveldwaardes:
 *   - `null` → geen cache (eerste visit, of na logout/purge)
 *   - `{ data, ageMs }` → cache hit, leeftijd in ms sinds laatste write
 */

const DB_NAME = 'move-offline'
const DB_VERSION = 1
const STORE = 'cache'
const KEY_PREFIX = 'dashboard:'
const NEVER_EXPIRE = Number.MAX_SAFE_INTEGER

// Lokaal CacheEntry-contract — spiegelt offline-store.ts, bewust niet
// geïmporteerd om circulaire afhankelijkheid te vermijden.
interface DashboardCacheEntry {
  key: string
  data: unknown
  timestamp: number
  maxAge: number
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    // Upgrade-handler spiegelt offline-store.ts zodat stand-alone gebruik
    // ook de store aanmaakt (bv. als dashboard-cache als eerste draait).
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

function cacheKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

export interface DashboardCacheHit<T> {
  data: T
  /** Milliseconden sinds de entry geschreven werd. */
  ageMs: number
}

/**
 * Lees de cached dashboard-data voor deze user.
 * Returnt null als er geen entry is of IDB niet beschikbaar is.
 * Retourneert de entry ook als hij "oud" is — caller beslist over stale UX.
 */
export async function readDashboardCache<T = unknown>(
  userId: string,
): Promise<DashboardCacheHit<T> | null> {
  if (!isBrowser() || !userId) return null

  try {
    const db = await openDB()
    return await new Promise<DashboardCacheHit<T> | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(cacheKey(userId))
      req.onsuccess = () => {
        const entry = req.result as DashboardCacheEntry | undefined
        if (!entry) return resolve(null)
        const ageMs = Date.now() - entry.timestamp
        resolve({ data: entry.data as T, ageMs })
      }
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    // IDB kan falen in private-browsing / quota-exceeded / corruption.
    // In dat geval: gedraag ons alsof er geen cache is. Caller valt terug op fetch.
    console.warn('[dashboard-cache] read failed:', err)
    return null
  }
}

/**
 * Schrijf fresh dashboard-data naar de cache voor deze user.
 * Fouten loggen we maar gooien we niet — een mislukte cache-write mag
 * de rest van het flow niet breken.
 */
export async function writeDashboardCache(
  userId: string,
  data: unknown,
): Promise<void> {
  if (!isBrowser() || !userId) return

  try {
    const db = await openDB()
    const entry: DashboardCacheEntry = {
      key: cacheKey(userId),
      data,
      timestamp: Date.now(),
      maxAge: NEVER_EXPIRE,
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(entry)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('[dashboard-cache] write failed:', err)
  }
}

/**
 * Wis de cache-entry voor één user, of (zonder argument) voor alle users.
 *
 * Gebruik:
 *   - Logout: `clearDashboardCache()` → wipe alles
 *   - User-switch op shared device: gebeurt automatisch via key-namespace,
 *     maar expliciete wipe op logout is veiliger
 *   - Kill-switch / debug: `clearDashboardCache()` zonder argument
 */
export async function clearDashboardCache(userId?: string): Promise<void> {
  if (!isBrowser()) return

  try {
    const db = await openDB()
    if (userId) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(cacheKey(userId))
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      return
    }

    // Geen userId → verwijder alle dashboard:* entries (cursor-scan).
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) return
        const k = cursor.primaryKey as string
        if (typeof k === 'string' && k.startsWith(KEY_PREFIX)) {
          store.delete(k)
        }
        cursor.continue()
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('[dashboard-cache] clear failed:', err)
  }
}

/**
 * Helper voor UX: cache ouder dan dit wordt als "verouderd" beschouwd.
 * 5 min sluit aan op de stale-while-revalidate header op /api/dashboard.
 */
export const STALE_AFTER_MS = 5 * 60 * 1000

export function isStale(hit: DashboardCacheHit<unknown> | null, thresholdMs = STALE_AFTER_MS): boolean {
  if (!hit) return true
  return hit.ageMs > thresholdMs
}
