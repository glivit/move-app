/**
 * Legacy Service Worker — zelf-ontkoppelende stub.
 *
 * Vóór Fase 3 draaide hier een 200-regel handwritten SW. Sinds de
 * @serwist/turbopack migratie wordt de echte SW geserveerd door
 * een Route Handler op:
 *
 *   /serwist/sw.js   (zie src/app/serwist/[path]/route.ts)
 *
 * Pre-migratie clients hebben deze oude /sw.js nog geregistreerd.
 * Deze stub zorgt dat zij zichzelf netjes afmelden zodra de browser
 * de SW opnieuw fetched voor een update-check. Na `unregister()` zal
 * de client-app via useServiceWorker/ensureSubscription de nieuwe
 * /serwist/sw.js registreren.
 *
 * Dit bestand kan weg zodra telemetrie aangeeft dat <1% van de
 * clients nog een '/sw.js'-registratie heeft.
 */

self.addEventListener('install', () => {
  // Overschakelen zonder te wachten op pagina-reload — we zijn toch
  // al aan het afscheid nemen.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Sloop alle caches die door de oude SW waren aangemaakt,
        // zodat stale assets verdwijnen en de nieuwe SW vers begint.
        const names = await caches.keys()
        await Promise.all(names.map((n) => caches.delete(n)))
      } catch (err) {
        console.warn('[legacy-sw] cache-cleanup failed:', err)
      }
      try {
        // Neem tijdelijk controle zodat de unregister niet faalt op
        // browsers die daar strikt over zijn.
        await self.clients.claim()
        await self.registration.unregister()
      } catch (err) {
        console.warn('[legacy-sw] unregister failed:', err)
      }
    })(),
  )
})

// Geen fetch/push/sync handlers meer — alles zit nu in /serwist/sw.js.
