/**
 * MŌVE Sync Queue
 * Processes pending offline actions when connectivity is restored
 */

import {
  getPendingActions,
  removePendingAction,
  updatePendingAction,
  getPendingActionCount,
} from './offline-store'

const MAX_RETRIES = 3
let isSyncing = false
let syncListeners: Array<(status: SyncStatus) => void> = []

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncAt: number | null
  lastError: string | null
}

let currentStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
}

function notifyListeners() {
  syncListeners.forEach(fn => fn({ ...currentStatus }))
}

export function onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
  syncListeners.push(listener)
  // Immediately notify with current status
  listener({ ...currentStatus })
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener)
  }
}

/**
 * Initialize sync queue — call once on app startup
 */
export function initSyncQueue() {
  if (typeof window === 'undefined') return

  // Listen for online/offline
  window.addEventListener('online', () => {
    currentStatus.isOnline = true
    notifyListeners()
    processQueue()
  })

  window.addEventListener('offline', () => {
    currentStatus.isOnline = false
    notifyListeners()
  })

  // Check pending count on init
  updatePendingCount()

  // Try processing on startup if online
  if (navigator.onLine) {
    processQueue()
  }
}

async function updatePendingCount() {
  try {
    currentStatus.pendingCount = await getPendingActionCount()
    notifyListeners()
  } catch {
    // IndexedDB may not be available
  }
}

/**
 * Process all pending actions in FIFO order
 */
export async function processQueue(): Promise<void> {
  if (isSyncing || !navigator.onLine) return

  isSyncing = true
  currentStatus.isSyncing = true
  notifyListeners()

  try {
    const actions = await getPendingActions()

    for (const action of actions) {
      if (!navigator.onLine) break

      try {
        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        })

        if (response.ok) {
          await removePendingAction(action.id)
        } else if (response.status >= 400 && response.status < 500) {
          // Client error — won't succeed on retry, remove
          console.warn(`Sync action ${action.id} failed with ${response.status}, removing`)
          await removePendingAction(action.id)
        } else {
          // Server error — retry later
          if (action.retries >= MAX_RETRIES) {
            console.error(`Sync action ${action.id} exceeded max retries, removing`)
            await removePendingAction(action.id)
          } else {
            await updatePendingAction(action.id, { retries: action.retries + 1 })
          }
        }
      } catch (err) {
        // Network error — stop processing, will retry when online
        console.warn('Sync error, will retry:', err)
        break
      }
    }

    currentStatus.lastSyncAt = Date.now()
    currentStatus.lastError = null
  } catch (error: any) {
    currentStatus.lastError = error.message
  } finally {
    isSyncing = false
    currentStatus.isSyncing = false
    await updatePendingCount()
  }
}

/**
 * Network-aware fetch that queues mutations when offline
 */
export async function offlineFetch(
  url: string,
  options: RequestInit & {
    offlineAction?: {
      type: 'workout_set' | 'supplement_log' | 'meal_toggle' | 'measurement' | 'message'
      optimisticData?: any
    }
  } = {}
): Promise<Response> {
  const { offlineAction, ...fetchOptions } = options

  // If online, try normal fetch
  if (navigator.onLine) {
    try {
      const response = await fetch(url, fetchOptions)
      return response
    } catch (err) {
      // Network failed despite being "online" — fall through to offline handling
      if (!offlineAction) throw err
    }
  }

  // Offline: queue the action
  if (offlineAction && (fetchOptions.method === 'POST' || fetchOptions.method === 'PATCH' || fetchOptions.method === 'DELETE')) {
    const body = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {}

    await import('./offline-store').then(store =>
      store.addPendingAction({
        type: offlineAction.type,
        payload: body,
        endpoint: url,
        method: fetchOptions.method as 'POST' | 'PATCH' | 'DELETE',
      })
    )

    await updatePendingCount()

    // Return a fake successful response for optimistic UI
    return new Response(JSON.stringify(offlineAction.optimisticData || { queued: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // For GET requests when offline, try cache
  throw new Error('Offline — geen cached data beschikbaar')
}
