/// <reference lib="webworker" />

/**
 * Service Worker source — gecompileerd naar /public/sw.js door @serwist/next.
 *
 * Fase 3 offline-first: Serwist genereert een precache-manifest voor ALLE
 * Next.js build-assets (JS chunks, CSS, HTML) zodat een warm-open offline
 * kan werken en cold-open geen round-trip nodig heeft voor de app-bundle.
 *
 * Custom handlers hieronder zijn 1-op-1 geport van de oude handwritten
 * /public/sw.js — push notifications, notification click, badge API,
 * en message-based cache clear.
 *
 * BELANGRIJK — skipWaiting-beleid:
 *   We zetten `skipWaiting: false`. Dat betekent: wanneer een nieuwe SW
 *   wordt geïnstalleerd, blijft die in "waiting" staan tot:
 *     (a) alle tabs gesloten worden, of
 *     (b) de client postMessage({type:'SKIP_WAITING'}) stuurt.
 *   De client laat een prompt zien ("Nieuwe versie · Vernieuwen") en
 *   stuurt die message pas op user-bevestiging. Dit voorkomt dat een
 *   bezig ingevulde set/input verloren gaat door een auto-reload.
 */

import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Wordt door @serwist/next ingevuld tijdens build met de precache manifest.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false, // ← prompt-on-update, geen surprise reloads
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()

// ═══════════════════════════════════════════════════════════════
// Custom handlers — geport van de oude sw.js
// ═══════════════════════════════════════════════════════════════

// ── Push notifications ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  try {
    const data = event.data?.json() ?? {}
    const {
      title = 'MŌVE',
      body = 'Je hebt een nieuwe melding',
      icon = '/icon-192x192.png',
      badge = '/icon-96x96.png',
      url = '/',
      tag = 'move-notification',
      vibrate = [200, 100, 200],
    } = data

    const badgeNum = data.badgeCount ?? 1

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          data: { url, badgeCount: badgeNum, ...data },
          requireInteraction: false,
          dir: 'ltr',
          lang: 'nl',
          // vibrate/image/timestamp niet in alle TS lib versies — extension via cast
          ...({ vibrate, image: data.image, timestamp: Date.now() } as Record<string, unknown>),
        } as NotificationOptions),
        // iOS 16.4+ PWA + Android: set app-icon badge count
        (async () => {
          try {
            const nav = self.navigator as Navigator & {
              setAppBadge?: (n: number) => Promise<void>
            }
            if (typeof nav.setAppBadge === 'function') {
              await nav.setAppBadge(badgeNum)
            }
          } catch {
            /* badge API niet supported op dit platform */
          }
        })(),
      ]),
    )
  } catch (error) {
    console.error('[SW] Push error:', error)
  }
})

// ── Notification click: focus/open + navigate + clear badge ──────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | null)?.url ?? '/'

  event.waitUntil(
    Promise.all([
      (async () => {
        try {
          const nav = self.navigator as Navigator & {
            clearAppBadge?: () => Promise<void>
          }
          if (typeof nav.clearAppBadge === 'function') {
            await nav.clearAppBadge()
          }
        } catch {
          /* no-op */
        }
      })(),
      (async () => {
        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        for (const client of windowClients) {
          if ('focus' in client) {
            await client.focus()
            const c = client as WindowClient & {
              navigate?: (url: string) => Promise<WindowClient | null>
            }
            if (typeof c.navigate === 'function') {
              await c.navigate(url)
            }
            return
          }
        }
        await self.clients.openWindow(url)
      })(),
    ]),
  )
})

// ── App → SW messages (badge + cache clear) ──────────────────────
// Serwist handelt SKIP_WAITING zelf af via addEventListeners(). We voegen
// hier alleen de app-specifieke CLEAR_BADGE en CLEAR_CACHE toe.
self.addEventListener('message', (event) => {
  const type = (event.data as { type?: string } | null)?.type

  if (type === 'CLEAR_BADGE') {
    try {
      const nav = self.navigator as Navigator & {
        clearAppBadge?: () => Promise<void>
      }
      if (typeof nav.clearAppBadge === 'function') {
        nav.clearAppBadge().catch(() => {})
      }
    } catch {
      /* no-op */
    }
  }

  if (type === 'CLEAR_CACHE') {
    // Oude handwritten cache (move-v2) schoonmaken voor users die migreren
    // van de oude sw.js. Nieuwe Serwist-caches blijven staan.
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => name === 'move-v2' || name.startsWith('move-v'))
            .map((name) => caches.delete(name)),
        ),
      ),
    )
  }
})
