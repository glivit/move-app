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

