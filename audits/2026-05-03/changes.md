# Optimization Plan · 2026-05-03

## Will fix this run

### Blockers
- [x] B-001 · Auth-gate `/api/ai-test` (coach-only), `/api/ai-feedback` (session-client or coach + Bearer fallback for internal call), `/api/ai/nutrition-plan` (self or coach)
- [x] B-002 · Auth-gate `/api/workout-complete` (session.client_id must match user, or caller is coach); `coach-debug-sessions` already had its own guard (re-verified)
- [x] B-003 · Limit messages query to 100, order desc on wire, reverse client-side

### Majors
- [x] M-001 · ESLint ignores: add `.next*/**`, `.claude/worktrees/**`, `scripts/tmp/**`
- [x] M-002 · Solid backgrounds for chat bubbles (blur kept on typing indicator only)
- [ ] M-003 · Split workout/active panels — DEFERRED (3150 LOC refactor, high regression risk for live workout flow)
- [ ] M-004 · Dynamic recharts — PARTIAL (consumer-component pattern was already done for ProgressLineChart/HealthChart; DEFERRED for stats/progress-report/exercises pages where recharts is inline)
- [x] M-005 · Removed `@daily-co/daily-js` and `html5-qrcode` from package.json (verified zero src/ imports)
- [x] M-006 · Stabilized `refresh()` effect dep in useMessageSubscription
- [x] M-007 · Added basic typeof shape-checks on the four newly-auth'd routes (full Zod sweep deferred)
- [x] M-008 · Limited progress-page queries: checkins/sessions to 180, PRs to 200, exercises trimmed to needed cols
- [x] M-009 · Added `.limit(100)` to `/api/checkins` GET
- [x] M-010 · Coach loading.tsx now uses ink-tint skeleton tokens, no more pre-aurora #A6ADA7
- [ ] M-011 · Rate-limiting middleware — DEFERRED (needs new module + IP-bucket strategy decision)
- [x] M-012 · ChatInput: revoke ObjectURL on unmount, on send, and on overwrite

## Deferred (logged in todo.md)
- M-003 — workout/active 3150-LOC split
- M-004 (page-level inline recharts in stats / progress-report / exercises)
- M-011 — rate-limiting infra
- All MINORs and NITs

---

# Optimizer Round 2 · 2026-05-03

## Plan

### Blockers
- [ ] BL-AW1 · active-workout: koppel X-icoon en/of MŌVE-mark aan `setCloseConfirm(true)` zodat closeConfirm-modal bereikbaar is
- [ ] BL-AW2 · active-workout: smart-prefill mag niet stille verlagen — ook geprefilde reps tonen of dim voor user-awareness
- [ ] BL-AW3 · active-workout: `addedExercises` reconstructie zonder `target_muscle` — fix in load
- [ ] BL-AW4 · active-workout: kebab — false-positive, SKIP
- [ ] BL-FORM1 · onboarding `canProceed` — geen feedback over missing fields → `attemptedAdvance` toggle + `aria-invalid`
- [ ] BL-FORM2 · onboarding `<input type="date">` op iOS → 3 separate inputs of `color-scheme: dark`
- [ ] BL-FORM3 · PhotoUploadStep camera permission disambiguation
- [ ] BL-FORM4 · weekly check-in: weight overflow bij iPhone SE
- [ ] BL-FORM5 · profile/edit: avatar foto-knop niet functioneel — SKIP (profile/health redesign sprint 2)
- [ ] BL-FORM6 · weight-log button kleur `#1F231F` → `#FDFDFE`
- [ ] BL-A11Y1 · `userScalable: false` weg in layout.tsx
- [ ] BL-A11Y2 · ClientBottomNav: `<div role="navigation" aria-expanded>` → echte `<button>` (DEFER → sprint 2, raakt nav primitive)
- [ ] BL-A11Y3 · onboarding contrast 2.05:1 — dark canvas backdrop or text-color bump
- [ ] BL-A11Y4 · auth reset/set-password contrast issues
- [ ] BL-A11Y5 · DashboardClient `<h1>` ontbreekt
- [ ] BL-A11Y6 · 0× `aria-describedby` en `aria-invalid` — wordt verholpen via Input primitive
- [ ] BL-A11Y7 · form errors zonder `role="alert"`/`aria-live`
- [ ] BL-A11Y8 · globale `outline: none` — fix met `:focus-visible` ring
- [ ] BL-PERF1 · LCP h1 fade-in op landing page

### Pattern A — Input primitive
- [ ] PA-1 · Bouw `src/components/ui/Input.tsx` als consolidated primitive
- [ ] PA-2 · Migreer login `FloatingInput` → Input
- [ ] PA-3 · Migreer reset-password `AnimatedInput` → Input
- [ ] PA-4 · Migreer set-password `AnimatedInput` → Input
- [ ] PA-5 · Migreer onboarding `TextInput` → Input
- [ ] PA-6 · Globale `outline: none` weg in 4 selectors

### Pattern C — EmptyState primitive
- [ ] PC-1 · Bouw `src/components/ui/EmptyState.tsx`
- [ ] PC-2 · Plaats op `/client/workout` empty
- [ ] PC-3 · Plaats op `/client/nutrition` empty
- [ ] PC-4 · Plaats op `/client/program` empty
- [ ] PC-5 · Plaats op `/client/workout/history` empty
- [ ] PC-6 · Plaats op `/client/progress-report` empty
- [ ] PC-7 · Plaats op `/client/meal-plan` empty
- [ ] PC-8 · `/client/settings` redirect → `/client/profile`
- [ ] PC-9 · `/client/accountability` als bestaat

### Pattern D — Bundle quick wins
- [ ] PD-1 · Dynamic-import recharts (LazyLineChart wrapper)
- [ ] PD-2 · Verwijder `unoptimized` op Supabase-storage Image calls
- [ ] PD-3 · Verwijder `userScalable: false` + `maximumScale: 1` (= BL-A11Y1)
- [ ] PD-4 · Fade-in op `<h1>MŌVE</h1>` LCP weg/verminder (= BL-PERF1)

