# Code Audit · 2026-05-03

Stack: Next.js 16.1.6 (Turbopack) · React 19.2.3 · Tailwind v4 · Supabase SSR · Serwist 9 · TypeScript strict.

## Samenvatting
- **TS errors:** 0  (`npx tsc --noEmit` is schoon — was de must-have post-fix gate, zit nog steeds groen).
- **ESLint errors:** 484 op `src/`, 0 warnings. Geen warnings boven baseline. Bulk = `@typescript-eslint/no-explicit-any` (381) en `react-hooks/static-components` (48). Geen blockers. Lint op de hele repo telt 2021 errors door scan op `.next 2/` (ongeïgnoreerde build-artefact-folder, zie m-001) en `.claude/worktrees`.
- **Top 5 perf hotspots:**
  1. Chat (messages page) is *niet* gevirtualiseerd, elke `ChatBubble` is een eigen `backdrop-filter` glass-laag → bij >25 messages in viewport zware paint cost op iOS.
  2. `src/app/client/workout/active/page.tsx` 3150 lines / 118 hooks — werkt nu via `memo()` per child (Set/Rest/Picker), maar één file voor 7 panels = grote re-render footprint en moeilijk te tree-shaken.
  3. Recharts is enkel in 6 components nodig maar wordt **niet** dynamic geïmporteerd in client routes (`stats`, `progress-report`, `exercises/[id]`) → in initial bundle.
  4. `html5-qrcode` (~1.4 MB) en `@daily-co/daily-js` (~600 kB) staan als directe deps, maar zijn nergens geïmporteerd in `src/`. Dead bundle weight tenzij Vercel ze tree-shaket.
  5. 717 hardcoded `#A6ADA7` / `#E6E8E7` / `#C85A2A` hex literals in TSX (zie m-005). Geen perf-hit op zich, maar elke style-mutatie = duplicate-paint risico zonder centrale token.
- **Top 5 robustness gaps:**
  1. Vier API-routes draaien zonder auth-gate met `createAdminClient()` (zie B-001..B-003). RLS-bypass voor willekeurige binnenkomers.
  2. Berichten-query haalt **alle** historiek op zonder `.limit()` — DoS-vector + UX-trage cold-start na ~6 mnd gebruik.
  3. Slechts 9/81 API-routes valideren input via Zod. Rest leest losse fields uit `request.json()` zonder shape-check.
  4. Service-worker `skipWaiting:false` is correct, maar de prompt-component die de update aankondigt zit niet in `ClientLayoutShell` — onduidelijk waar die hangt; kan unreachable zijn.
  5. `useMessageSubscription.ts:267` roept `refresh()` direct in `useEffect` aan (gevangen door react-hooks lint, set-state-in-effect cascade-rerender).

---

## Findings

### Blockers

- **[B-001]** `/api/ai-test`, `/api/ai-feedback`, `/api/ai/nutrition-plan` accepteren een POST zonder auth-gate en gebruiken admin-client + Anthropic SDK. Iedere bezoeker kan dus AI-cost forceren en in geval van `nutrition-plan` willekeurige `nutrition_plans`-rows aanmaken voor een opgegeven `userId`. · `src/app/api/ai-test/route.ts:13-30`, `src/app/api/ai-feedback/route.ts:22-40`, `src/app/api/ai/nutrition-plan/route.ts:14-25` · Root cause: bij toevoegen van AI-paden zijn de auth-helpers (`getAuthFast`/`createServerSupabaseClient`) niet meegenomen. · Fix: prepend `const { user } = await getAuthFast(); if (!user) return 401`. Voor `ai/nutrition-plan` ook `userId === user.id || role === 'coach'`. · Effort: S.

- **[B-002]** `/api/workout-complete` en `/api/coach-debug-sessions` schrijven met admin-client (push notifs + system message → coach) op basis van een sessionId in body, zonder auth. Spamvector + arbitrary-coach-spam. · `src/app/api/workout-complete/route.ts:23-35` · Fix: lees user uit cookie, valideer `session.client_id === user.id`. · Effort: S.

- **[B-003]** `src/app/client/messages/page.tsx:103` `messages.select('*')` zonder `.limit()` of pagination. Bij langlopende coaching-relatie (>1000 messages) blijft de page ~secs hangen op cold open en houdt alle bubbles tegelijk gemount in DOM mét backdrop-filter. Op iPhone met thermische throttling = jank in scroll. · Fix: `limit(50)` + cursor-paginate older-on-scroll, of virtualisatie (zie M-002). · Effort: M.

### Major

- **[M-001]** `eslint.config.mjs` ignoreert `.next/**` maar niet `.next 2/**`, `.claude/worktrees/**`, of `scripts/tmp/**` → ESLint rapporteert 1537 false-positive errors op build-artefacten. Maakt CI-gate onbruikbaar (signaalverlies). · Fix: voeg `".next*/**"`, `".claude/worktrees/**"`, `"scripts/tmp/**"` toe aan `globalIgnores`. · Effort: S.

- **[M-002]** `src/app/client/messages/page.tsx:292-313` rendert per message een `<ChatBubble>` met eigen `backdrop-filter: blur(18-20px) saturate(130-140%)`. Geen virtualisatie. Bij ≥25 zichtbare bubbles overschrijdt dit de "8 blur surfaces"-richtlijn ruim. iOS Safari paint > 16ms/frame bij scroll. · Fix: solid background voor bubbles in scroll-list, blur reserveren voor input-pill + header; óf `react-virtual` met windowing. · Effort: M.

- **[M-003]** `src/app/client/workout/active/page.tsx` = 3150 lines / 11 sub-componenten in één file. Goed gemanaged via `memo()`, maar (a) lazy chunk-splitting onmogelijk → workout-route haalt `IntervalTimerPanel`+`CardioTimerPanel`+`ExercisePickerModal`+`FormCheckModal` ook in voor users die ze niet openen, (b) review/onderhoud zwaar. · Split-points: `IntervalTimerPanel` (l.296-550), `CardioTimerPanel` (l.152-292), `ExercisePickerModal` (l.680-1063), `FormCheckModal` (l.1083-1213) → eigen bestanden + `dynamic(() => import…, { ssr:false })` hangs. · Effort: M.

- **[M-004]** Recharts wordt eager geïmporteerd in `src/app/client/stats/page.tsx`, `src/app/client/progress-report/page.tsx`, `src/app/client/exercises/[id]/page.tsx`, `src/components/coach/ProgressCharts.tsx`, `src/components/coach/ClientHealthChart.tsx`, `src/components/client/HealthChart.tsx`. `optimizePackageImports` helpt voor tree-shaking maar kan de SVG-renderer (~50 kB gz) niet weghalen uit initial chunks. · Fix: `const HealthChart = dynamic(() => import('@/components/client/HealthChart'), { ssr:false })` op de page, en niet de chart-component zelf. · Effort: S.

- **[M-005]** `@daily-co/daily-js` (`package.json:15`) en `html5-qrcode` (`package.json:24`) zijn nergens in `src/` geïmporteerd. Nooit afgerond feature, of dood gewicht. · Fix: verwijderen of dynamic importen achter feature-flag. · Effort: S.

- **[M-006]** `useMessageSubscription.ts:266-268` roept `refresh()` direct in `useEffect` aan zonder guard, en `refresh` heeft `coachId` als dep → cascade re-render. Lint flag `react-hooks/set-state-in-effect`. · Fix: `useEffect(() => { refresh() }, [coachId])` of `refresh` in `useEvent`. · Effort: S.

- **[M-007]** Slechts 9 van 81 API routes gebruiken Zod. Rest leest losse fields uit `request.json()` zonder shape-check. Voorbeelden: `workout-complete` (sessionId), `ai-feedback` (sessionId), `messages` (content/file_url) — typed but unverified. · Fix: introduceer `lib/api/validate.ts` helper en `z.object` op alle POST/PATCH endpoints. · Effort: M (incrementeel; start met de unauth'd routes uit B-001/B-002).

- **[M-008]** `src/app/coach/clients/[id]/progress/page.tsx:256-259` doet `select('*')` op `checkins`, `workout_sessions` en `exercises` zonder limit. Voor power-clients (>2 jaar) → meerdere MB JSON over de wire. · Fix: `.limit(180)` op checkins/workouts (~6 maanden window), `select('id, name, name_nl, muscle_group')` op exercises. · Effort: S.

- **[M-009]** `src/app/api/checkins/route.ts:13` doet `from('checkins').select('*').order(date desc)` zonder limit. Coach inbox houdt alle history. · Fix: `.limit(100)` of date-window. · Effort: S.

- **[M-010]** `src/app/coach/loading.tsx` gebruikt 19× hardcoded `#A6ADA7` als skeleton-kleur. Na de aurora-migratie hoort dit `var(--card-bg-tint)` of `rgba(28,30,24,0.08)` te zijn. Skeleton flasht nu in oude greenscale terwijl rest van page in beige tint zit. · Fix: replace-all op de loading.tsx files in `src/app/coach/**`. · Effort: S.

- **[M-011]** Geen rate-limiting op publieke POST endpoints (login, reset-password, ai-test). `reset-password` is correct silent over user-existence (line 21-24), maar zonder rate-limit kan een attacker enumeration via timing of mass-flood pas-reset emails. · Fix: middleware met IP-bucket (~5/min) op `/api/auth/*` en alle AI-routes. · Effort: M.

- **[M-012]** `ChatInput.tsx` bevat een `useEffect` cleanup voor MediaRecorder, maar geen cleanup als de user mid-recording navigeert weg en `onSend` faalt → file blob in memory + nooit `revokeObjectURL`. · `src/components/client/ChatInput.tsx:68-76` · Fix: cleanup bij unmount + `URL.revokeObjectURL(filePreview.localPreview)` na send/cancel. · Effort: S.

### Minor

- **[m-001]** `globals.css` is 1970 lines met 24 inline `backdrop-filter` declaraties verspreid over `.v6-card`, `.v6-card-dark`, `.dark-surface`, `.glass-warm`, etc. Single source-of-truth voor blur ontbreekt — varieert nu tussen 12-24px. · `src/app/globals.css:246/276/296/326/341/349/372/379/1016/1073/1253/1334` · Fix: gebruik `var(--glass-blur-light)`/`var(--glass-blur)` consistent (deze tokens bestáán al in `:root`). · Effort: S.

- **[m-002]** `:root` definieert nog `--glass-blur: 60px` en `--glass-blur-strong: 80px` (`src/styles/variables.css:78-79`) maar deze waardes worden in geen enkele `.css` of `.tsx` meer gebruikt — overgehaalde-vars na migratie naar 24/18/20px hard-coded values. · Fix: óf vars updaten naar 24/18/20 en globals.css ernaar laten verwijzen, óf orphan vars verwijderen. · Effort: S.

- **[m-003]** Card-scoped vars (`--card-text`, `--card-text-soft`, etc.) zijn correct gedefinieerd in `.v6-card` (l.231-241), `.v6-card-dark` (l.262-273), `.dark-surface` (l.362-373) en als fallback op `body` (l.135-142), maar `.card-v2-flat` (l.339) ontbreekt deze tokens — content erin krijgt `body`-fallback (dark text op licht), wat vrijwel altijd correct is, maar bij `.card-v2-flat` binnen een dark-context (bv. modal) breekt contrast. · Fix: voeg dezelfde 7 token-defs toe als `.v6-card`. · Effort: S.

- **[m-004]** `src/app/client/messages/page.tsx:54-58` definieert `CANVAS_BG` als 4-stop radial-gradient string, identiek aan `.client-app::before` in globals.css (l.183-191). Duplicated definition — drift bij volgende design-aanpassing zeker. · Fix: import uit één centraal token file of laat layout-shell de canvas regelen, page laat `transparent` body. · Effort: S.

- **[m-005]** 569× hardcoded `rgba(28,30,24,…)` (= `--color-ink`) en 70× hardcoded `rgba(192,252,1,…)` (= `--color-accent`) in client TSX. Migratie pad zegt vars gebruiken; veel van deze zijn correct (bubble-scoped, modal-scoped), maar global utilities zoals `INK_FAINT = 'rgba(28,30,24,0.55)'` zouden `var(--card-text-faint)` moeten gebruiken. · Fix: regex-pass over `src/components/client/` + `src/app/client/`, vervang globale color-consts → vars. · Effort: M.

- **[m-006]** `src/app/coach/clients/[id]/intake/page.tsx` heeft 25 ESLint errors op één regel (`98:17`) — vermoedelijk dat een hele JSX-tree in één regel op een no-explicit-any catch zit. Inspect en fix typing. · Effort: S.

- **[m-007]** `src/lib/sync-queue.ts:25` en `src/lib/progression.ts:148` flagged als `prefer-const` — `let` zonder reassignment. Cosmetic. · Fix via `--fix`. · Effort: XS.

- **[m-008]** `public/sw.js` legacy stub bestaat naast `src/app/sw.ts` (Serwist). Comment zegt "Dit bestand kan weg zodra <1% van clients het nog registreert". Verifieer in telemetry en plan removal. · Effort: S.

- **[m-009]** `next.config.ts` `experimental.optimizePackageImports` lijst bevat `'@supabase/supabase-js'` — sinds versie 2.99 zijn de hoofd-export al ESM-friendly, optimizePackageImports voegt nu weinig toe en kan in zeldzame gevallen tree-shaking corrumperen voor server-only paden. · Fix: meet build size voor/na, overweeg te verwijderen voor supabase. · Effort: S.

- **[m-010]** `src/app/api/coach-debug-sessions/route.ts` is een interne debug-route die in productie gemount blijft. Heeft auth-check (`role:coach`), maar exposeer info die debug-flow eigenlijk via `/coach/debug-sessions/page.tsx` (server) zou moeten doen. · Fix: gate achter `process.env.NODE_ENV !== 'production'` of verplaats logica naar Server Component. · Effort: S.

- **[m-011]** 5 `TODO`s in `src/lib/{performance,analytics,error-logger}.ts` zeggen "Send to analytics service" — alle drie zijn no-op stubs. Telemetry niet geïmplementeerd terwijl performance.ts wel iets meet. · Fix: keuze maken (Sentry/PostHog/eigen endpoint) of stub helder doc-en als "geen telemetry". · Effort: S/M.

- **[m-012]** 115 `as any` casts in `src/`. Vooral in `lib/dashboard-data.ts` (38) en `app/api/progress/route.ts` (34). Zonder type-veiligheid op de hot path naar dashboard. · Fix: genereer `database.types.ts` via `supabase gen types` en gebruik die. · Effort: M.

- **[m-013]** Inline-style densiteit: `src/app/client/progress/page.tsx` 187× `style={{`, `workout/active/page.tsx` 185×, `nutrition/page.tsx` 144×. Voor enkele kleine `:hover`/animation niet anders mogelijk, maar Aurora system heeft `.v6-card` etc als utilities — veel inline-styles dupliceren wat `.v6-card` al kan. · Fix: per route een sweep over inline-styles → equivalent token-class. · Effort: M.

- **[m-014]** `src/app/client/messages/page.tsx:95` query op `profiles` voor coach gaat met `.limit(1)` maar zonder ordering → niet-deterministisch welke coach gepakt wordt als er ooit meer komen. App is single-coach, maar maak het defensief. · Fix: `.order('created_at').limit(1)`. · Effort: XS.

- **[m-015]** `src/app/client/ClientLayoutShell.tsx:30-37` doet sync-queue init via `import('@/lib/sync-queue')` in `useEffect`. OK voor offline path, maar `client-app/min-h-screen` div errond gebruikt nog steeds gradient die ook in body-css zit (m-004) — dubbele paint van `radial-gradient`. · Fix: laat één laag het canvas serveren. · Effort: S.

### Nits / TODO-cleanup

- **[n-001]** `console.error` calls (74 in `src/app/client/`) lekken in productie naar console — ok voor diag, maar zonder `error-logger.ts` wrapper niet in tooling te krijgen. Zie m-011. 

- **[n-002]** `src/app/client/settings/health-connect/page.tsx:93` TODO "Open Terra widget for OAuth flow" — feature-flag de pagina als nog niet af, of remove. 

- **[n-003]** `src/components/client/ChatBubble.tsx:393/430/469` declareren `backdropFilter` 3× nominally identiek (`blur(20px) saturate(140%)` voor coach, `blur(18px)…` voor me, `blur(20px)…` voor typing). Centraliseer als const aan top of file (gestart met `CARD_LIGHT`/`CARD_DARK`, niet doorgetrokken naar blur strings). 

- **[n-004]** `src/app/globals.css:179` definieert `h1..h6 { color: #FDFDFE }` (hard wit), maar `body` is `color: #1C1E18` (dark). Headings krijgen dus standaard wit-op-licht — alleen leesbaar binnen `.v6-card-dark` of `.dark-surface` waar hun parent override wint. Voor `<h1>` op canvas of in `.v6-card` (light) is dit ongetest. · Fix: `color: var(--card-text, #1C1E18)`. 

- **[n-005]** `vercel.json` is leeg `{}`. Crons staan dus niet via Vercel scheduling — controleer of crons echt via Vercel Cron triggert (auth header check is wel aanwezig).

- **[n-006]** `src/styles/variables.css:131` — `--shadow-card-dark` heeft een `inset 0 1px 0 rgba(255,255,255,0.10)` highlight, maar `--shadow-card` start de highlight op `0.5`. Voor donker → licht overgang (zoals `card-elevated-v2`) is dat een visuele inconsistency. 

- **[n-007]** Custom hook `useMessageSubscription` is 270+ regels, doet en `messages` én `subscriptions` én `presence`. Single-responsibility shaving = makkelijker testbaar. 

- **[n-008]** `src/app/client/workout/active/page.tsx:1666-1673` doet PR-detect met losse Supabase-call binnen click-handler (per set-completion). Geen N+1 in render-loop dus geen blocker, maar 2-fase commit (eerst optimistic, dan PR-check) is robuuster + voelt sneller.

---

## Metrics
- **Files >500 lines:** 25 in `src/`. Top: `client/workout/active/page.tsx` (3150), `client/progress/page.tsx` (2440), `onboarding/page.tsx` (2088), `client/nutrition/page.tsx` (1950), `coach/clients/[id]/nutrition/page.tsx` (1693).
- **Files >800 lines:** 13.
- **Backdrop-filter total:** 139 hits in `src/`. Max blur-radius nu **24px** (was 60-80 vóór sed-pass — bevestigd schoon). Per-route inline blur-counts: DashboardClient 0, workout/active 1, workout/page 0, nutrition 0, messages 0 (de blur zit in ChatBubble component, daar inderdaad 3 declaraties × N messages).
- **Inline `style={{}}` count:** zwaar geconcentreerd, top-3 ≥ 144 per file.
- **Hardcoded ink rgba (28,30,24,…):** 569 in client TSX.
- **Hardcoded lime rgba (192,252,1,…):** 70 in TSX.
- **Stale gray hex (`#A6ADA7`/`#E6E8E7`/`#C85A2A`):** 717 — vooral coach loading-skeletons.
- **TODO/FIXME age >30 dagen:** 5 (allen in lib/, geen aged dates in commits maar staan al in oudere refactor — alle als cleanup-batch).
- **`as any` casts:** 115.
- **API routes zonder Zod-validatie:** 72 / 81.
- **API routes zonder auth-gate (geen webhook/cron):** 4 (zie B-001/B-002).
- **Supabase queries zonder `.limit()` op grote tables:** ≥10 (zie B-003, M-008, M-009).

---

## Recommended next actions
1. **Fix B-001 + B-002 vandaag.** Vier API-routes met admin-client zonder auth = direct exploiteerbaar. Patroon kopiëren van `/api/coach/week-overview` (`getAuthFast` + role check). 30 min werk, voorkomt cost-DDoS + arbitrary message-spam.
2. **Pagineer berichten + virtualiseer chat-list (B-003 + M-002).** Limit op 50 + windowing (`react-virtual`) verlost iOS Safari direct van de meest concrete paint-bottleneck na de blur-fix. Pakt ook de #1 user-visible perf hit aan.
3. **ESLint config + bundle clean-up (M-001 + M-005).** Eerst ignores recht trekken zodat CI signaal heeft, daarna `html5-qrcode`/`@daily-co/daily-js` weg + recharts dynamic. Levert direct kleinere initial bundle voor cold-start op mobile.
