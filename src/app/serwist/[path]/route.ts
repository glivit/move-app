/**
 * Serwist Service Worker route handler — Next 16 / Turbopack compatible.
 *
 * @serwist/turbopack serveert de SW via een Route Handler i.p.v. een
 * statisch bestand in /public. De `[path]` dynamic segment matcht beide
 * outputs:
 *   - /serwist/sw.js      ← gecompileerde service worker
 *   - /serwist/sw.js.map  ← source map
 *
 * Registreren gebeurt vanuit useServiceWorker met `{ scope: '/' }`.
 * De `Service-Worker-Allowed: /` header wordt door createSerwistRoute
 * automatisch meegestuurd zodat de SW de hele app kan controllen, ook
 * al staat het bestand zelf onder /serwist/.
 *
 * SW-source en custom handlers staan in src/app/sw.ts.
 */

import { createSerwistRoute } from '@serwist/turbopack'

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: 'src/app/sw.ts',
    // Native esbuild i.p.v. wasm — sneller en minder geheugen tijdens build.
    useNativeEsbuild: true,
    // Hot-reload van SW-source tijdens dev (bij wijzigingen in src/app/sw.ts).
    rebuildOnChange: true,
  })
