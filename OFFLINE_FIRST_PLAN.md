# Offline-First PWA — Implementatieplan

**Doel:** App-open voelt instant. Cached data verschijnt < 300ms na tap op het icoon, fresh data slipt stil binnen wanneer ze er is.

**Meetbare success-criteria:**
- Warme visit (cache aanwezig): time-to-interactive < 300ms
- Koude visit (eerste install / cache miss): TTI < 3s, met loading skeleton vanaf 200ms
- Offline app-open: cached data zichtbaar, banner met "geen verbinding"
- Optimistic actie (weight log, meal toggle): UI swap < 50ms, sync naar server in achtergrond

---

## Huidige staat (audit-resultaat)

**Wat er al staat:**
- `public/sw.js` custom Service Worker — precacht statische assets, network-first voor pages, **slaat `/api/` over** (geen API caching nu)
- `public/manifest.json` volledig PWA-compliant (icons, scope, shortcuts)
- `src/lib/offline-store.ts` — IndexedDB met 3 stores: `pendingActions`, `cache` (TTL), `workoutState`. **Solide basis, alleen niet gebruikt voor dashboard.**
- `src/lib/fetcher.ts` `cachedFetch` — in-memory SWR pattern, verloren bij tab-close
- `/api/dashboard` heeft `Cache-Control: private, max-age=30, stale-while-revalidate=120`
- SW wordt **alleen geregistreerd bij push-permission flow** (niet auto bij app-load)
- Geen optimistic UI op writes — elke actie wacht op server

**Wat ontbreekt:**
- Persistent cache voor dashboard-respons (overleeft tab-close, app-restart)
- SW shell-precaching voor instant cold-start
- Auto-registratie van SW (niet user-gated op push)
- Optimistic mutations
- Cache-invalidation per write-path
- Multi-tab sync van cache-updates

---

## Nieuwe architectuur

```
┌─ App-icoon tap ───────────────────────────────────────┐
│                                                        │
│  Service Worker serveert HTML+JS uit cache    (~100ms) │
│                                                        │
│  React hydrateert + leest IndexedDB cache     (~150ms) │
│                                                        │
│  Render dashboard met cached data + sync-dot  (~200ms) │
│                                                        │
│  ┌─ Background ─────────────────────────────────────┐  │
│  │  fetch /api/dashboard                             │  │
│  │   ├─ ok: write IDB, swap UI, hide sync-dot       │  │
│  │   └─ fail: keep cache, show offline banner       │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘

┌─ Gebruikersactie (weight log, meal toggle, ...) ──────┐
│                                                        │
│  1. Mutate IDB cache + UI optimistic              (0ms)│
│  2. POST naar API in achtergrond                       │
│      ├─ ok: invalidate cache → bg refresh /api/dash    │
│      └─ fail: rollback UI + queue in pendingActions    │
│                  → retry op online event               │
└────────────────────────────────────────────────────────┘
```

---

## Implementatie in 6 fases

Volgorde gekozen op basis van: kleinste blast radius eerst, max omkeerbaar, meetbaar verbetering per fase. **Niet doorgaan naar volgende fase tot vorige in productie staat en geen regressies geeft.**

---

### Fase 0 — Foundation utilities (1u, 0 UX-change)

**Doel:** schone primitieven beschikbaar maken vóór features.

**Files toe te voegen:**
- `src/lib/dashboard-cache.ts` — typed wrapper rond IndexedDB voor dashboard-data
  - `readDashboardCache(userId): Promise<{data, age} | null>`
  - `writeDashboardCache(userId, data): Promise<void>`
  - `clearDashboardCache(userId?: string): Promise<void>` — nul-arg = wipe alle
  - Cache key: `dashboard:${userId}` — voorkomt user-leakage op shared device
- `src/lib/optimistic.ts` — helper voor mutate + rollback patroon
  - `optimisticMutate<T>(key, mutator, apiCall): Promise<T>` met automatische rollback bij failure

**Verify:**
- TSC clean
- Unit-conceptueel: schrijf-lees roundtrip in dev console werkt

**Risico:** 0 — alleen nieuwe files, niets in productie verandert.

**Rollback:** files verwijderen.

---

### Fase 1 — IndexedDB cache + lees-op-mount (2u)

**Doel:** tweede visit na een eerdere succesvolle fetch = instant data uit cache.

**Files te wijzigen:**
- `src/app/client/DashboardClient.tsx`:
  - `useEffect` op mount: `readDashboardCache(currentUserId)` → als hit, `setData(cached)` + `setLoading(false)` direct
  - Na succesvolle `cachedFetch('/api/dashboard')`: `writeDashboardCache(userId, fresh)`
  - Visuele "syncing" indicator (kleine sync-dot in TopBar of subtle pulse) zolang bg fetch loopt nadat cached data al getoond is
- `src/app/client/page.tsx`: pass `currentUserId` als prop naar DashboardClient (nu zit user.id in `getAuthFast` server-side; we moeten userId beschikbaar maken client-side voor cache-key)
- Logout-flow ergens (zoek naar `signOut` calls): roep `clearDashboardCache()` aan

**Verify:**
- TSC clean
- Manueel: load → wacht klaar → reload → moet instant data tonen + sync-dot 1-2s
- Logout → opnieuw inloggen als andere user → check geen vorige data lekt

**Risico:** laag. Server-flow blijft volledig intact — IDB is alleen extra laag op client.

**Rollback:** revert DashboardClient changes; cache-files blijven dormant.

---

### Fase 2 — Drop SSR-fetch op page.tsx (1u)

**Doel:** server hoeft niet meer te wachten op 18 queries voor het eerste byte HTML.

**Files te wijzigen:**
- `src/app/client/page.tsx`:
  - Verwijder `await fetchDashboardData(user.id)`
  - Render `<DashboardClient initialData={null} currentUserId={user.id} />` direct na auth-check
  - Behoud `force-dynamic` (we hebben nog steeds auth check nodig)
- `src/app/client/loading.tsx`: blijft staan, treedt nu in werking voor cold-cache visit
- Optioneel: voeg shell-niveau Suspense toe aan layout voor smoother transition

**Verify:**
- TSC clean
- Cold visit (incognito): skeleton verschijnt < 500ms, data fillt in 2-4s
- Warm visit (cache from Fase 1): instant cached data + sync-dot
- Auth-redirect blijft werken (logged-out user → naar `/`)

**Risico:** medium. Cold-start UX zonder cache = blank moment dat door loading.tsx ondervangen wordt. Test cold-path goed.

**Rollback:** restore `await fetchDashboardData` regel.

---

### Fase 3 — SW aggressieve shell + JS precache (2-3u)

**Doel:** app-icoon tap → HTML+JS uit SW cache → React mount < 200ms.

**Files te wijzigen:**
- `public/sw.js`:
  - Cache-versie naar v3 (huidige is v2 vermoedelijk — bumpen forceert clean install)
  - Precache uitbreiden: `/client`, main JS chunks (via build-time manifest), CSS
  - Strategy voor `/client`: cache-first met background revalidate
  - SW responde voor JS-chunks: cache-first met `stale-while-revalidate` (Next.js chunk-namen zijn content-hashed → safe)
  - Behoud `/api/` skip — API caching gebeurt op IDB-laag, niet SW
- Build-time helper voor chunk-manifest:
  - Optie A: switchen naar `next-pwa` of `@serwist/next` (best practice, goed onderhouden)
  - Optie B: custom Node-script post-build dat `.next/static/chunks/*` lijst genereert in sw.js
  - **Aanbeveling: Optie A** — minder maintenance, robuuster
- `src/components/notifications/NotificationPermission.tsx` of nieuwe `src/components/SWBoot.tsx`:
  - SW-registratie verhuizen uit push-flow naar layout-mount (auto-register voor alle users)
  - Permission-prompt blijft user-gated, alleen registratie wordt eager
- SW update flow:
  - `skipWaiting` + `clientsClaim`
  - Detect new SW available → toast "Nieuwe versie beschikbaar" met reload-knop
  - Bij `controllerchange` event → reload page

**Verify:**
- Lighthouse PWA score: 100
- Network throttle "Slow 3G" cold visit: shell paint < 500ms
- Build → deploy → verify oude clients krijgen nieuwe SW binnen 1 visit
- Test: bewust corrupte cache → kill-switch URL `/sw-purge` werkt

**Risico:** **HOOG.** SW-bugs zijn moeilijk te debuggen, oude versies blijven hangen, foute precache-lijst breekt de app voor cached users.

**Mitigatie:**
- Cache-versie bump = nuke oude
- Voorzie `/sw-purge` route die alle SW caches dropt + unregisters SW
- Stage rollout: deploy aan 10% via Vercel, monitor errors voor 100%

**Rollback:** revert sw.js + bump cache-versie nogmaals (nieuwe SW unregistert oude door versie-mismatch).

---

### Fase 4 — Optimistic mutations per write-path (3-4u)

**Doel:** elke gebruikersactie = instant feedback, geen wachten op server.

**Per endpoint pattern:**
1. UI handler roept `optimisticMutate(...)` aan met expected new state
2. IDB cache muteren + setState in component
3. `fetch()` naar API endpoint
4. On success: `invalidateCache('/api/dashboard')` + bg refresh
5. On failure: rollback IDB + setState + toast "kon niet opslaan, probeer opnieuw"
6. Op offline: schrijf naar `pendingActions` store, retry bij `online` event

**Endpoints aan te pakken (in volgorde van gebruik / impact):**

1. **Weight log** (`POST /api/health-metrics`)
   - File: `DashboardClient.tsx` `submitWeight` handler
   - Optimistic: update `weightLog.entriesThisWeek++`, `lastValue`, `lastDate`
2. **Meal toggle** (`POST /api/nutrition-log`)
   - File: meal toggle handler in nutrition card
   - Optimistic: flip `meals[i].completed`, recompute `mealsCompleted`, `consumed.calories/protein/...`
3. **Workout completion** (`POST /api/workout-complete`)
   - File: workout-finish flow
   - Optimistic: `training.today.completed = true`, `momentum.workoutsThisWeek++`, voeg date toe aan `completedDates`
4. **Accountability check** (`POST /api/accountability`)
   - File: nudges accountability handler
   - Optimistic: `actions.accountabilityPending = false`, decrement `notificationCount`
5. **Weekly check-in** (`POST /api/weekly-check-in`)
6. **Message read** (`PATCH /api/messages/[id]/read`) — for unread broadcast counts

**Verify per endpoint:**
- Happy path: actie → instant UI update → server bevestigt → cache fresh
- Server-error path: actie → instant UI update → server faalt → rollback + toast zichtbaar
- Offline path: actie → instant UI update → in pendingActions queue → online → flushed → server bevestigt

**Risico:** medium. Race conditions tussen optimistic update en bg refresh.

**Mitigatie:** versie-token per mutation (`mutationId` in cache entry); bg refresh negeert cache-write als nieuwere mutation pending is.

**Rollback:** per endpoint independently revertible.

---

### Fase 5 — Online/offline UX polish (1-2u)

**Doel:** gebruiker weet altijd: zie ik live data, cached data, of offline.

**Files te wijzigen:**
- `src/components/ui/SyncStatusIndicator.tsx`:
  - States: `online-fresh` (geen indicator), `online-syncing` (kleine pulse), `offline` (banner bovenaan), `sync-failed` (toast met retry)
  - Listener op `navigator.onLine` + `window` online/offline events
- `src/lib/dashboard-cache.ts`:
  - Track `lastSyncedAt` met cache entry
  - Helper `isCacheStale(entry, maxAge)` voor "verouderd" indicator (default 5min)
- DashboardClient: subtle "verouderd" badge op de hero als cache > 5min en nog niet gesynced
- Retry queue:
  - In `offline-store.ts` zit al `pendingActions` — voeg retry-runner toe die bij `online` event de queue afwerkt
  - Per actie: max 3 retries, exponential backoff

**Verify:**
- Airplane mode aan → app open → cached data + offline banner
- Airplane uit → banner weg, sync-dot kort, fresh data
- Offline + weight log → in queue → online → automatisch synced
- Cache > 5min en sync faalt → "verouderd" badge zichtbaar

**Risico:** laag, alleen UX-laag.

---

### Fase 6 — Verificatie & meten (1-2u)

**Doel:** bewijzen dat het werkt voor échte gebruikers.

**Acties:**
- Lighthouse PWA + Performance audit op staging (target: PWA 100, Perf > 90)
- Real-User Monitoring (RUM): plug `web-vitals` in, log naar Vercel Analytics of console
- Cross-device testing matrix:
  - iOS Safari 16.4+ (PWA, push support)
  - iOS Safari < 16.4 (PWA zonder push)
  - Android Chrome (volledige PWA)
  - Desktop Chrome/Firefox (fallback)
- Stress test: 10 opens binnen 1 min → verify geen rate-limit / cache-corruption
- Multi-tab test: open 2 tabs, mutate in tab A → tab B updated binnen 2s (BroadcastChannel)

---

## Edge cases & failure modes

| Scenario | Aanpak |
|---|---|
| User logout | `clearDashboardCache()` + SW unregister + IDB wipe |
| User switch op shared device | Cache key per `userId` voorkomt leakage automatisch |
| SW update midden in actieve sessie | Toast "nieuwe versie" + reload-knop, geen auto-reload |
| Optimistic actie faalt (server-error) | Rollback IDB + setState + retry-toast |
| Optimistic actie faalt (offline) | Queue in `pendingActions`, retry op `online` event |
| Multiple tabs open, mutation in tab A | BroadcastChannel `'dashboard-cache'` → tab B her-leest IDB |
| Stale write-action overschrijft nieuwere server-state | Server-timestamp wint in conflict resolution; client toont "Coach heeft je data al bijgewerkt" |
| Cache corruption | Kill-switch `/sw-purge` route, ook automatisch bij JSON.parse fail |
| iOS Safari quota-exceeded op IDB | Catch QuotaExceededError → wipe cache, fall back naar netwerk |
| User wijzigt timezone tijdens sessie | Cache key includes geen TZ; bg fetch herrekent dates server-side |

---

## Rollback-strategie

Per fase commits gescheiden zodat individuele revert mogelijk blijft.

**Kill-switches:**
- SW bug → bump cache versie, oude SW unregistert zichzelf
- IDB corrupt → `/sw-purge` route wipet alles + reload
- Optimistic-bug → feature-flag per endpoint (env var `OPTIMISTIC_DISABLED=weight,meal,...`)

---

## Tijdsinschatting

| Fase | Werk | Cumulatief |
|---|---|---|
| 0 — Foundation | 1u | 1u |
| 1 — IDB cache + lees | 2u | 3u |
| 2 — Drop SSR-fetch | 1u | 4u |
| 3 — SW shell precache | 2-3u | 6-7u |
| 4 — Optimistic mutations | 3-4u | 9-11u |
| 5 — Online/offline UX | 1-2u | 10-13u |
| 6 — Verificatie & meten | 1-2u | 11-15u |

**Totaal: ~12-15u development + 2u test = 2-3 dagen.**

**Aanbeveling:** fasen 0-2 in één sprint (4u) → al dramatische verbetering bij warme visits voelbaar. Fasen 3-5 in tweede sprint → volledige offline-first ervaring. Fase 6 throughout.

---

## Open vragen voor Glenn (graag beantwoorden voor we starten)

1. **SW update gedrag bij actieve sessie:** auto-reload of expliciete "nieuwe versie" prompt?
   *Aanbeveling: prompt — voorkomt data-loss bij midden-sessie reload.*

2. **Optimistic-prioriteit:** welke 2 actions eerst als je tussen Fase 4 onderdelen kiest?
   *Aanbeveling: weight-log + meal-toggle — meest gebruikt + meest "voelt traag" nu.*

3. **Realtime updates op homepage:** wil je dat coach-side mutaties direct doorkomen (bv. nieuw programma, nieuwe broadcast)?
   *Optie: na Fase 4 toevoegen via Supabase realtime subscription.*

4. **next-pwa vs custom SW:** mag ik `@serwist/next` (modern fork van next-pwa) introduceren in Fase 3?
   *Aanbeveling: ja — minder maintenance, robuuster, breed gebruikt.*

5. **Staged rollout:** willen we Fase 3 (SW) achter een Vercel feature flag of meteen 100%?
   *Aanbeveling: 10% → 50% → 100% over 3 dagen, met error-monitoring.*

---

## Wat na deze refactor blijft staan

- Bestaande performance-fixes #1 (DB query collapse) en #2 (middleware getSession) blijven actief
- `force-dynamic` op `/client` blijft (auth-check vereist)
- Push-notification flow ongewijzigd
- Coach-side architectuur ongewijzigd (kan later identieke pattern krijgen indien nodig)

Wanneer je akkoord gaat met dit plan + de 5 open vragen beantwoordt, start ik met Fase 0.
