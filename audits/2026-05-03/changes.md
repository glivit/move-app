# Optimization Plan · 2026-05-03

## Will fix this run

### Blockers
- [ ] B-001 · Auth-gate `/api/ai-test`, `/api/ai-feedback`, `/api/ai/nutrition-plan`
- [ ] B-002 · Auth-gate `/api/workout-complete` (coach-debug-sessions already has guard — re-verify)
- [ ] B-003 · Limit + order messages query in `client/messages/page.tsx`

### Majors
- [ ] M-001 · ESLint ignores: add `.next*/**`, `.claude/worktrees/**`, `scripts/tmp/**`
- [ ] M-002 · Reduce backdrop-filter in chat bubbles (solid bg in scroll list)
- [ ] M-003 · Split workout/active panels into separate files w/ dynamic import
- [ ] M-004 · Dynamic import recharts in stats / progress-report / exercises pages
- [ ] M-005 · Remove unused deps `@daily-co/daily-js` and `html5-qrcode`
- [ ] M-006 · Stabilize `refresh` ref in useMessageSubscription useEffect
- [ ] M-007 · Add Zod validation to formerly-unauth'd routes (B-001/B-002)
- [ ] M-008 · Add limits to `coach/clients/[id]/progress` query
- [ ] M-009 · Add `.limit(100)` to `/api/checkins` GET
- [ ] M-010 · Coach loading.tsx: replace #A6ADA7 with token-based skeleton color
- [ ] M-011 · Rate-limit middleware on auth/AI routes (DEFER — outside scope of single-file fix)
- [ ] M-012 · ChatInput: revoke ObjectURL on unmount + cancel

## Deferred (logged in todo.md)
- M-003 split panels — too invasive (3150 lines, 11 components, 30+ min work, high regression risk for active workout flow). Will defer.
- M-011 rate-limiting — needs IP-bucket middleware, new module, infra decision. Defer.
- All MINORs and NITs.

---

## Progress

