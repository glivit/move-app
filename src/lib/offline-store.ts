/**
 * MŌVE Offline Store
 * IndexedDB-based storage for offline-first functionality
 * Uses idb-keyval pattern for simplicity
 */

const DB_NAME = 'move-offline'
const DB_VERSION = 1

interface PendingAction {
  id: string
  type: 'workout_set' | 'supplement_log' | 'meal_toggle' | 'measurement' | 'message'
  payload: any
  endpoint: string
  method: 'POST' | 'PATCH' | 'DELETE'
  timestamp: number
  retries: number
}

interface CacheEntry {
  key: string
  data: any
  timestamp: number
  maxAge: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('workoutState')) {
        db.createObjectStore('workoutState', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ─── Pending Actions Queue ──────────────────────────────

export async function addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retries'>): Promise<string> {
  const db = await openDB()
  const id = `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const entry: PendingAction = {
    ...action,
    id,
    timestamp: Date.now(),
    retries: 0,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite')
    tx.objectStore('pendingActions').put(entry)
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readonly')
    const request = tx.objectStore('pendingActions').getAll()
    request.onsuccess = () => {
      const actions = request.result as PendingAction[]
      resolve(actions.sort((a, b) => a.timestamp - b.timestamp))
    }
    request.onerror = () => reject(request.error)
  })
}

export async function removePendingAction(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite')
    tx.objectStore('pendingActions').delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function updatePendingAction(id: string, updates: Partial<PendingAction>): Promise<void> {
  const db = await openDB()
  return new Promise(async (resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite')
    const store = tx.objectStore('pendingActions')
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, ...updates })
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPendingActionCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readonly')
    const request = tx.objectStore('pendingActions').count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ─── Cache Store ──────────────────────────────────────

export async function setCacheEntry(key: string, data: any, maxAge: number = 300000): Promise<void> {
  const db = await openDB()
  const entry: CacheEntry = { key, data, timestamp: Date.now(), maxAge }
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCacheEntry<T>(key: string): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readonly')
    const request = tx.objectStore('cache').get(key)
    request.onsuccess = () => {
      const entry = request.result as CacheEntry | undefined
      if (!entry) return resolve(null)
      // Check if expired
      if (Date.now() - entry.timestamp > entry.maxAge) {
        return resolve(null)
      }
      resolve(entry.data as T)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function clearCache(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ─── Workout State ───────────────────────────────────

export async function saveWorkoutStateDB(state: any): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workoutState', 'readwrite')
    tx.objectStore('workoutState').put({ id: 'current', ...state, savedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getWorkoutStateDB(): Promise<any | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workoutState', 'readonly')
    const request = tx.objectStore('workoutState').get('current')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function clearWorkoutStateDB(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workoutState', 'readwrite')
    tx.objectStore('workoutState').delete('current')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
