/**
 * Workout-finish retry queue.
 *
 * Als /api/workout-finish OF de directe DB-fallback in handleComplete faalt,
 * wordt de payload in localStorage 'pending-workout-finish' gegooid. Bij de
 * volgende mount van de client-app shell loopt processPendingWorkoutFinish()
 * eenmalig: elke item wordt opnieuw naar /api/workout-finish gestuurd, en bij
 * succes uit de queue gehaald. Zo verliezen we nooit meer een getrainde sessie
 * omdat een netwerkflap op het verkeerde moment viel.
 *
 * Het 'moment van commit' blijft dezelfde: completedAt wordt meegestuurd uit
 * de oorspronkelijke poging, niet vervangen door now(). Duration blijft ook
 * de originele (zodat analytics correct blijft ook al is retry uren later).
 */

const KEY = 'pending-workout-finish'

interface PendingFinish {
  sessionId: string
  completedAt: string
  durationSeconds: number
  difficultyRating: number | null
  notes: string | null
  queuedAt: string
}

function readQueue(): PendingFinish[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PendingFinish[]) : []
  } catch {
    return []
  }
}

function writeQueue(queue: PendingFinish[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(queue))
  } catch {
    /* quota / disabled — niets te doen */
  }
}

export async function processPendingWorkoutFinish(
  authHeaders: Record<string, string>,
): Promise<{ succeeded: number; failed: number }> {
  const queue = readQueue()
  if (queue.length === 0) return { succeeded: 0, failed: 0 }

  const stillPending: PendingFinish[] = []
  let succeeded = 0
  let failed = 0

  for (const item of queue) {
    try {
      const res = await fetch('/api/workout-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          sessionId: item.sessionId,
          completedAt: item.completedAt,
          durationSeconds: item.durationSeconds,
          moodRating: null,
          difficultyRating: item.difficultyRating,
          notes: item.notes,
          feedbackText: null,
          painData: null,
        }),
      })
      if (res.ok) {
        succeeded += 1
        continue
      }
      // 404 session not found of 403 not your session — queue lozen,
      // anders blijft het eeuwig retry'en.
      if (res.status === 404 || res.status === 403) {
        succeeded += 1 // telt als "afgehandeld" — niets meer te doen
        continue
      }
      stillPending.push(item)
      failed += 1
    } catch {
      stillPending.push(item)
      failed += 1
    }
  }

  writeQueue(stillPending)
  return { succeeded, failed }
}
