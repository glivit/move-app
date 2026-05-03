# Sprint 2/3 — Deferred from Optimizer Round 2 · 2026-05-03

Round 2 (this run) addressed all sprint-1 blockers + Pattern A (Input
primitive), Pattern C (EmptyState placement) and Pattern D (recharts +
Image-optimization quick wins).

The items below were explicitly out of scope and need follow-up.

---

## Design-call required (not pure execution)

- **Profile / Health redesign** — medisch formulier UX (a11y-report 1.4.3
  + forms-report). Needs designer pass on activity-level segmented control,
  health questionnaire IA, and inline error-handling spec.
- **Profile / Privacy GDPR content** — copy + legal review.
- **Lime-accent semantics policy** — when is lime allowed?
  (Voltooid · current set · PR are documented, but `EmptyState` icon-
  circle uses lime soft-tint by default — confirm this is acceptable for
  general "geen data" affordance, not just events.)
- **active-workout: split into sub-components + useReducer** (perf-report
  R1 / code-report M-003) — 3 150 LOC, 38 useStates. iOS QA pass needed
  on real device before/after the split.
- **active-workout: real rest-timer modal** with pause/skip/audio cue
  (active-workout-report MAJOR §7).
- **Exercise-picker filters** — body-part chips + recent-used (active-
  workout-report §6 MAJOR).

## Code-only follow-ups (sprint 2 scope)

### Active-workout (active-workout-report)

- [ ] Avatar-link in top-bar is a dead `<div>` — make it a Link to
      `/client/profile` or remove.
- [ ] `pt-safe` + `padding 10px` causes drukke top — review on iPhone w/
      dynamic island.
- [ ] Klaar-link in preview-mode mist — voeg Annuleer-link toe.
- [ ] KG/LBS toggle als chip i.p.v. 11px text-link.
- [ ] Long-press 500 ms → 350 ms; visual hold-progress (radial fill).
- [ ] Swipe-to-delete UNDO toast (4 s).
- [ ] PR-badge naast prevLabel, niet ervoor in plaats van.
- [ ] `set-row.checked` background `#2FA65A` te fel — gebruik
      `rgba(47,166,90,0.12)`.
- [ ] Set-type popup `top-full` — flip up bij laatste set.
- [ ] `c-prev` zonder unit-suffix bij lbs-mode.
- [ ] `ex-drag.opacity 0.45` → 0.7 (drag-handle visibility).
- [ ] `removeExercise` UI-pad bouwen via kebab-menu (Toon info / Verwijder
      oefening / Vervang). Bestaat reeds als BL-AW4 false-positive in de
      brief — kebab-knop opent nu nog direct het info-panel; menu-laag
      toevoegen is sprint 2.
- [ ] Cardio detection — gebruik `category` flag i.p.v. naam-substring.
- [ ] IntervalTimerPanel attention-cue versterken (rgba 0.08 → 0.18 +
      audible beep).
- [ ] Confetti reduce 40 → 20 particles + remove `#A6ADA7` (onzichtbaar).
- [ ] PR celebration 3 s → 5 s + dismiss-on-tap.
- [ ] Auto-save explicit retry (huidige logica skipt op identieke hash).
- [ ] `setSets` clones + `memo` SetRow re-render audit.
- [ ] `localStorage` 4 h TTL → UI-warning when restored after lunch.

### Forms (forms-report)

- [ ] `<Textarea>` primitive met maxLength/showCount/error/helperText/
      autoResize. 6+ hand-rolled textareas migreren.
- [ ] `<SegmentedRating>` primitive (NotesStep ScoreSlider, weekly-check-
      in RatingRow, onboarding ChipSingle/ChipMulti — drie versies van
      hetzelfde concept).
- [ ] `<FileUploadZone>` primitive met size-validation, progress, drag-
      drop, HEIC handling.
- [ ] PhotoUploadStep: file-size + file-type enforce (>20 MB reject).
- [ ] PhotoUploadStep: useEffect cleanup voor blob URL leaks.
- [ ] Monthly check-in: localStorage draft per stap.
- [ ] Profile/edit avatar foto-upload — niet-functioneel knop. Sprint-2
      omdat photo-upload primitive eerst bestaat.
- [ ] Profile/notifications: `role="switch" aria-checked` toggle.
- [ ] Profile/health: white-on-white check icon `text-white` →
      `text-[#1C1E18]`.
- [ ] Onboarding sliders: `aria-valuetext`.
- [ ] Onboarding TagInput: `aria-live="polite"` voor "Pasta toegevoegd".
- [ ] ChatInput: HEIC fallback try/catch + audio-MIME-fallback.
- [ ] Generic email-format check client-side vóór network call.

### A11y (a11y-report)

- [ ] **ClientBottomNav rebuild** — semantisch `<nav><button aria-
      expanded><svg aria-hidden /></button>` (BL-A11Y2). Raakt nav-shell;
      sprint-2 omdat ook visuele staten herontworpen worden.
- [ ] Skip-link `<a href="#main">Naar inhoud</a>` in ClientLayoutShell.
- [ ] `<main id="main">` op auth + onboarding pages.
- [ ] `<Dialog>` primitive met focus-trap, Esc, return-focus. Migreer 8+
      modals.
- [ ] Calendar dag-buttons: `aria-label={fullDateString}`.
- [ ] DashboardClient h1 staat op `sr-only` — overweeg zichtbare h1
      ("Home") of "Dashboard" met visueel design.
- [ ] Body-text `text-[#A09D96]` → `text-[#75726B]` op auth gefixed —
      overige client routes audit op `rgba(28,30,24,0.62)` op canvas-
      kleur (effectief 3.4:1).
- [ ] Card-borders `rgba(28,30,24,0.10)` → 0.20 voor 3:1 (1.4.11).
- [ ] Macro-bars `role="progressbar"` + aria-valuenow/min/max.

### Performance (perf-report)

- [ ] Remove inline recharts in nutrition aggregations (currently OK).
- [ ] `globals.css` 1 970 LOC → CSS modules per route (target < 400 LOC
      globals).
- [ ] Browserslist config in package.json.
- [ ] Outfit font: drop weight 600 (5 → 4 weights, save ~20 kB).
- [ ] `<link rel="preconnect">` naar Supabase URL in layout.tsx.
- [ ] `priority` prop op above-the-fold avatars.
- [ ] Server-Component split voor 10 zwaarste read-only client pages.
- [ ] Edge runtime voor `/api/dashboard`, `/api/nutrition-log`,
      `/api/messages-recent`.
- [ ] Service-Worker custom cache strategies (Supabase storage CacheFirst,
      `/api/dashboard` SWR 5 min).
- [ ] Backdrop-filter density audit — vervang below-fold blurs door
      semi-transparent fills.
- [ ] `min-h-screen` (28×) → `min-h-dvh`.
- [ ] `useDeferredValue` op rest-timer + nutrition macro-totaal-recalcs.
- [ ] Babel `transform-remove-console` voor productie (88 console.* in
      client-code).
- [ ] AbortController in `/client/messages` + `/client/nutrition` fetch.

### Code-report deferred items (al gelogd in todo.md round 1)

- M-003 — workout/active 3 150 LOC split (zie active-workout sprint-2).
- M-004 — page-level inline recharts → afgehandeld via LazyRecharts in
  round 2.
- M-011 — rate-limiting infra (nieuwe module + IP-bucket strategy).
- All MINORs en NITs uit code-report.md.

### Active-workout MINORs / NITs

Volledige lijst staat in `audits/2026-05-03/active-workout-report.md`
(35 MINOR · 15 NIT). Triage in een design-werksessie aanbevolen.

### UX-report findings

Niet expliciet in scope — alle 36 findings uit `ux-report.md` waren MAJOR/
MINOR/NIT. Te triëren in sprint 2.

---

## Notes voor volgende ronde

- Pattern B (forms ontbreekt in brief) — er was geen "Pattern B" in de
  brief, dus skip.
- Decimal-tolerant `Input` heeft een `decimal` prop in de nieuwe
  primitive — gebruik die in MetricsInputStep / TapeMeasurementsStep om
  komma → punt op blur te normaliseren in plaats van per submit-handler.
- `ScoreSlider` (NotesStep) heeft `bg-[#1C1E18] text-[#2A2D2B]` voor
  selected — dark-on-dark bug (forms-report MAJOR). Triviale fix maar
  raakt visueel design — design-call eerst.
