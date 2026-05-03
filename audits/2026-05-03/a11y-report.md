# Accessibility (WCAG 2.1 AA) Audit · 2026-05-03

> Auditor: senior accessibility consultant · Tools: axe-core 4.x via Playwright (iPhone 14 Pro emulation), aanvullend grep over `src/`, manual review van DOM-snapshots in `audits/2026-05-03/dom/*.json` en screenshots in `audits/2026-05-03/screens/*.png`. Dev-server: `http://localhost:3002`.

## Samenvatting

- **25 routes gescand** (15 client, 4 client-profile, 3 auth, 1 onboarding, 2 client-secondary).
- **31 axe-violations totaal** (10 nodes color-contrast op 3 routes + 25 nodes meta-viewport op alle routes − overlap = 31 unique). Daarbovenop **~25 manueel gevonden findings** die axe niet detecteert (focus-visible, role-misuse, dialogs zonder semantics, target-size, label-association, error-announcement).
- **Verdeling**: **8 BLOCKER · 14 MAJOR · 18 MINOR · 4 NIT** = **44 findings** (binnen cap van 80).
- **WCAG conformance niveau (huidige status): GEEN**. De codebase faalt op multiple niveau-A criteria (2.1.1 Keyboard, 4.1.2 Name/Role/Value, 1.3.1 Info & Relationships, 3.3.1 Error Identification, 1.4.4 Resize Text via `userScalable: false`). Niveau A is een prerequisite voor AA — zonder die fix is "AA conformant" formeel niet haalbaar.
- **Automated coverage**: axe `passes` ratio is 92% op auth-pages, 96% op client-pages — dus de meeste fouten zijn **structurele** ontwerpkeuzes (onzichtbare focus, te kleine targets, div-met-role) die axe niet als violation flagt maar wel WCAG-blokkerend zijn.

### Top 5 patterns die conformance blokkeren

1. **Globale `outline: none` op alle inputs zonder vervanging** (`src/app/globals.css:703-708`) — breekt 2.4.7 Focus Visible op élke route met een formulier. BLOCKER.
2. **`ClientBottomNav` is een `<div>` met `role="navigation"` + `aria-expanded` zonder echte `<button>`** (`src/components/layout/ClientBottomNav.tsx:57-83`) — toggle is muis-only, geen keyboard, faalt 2.1.1 + 4.1.2. BLOCKER.
3. **70% van alle zichtbare interactieve elementen is <44×44 px** (279 / 399 elementen volgens DOM-snapshot) — faalt 2.5.5 Target Size (Enhanced AAA en al richting AA na WCAG 2.2). MAJOR — pervasive.
4. **`userScalable: false` + `maximumScale: 1`** in `src/app/layout.tsx:60-61` — faalt 1.4.4 Resize Text (niveau A/AA). BLOCKER.
5. **Form errors worden niet aangekondigd** — geen `aria-live`, `role="alert"`, `aria-describedby` of `aria-invalid` (0 hits in de auth-flow). Faalt 3.3.1 + 4.1.3 Status Messages. BLOCKER.

---

## Per WCAG-criteria

### 1.1.1 Non-text Content (A)
- **[MAJOR]** 99 van de 419 buttons in `src/components/` + `src/app/client/` hebben een `aria-label` — d.w.z. **±320 buttons rust voor accessible name op tekstkinderen**, wat oké is als er tekst in zit, maar de DOM-snapshot toont **75 unlabeled visible interactives** verspreid over routes (`calendar.json: 33`, `health.json: 7`, `community.json: 6`). Voorbeeld: 33 calendar `<button>` 40×40 zonder text + zonder aria — vermoedelijk dag-cellen. Audit: `audits/2026-05-03/dom/calendar.json`.
- **[MINOR]** 13 van de 112 SVG's in client-code zijn `aria-hidden="true"`. De overige ±99 SVG's worden door screen readers als anonieme grafische groep voorgelezen of stilgehouden afhankelijk van browser. Standardiseer: decoratieve SVG `aria-hidden` + iconenbutton met `aria-label`. Bestanden: hele `src/app/client/**/*.tsx`.

### 1.3.1 Info and Relationships (A)
- **[BLOCKER]** Heading-hiërarchie ontbreekt op `/client` (DashboardClient.tsx) — **geen `<h1>`**, alleen meerdere `<h2>` (lijnen 678, 705, 728, 757, 773, 792, 807). Screen-reader users krijgen geen page-context.
- **[MAJOR]** `src/app/client/health/page.tsx:180` gebruikt `<h1 className="text-6xl">{value}</h1>` voor een numerieke metric — semantisch fout, headings zijn voor sectiekoppen, niet voor data. Idem mogelijk in andere `*-stat` componenten.
- **[MAJOR]** 0 hits voor `<fieldset>` + `<legend>` in formulieren met radiogroepen (onboarding, weekly check-in goal-keuze, profile diet) — gerelateerde inputs zijn niet semantisch gegroepeerd. Faalt 1.3.1 voor radio-/checkbox-sets.
- **[MAJOR]** Geen `<main>` op `/client` root noch op auth/onboarding pages. `ClientLayoutShell.tsx:149` heeft wel `<main>`, maar `auth/reset-password/ResetPasswordClient.tsx`, `auth/set-password/page.tsx` en `onboarding/page.tsx` ontbreken landmarks. Faalt 1.3.1 + 2.4.1.
- **[MINOR]** Lijst-semantiek: snelle grep toont dat veel "lijsten" als `<div>` + `gap-3` worden gerendered i.p.v. `<ul><li>`. Nutrition-cards, training-cards, message-list zijn allemaal div-stacks.

### 1.4.3 Contrast (Minimum) — AA, 4.5:1 / 3:1
- **[BLOCKER]** **Onboarding (`/onboarding`)** heeft 6 nodes onder 4.5:1 (axe report). Body-copy `rgba(253,253,254,0.62)` op `#8E9890` = **2.05:1** (faalt fors). Visueel bevestigd in `audits/2026-05-03/screens/onboarding.png`. Header `#FDFDFE` op `#8E9890` = 2.93:1 (faalt 3:1 large-text rule). Bron: `src/app/onboarding/page.tsx`.
- **[BLOCKER]** **Auth reset-password** (`/auth/reset-password`): `text-[#A09D96]` op `#FFFFFF` = **2.7:1**. Helper-tekst onder formulieren onleesbaar. `h1` "MOVE" rendered als `text-[#FDFDFE]` (waarschijnlijk dynamic theme-toggle-bug) op `#EEEBE3` = **1.17:1**. `h2` `#FDFDFE` op `#FFFFFF` = **1.01:1** — onzichtbaar.
- **[BLOCKER]** **Auth set-password**: zelfde patronen (`/auth/set-password` → `text-[#A09D96]` op `#EEEBE3` = 2.27:1).
- **[MAJOR]** `ClientBottomNav` labels: `rgba(253,253,254,0.62)` op `#474B48` ≈ **3.8:1** — faalt body-text 4.5:1 (text is 13px → small).
- **[MAJOR]** Veel placeholder-stylings `rgba(28,30,24,0.50)` op `rgba(255,255,255,0.50)` over `#EDECE3` (input-v3 placeholder, `globals.css:662`). Effective contrast ≈ 3:1, faalt 4.5:1 voor text en is daarnaast WCAG 1.4.11 grijs-zone.
- **[MAJOR]** Coach-views gebruiken `text-[rgba(253,253,254,0.35)]` placeholder (`coach/clients/[id]/nutrition/page.tsx:1211, 1503`) op `rgba(253,253,254,0.06)` op donkere bg → effectief ~3:1.

### 1.4.4 Resize Text (AA)
- **[BLOCKER]** `src/app/layout.tsx:57-64`:
  ```ts
  maximumScale: 1, userScalable: false
  ```
  Pinch-to-zoom is uitgeschakeld op viewport-niveau. Slechtziende gebruikers kunnen de UI niet vergroten. Hard fail van 1.4.4. **Verwijder `userScalable: false`** en zet `maximumScale: 5` (of weg).

### 1.4.10 Reflow (AA)
- **[MINOR]** Reflow op 320px CSS-pixels niet getest, maar v6-card hard-coded 280px breed (`v6-card max-w-[280px]` in DashboardClient line 708) → mogelijk horizontaal scrollen op 320px. Manuele check aanbevolen.

### 1.4.11 Non-text Contrast (AA, 3:1 voor UI/borders)
- **[MAJOR]** Card borders `rgba(28,30,24,0.10)` op `#EDECE3` ≈ **1.4:1** — randen zijn onzichtbaar. Faalt 1.4.11 voor componentgrenzen. Voorbeeld: `cardio/page.tsx:188` `border-b border-[rgba(28,30,24,0.10)]`.
- **[MAJOR]** Input-v3 border `rgba(28,30,24,0.14)` op `rgba(255,255,255,0.50)` op `#EDECE3` ≈ 1.7:1 — gebruikers zien velden niet als vrouw zonder placeholder.
- **[MAJOR]** Active dot in `bnav-plus` (`#C0FC01` op `#474B48`) = **9.7:1** voor de dot zelf — fine — maar 3px diameter is sub-WCAG-perceptible voor kleurenblind/visus-impaired. Voeg ook iconen-vorm of underline toe.

### 2.1.1 Keyboard (A)
- **[BLOCKER]** `ClientBottomNav` (`src/components/layout/ClientBottomNav.tsx:57-83`): hele toggle zit op een `<div onClick={...}>` zonder `tabIndex`, zonder `onKeyDown`, zonder echte button. Toetsenbord users kunnen het + niet activeren. De "Esc to close" werkt wel (regel 32) maar er is niets om te openen via TAB.
- **[MAJOR]** Veel cards die navigatie zijn worden als `<Link>` gerenderd (goed) maar veel "interactieve" `<div>`s in DashboardClient hebben `onClick` zonder keyboard-handler. Snelle grep nodig op `onClick=` zonder `onKeyDown`/`role="button"`/`tabIndex`.
- **[MAJOR]** Workout active page heeft inline number-inputs (`set-row .c-kg`, `c-reps`) met `outline: none` op focus. Toetsenbord-gebruikers zien niet welk veld actief is. `globals.css:1477`.

### 2.1.2 No Keyboard Trap (A)
- **[MINOR]** Modals zoals `BugReporter`, `FeedbackWidget`, `ExerciseSearchModal` (8 fixed-inset-0 patterns gevonden) hebben **geen focus-trap**. Tab loopt door de achtergrond. Geen automated check beschikbaar — handmatig nakijken vereist.

### 2.4.1 Bypass Blocks (A)
- **[MAJOR]** Geen skip-link (`#main`) op enige route. Enige `sr-only` hit is in coach/programs (file-input). Voor toetsenbord-users met de bottom-nav betekent dit: TAB door 4-tab-nav + header bij elke route-wissel.

### 2.4.3 Focus Order (A)
- **[MINOR]** Niet automated detecteerbaar; pannen om te checken: `client/profile/edit` (sticky header + form) en `client/check-in` (multi-step). Manuele tab-volgorde-test nodig.

### 2.4.4 Link Purpose (A)
- **[MINOR]** Veel "card-link" patterns hebben enkel een visueel chevron (`Arr` component) als CTA — link-tekst is herhaald paragraaftekst. Acceptabel zolang de hele card de link is, maar screen-reader krijgt soms 80-woord-link.

### 2.4.7 Focus Visible (AA)
- **[BLOCKER]** Globale CSS in `src/app/globals.css`:
  - regel 703-708: `input:focus, textarea:focus, select:focus { outline: none; box-shadow: none; }` — **élk** formulier-veld in de hele app verliest de OS-focus-ring. Vervanging is `border-color` van rgba(28,30,24,0.14) → rgba(253,253,254,0.46) — een nauwelijks zichtbaar lichter randje + de `253,253,254` (witte) variant op een lichte bg geeft géén contrast.
  - regel 664: `.input-v3:focus { outline: none; … }` — gelijkaardig.
  - regel 1477: `.set-row .c-kg, .c-reps { outline: none }`.
  - regel 1873: `.note-box { outline: none }`.
- **[MAJOR]** 17 inline `focus:outline-none` Tailwind-klassen in coach- + auth-bestanden. In de helft (zie file-list `audits/...`) is er **geen `focus:ring`/`focus-visible`-vervanger** (bv. `coach/clients/[id]/nutrition/page.tsx` lijnen 1211, 1223, 1234, 1314, 1399, 1503, 1509, 1546).

### 2.5.5 Target Size (AAA, maar SC 2.5.8 in WCAG 2.2 Level AA = 24px)
- **[MAJOR]** **279 / 399 visible interactives < 44×44 px** (70%). Concrete cijfers per route (DOM-snapshot):
  - `booking.json`: 55/55 too small (typische date-cells)
  - `meal-plan.json`: 3/3
  - `nutrition.json`: 3/3
  - `journey.json`: 6/7
  - `community.json`: 8/9
  - `calendar.json`: 6/37
  - `home.json`: 3/9 (incl. logo-link 62×33, avatar 32×32)
  - `weekly-check-in.json`: 5/8
- **[MAJOR]** Avatar-link top-right is 32×32 op alle routes (`a` met aria="Profiel"). Bottom-nav `+` icon is 68×44 — minimaal 44h maar onder spacing-norm wanneer twee tegen elkaar liggen.
- **[NIT]** "Terug" buttons zijn 54×20 (calendar route) — ver onder minimum.

### 3.1.1 Language of Page (A)
- **[PASS]** `<html lang="nl-BE">` aanwezig in `src/app/layout.tsx:68`. Goed.
- **[NIT]** Mixed-language content (Engelse productnamen "Workout", "Progress" in NL UI) niet apart gemarkeerd met `lang="en"`. Subtiel.

### 3.3.1 Error Identification (A)
- **[BLOCKER]** `src/app/auth/reset-password/ResetPasswordClient.tsx:313-325` toont errors in een `<div>` met `<p>{error}</p>`. **Geen `role="alert"`, geen `aria-live`, geen `aria-describedby` op de input**. Screen reader users krijgen niets te horen wanneer een wachtwoord-validatie mislukt. Identiek in:
  - `src/app/auth/set-password/page.tsx:395-397`
  - `src/app/auth/callback/recovery/page.tsx:90`
  - `src/app/auth/callback/invite/page.tsx:98`
- **[BLOCKER]** **0 hits** voor `aria-describedby` of `aria-invalid` in heel `src/`. Geen enkel formulier koppelt zijn fout-tekst aan een input.
- **[MAJOR]** "Required" indicator: 2 hits in onboarding/auth. De rest van de forms gebruikt impliciete required-state via JS `disabled` op submit-button — gebruiker krijgt geen vooraf indicatie welke velden verplicht zijn.

### 3.3.2 Labels or Instructions (A)
- **[PASS]** `<label htmlFor>` koppeling lijkt consistent gebruikt (141 labels op 211 form-fields in `src/`, en de overige zijn vaak `<select>`/checkbox-binnen-label).
- **[MINOR]** Floating-label pattern in `auth/reset-password` is functioneel maar `<label>` heeft `pointer-events-none` waardoor klikken op label niet focus geeft. Het `htmlFor` attribuut werkt wel voor SR.

### 4.1.2 Name, Role, Value (A)
- **[BLOCKER]** `ClientBottomNav` heeft `role="navigation"` + `aria-expanded` op een `<div>`. `aria-expanded` is alleen geldig op een interactieve role (`button`, `link`, `combobox`...). Dit is een hard fail van 4.1.2.
- **[MAJOR]** Alleen 1 component met `role="dialog"` (`profile/logs/page.tsx:561`). Alle andere fixed-inset-0 modals (zie file-list, ±10) missen `role="dialog"`, `aria-modal="true"`, `aria-labelledby`. Concrete files:
  - `src/components/FeedbackWidget.tsx`
  - `src/components/ui/BugReporter.tsx`
  - `src/components/coach/ExerciseSearchModal.tsx`
  - `src/components/coach/ProgramAssignModal.tsx`
  - `src/components/workout/ActiveWorkoutBar.tsx`
- **[MAJOR]** Switch/toggle-componenten (in `profile/notifications`, `profile/privacy`) zonder `role="switch"` of `aria-checked` — visueel als toggle herkenbaar, programmatisch onbekend voor SR.

### 4.1.3 Status Messages (AA)
- **[BLOCKER]** Toast/error-feedback wordt nergens met `role="status"` of `aria-live` aangekondigd voor de auth-flow en form-submits. De drie hits voor `aria-live` zijn alle 3 voor offline/sync-indicators in app-shell — niet voor user-acties. Faalt 4.1.3 hard.
- **[MAJOR]** `BugReporter`, `FeedbackWidget` success-state: zelfde issue.

### 1.4.13 Content on Hover or Focus (AA)
- **[MINOR]** Niet onderzocht — geen tooltips bekend in mobile-first codebase. Sla over.

### 2.2.1 Timing Adjustable (A)
- **[MAJOR]** `src/app/client/workout/cardio/page.tsx` rest-timer (`restSeconds = 30`) start automatisch zonder pause-knop in het zichtbare UI-pad (regel 50, 102-118). Auto-tellende rest-timer faalt 2.2.1 als er geen pauze/extend-mogelijkheid is. Verifiëren of er een pause-button is.
- **[MINOR]** Geen idle-timeout op auth-sessie zichtbaar — supabase default. Lage prioriteit.

### 2.3.1 Three Flashes or Below (A)
- **[PASS]** Geen flashing-content gevonden. Animaties zitten op 200-400ms cubic-bezier transitions.

### 2.5.1 Pointer Gestures (A)
- **[NIT]** Workout-active page heeft swipe-to-mark-complete op set-rows. Verifiëren dat alternatief tap/click werkt (lijkt ja, want check-button staat ernaast).

---

## Per route — top 3 issues

### `/client` (DashboardClient)
1. Geen `<h1>` op de pagina (1.3.1).
2. Avatar-link 32×32 (2.5.5).
3. Skeleton-cards niet aangekondigd als loading via `aria-busy`/`role="status"` (4.1.3).

### `/client/workout` (overview) + `/client/workout/active`
1. `outline: none` op `.set-row .c-kg/.c-reps` — geen focus-state voor numerieke inputs in active workout (2.4.7).
2. Inline number-inputs zonder `aria-label` of zichtbare label (4.1.2).
3. Set-row is een `<div>` interactie i.p.v. `<button>` voor "complete set" — keyboard-onbruikbaar in active mode.

### `/client/nutrition` + `/client/profile/diet`
1. 3/3 visible interactives `tooSmall`.
2. Macro-bars zonder `role="progressbar"` + `aria-valuenow/min/max` (4.1.2).
3. Card-links accumulate lange paragraaftekst als link-name (2.4.4).

### `/client/messages`
1. 4/4 too small (chat-bubbles als `<button>`?).
2. Geen `aria-live="polite"` op message-list voor inkomende berichten (4.1.3).
3. Tekstinput onderaan: deelt globale `outline: none`-issue.

### `/client/calendar`
1. **33 unlabeled `<button>`** (dag-cellen) — screen reader krijgt "button" "button" "button"… (1.1.1, 4.1.2).
2. Sommige knoppen 40×40 (under-target) en 49×48 (just OK).
3. "Terug" button 54×20 — onder minimum (2.5.5).

### `/client/check-in` + `/client/weekly-check-in`
1. Multi-step flow: stappen niet aangekondigd (geen `aria-current="step"` of progress-status).
2. Slider/numerieke inputs voor mood/energie zonder `aria-valuetext`.
3. 5-6 of 8 visible interactives `tooSmall`.

### `/client/measurements`
1. 5/8 too small.
2. Numerieke inputs delen globale `outline: none`-bug.

### `/client/profile/*`
1. h1 met `text-editorial-h2` style — visuele heading-grootte mismatcht semantische niveau (verwarrend, niet a11y-fail).
2. Toggle-rijen zonder `role="switch"`.
3. "Logs" page heeft wel role="dialog" — best-practice voorbeeld om uit te breiden.

### `/auth/reset-password`, `/auth/set-password`, `/auth/verify`
1. `text-[#A09D96]` body-copy faalt 4.5:1 op alle 3 (1.4.3).
2. Errors zonder `role="alert"`/`aria-live` (3.3.1, 4.1.3).
3. h1 in een `text-[#FDFDFE]` op licht bg — vermoedelijk verkeerd theme-token.

### `/onboarding`
1. Body-copy 2.05:1 op sage-green (1.4.3) — visueel bevestigd in `screens/onboarding.png`.
2. h1 + feature-list 2.93:1 (1.4.3).
3. Checkmark-icons (`<svg>`) zonder `aria-hidden` of accessible name.

---

## Cross-cutting patterns

1. **Globale `outline: none`** in `globals.css` op 4 plaatsen — refactoreer naar één `:focus-visible` mixin met `box-shadow: 0 0 0 2px var(--ring)` (lime op donker, dark op licht). Schrap inline `focus:outline-none` zonder ring-vervanging in 17 files.
2. **Touch-target minimum** — 70% van interactive elementen onder 44px. Pill/Chip primitive moet `min-height: 44px` enforcen, met visueel kleinere "thumb" via `transform` of inner-padding. Avatar-link top-right naar 44×44 (huidig 32×32).
3. **Modal-primitive ontbreekt** — bouw 1 `<Dialog>` component met `role="dialog"`, `aria-modal`, focus-trap, Esc, return-focus, en gebruik die i.p.v. ad-hoc `fixed inset-0` divs. Vervang minimum 8 modal-implementaties.
4. **Form-error toolkit** — bouw een `<FormField>` met automatisch `aria-invalid`, `aria-describedby={errorId}` koppeling + een `<Toast role="alert">` voor submit-errors. 0 hits nu.
5. **Heading hierarchy reset** — élke route start met `<h1 className="sr-only">` (route-name) of zichtbaar, en sectiekoppen schalen vanaf h2. Verbied `h1`/`h2` voor metric-numbers — die zijn `<dl>`/`<output>`-territorium.
6. **Bottom-nav rebuild** — vervang de div-met-role door `<nav><button aria-expanded><svg aria-hidden /></button><ul role="menu">…</ul></nav>` en zorg voor keyboard-bediening.
7. **Viewport meta** — `userScalable: false` weg, `maximumScale: 5`. Eén regel-fix met grote impact.
8. **SVG-icoon discipline** — voeg lint-rule of codemod toe: elke `<svg>` zonder `<title>` krijgt `aria-hidden="true"`. Elke icon-only button krijgt `aria-label`.

---

## Roadmap naar AA

Geprioriteerde stappen om "WCAG 2.1 AA conformant" te halen.

### Sprint 1 — Niveau A unblock (1 week)
- Fix `userScalable: false` (1.4.4 / 1 regel).
- Vervang `ClientBottomNav` door semantisch correcte `<nav>` + `<button>` (2.1.1, 4.1.2).
- Skip-link toevoegen in `ClientLayoutShell.tsx` (`<a href="#main" className="sr-only focus:not-sr-only">Naar inhoud</a>`).
- `<main id="main">` op alle root-pages incl. auth + onboarding (2.4.1).
- Form errors: `<div role="alert">` rond errors + `aria-describedby` koppeling (3.3.1, 4.1.3) — bouw `<FormError>` primitive.
- Calendar dag-buttons: voeg `aria-label={fullDateString}` toe (1.1.1).

### Sprint 2 — Focus + Contrast (2 weken)
- Verwijder globale `outline: none` in `globals.css` regels 664, 706, 1477, 1873; vervang door `:focus-visible { box-shadow: 0 0 0 2px var(--ring); outline: 2px solid transparent; }` met card-context awareness (lime op dark, ink op light) (2.4.7).
- Lift body-text op `#A09D96` → minimum `#7A7770` (4.5:1 op witte bg) (1.4.3).
- Onboarding: vervang `rgba(253,253,254,0.62)` door `rgba(253,253,254,0.85)` of donker bg (1.4.3).
- Border-tokens: bump card-borders van `rgba(28,30,24,0.10)` naar `0.20+` voor 3:1 (1.4.11).

### Sprint 3 — Target size + dialog primitive (2 weken)
- Avatar/logo top-bar: 44×44 hit-area met centered visual.
- Modal-primitive build (`<Dialog>` met focus-trap via `react-focus-lock` of vergelijkbaar) en migrate 8 bestaande modals (4.1.2, 2.1.2).
- Switch-component voor toggle-rijen met `role="switch"` + `aria-checked` (4.1.2).
- Cardio rest-timer: pause/extend button (2.2.1).

### Sprint 4 — Polish + audit (1 week)
- Heading-tree audit per route, zorg dat élke route exact 1 `<h1>` heeft.
- Re-run axe + voeg pa11y CI-check toe op `audits/playwright/a11y.spec.ts` zodat regressions blocked worden in PR.
- Manueel testen met VoiceOver (iOS) + NVDA (Windows desktop) op de 5 main flows: home, workout-start, nutrition-log, message-send, weekly-check-in.

### Acceptance
- Axe violations: 0 op alle routes (huidige: 31 nodes).
- Manueel: tab-volgorde correct over alle main flows, geen onzichtbare focus, alle errors hoorbaar, geen target <44px in primary actions.
- Pas dán: claim "WCAG 2.1 AA conformant" in privacy-policy / accessibility-statement.

---

## Bestanden voor opvolg-tickets

- Test-spec: `audits/playwright/a11y.spec.ts`
- Per-route axe JSON: `audits/2026-05-03/a11y/*.json` (25 files)
- DOM-snapshots met tooSmall-flags: `audits/2026-05-03/dom/*.json`
- Visuele bewijslast: `audits/2026-05-03/screens/onboarding.png`, `screens/home.png`

## Hoofd-bestanden om te fixen

- `src/app/layout.tsx:57-64` — viewport
- `src/app/globals.css:664, 703-708, 1477, 1873` — focus
- `src/app/globals.css:778-806` — bnav contrast + size
- `src/components/layout/ClientBottomNav.tsx` — full rewrite
- `src/app/onboarding/page.tsx` — contrast op sage bg
- `src/app/auth/reset-password/ResetPasswordClient.tsx`, `auth/set-password/page.tsx` — error semantics + helper-text contrast
- `src/app/client/calendar/page.tsx` — dag-button labels
- `src/app/client/DashboardClient.tsx` — h1 + h2-hierarchy
- `src/components/FeedbackWidget.tsx`, `BugReporter.tsx`, `coach/ExerciseSearchModal.tsx`, `coach/ProgramAssignModal.tsx`, `workout/ActiveWorkoutBar.tsx` — dialog-semantics + focus-trap
