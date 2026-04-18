/**
 * Optimistic mutation primitive — Fase 0 foundation voor offline-first.
 *
 * Patroon:
 *   1. Caller past de UI-state aan alsof de server al "ja" gezegd heeft.
 *   2. We vuren de API-call af.
 *   3. Lukt → klaar; caller kan optioneel reconciliëren met server-respons.
 *   4. Faalt → we rollen de UI terug naar de vorige staat en reporten.
 *
 * Waarom geen fetch-wrapper? De meeste mutations hebben al bestaande
 * `fetch('/api/...')`-calls. Deze helper wil niets meer zijn dan een
 * deterministische apply-then-commit-or-rollback orchestrator.
 *
 * Voorbeeld:
 *   const prev = meals
 *   const next = [...meals, { id: tempId, ...newMeal }]
 *   await optimisticMutate({
 *     key: `meal-add:${tempId}`,
 *     apply: () => setMeals(next),
 *     rollback: () => setMeals(prev),
 *     commit: () => fetch('/api/meals', { method: 'POST', body: ... }).then(r => r.json()),
 *     onError: (e) => toast.error('Maaltijd kon niet opgeslagen worden'),
 *   })
 *
 * Queue-integratie (offline/5xx) gebeurt in Fase 4 via `addPendingAction`
 * in `offline-store.ts`. Dit primitive blijft bewust agnostisch — caller
 * beslist zelf of een specifieke mutation naar de queue mag.
 */

export interface OptimisticMutateOptions<T> {
  /**
   * Optionele label voor logging. Handig voor debugging als er veel
   * optimistic updates in korte tijd gebeuren (bv. supplement-toggles).
   */
  key?: string

  /**
   * Pas de optimistische staat toe (setState + evt. IDB-cache write).
   * Wordt *synchroon* aangeroepen vóór `commit()`.
   */
  apply: () => void

  /**
   * Zet de state terug naar vóór `apply()` als `commit()` faalt.
   * Moet idempotent zijn (we garanderen 1x call, maar defensief is beter).
   */
  rollback: () => void

  /**
   * De eigenlijke server-call. Return-value wordt doorgegeven aan
   * `onSuccess` en uit `optimisticMutate` terug-gereturned.
   */
  commit: () => Promise<T>

  /**
   * Optionele hook met server-respons. Hier kan je de tempId vervangen
   * door de echte server-id, of server-velden (created_at, computed
   * totals) mergen. Wordt NIET aangeroepen bij failure.
   */
  onSuccess?: (response: T) => void | Promise<void>

  /**
   * Optionele hook vóór rollback. Hier doe je meestal een toast of log.
   * Na deze hook volgt `rollback()`.
   */
  onError?: (err: unknown) => void
}

/**
 * Runt een optimistische mutation met automatische rollback.
 *
 * Throwt de originele error *na* rollback, zodat callers kunnen vangen
 * voor bv. een retry-loop of een "save failed"-state.
 */
export async function optimisticMutate<T>(
  options: OptimisticMutateOptions<T>,
): Promise<T> {
  const { key, apply, rollback, commit, onSuccess, onError } = options

  // 1. Apply synchroon — UI voelt instant aan.
  apply()

  try {
    // 2. Fire-and-await API.
    const response = await commit()

    // 3. Reconcile (bv. tempId → real id).
    if (onSuccess) {
      try {
        await onSuccess(response)
      } catch (err) {
        // Reconcile-fout is apart van commit-fout: UI heeft al de optimistic
        // state, server is accordered — we loggen en gaan door. Rollback niet
        // wenselijk want de server-call sláágde wel.
        console.warn(
          `[optimistic${key ? `:${key}` : ''}] onSuccess handler threw:`,
          err,
        )
      }
    }

    return response
  } catch (err) {
    // 4. Rollback. Volgorde: onError (voor toast) → rollback (state fix).
    //    Als onError throwt, blijven we nog steeds rollbacken.
    if (onError) {
      try {
        onError(err)
      } catch (innerErr) {
        console.warn(
          `[optimistic${key ? `:${key}` : ''}] onError handler threw:`,
          innerErr,
        )
      }
    }

    try {
      rollback()
    } catch (rollbackErr) {
      // Rollback-fout is een bug in caller-code. We gooien de originele
      // commit-error omdat die user-relevanter is, maar loggen de rollback.
      console.error(
        `[optimistic${key ? `:${key}` : ''}] rollback threw — state may be inconsistent:`,
        rollbackErr,
      )
    }

    throw err
  }
}

/**
 * Variant voor mutations die geen server-call hebben *tijdens* de interactie
 * (alleen queue-based: user is offline, we slaan op voor later sync).
 *
 * Hier is er geen rollback-moment omdat er geen commit is die kan falen;
 * de queue garandeert eventual consistency. We wrappen alleen voor
 * uniforme call-site ergonomie en logging.
 */
export async function queuedMutate(options: {
  key?: string
  apply: () => void
  enqueue: () => Promise<void>
  onError?: (err: unknown) => void
  rollback?: () => void
}): Promise<void> {
  const { key, apply, enqueue, onError, rollback } = options

  apply()

  try {
    await enqueue()
  } catch (err) {
    if (onError) {
      try {
        onError(err)
      } catch (innerErr) {
        console.warn(
          `[queued${key ? `:${key}` : ''}] onError handler threw:`,
          innerErr,
        )
      }
    }

    if (rollback) {
      try {
        rollback()
      } catch (rollbackErr) {
        console.error(
          `[queued${key ? `:${key}` : ''}] rollback threw — state may be inconsistent:`,
          rollbackErr,
        )
      }
    }

    throw err
  }
}

/**
 * Utility: genereert een tempId voor nieuwe resources die nog geen
 * server-id hebben. Gebruik in `apply()` om een placeholder te tonen;
 * vervang de tempId in `onSuccess()` door de echte server-id.
 *
 * Prefix `tmp_` zodat rendering/filtering deze kan herkennen (bv. om
 * delete/edit-knoppen uit te schakelen tot de server bevestigt).
 */
export function tempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function isTempId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('tmp_')
}
