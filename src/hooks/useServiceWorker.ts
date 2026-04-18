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
 */

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

    // ── Reload de pagina pas wanneer de nieuwe SW echt aan het roer is ──
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    // ── Register + update lifecycle ──────────────────────────────────────
    // SW wordt geserveerd door /serwist/[path]/route.ts (Next 16 turbopack).
    // Scope '/' werkt omdat de route Service-Worker-Allowed: / meestuurt.
    navigator.serviceWorker
      .register('/serwist/sw.js', { scope: '/' })
      .then((registration) => {
        // Detecteer "er staat al een waiting SW klaar bij page load"
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting)
          setUpdateAvailable(true)
        }

        // Detecteer een NIEUWE update die binnenkomt tijdens deze sessie
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            // installed + controller bestaat = update (geen first install)
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
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
