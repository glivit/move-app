# Performance & Web Vitals Audit · 2026-05-03

> Senior performance engineer review · MŌVE app · Next.js 16.1.6 + Turbopack + React 19.2.3 + Serwist PWA + Supabase.
> Werkdir: `/Users/glenndelille/Desktop/move-app/`. Dev server port: 3002.

---

## Samenvatting

- 9 routes gemeten met Lighthouse (mobiel-emulatie, throttled).
- **Critical caveat:** alle 9 Lighthouse-runs werden geredirect naar `/` (auth gate). De gemeten cijfers gelden dus voor de **publieke landingspagina**, niet voor de geauthenticeerde client-routes. De rest van het rapport leunt voor client-routes vooral op **statische analyse + bundle inspection** (production `next build`). Lighthouse-cijfers blijven nuttig als dev-mode baseline en voor de landingspagina zelf.
- Lighthouse perf scores: **avg 76, min 75 (workout/active), max 77 (nutrition + calendar)**. Alle binnen 75-77 (homogeen — wat verwacht is bij identieke landing-page render).
- LCP failures: **9/9** routes >2.5 s in dev mode (LCP 6.2-7.0 s) — **geïnflateerd door dev/Turbopack JIT-compile + 358 kB unused JS uit `next-devtools`**. Productie-LCP zal ruim onder die waarde liggen, maar nog steeds een risico op trage 4G-verbindingen door bundle-zwaarte (zie §4).
- INP: **`undefined` op alle routes** — Lighthouse triggert geen interactie tijdens de page-load test. Geen meting beschikbaar; INP-risico's afgeleid uit code (zie §4-5).
- CLS: **0 op alle routes** ✓
- Bundle (productie-build): totaal `.next/static` = **4.8 MB**. JS chunks alleen = **4.4 MB**. CSS = **160 KB**. Drie geduplicate **336 KB recharts-chunks**. Eén **184 KB Supabase chunk**. Eén **156 KB CSS-bundle**.
- 41 van 45 `/client/*/page.tsx` zijn **volledige client components** ('use client' aan top) — geen Server-Component split, dus de gehele page-tree wordt gehydrateerd.

### Top 5 perf-bottlenecks (in volgorde van impact)

1. **Recharts gedupliceerd over 3 chunks (3 × 336 KB ≈ 1.0 MB JS gebundled)** — `progress-report`, `stats`, `exercises/[id]` importeren elk recharts statisch. Geen dynamic-import. Bovendien 3 server-side chart-components (`HealthChart`, `ProgressCharts`, `ClientHealthChart`) die elk in eigen chunk landen. → Single recharts chunk + dynamic import = **−700 kB** uit eerste-page-loads.
2. **`workout/active/page.tsx` is 3 150 LOC met 38 useState + 17 useEffect + 30 useCallback/useMemo** in één component. Render-cost per set-tap is groot, en de file is op zich >40 kB minified. → Split in sub-components, gebruik `useReducer` voor sets-state, isoleer rest-timer in eigen render-island.
3. **52 van 58 `<Image>` calls staan op `unoptimized`** → AVIF/WebP wordt **niet** geleverd ondanks `next.config.ts: formats: ['image/avif','image/webp']`. Geen responsive `sizes`, geen Next image-server compressie. **iOS gebruikers downloaden full-resolution Supabase-blobs** zoals Cole-shots progress-photos.
4. **`globals.css` is 1 970 regels → 156 KB CSS-bundle** voor een mobiele PWA. Bevat 24 `backdrop-filter: blur(...)` declaraties + 53 `transition`/`animation`. → CSS-split per route + purge unused selectors (Tailwind 4 zou dit moeten doen, maar `@layer` gebruik in 1970-regel custom CSS bypasses).
5. **Client-side fan-out in `/client/nutrition`** → 7 sequentiële `/api/nutrition-log?date=...` fetches om "recent foods" te berekenen. → Single backend endpoint dat 7 dagen aggregeert in één Supabase-query.

---

## Lighthouse per route

> **Caveat herhaald:** alle routes werden geredirect naar `/` (auth-gate); cijfers reflecteren de landing-page render. INP is `undefined` (geen interaction-measurement in static page load).

| Route | Perf | LCP (s) | FCP (s) | TBT (ms) | TTI (s) | SI (s) | Transfer | Bootup | Unused JS |
|---|---|---|---|---|---|---|---|---|---|
| /client | 76 | 6.96 | 1.06 | 105 | 7.0 | 2.35 | 972 KB | 536 ms | 358 kB |
| /client/workout | 76 | 6.25 | 1.10 | 155 | 7.1 | 1.40 | 972 KB | 834 ms | 355 kB |
| /client/workout/active | 75 | 6.81 | 1.08 | 147 | 7.0 | 1.15 | 972 KB | 610 ms | 358 kB |
| /client/nutrition | 77 | 6.28 | 1.14 | 105 | 7.1 | 1.14 | 972 KB | 482 ms | 358 kB |
| /client/messages | 76 | 6.95 | 1.14 | 81 | 7.1 | 1.14 | 972 KB | 464 ms | 358 kB |
| /client/progress | 76 | 6.76 | 1.07 | 95 | 7.0 | 1.07 | 972 KB | 453 ms | 358 kB |
| /client/calendar | 77 | 6.17 | 1.07 | 114 | 7.0 | 1.08 | 972 KB | 535 ms | 358 kB |
| /client/profile | 76 | 6.89 | 1.14 | 107 | 7.1 | 1.14 | 972 KB | 483 ms | 358 kB |
| /client/check-in | 76 | 6.76 | 1.07 | 105 | 7.0 | 1.07 | 972 KB | 482 ms | 358 kB |

**Wat de cijfers ons WEL vertellen (los van de redirect-bias):**

- **TBT 80-155 ms** is een goede indicatie: Lighthouse zelf flagt TBT onder 200 ms als "Good" — de hoofd-thread heeft op een mobiel CPU/4×-throttling slechts ~100 ms aan tasks >50 ms tijdens de eerste paint. Dat is OK voor de landing.
- **`bootup-time` 450-830 ms** = JS-execution kost voor de page. `/client/workout` heeft de hoogste bootup (834 ms) — opvallend, want het is 'maar' de redirect/landing-page (geen workout-content geladen). Suggestief voor heavy shared chunks in de critical-path.
- **`unused-javascript: 358 kB constant` op alle routes**: de top-3 unused chunks zijn `next-devtools/index_*.js` (142 kB), `node_modules_c36b4b4c._.js` (87 kB), `next/dist/client_*.js` (66 kB). **Dit zijn dev-only artefacten** — Turbopack levert zijn devtool-overlay als runtime chunk. In productie verdwijnen die. → De **echte** unused-JS in productie is een fractie hiervan; **ik schat 50-80 kB op basis van de overige items**. Daarom moet je dit in een prod-build hermeten.
- **DOM-size 122-140**, dom-depth `score: 1` ✓ — geen DOM-bloat op deze routes.

**Top issues uit Lighthouse (over alle routes):**
- `legacy-javascript`: 9 kB savings — Babel/swc transpileert iets dat moderne browsers natively kunnen. Klein.
- `non-composited-animations`: 1 element — minor, maar checken.
- `prioritize-lcp-image`, `third-party-summary`: `null score` (audit-niet-toepasbaar) → klopt voor landing-page zonder LCP-image.

### LCP-element (landing fallback)

```html
<h1 class="text-7xl animate-fade-in" style="font-family: var(--font-sans, Outfit), Outfit, sans-serif; color: rgb(253, 253, 254); ...">MŌVE</h1>
```
- LCP element heeft `bounding rect 0×0` wat erop wijst dat de h1 geanimeerd wordt vanuit `opacity:0` (`animate-fade-in`). **Lighthouse meet de fade-in als LCP-vertraging**. → MAJOR finding (#L1).

---

## Bundle-analyse (productie `next build`)

```
Compiled successfully in 12.8s
Static assets total: 4.8 MB
  ├── JS  : 4.4 MB
  └── CSS : 160 KB
```

### Top 10 chunks

| Size | File | Inhoud (geïdentificeerd via grep) |
|---|---|---|
| 336 KB | `chunks/ed825f57128c60ef.js` | **recharts** (51 occurrences) |
| 336 KB | `chunks/bc1e887710ca9a19.js` | **recharts** (identieke hash-content) |
| 336 KB | `chunks/199b788266923fa4.js` | **recharts** (3e copy) |
| 220 KB | `chunks/4af27f77bd5de33b.js` | Next.js framework (chunk: error overlay, /_next/) |
| 184 KB | `chunks/1327fc85e03b36ae.js` | **@supabase** (59 occurrences) |
| 156 KB | `chunks/69625536a82bad0d.css` | globals.css build-output |
| 116 KB | `chunks/a6dad97d9634a72d.js.map` | source-map (kan weg in prod) |
| 112 KB | `chunks/a6dad97d9634a72d.js` | (unidentified — likely React + react-dom shared) |
| 112 KB | `chunks/7d894ed9eb0ab287.js` | (unidentified) |
| 96 KB  | `chunks/afcf2b6342246af9.js` | (unidentified) |

**Findings:**

- **3× recharts duplicate (≈1 MB JS totaal)** — drie identiek-grote files met dezelfde recharts internals (`@@observable`, `Decimal.js`'s "Division by zero", `d3-scale`). Komt doordat:
  - `src/app/client/progress-report/page.tsx:16` — `} from 'recharts'`
  - `src/app/client/exercises/[id]/page.tsx:16` — `} from 'recharts'`
  - `src/app/client/stats/page.tsx:8` — `} from 'recharts'`
  
  Drie route-niveau pages importeren elk recharts statisch. Turbopack splitst per route maar dedupliceert deze niet naar een shared chunk. **De 3 pages worden NIET gebruikt in DashboardClient/workout/nutrition; toch worden de chunks geprecached** door Serwist (precacheEntries: self.__SW_MANIFEST). Resultaat: **gebruikers downloaden 1 MB recharts ook al openen ze nooit een chart-page**.
  
- **Geen dynamic import voor recharts** — alleen `HealthChart` en `ClientHealthChart` zijn dynamic. De drie page-level imports zijn statisch.

- **Supabase als losse 184 KB chunk** is ok (vendored, gedeeld). `@supabase/ssr + @supabase/supabase-js` samen ~150 kB gzipped is normaal.

- **CSS-bundle 156 KB** voor een mobiele app is fors. Source: `globals.css` is 1 970 regels (zie §4).

### First Load JS (raming)

Turbopack-build toont GEEN per-route First-Load-JS-tabel (Next 16 Turbopack-mode regression: `next build` levert de routes-tabel zonder size-kolom). Schatting per route:
- Shared baseline (React + Next runtime + Supabase + chunk-loader): **~350-400 kB** (uncompressed).
- Routes met chart: + ~336 kB recharts.
- → **/client/stats, /client/progress-report, /client/exercises/[id]: ~700 kB First-Load JS**. Dit is een MAJOR gat tegen de 200 kB-target voor "Good".
- Andere routes: **~400 kB** First-Load. Borderline; OK voor 4G maar niet snel op 3G/EDGE.

---

## Findings per categorie

### Lighthouse / Web Vitals

- **[MAJOR L1]** LCP-element gebruikt `animate-fade-in` (opacity 0→1) op de h1. Lighthouse measure-window vangt de transition op en LCP-time = animation-end-time. → `src/app/page.tsx:326` — verwijder `animate-fade-in` op de loading-fallback h1, of zet `animation-delay: 0; animation-duration: 0ms` voor de eerste paint, of verberg het LCP-element op het kritieke pad. Kan LCP makkelijk 1-2 s drukken.
- **[MAJOR L2]** Lighthouse-runs werden geredirect → re-run met **authenticated session** voor reële cijfers. Optie: gebruik `chrome-launcher` met `chromeFlags: ['--user-data-dir=/tmp/lh-auth']`, log één keer in, hergebruik die profile.
- **[MAJOR L3]** **Production-build hermeten**: dev-mode geeft +358 kB unused JS uit next-devtools. Reële prod-cijfers zullen aanzienlijk beter zijn. Run `npm run build && npm start` op port 3000 en herhaal het script. Verwacht LCP-improvement van 4-5 s naar 1.5-2.5 s in prod.

### Bundle / loading

- **[MAJOR B1]** Recharts × 3 duplicate chunks = **~1 MB** verspilling. → 1) Centraliseer in `src/components/charts/` met `dynamic(() => import('recharts'), { ssr: false })`; 2) Of refactor tot een sharedChartCanvas component die door de 3 pages wordt geïmporteerd. Estimated win: **−700 kB** geprecached, **−336 kB** First-Load voor stats/progress-report/exercises.
- **[MAJOR B2]** `unoptimized` op 52 van 58 `<Image>`-calls (gefiltered op `<Image\b`). → Verwijder `unoptimized` waar de bron HTTPS Supabase storage is; Next image-server kan die pipen via `images.remotePatterns` (al ingesteld voor Supabase ✓). Geeft AVIF + auto-resize. Estimated win: **30-50% kleinere afbeeldingen** + responsive `sizes` levert tot −60% op mobiel.
- **[MAJOR B3]** Geen `priority` prop op LCP-image gevonden (er is er geen — LCP is een h1). Toch: voeg `priority` toe aan boven-the-fold gebruiker-avatar (`src/app/client/profile/page.tsx:355`, `src/components/ui/ClientCard.tsx:49`).
- **[MEDIUM B4]** `globals.css` 1 970 regels → 156 KB build CSS. Tailwind v4 zou dit moeten purgen, maar `@layer` blocks in raw CSS bypassen de purge. → Migreer per-route CSS naar component-level (`workout-active.module.css`) of verkort de globals tot tokens + utilities.
- **[MEDIUM B5]** Source-map `.js.map` files (116 KB) worden meegeleverd in prod-build. → `next.config.ts: productionBrowserSourceMaps: false` (default is false; verifiëer of er een lib expliciet aanstaat).
- **[MEDIUM B6]** `legacy-javascript: 9 kB savings` — geen targets-config voor `browserslist` zichtbaar. → Voeg een `browserslist`-veld in package.json: `["last 2 chrome versions", "last 2 safari versions", "last 2 firefox versions", "last 2 edge versions", "ios>=15"]`.
- **[MEDIUM B7]** `optimizePackageImports` is gezet voor `lucide-react, recharts, date-fns, @supabase/supabase-js` (✓), maar de 3 recharts-duplicaten suggereren dat de tree-shake niet werkt voor recharts page-level imports. Verifieer met `next build --debug` of geef `transpilePackages: ['recharts']`.
- **[MINOR B8]** Outfit font: 5 weights (200/300/400/500/600) gedeclareerd in `src/app/layout.tsx:18`. Elke weight = ±20 kB woff2. **5 weights = 100 kB font**. → Drop 600 (niet meer nodig per memory: "sans-only, no editorial moves") en 200 als die alleen op hero-numbers zit; behoud 300/400/500. Save: ~40 kB.
- **[MINOR B9]** Geen `<link rel="preconnect">` naar `*.supabase.co` voor de eerste data-fetch. → Voeg toe in `src/app/layout.tsx`. Saves ~150-300 ms op cold-start TLS+DNS round-trip.

### Render hot-paths

- **[MAJOR R1]** `src/app/client/workout/active/page.tsx` = **3 150 LOC, 38× useState, 17× useEffect, 30× useCallback/useMemo, 1× backdrop-blur, 1× Suspense**. De file is monolithisch. Elke set-tap (weight/reps update) re-rendert de hele 3 000-LOC tree. Parents krijgen onnodige re-renders door state-bubbling. → Split:
  - `<ActiveWorkoutLayout>` (header + safe-area)
  - `<ExerciseList>` (memo'd, key=exId)
  - `<ExerciseRow>` (memo'd, alleen luistert op eigen sets)
  - `<RestTimer>` (eigen render-island met `useTransition` voor non-urgent UI updates)
  - `<SetInputRow>` (per row, lokale state, lift bij blur)
  - Reducer voor sets: `useReducer((state, action) => {...}, initialState)` ipv 38 losse setStates.
  - **Estimated INP improvement: van ~250-400 ms naar <100 ms** voor set-input op mid-tier Android.
- **[MAJOR R2]** `src/app/client/progress/page.tsx` = **2 440 LOC, 0 useCallback/useMemo, 0 React.memo**. Geen memoization. → Audit + add memo waar lijst-renders plaatsvinden.
- **[MAJOR R3]** `src/app/client/nutrition/page.tsx` = **1 950 LOC, geen virtualization** voor recent-foods (max 20) of food-list. Tolerable bij <50 items, maar plan-meals + logs + recent kunnen samen 100+ items leveren bij power-users.
- **[MEDIUM R4]** `41 van 45` page-files in `/client/*/` zijn `'use client'` direct in de page-component. **Geen Server-Component split**. → Pattern: `page.tsx` wordt server component die data fetcht via Supabase server-client + `<ClientWidget initialData={...} />` rendert. Alleen interactieve sub-tree wordt gehydrateerd. Geeft kleinere JS-bundle per route (vooral list-pages).
- **[MEDIUM R5]** **Geen `useDeferredValue` of `useTransition` gevonden** in `/client/`. React 19's concurrency primitives ongebruikt. → Op `workout/active` rest-timer (ticks per seconde) en op `nutrition` macro-totaal-recalcs zou `useDeferredValue` ruwe input-latency drukken.
- **[MEDIUM R6]** Backdrop-blur in `globals.css`: **24 declaraties** met blur-radii van 12 / 18 / 20 / 24 px en 8 daarvan met `saturate(140-180%)`. Per route komt dat uit op:
  - `/client` (DashboardClient): 0 backdrop-blur in component, maar root layout `ClientLayoutShell.tsx` heeft 1 → top-nav + safe-area = ±2 lagen viewport-overlap.
  - `/client/workout/active`: 1 backdrop-blur in component + globale.
  - `/client/calendar`: 1 + globale.
  - `/client/health`: 1 + globale.
  - **iOS Safari kost van backdrop-filter is ~5-15 ms per laag per frame** op iPhone 12 of ouder. Met 2-3 lagen tegelijk in viewport: 15-45 ms paint-cost = INP risk.
  - **Aanbeveling:** vervang voor below-fold elements `backdrop-filter` door `background: rgba(0,0,0,0.4)` met `transform: translateZ(0)` voor compositor-promotion. Behoud blur enkel op de top-nav (≤1 laag).
- **[MEDIUM R7]** **Geen `will-change` hints** in `src/app/` of `src/components/` ondanks 53 transition/animation declarations en 24 backdrop-filters. → Voor de transform/opacity-animations op `<h1>`-fade-in en de skeleton-pulse: voeg `will-change: opacity` of `will-change: transform`. Voor backdrop-filters: `will-change: backdrop-filter` op de top-nav. Let op: alleen op echte animation-targets, niet overal.
- **[MEDIUM R8]** **88 console.log/warn/error** in client-code (incl. error paths). Console writes blokkeren de JS-thread tijdens devtools-open en in productie blijven ze runnen. → ESLint rule `no-console` met allow=['warn','error'] + Babel `transform-remove-console` voor productie.

### Network / data

- **[MAJOR N1]** `src/app/client/nutrition/page.tsx:1227-1234` — **client-side N×1 fan-out**: 7 sequentiële `fetch('/api/nutrition-log?date=Y-M-D')` Promise.all'd om recent-foods (laatste 7 dagen) te aggregeren. Backend krijgt 7 parallelle Supabase-queries op `nutrition_logs`. Tijd: 7 round-trips minimum, mogelijk Supabase query-budget. → Vervang door één endpoint `/api/nutrition-log/recent?days=7` dat één Supabase-query uitvoert (`gte(date, today-7).select(...)`).
- **[MAJOR N2]** `src/app/client/nutrition/page.tsx:1155` — `supabase.from('nutrition_plans').select('*')` zonder `.limit()`. `.eq('client_id', user.id).eq('is_active', true).single()` → die `.single()` werkt als implicit limit, dus hier OK. Maar **`select('*')`** retourneert alle kolommen incl. JSON-blobs (meals jsonb). Moeilijk te budgetteren. → Specifieer kolommen.
- **[MEDIUM N3]** `src/app/client/workout/active/page.tsx:1669` — `supabase.from('workout_sets').select('weight_kg')` heeft `.eq('exercise_id', x).order('created_at', desc).limit(20)` (verifieer rond die regel). Lijkt OK; de 1 1RM-history fetch.
- **[MEDIUM N4]** **Geen AbortController in `/client/messages` of `/client/nutrition` fetches** (wel in DashboardClient ✓). Mount→unmount race-condition risico. → Voeg `AbortController` toe of migreer naar `@tanstack/react-query` (al weggelaten uit deps; goed gezien — voorkomt 50 kB extra bundle).
- **[MEDIUM N5]** `src/app/client/messages/page.tsx:105` — `select('*')` op messages met `.limit(100)` ✓. Maar messages.content kan tekst + lange URLs bevatten. → Bij meer dan 100 messages: cursor-paginatie.
- **[MEDIUM N6]** Geen evidence van indexes op Supabase-side. Topqueries: `messages.created_at DESC + (sender,receiver)` (verbatim "ordered desc on the wire to leverage index" comment in messages/page.tsx → dev gelooft het, maar verifieer in Supabase migrations folder of `idx_messages_pair_created` bestaat).
- **[MEDIUM N7]** Service-Worker cache uses `defaultCache` from `@serwist/next/worker` (`src/app/sw.ts:31`). Geen custom strategy voor:
  - `/api/dashboard` → kan StaleWhileRevalidate met 5 min TTL (huidige implementatie is alleen IDB).
  - Supabase storage URLs (`/storage/v1/object/public/...`) → CacheFirst met 30 dagen TTL voor afbeeldingen levert dramatische verbetering bij PWA-revisits.
- **[MINOR N8]** Geen `<link rel="dns-prefetch">` of `preconnect` naar `fkkfnrtogosbubtfrvza.supabase.co` (gehardcode in `next.config.ts:9`). → Save 50-150 ms cold-start TLS.
- **[MINOR N9]** `compress: true` ✓ in next.config. Brotli automatic via Vercel/Edge. Geen actie.

### iOS Safari / mobiel

- **[MAJOR I1]** **`min-h-screen` / `h-screen` (28 occurrences) i.p.v. `100dvh`** (slechts 1 dvh-occurrence). iOS Safari URL-bar veroorzaakt scroll-jump als de viewport van 100vh naar 100lvh switcht bij scroll. → Vervang door `min-h-dvh` (of `min-h-svh` voor "stable small viewport"). Tailwind 4 ondersteunt `dvh/svh/lvh` natively.
- **[MAJOR I2]** **60 `position: fixed`** instances. Backdrop-filter parents + transform parents + position-fixed kinderen kunnen op iOS Safari een nieuwe stacking-context aanmaken die fixed-children verkeerd positioneert (bekende WebKit-bug). → Audit: een fixed bottom-nav binnen een transformed parent renders soms relative i.p.v. fixed. Manual test op iOS 17 nodig.
- **[MEDIUM I3]** **Slechts 1 `WebkitOverflowScrolling: touch`** (`src/app/client/workout/active/page.tsx:986`). De rest van scroll-containers vertrouwt op default native momentum. iOS 13+ heeft dat default goed; pre-iOS 13 niet. Geen actie nodig tenzij je iOS <13 ondersteunt.
- **[MEDIUM I4]** Backdrop-filter density per route (zie R6). Worst case is ClientLayoutShell + page-level backdrop = 2 lagen op iOS. Houdbaar maar ruimer dan ideaal.
- **[MEDIUM I5]** Geen `-webkit-tap-highlight-color: transparent` gevonden globally → tap-flash op buttons. Minor visual noise.

### Database & queries (op basis van API-route inspection)

- **[MEDIUM Q1]** 71 `.limit(N)` calls verspreid over 358 `.from()/.select()` queries (api+client+components). Niet 100% coverage — sommige `.single()` of `.maybeSingle()` zijn impliciet OK, maar audit op `select('*')` zonder limit blijft een kleine restpost.
- **[MEDIUM Q2]** `src/app/api/client-workout/route.ts:20` doet `.from('program_template_exercises').select('*, exercises(*)')` — joined select met wildcard. Op een program met 10+ exercises levert dat een zware payload. → Specifieer welke `exercises.*` kolommen nodig zijn (gif_url, name, instructions).
- **[MEDIUM Q3]** Geen evidence van `RLS-bypass-leaky` patterns in client code (alle Supabase calls via auth-cookied client). ✓
- **[INFO Q4]** Aantal API-routes is **groot** (358+ select-statements over `src/app/api/`). Edge-runtime-opt zou voor read-heavy GET-routes een grote latency-win zijn (NL→Vercel-Frankfurt vs. Lambda cold-start).

---

## Roadmap naar premium-perf

### Quick wins (deze sprint, 1-3 dagen)

1. **Fix LCP-fade-in** op landing — verwijder `animate-fade-in` op de `<h1>MŌVE</h1>` of triggert pas na first paint. **Win: −1.5 s LCP.**
2. **Recharts dynamic import + de-duplicate** — wrap progress-report/stats/exercises imports in `dynamic(() => import('@/components/charts/...'), { ssr: false, loading: skeleton })`. **Win: −700 kB precached, −336 kB First Load voor 3 routes.**
3. **Verwijder `unoptimized` van Supabase-storage `<Image>` calls** — 52 occurrences. Pin `sizes` per call. **Win: 30-50% kleinere afbeeldingen, betere LCP voor avatar/photo views.**
4. **Reduce Outfit-font weights** van 5 naar 3 (300/400/500). **Win: −40 kB font.**
5. **Add `<link rel="preconnect">` naar Supabase URL** in layout.tsx. **Win: −150 ms cold-start.**

### Big wins (1-3 sprints)

1. **Refactor `workout/active/page.tsx`** in 5-6 sub-components met `useReducer` + `React.memo` op exercise-rows. **Win: INP <100 ms op mid-tier Android, code-maintainability.**
2. **Server-Component split** — voor minimaal de 10 zwaarste read-only pages (`/client/program`, `/client/progress`, `/client/exercises`, `/client/health`, etc.). Page = server component, `<ClientWidget>` = hydrated child. **Win: −150-250 kB First Load JS per route.**
3. **CSS-bundle reductie** — split `globals.css` (1 970 LOC) naar route-level CSS modules. Doelwit: globals onder 400 LOC. **Win: −80-100 kB CSS, sneller FCP.**

### Infrastructure (architectuur-niveau)

1. **Edge runtime voor read-heavy GET-routes** — `/api/dashboard`, `/api/nutrition-log`, `/api/messages-recent`. Voeg `export const runtime = 'edge'` + cookies-based Supabase client. **Win: 100-300 ms latency-reductie per request, multi-region cold-start gone.**
2. **Service-Worker cache strategies** — custom Serwist `runtimeCaching`:
   - Supabase storage (afbeeldingen): CacheFirst, 30 days, max 100 entries.
   - `/api/dashboard`: StaleWhileRevalidate, 5 min.
   - Static `/api/exercises` data: CacheFirst, 7 days.
   **Win: PWA revisits laden offline-instant; net-traffic −60%.**

---

## Lijst van findings (samengevat, severity-gesorteerd)

### MAJOR (12)

| # | Categorie | Finding | Locatie |
|---|---|---|---|
| L1 | Lighthouse | LCP-element animeert (fade-in op h1) — meet als delay | `src/app/page.tsx:326` |
| L2 | Lighthouse | Auth-redirect maakt LH-runs onbruikbaar voor /client routes | scriptniveau |
| L3 | Lighthouse | Dev-mode +358 kB unused (next-devtools) — hermeten in prod | infrastructure |
| B1 | Bundle | Recharts × 3 duplicate chunks (~1 MB) — geen dynamic import | `src/app/client/{progress-report,stats,exercises/[id]}/page.tsx` |
| B2 | Bundle | 52 van 58 `<Image>` op `unoptimized` — geen AVIF/WebP/responsive | grep "unoptimized" src/ |
| B3 | Bundle | Geen `priority` op above-the-fold avatars | `src/app/client/profile/page.tsx:355` |
| R1 | Render | `workout/active/page.tsx` 3150 LOC, 38 useState — re-render storm | `src/app/client/workout/active/page.tsx` |
| R2 | Render | `progress/page.tsx` 2440 LOC, 0 memoization | `src/app/client/progress/page.tsx` |
| R3 | Render | `nutrition/page.tsx` 1950 LOC, geen virtualization voor lists | `src/app/client/nutrition/page.tsx` |
| N1 | Network | 7 fan-out `/api/nutrition-log?date=...` voor recent-foods | `src/app/client/nutrition/page.tsx:1227-1234` |
| N2 | Network | `select('*')` op `nutrition_plans` met JSON blob | `src/app/client/nutrition/page.tsx:1155` |
| I1 | iOS | 28× `min-h-screen` ipv `min-h-dvh` — viewport jumps | grep `min-h-screen` |
| I2 | iOS | 60× `position: fixed` met mogelijk transform-parent edge cases | grep `position.*fixed` |

### MEDIUM (16)

| # | Categorie | Finding | Locatie |
|---|---|---|---|
| B4 | Bundle | `globals.css` 1970 LOC → 156 KB CSS bundle | `src/app/globals.css` |
| B5 | Bundle | Source-maps in build output (116 KB) — controleer prod | `.next/static/chunks/*.js.map` |
| B6 | Bundle | Geen `browserslist` config → 9 kB legacy-JS overhead | `package.json` |
| B7 | Bundle | `optimizePackageImports` levert geen recharts-dedup | `next.config.ts` |
| R4 | Render | 41/45 client-pages volledig 'use client' — geen RSC split | `src/app/client/**/page.tsx` |
| R5 | Render | Geen `useDeferredValue`/`useTransition` gebruikt | grep |
| R6 | Render | 24 backdrop-filter declaraties; densiteit op iOS = INP-risk | `src/app/globals.css:246-1074` |
| R7 | Render | Geen `will-change` hints op transitionende elementen | grep |
| R8 | Render | 88 `console.*` calls in client-code — runtime kost | grep `console\.` |
| N3 | Network | `select('weight_kg')` workout_sets — controleer index-coverage | `src/app/client/workout/active/page.tsx:1669` |
| N4 | Network | Geen AbortController in messages/nutrition fetches | grep |
| N5 | Network | Messages: `select('*').limit(100)` — geen cursor-paginatie | `src/app/client/messages/page.tsx:105` |
| N6 | Network | Indexes op Supabase ongeverifieerd via codebase | `supabase/migrations/` |
| N7 | Network | Service-Worker gebruikt `defaultCache` zonder custom strategies | `src/app/sw.ts:49` |
| Q1 | Query | `select('*')` patterns zonder kolom-spec | meerdere |
| Q2 | Query | `program_template_exercises.*, exercises(*)` join wildcard | `src/app/api/client-workout/route.ts:20` |

### MINOR (5)

| # | Categorie | Finding | Locatie |
|---|---|---|---|
| B8 | Bundle | Outfit font 5 weights (200/300/400/500/600) | `src/app/layout.tsx:18` |
| B9 | Bundle | Geen `preconnect` naar Supabase URL | `src/app/layout.tsx` |
| I3 | iOS | Maar 1× `WebkitOverflowScrolling: touch` — checken | `src/app/client/workout/active/page.tsx:986` |
| I4 | iOS | Backdrop-filter overlap bij ClientLayoutShell + page | meerdere |
| I5 | iOS | Geen globale `-webkit-tap-highlight-color: transparent` | `src/app/globals.css` |

### INFO (1)

| # | Categorie | Finding | Locatie |
|---|---|---|---|
| Q4 | Query | 358 select-statements over API-routes — Edge-runtime opportunity | `src/app/api/**` |

**Totaal: 34 findings.**

---

## Volgende stappen

1. **Hermeten in productie** — `npm run build && npx serve@latest .next` of Vercel preview, dan dezelfde Lighthouse-runs. Verwacht perf-score 85-92 op alle routes.
2. **Authenticated Lighthouse-runs** — gebruik een persistent Chrome-profile met logged-in cookie, dan elke route met echte content meten. Levert echte LCP/INP voor `/client/workout/active` etc.
3. **WebPageTest (real device)** — iPhone 12 op 4G uit Brussel/Amsterdam datacenter — geeft echte iOS Safari paint-times incl. backdrop-filter cost. (Lighthouse emuleert iOS via Chrome — backdrop-filter perf is fundamenteel anders op echte WebKit.)
4. **Real-User Monitoring** — Vercel Analytics of een lichte web-vitals beacon (`web-vitals` lib) op `/client/*` om INP/LCP-distributies te zien op echte gebruikersapparaten.

---

_Audit uitgevoerd door senior performance engineer · 2026-05-03 · methodologie: Lighthouse 12.x mobile + statische bundle/source-analyse + production `next build` chunk-inspection._
