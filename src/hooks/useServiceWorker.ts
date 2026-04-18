'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Service Worker registration + update lifecycle.
 *
 * Fase 3 wijziging:
 *   - Vóór: auto-reload op `controllerchange` → live workout state ging verloren
 *   - Nu:   prompt-on-update → returnt `updateAvailable` + `applyUpdate()`
 *
 * Caller (UpdatePrompt) toont een banner wanneer updateAvailable=true,
 * en roept applyUpdate() aan op user-bevestiging. We sturen dan SKIP_WAITING
 * naar de wachtende SW; serwist's eigen handler activeert hem, waarna
 * controllerchange → window.location.reload().
 *
 * Fase 6 fix (Bug 74):
 *   - Het Serwist route-handler pad (`/serwist/sw.js`) levert in dev (en soms
 *     prod) byte-verschillen per request omdat de SW on-demand gecompileerd
 *     wordt. De browser ziet dat als een update → SW blijft in "waiting" →
 *     de update-prompt verscheen bij elke page load.
 *   - We tonen de prompt nu niet meer voor een pre-existing `registration.
 *     waiting` bij register-time. Alleen updates die tijdens deze sessie
 *     via `updatefound` binnenkomen triggeren de prompt. Een waiting SW die
 *     uit een vorige sessie staat, activeert zichzelf zodra alle tabs dicht
 *     gaan (native browser behavior).
 *   - Reload na SKIP_WAITING: 150ms delay zodat de nieuwe SW genoeg tijd
 *     heeft om zijn precache te settlen voordat we fetches doen (voorkomt
 *     "er ging iets mis bij het laden").
 *
 * Fase 6 fix v2 (Bug 74 follow-up):
 *   - sessionStorage werd op iOS PWA leeggemaakt bij elke app-close. Bij
 *     heropenen was er geen cooldown meer → de Serwist-route leverde weer
 *     byte-verschillend → updatefound → prompt elke keer je de app opent.
 *   - Switch naar localStorage + 24u cooldown. Eens Glenn de prompt zag
 *     (of erop klikte) blijft hij weg voor een dag, ook na app-killen.
 *     Voor écht nieuwe releases is 1× per 24u prompten meer dan voldoende.
 *   - Bonus: markCooldown() óók bij applyUpdate, zodat na de reload niet
 *     direct opnieuw geprompt wordt als de SW nóg een keer byte-veranderd.
 */

const UPDATE_COOLDOWN_KEY = 'move-sw-update-seen-at'
const UPDATE_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24u — zie Fase 6 v2 toelichting

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

function isInCooldown(): boolean {
  const store = safeLocalStorage()
  if (!store) return false
  try {
    const seen = parseInt(store.getItem(UPDATE_COOLDOWN_KEY) ?? '0', 10)
    return Number.isFinite(seen) && Date.now() - seen < UPDATE_COOLDOWN_MS
  } catch {
    return false
  }
}

function markCooldown() {
  const store = safeLocalStorage()
  if (!store) return
  try {
    store.setItem(UPDATE_COOLDOWN_KEY, Date.now().toString())
  } catch {
    /* storage disabled — no cooldown, acceptable */
  }
}

export interface ServiceWorkerStatus {
  /** Een nieuwe SW staat klaar in "waiting" — caller kan prompt tonen. */
  updateAvailable: boolean
  /** Triggert SKIP_WAITING op de waiting SW; reload volgt automatisch. */
  applyUpdate: () => void
}

export function useServiceWorker(): ServiceWorkerStatus {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    let refreshing = false

    // ── Reload pas wanneer de nieuwe SW echt aan het roer is ─────────────
    // Kleine delay zodat de nieuwe SW zijn precache kan afronden voordat
    // de browser de eerstvolgende fetch doet. Zonder dit zagen we sporadisch
    // "er ging iets mis bij het laden" omdat chunks gedurende de transitie
    // niet uit cache noch netwerk ingelost konden worden.
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      setTimeout(() => window.location.reload(), 150)
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    // ── Register + update lifecycle ──────────────────────────────────────
    // SW wordt geserveerd door /serwist/[path]/route.ts (Next 16 turbopack).
    // Scope '/' werkt omdat de route Service-Worker-Allowed: / meestuurt.
    navigator.serviceWorker
      .register('/serwist/sw.js', { scope: '/' })
      .then((registration) => {
        // NB: geen prompt meer voor pre-existing `registration.waiting`
        // bij register-time — zie toelichting boven. Dit voorkomt de
        // update-prompt-spam uit Bug 74.

        // Detecteer een NIEUWE update die binnenkomt tijdens deze sessie
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            // installed + controller bestaat = update (geen first install)
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Cooldown tegen dev-rebuild-spam.
              if (isInCooldown()) return
              markCooldown()
              setWaitingWorker(newWorker)
              setUpdateAvailable(true)
            }
          })
        })

        // Periodieke check voor nieuwe versies (~5 min)
        const interval = setInterval(() => {
          registration.update().catch(() => {})
        }, 5 * 60 * 1000)

        // Cleanup wanneer hook unmount (zeldzaam, maar netjes)
        return () => clearInterval(interval)
      })
      .catch((error) => {
        console.error('[MŌVE] SW registration failed:', error)
      })

    // ── Badge clear bij open + visibility change ─────────────────────────
    const clearBadge = () => {
      if ('clearAppBadge' in navigator) {
        ;(navigator as unknown as { clearAppBadge: () => Promise<void> })
          .clearAppBadge()
          .catch(() => {})
      }
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_BADGE' })
      }
    }
    clearBadge()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') clearBadge()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    // Altijd cooldown-bump: ook als er geen waitingWorker is (fallback
    // reload), willen we voorkomen dat direct na reload de prompt herverschijnt
    // omdat Serwist per request byte-verschillende SW levert.
    markCooldown()
    if (!waitingWorker) {
      // Fallback: forceer een reload — als update is geactiveerd via
      // tab-close-cycle is de nieuwe SW al actief.
      window.location.reload()
      return
    }
    // Stuur SKIP_WAITING → serwist activeert de waiting SW → controllerchange → reload
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }, [waitingWorker])

  return { updateAvailable, applyUpdate }
}
