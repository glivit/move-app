/**
 * Simple SWR-style fetch cache for client-side data.
 * Returns cached data immediately (if fresh enough) while revalidating in the background.
 * This eliminates redundant network requests during same-session navigation.
 */

interface CacheEntry {
  data: any
  timestamp: number
  promise?: Promise<any>
}

const cache = new Map<string, CacheEntry>()

// Default: serve cached data for 30 seconds, then revalidate
const DEFAULT_MAX_AGE = 120_000

/**
 * Fetch with stale-while-revalidate caching.
 *
 * @param url - The API endpoint to fetch
 * @param options - Optional: maxAge (ms), forceRefresh
 * @returns The data (from cache or network)
 */
export async function cachedFetch<T = any>(
  url: string,
  options?: {
    maxAge?: number
    forceRefresh?: boolean
    fetchOptions?: RequestInit
  }
): Promise<T> {
  const maxAge = options?.maxAge ?? DEFAULT_MAX_AGE
  const forceRefresh = options?.forceRefresh ?? false

  const entry = cache.get(url)
  const now = Date.now()

  // If we have fresh cached data and not forcing refresh, return it immediately
  if (entry && !forceRefresh && (now - entry.timestamp) < maxAge) {
    return entry.data as T
  }

  // If we have stale data, return it but revalidate in background
  if (entry && !forceRefresh) {
    // Start background revalidation (deduplicated)
    if (!entry.promise) {
      entry.promise = fetchAndCache<T>(url, options?.fetchOptions).finally(() => {
        const e = cache.get(url)
        if (e) e.promise = undefined
      })
    }
    return entry.data as T
  }

  // No cache or force refresh — fetch now
  // Deduplicate: if another call is already in-flight, wait for it
  if (entry?.promise) {
    return entry.promise as Promise<T>
  }

  const promise = fetchAndCache<T>(url, options?.fetchOptions)

  // Store the in-flight promise for deduplication
  if (entry) {
    entry.promise = promise
  } else {
    cache.set(url, { data: null, timestamp: 0, promise })
  }

  return promise
}

async function fetchAndCache<T>(url: string, fetchOptions?: RequestInit): Promise<T> {
  const res = await fetch(url, fetchOptions)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`)
  }
  const data = await res.json()
  cache.set(url, { data, timestamp: Date.now() })
  return data as T
}

/**
 * Invalidate a specific cache entry (e.g., after mutation)
 */
export function invalidateCache(url: string) {
  cache.delete(url)
}

/**
 * Invalidate all cache entries matching a prefix
 */
export function invalidateCacheByPrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

/**
 * Clear all cached data
 */
export function clearCache() {
  cache.clear()
}
