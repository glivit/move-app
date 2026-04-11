/**
 * Lightweight localStorage-backed snooze for the coach triage inbox.
 *
 * When a coach swipes left on a client or session, we don't want to hide it
 * permanently — we want it to disappear from the "Aandacht" view until
 * tomorrow morning. A simple per-device store is enough: snoozes are
 * ephemeral by nature, and replicating them across devices is overkill.
 *
 * Keys are prefixed (`client:`, `session:`) so we can reuse this for both
 * levels. All timestamps are ISO strings.
 */

const STORAGE_KEY = 'move-coach-snoozes-v1'

type SnoozeMap = Record<string, string> // key → ISO until

function readMap(): SnoozeMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map: SnoozeMap) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // quota / private mode — ignore
  }
}

/** Returns true if the key is currently snoozed. Also evicts expired entries. */
export function isSnoozed(key: string): boolean {
  if (typeof window === 'undefined') return false
  const map = readMap()
  const until = map[key]
  if (!until) return false
  const untilMs = Date.parse(until)
  if (!Number.isFinite(untilMs) || untilMs <= Date.now()) {
    delete map[key]
    writeMap(map)
    return false
  }
  return true
}

/** Snooze a key until tomorrow 07:00 local time (default). */
export function snooze(key: string, untilDate?: Date): void {
  const until = untilDate || nextMorning()
  const map = readMap()
  map[key] = until.toISOString()
  writeMap(map)
}

/** Clear a snooze (undo). */
export function unsnooze(key: string): void {
  const map = readMap()
  if (key in map) {
    delete map[key]
    writeMap(map)
  }
}

/** Returns every currently-active snooze key (for debugging/UI). */
export function listSnoozes(): SnoozeMap {
  return readMap()
}

function nextMorning(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(7, 0, 0, 0)
  return d
}

// Convenience key builders so the prefix scheme stays consistent.
export const snoozeKey = {
  client: (id: string) => `client:${id}`,
  session: (id: string) => `session:${id}`,
}
