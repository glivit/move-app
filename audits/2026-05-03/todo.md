# Deferred items · 2026-05-03

Items below were intentionally not fixed in the optimizer run. Each has a one-line reason and a pointer to the original finding in `code-report.md`.

## Majors deferred

- **M-003** · split `src/app/client/workout/active/page.tsx` (3150 LOC, 11 components → 4 separate files w/ `dynamic()`). High regression risk on the live workout flow; needs its own focused PR with QA pass on iOS Safari + offline sync. Estimated effort: M.
- **M-004 (partial)** · inline recharts imports in `src/app/client/stats/page.tsx`, `src/app/client/progress-report/page.tsx`, `src/app/client/exercises/[id]/page.tsx`. The chart-using JSX is tightly coupled to data shapes inside each page; clean fix is to extract chart subtree → `<StatsCharts>`/`<ProgressReportCharts>`/`<ExerciseCharts>` component files and dynamic-import them. Same pattern as `ProgressLineChart`/`HealthChart` consumers (already done). Estimated effort: S each, ~30 min total.
- **M-011** · rate-limiting middleware on `/api/auth/*` and AI routes. Needs IP-bucket strategy choice (in-memory vs Upstash vs Vercel Edge KV) — beyond scope of single-file optimizer run. Open follow-up issue with infra decision required. Estimated effort: M.

## Minors (skipped per scope)

All MINOR items from `code-report.md` are deferred to a separate cleanup run:

- **m-001** · single source-of-truth for `backdrop-filter` in `globals.css` (use existing `--glass-blur-*` tokens consistently)
- **m-002** · orphan `--glass-blur` / `--glass-blur-strong` vars (60/80px no longer referenced)
- **m-003** · `.card-v2-flat` missing the 7 `--card-text-*` tokens
- **m-004** · `CANVAS_BG` duplicated between `messages/page.tsx` and `globals.css`
- **m-005** · regex pass to convert hardcoded `rgba(28,30,24,…)` / `rgba(192,252,1,…)` global utilities to vars
- **m-006** · `coach/clients/[id]/intake/page.tsx:98:17` — 25 ESLint errors on one line, fix typing
- **m-007** · `prefer-const` in `lib/sync-queue.ts:25` and `lib/progression.ts:148`
- **m-008** · verify `public/sw.js` legacy stub usage in telemetry, plan removal
- **m-009** · measure build size before/after removing `@supabase/supabase-js` from `optimizePackageImports`
- **m-010** · move `coach-debug-sessions` logic into Server Component or gate behind `NODE_ENV !== 'production'`
- **m-011** · decide on telemetry implementation for `lib/{performance,analytics,error-logger}.ts` stubs
- **m-012** · generate `database.types.ts` with `supabase gen types`, eliminate 115 `as any` casts
- **m-013** · per-route inline-style sweep → token-class equivalents
- **m-014** · add `.order('created_at')` to coach `.limit(1)` profile lookup
- **m-015** · single-source for client-app canvas gradient

## Nits (skipped per scope)

- **n-001..n-007** · all logged in `code-report.md`, none touched this run
