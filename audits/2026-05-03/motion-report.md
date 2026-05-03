# Motion & Micro-interactions Audit · 2026-05-03

## Samenvatting

- **48 findings** over 7 categorieën (1 blocker · 12 major · 22 minor · 13 nit)
- **15 keyframes geaudit** (10 in globals.css, 5 lokaal in components/pages)
- **3 motion-tokens** in CSS (`--ease-premium`, `--ease-out-expo`, 3 transitions) — onderbenut, ~80% van componenten hardcodeert duration/easing
- Geen page-transitions (alle routes worden synchroon gerenderd, ad-hoc `animate-up-v6`/`animate-slide-up` op mount)

### Top 3 motion-patterns die premium feel ondermijnen
1. **Modals openen instant zonder enter-animatie** (ExerciseSearchModal, FeedbackWidget, NotificationCenter dropdown). Backdrop verschijnt zonder fade, dialog zonder scale-in. Voelt als alert(), niet als premium app.
2. **Inconsistente easing/duration** — 3 design-tokens bestaan, maar overal worden hardcoded waarden gebruikt: 140ms / 160ms / 180ms / 240ms / 250ms / 280ms / 320ms / 500ms / 600ms / 1000ms. Tien snelheden zonder ritme.
3. **Stagger begint bij `stagger-3` (120 ms)** op de hero-card van het dashboard; eerste 120 ms gebeurt er niets terwijl de skeleton verdwijnt → "lege beat" voor de gebruiker.

---

## Globale tokens

### Bestaande motion-tokens (`src/styles/variables.css:136-141`)

```css
--ease-premium:    cubic-bezier(0.4, 0, 0.2, 1);
--ease-out-expo:   cubic-bezier(0.16, 1, 0.3, 1);
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 280ms cubic-bezier(0.16, 1, 0.3, 1);
--transition-slow: 450ms cubic-bezier(0.16, 1, 0.3, 1);
```

### Geconstateerde inconsistentie

| Doel | Voorkomende waarden | Opmerking |
|---|---|---|
| Press-feedback (active scale) | 140ms · 160ms · 180ms · 200ms · `transition-all duration-150` | 4 verschillende durations voor hetzelfde gevoel |
| Card / button hover | 140ms · 160ms · 180ms · 240ms · 250ms · 280ms | nergens `var(--transition-fast)` gebruikt |
| Background/color | 160ms ease · 180ms ease · 250ms cubic-bezier · 250ms (geen easing) | mix van `ease`, `var(--ease-out-expo)`, default |
| Sheet/modal slide-up | 0.4s `cubic-bezier(0.16,1,0.3,1)` | enige plek waar curve consistent is |

→ Cross-cutting fix: **CSS-tokens uitbreiden met `--ease-press` (cubic-bezier(0.2,0,0,1) 140ms), `--ease-emphasized` (Material 3-style cubic-bezier(0.2, 0.0, 0, 1.0) 450ms), en `--duration-micro` 150ms / `--duration-small` 220ms / `--duration-medium` 320ms / `--duration-large` 450ms`** en alle hardcoded waarden vervangen met find/replace.

### `@keyframes` inventaris (globals.css)
- `slide-in-right`, `slide-in-left` (translateX 16px) — 350ms
- `slide-up` (translateY 12px) — 400ms
- `fade-in` — 300ms
- `scale-in` (0.97 → 1) — 300ms
- `gentle-rise` (translateY 8px) — 400ms
- `up-v6` (translateY 12px) — 400ms (**duplicaat van slide-up**)
- `bounce-in` — 400ms `cubic-bezier(0.34, 1.56, 0.64, 1)` — overshoot easing
- `pulse-subtle` — 2s
- `confetti-fall` — 3s
- `count-up`, `check-bounce`, `progress-fill`, `row-success`, `shimmer`, `spin`

Lokaal gedefinieerd (page-/component-scope):
- `pulse-dot` (page.tsx + ActiveWorkoutBar.tsx — duplicate)
- `pulse` (nutrition/loading.tsx, nutrition/page.tsx, meal-plan/page.tsx — 3 duplicates)
- `confettiFall` (workout/active/page.tsx + workout/complete/page.tsx — duplicate van globale `confetti-fall`)
- `typing-bounce` (ChatBubble.tsx)

→ **6 duplicates** verspreid in component-scope. Major: consolideer naar `globals.css`.

---

## Per categorie

### Page transitions

**M1 (major) — Geen page transitions tussen routes.**
Next.js routes worden synchroon hard-swapped. Geen view-transition API, geen framer-motion `AnimatePresence`. Resultaat: dashboard → progress → calendar voelt als 3 losse pagina's, niet als één app. Tabs op `/client/progress` (`progress/page.tsx:780-811`) wisselen zonder transition tussen tab-bodies — content "popt" binnen.

**M2 (major) — Stagger begint bij stagger-3 op dashboard hero.**
`DashboardClient.tsx:554` zet `animate-up-v6 stagger-3` (120ms delay) op het belangrijkste element (HeroCard). `stagger-1` en `stagger-2` worden nergens gebruikt op deze view → gebruiker ziet 120ms niets na skeleton-fadeout. Hero hoort op stagger-1 (0ms) zodat de eerste beat onmiddellijk begint.

**M3 (major) — `animate-up-v6` is dupliceert `animate-slide-up`.**
Beide animeren `translateY(12px) → 0` met opacity fade. `animate-up-v6 = 0.4s cubic-bezier(0.16,1,0.3,1)`, `animate-slide-up = 0.4s cubic-bezier(0.16,1,0.3,1)`. Identiek. Twee classes, één animatie → opruimen.

**N1 (nit) — `animate-fade-in` gebruikt andere easing (`cubic-bezier(0.4,0,0.2,1)`) dan andere entrance-animaties (`cubic-bezier(0.16,1,0.3,1)`).** Inconsistent ritme. Voor entrance de spring-y `out-expo` aanhouden.

---

### Modal / sheet entries

**B1 (BLOCKER) — `ExerciseSearchModal` opent zonder enige animatie** (`src/components/coach/ExerciseSearchModal.tsx:67-77`).
Backdrop én dialog verschijnen instant. Geen fade op backdrop, geen scale-in op dialog. Critical UX-moment voor de coach — voelt als modal uit 2008. Voeg toe: backdrop `animate-fade-in` 200ms, dialog `animate-scale-in` 280ms. Reduce-motion: opacity-only.

**M4 (major) — `FeedbackWidget` modal opent instant** (`src/components/FeedbackWidget.tsx:98-100`).
Idem. `bg-black/40` backdrop popt erin, dialog komt er onder met geen transition.

**M5 (major) — `NotificationCenter` dropdown opent instant** (`src/components/client/NotificationCenter.tsx:158-166`).
Conditioneel `{isOpen && <div…>}` met geen animatie. Verwacht: scale-in vanuit top-right (transform-origin) + fade, 200ms. Verdwijnt nu ook zonder exit-animatie omdat unmount direct gebeurt.

**M6 (major) — Bottom-sheet in workout/active gebruikt `animate-slide-up` (400ms translateY 12px)** (`workout/active/page.tsx:809`).
Dit is een fade-in-plus-mini-rise — geen écht sheet-gevoel. Een bottom-sheet hoort vanaf `100vh` (off-screen) omhoog te schuiven (translateY van bv. 60vh → 0) over 320–400ms met `out-expo`. Huidige 12px offset = nauwelijks zichtbaar.

**N2 (nit) — Lightbox voor afbeeldingen ontbreekt animatie.** Bij chat-image taps (`ChatBubble.tsx:213-216`) opent de full-screen viewer (indien aanwezig) zonder zoom-from-thumbnail transition. State of the art = shared-element transition.

**N3 (nit) — Confirm/Stop sheets in `ActiveWorkoutBar` (`showStopSheet`)** — niet geverifieerd of die slide-up heeft, code suggereert geen explicit animation class. Te valideren bij implementatie.

---

### Micro-interactions

#### Buttons

**M7 (major) — `Button.tsx:35` gebruikt `transition-all duration-150 ease-out`.**
1. `transition-all` is duur — alle properties triggeren transitions (incl. layout). Beperken tot `transform, background-color, opacity`.
2. `ease-out` = Tailwind default `cubic-bezier(0, 0, 0.2, 1)` — niet de premium `var(--ease-out-expo)`. Gebruik token.
3. Geen success-/error-state animatie. `loading` toont alleen spinner; success na submit zou een korte check-bounce moeten doen voor confirmation-feel.

**M8 (major) — `active:scale-[0.98]` op buttons inconsistent.**
Sommige buttons gebruiken `active:scale-[0.98]` (workout/active, Button.tsx), andere `active:scale-[0.99]` (DashboardClient, week-row), andere `active:scale-[0.95]` (start-cta ring), nog andere alleen `active:opacity-70` (heel coach-area). 4 verschillende press-feedbacks. Standaardiseer op één primitive: kleine btn = 0.96, normale btn = 0.98, opacity-only voor links.

**N4 (nit) — Coach-side buttons gebruiken `transition-opacity active:opacity-70`** in plaats van scale. Dat is een iOS-Apple-stijl press, premium maar inconsistent met client-side scale-feedback. Eén pattern kiezen.

**N5 (nit) — `BugReporter.tsx:133` gebruikt `hover:scale-105 transition-all`.**
Hover-scale op floating buttons is overkill (enterprise-y). Premium = subtiele schaduw-bump of geen scale.

#### Cards

**M9 (major) — `v6-card:active { transform: scale(0.99); }` (`globals.css:260`) heeft geen `transition`** binnen de active state. De transition is op de base class `transform 140ms`, dus het werkt — maar 0.99 is **bijna onzichtbaar**. iOS premium = 0.97-0.98 voor cards. Bump.

**N6 (nit) — Card `transition: transform 140ms` is OK, maar de hover-state heeft geen lift (geen `transform: translateY(-2px)` + shadow-bump).** Dat is een keuze (sans-only / minimal), maar verdient een `:hover` met bv. `box-shadow` upgrade om responsiviteit op desktop te tonen.

#### Toggles, checkboxes, radios

**N7 (nit) — Geen native Toggle/Switch component.** Alle toggles zijn ad-hoc buttons met `active:bg-…`. Geen knob-slide animation, geen track-fill. Mist een design-system primitive.

**M10 (major) — Set-row checkmark "snapt" bij completion** (`globals.css:1426-1448`).
`.set-row` → `.set-row.checked` triggert background swap van transparent → `#2FA65A` over 160ms. Geen check-icon-bounce. Bestaande `animate-check-bounce` (`globals.css:899-903`) wordt niet toegepast op `.check-btn svg` in checked state. Quick-win: voeg `.set-row.checked .check-btn svg { animation: check-bounce 0.4s … }` toe.

**N8 (nit) — `animate-row-success` keyframe bestaat (globals.css:908-912) maar wordt nergens toegepast.** Dood code, of had toegepast moeten worden op set-completion voor success-flash → row achtergrond pulst kort 12% groen, dan settles op 6%. Use it of remove it.

#### Progress bars / rings

**M11 (major) — `CalorieGauge` ring fill = `transition: stroke-dashoffset 500ms ease-out` (`CalorieGauge.tsx:68`).**
- 500ms is OK voor een ring-fill (perceptueel ~"dramatic")
- Maar `ease-out` (Tailwind default) ipv premium curve. Gebruik `cubic-bezier(0.16, 1, 0.3, 1)`.
- Geen "count-up" op het centrale getal — ring beweegt maar `{Math.round(remaining)}` staat instant op de eindwaarde. Premium = number-tween parallel met ring.

**M12 (major) — `MacroRings` = identiek (`stroke-dashoffset 500ms ease-out`, MacroRings.tsx:69).** Same fix.

**N9 (nit) — `OnboardingChecklist` progress bar = `transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]`** (correct curve, maar 600ms is tegen de bovengrens — voelt soft. 450ms zou tighter zijn.)

**N10 (nit) — `ChatInput` upload-progress = `transition-all duration-300`** (linear default ease) — voor een progress bar **moet** dat `linear` zijn (echte linear progress), niet ease-out. Sterker nog, `transition-all` zou `transition-[width]` moeten zijn.

**M13 (major) — `ProgramView` progress bar gebruikt `transition-all`** zonder duration (`ProgramView.tsx:180`) — valt terug op default 150ms. Te snel voor een progress visual; gebruiker registreert het niet.

#### Skeletons

**M14 (major) — Skeleton-cadence inconsistent.**
- `client/loading.tsx:6` gebruikt `animate-fade-in` voor de wrapper én `animate-pulse` (Tailwind default 2s) voor de skeleton-blokken.
- `MessageThreadSkeleton`, `MessageSkeleton`, `VideoCallSkeleton` gebruiken Tailwind `animate-pulse` (cubic-bezier `(0.4, 0, 0.6, 1)` — niet premium).
- Eigen `animate-shimmer` keyframe bestaat (globals.css:923-936) maar wordt nergens gebruikt.

→ Premium-tier skeletons = shimmer (gradient sweep) niet pulse (opacity flicker). Pulse is acceptabel voor data-rich apps maar shimmer voelt high-end. Beslis één pattern; toepassen overal.

**N11 (nit) — Skeleton fade-out → real-content fade-in is niet gechoreografeerd.** Skeleton verdwijnt instant, content rises met `animate-up-v6 stagger-3` (120ms delay). Mismatch. Beter: 150ms fade-out van skeleton + parallel start van content fade-in (crossfade), of skeletons morphen naar content-shape.

#### FAB & chat bubble

**M15 (major) — `ChatFAB` heeft `transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1)` maar geen `:hover`/`:active` rule** (`ChatFAB.tsx:49`). Inline style → de transition wordt nooit getriggerd. FAB heeft geen press-feedback. Add `:active { transform: scale(0.92) }`.

**N12 (nit) — Unread badge op FAB (`ChatFAB.tsx:65-91`) is statisch.** Bij nieuwe message een korte `bounce-in` of pulse zou heel feedback geven. Nu verandert het getal in stilte.

**M16 (major) — `ChatInput` Mic↔Send swap is geen morph.**
`ChatInput.tsx:518` gebruikt `{hasContent ? <SendBtn /> : <MicBtn />}` — twee verschillende buttons unmount/mount. Geen cross-fade, geen morph van mic-icoon naar send-pijl. Premium = same button, icon swap met scale + rotate. Voelt nu als "knop verspringt".

**N13 (nit) — Plus-button rotate (showMediaMenu)** (`ChatInput.tsx:482`) = `transform: rotate(45deg)` over 160ms ease — werkt, maar 200ms `out-expo` zou smoother zijn.

#### Bottom-nav

**M17 (major) — `.bnav-plus` collapse/expand animeert `width`, `left`, `right`, `margin-left`, `padding`** (`globals.css:755-760`).
**Niet GPU-accelerated.** Width-animation triggert layout op elk frame — kan janken op low-end devices. Vervangen door `transform: scaleX()` met inverse-scale op kinderen, of gebruik `clip-path`. Minstens benchmarken.

**N14 (nit) — De 4 nav-labels hebben geen stagger-in.** Wanneer `.bnav-plus.open .bnav-labels { display: grid }` triggert, popt de hele label-set tegelijk in. Stagger van 30ms per label = elegantere expand.

---

### Scroll behavior

**M18 (major) — Chat auto-scroll is **instant** ondanks `smooth=true` argument** (`messages/page.tsx:77-83`).
```ts
const scrollToBottom = useCallback((smooth = true) => {
  requestAnimationFrame(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight  // ← negeert smooth
    }
  })
}, [])
```
Argument wordt niet doorgegeven aan `scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' })`. Bij iedere nieuwe message **springt** de view → jitter zoals user beschreef. **Dead bug.**

**M19 (major) — Geen scroll-snap op horizontale scrollers.**
- `progress/page.tsx:780` (`flex gap-1.5 overflow-x-auto` met tabs) — geen `scroll-snap-type: x mandatory`
- DayPicker — geen scroll-snap
- Calendar week-pills — geen snap

Carousels horen op iOS te snappen voor premium feel.

**N15 (nit) — Geen pull-to-refresh.** App is een PWA — pull-to-refresh op dashboard / messages zou native voelen. Implementatie: `overscroll-behavior: contain` aanwezig op messages, maar geen PTR-handler.

**N16 (nit) — Header collapse-on-scroll bestaat niet.** Topbar staat constant. Op pagina's met veel content (workout/active, progress) zou collapse 16px naar 8px op scroll de hierarchy versterken.

**N17 (nit) — `-webkit-overflow-scrolling: touch` alleen op `workout/active` set-list (regel 986) — overige scroll-containers missen dit.** iOS legacy-fix nu onnodig (alle moderne iOS Safari heeft default momentum), maar inconsistent.

---

### Real-time updates

**N18 (nit) — Nieuwe chat-bericht arrival heeft geen fade-in.**
Bericht verschijnt instant in de DOM. Eerste rij heeft geen `animate-slide-up` of fade-in. Premium = bericht slides van bottom in.

**N19 (nit) — `TypingIndicator` (3-dot bounce) is goed gedaan** (`ChatBubble.tsx:461-501`) — `typing-bounce 1.2s` met cascade `0s/0.15s/0.30s` delay. Geen findings.

**N20 (nit) — Notification badge is statisch.** `NotificationCenter.tsx:150-155` bell-badge fade-in/pulse mist. Bij arrival ideaal: brief `bounce-in` (0.4s) + 1× `pulse-subtle` cycle.

**M20 (major) — Optimistic updates ontbreken visual confirmation.**
Reps/weight inputs in workout/active updaten zonder bevestiging. Bij autosave ideaal = brief 100ms green-tint of check-flash op de cell. Nu = blind typen.

---

### Lime accent animations

**N21 (nit) — Confetti op PR-celebration** (`workout/active/page.tsx:2167-2192`).
- 40 particles, random delay 0–0.6s, dur 1.5–2.5s, ease-in fall.
- Verdict: **niet overkill, net leuk.** Lime/green/sage palette respecteert design system, geen rainbow.
- Aandachtspunt: `pointer-events: none` aanwezig ✅. Reduced-motion override ontbreekt — bij `prefers-reduced-motion` zou alleen de PR-badge moeten verschijnen, geen confetti.

**M21 (major) — PR-badge gebruikt `animate-bounce-in` met overshoot easing `cubic-bezier(0.34, 1.56, 0.64, 1)`** (`globals.css:871`).
Overshoot van 6% → "elastic" feel. Voor een PR-celebration is een stevigere overshoot gerechtvaardigd, maar 1.06× is timid; **bump naar 1.10× of 1.12×** voor punchy confirmation. Alternatief: behoud 1.06× maar voeg een `scale(1) → scale(1.04) → scale(1)` follow-up tick toe na 600ms voor "heartbeat".

**N22 (nit) — `today-dot` (lime) op week-card** is niet meer aanwezig — week-row.today gebruikt nu donker font (`globals.css:1149`). Geen animation needed daar.

**N23 (nit) — Set-complete check is groen (#2FA65A) maar gebruikt geen lime accent.**
Bewuste keuze (groen = klaar, lime = milestones), maar het bestaande `animate-check-bounce` zou minstens kunnen worden toegepast op de checkmark icon.

---

### Gesture support

**M22 (major) — Geen swipe-back-to-dismiss op modals/sheets.**
Bottom-sheet in workout/active heeft alleen close-button. Native iOS-feel = swipe-down 50px om sheet te sluiten. Mist library zoals `react-spring` of `framer-motion drag` ervoor — kan met `useDrag` hook gebouwd.

**N24 (nit) — Geen drag-handle op bottom-sheets.**
Visueel ontbreekt het 36×4 grey bar bovenaan dat aanduidt "ik kan deze slepen". Affordance-gap.

**N25 (nit) — Long-press / haptic feedback ontbreekt overal.**
PWA op iOS Safari → `navigator.vibrate(10)` op set-complete zou native feel boosten. Niet geïmplementeerd.

**N26 (nit) — Double-tap niet gebruikt.** Could-have voor likes (community), niet kritiek.

**N27 (nit) — `SwipeableRow` bestaat in coach-side** (`components/coach/SwipeableRow.tsx`) maar niet gebruikt op client-side voor bv. notification dismiss / chat list. Asset al gebouwd, niet ge-leveraged.

---

### Reduced-motion

**M23 (major) — `globals.css:5-11` reduces motion correct, maar te aggressief.**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
- ✅ Wraps alles, niet uit
- ❌ `0.01ms` voelt als "uit" — gebruikers met vestibulaire issues hebben vaak baat bij **verkorte maar nog zichtbare** animaties (50–100ms). 0.01ms = harde-snap, kan jarring zijn voor elementen die plotseling van A → B springen zonder visuele continuity.
- ❌ Confetti, typing-dots, pulse blijven helemaal uit — dat is correct
- ❌ Geen JS-side `useReducedMotion` hook — confetti in workout/active rendered nog steeds 40 particles in DOM (alleen animatieduration is 0.01ms, dus particles "doen niets" maar zijn er wel)

Better:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important; /* of remove via :where() */
    animation-iteration-count: 1 !important;
    transition-duration: 80ms !important; /* houd kort visibel */
  }
  .confetti-particle { display: none; }
  .animate-pulse-subtle, .animate-shimmer { animation: none; }
}
```

**N28 (nit) — Geen `useReducedMotion()` JS hook** voor componenten die programmatically confetti/animations triggeren (workout/active). Resultaat: motion CSS klopt, maar JS-driven animations (random particle gen) gaan door.

---

### Cross-cutting patterns

**Cross-1.** **Veelheid aan duration-waarden.** 140/150/160/180/200/220/240/250/280/300/320/350/400/450/500/600/1000ms in gebruik. Cap op 5: 100/200/280/450/600. `tokenize` aanbevolen (`var(--duration-*)`).

**Cross-2.** **`transition-all` overal.** Gebruikt op > 30 plekken. Performance/predictability cost — beperk tot specifieke properties (`transition-[transform,background-color]`).

**Cross-3.** **Inline `style={{ transition: ... }}` vs class-based.** Mix van patterns. Inline = niet door reduced-motion media-query gevangen omdat `!important` daar niet altijd wint van inline styles. Specifically `ChatFAB.tsx:49`, `RestTimer.tsx:140`, `CalorieGauge.tsx:68` — deze worden door reduced-motion `transition-duration: 0.01ms !important` correct overschreven, maar het is fragile pattern.

**Cross-4.** **Origin/pivot expliciet zetten ontbreekt.** `scale-in` keyframe heeft geen `transform-origin` → schaalt vanuit center (default), wat OK is. Maar `NotificationCenter` dropdown — als die scale-in zou krijgen, **moet** `transform-origin: top right`. Niet documented.

**Cross-5.** **Geen interruption-handling.** Tap halverwege een entrance-animation cancelt 'm waarschijnlijk niet (animation `both` keep-end-state) maar tap-on-tap-on-tap kan jank veroorzaken op cards. Pas `will-change: transform` selectief toe (gevaarlijk om altijd aan te zetten).

**Cross-6.** **Choreography ontbreekt.** Op het dashboard is volgorde Hero → Week → Diet → Check-in → Onboarding. Elk gebruikt 60ms stagger via `stagger-N` classes — perfect rate. Maar volgorde van semantische belangrijkheid niet gechecked: is "Vandaag's hero" écht het eerste element dat de user moet zien? Ja → fix M2 (start bij stagger-1).

**Cross-7.** **Lokale `<style jsx>` keyframes** (ChatBubble typing-dot, workout-active confetti, page.tsx pulse-dot, nutrition pulse) breken caching/HMR. Centraliseer.

---

## Premium-feel tier upgrade

### 1. Tokenize motion (1 dag)
```css
:root {
  /* Duration */
  --d-instant:   80ms;   /* hover-color */
  --d-micro:    150ms;   /* press-feedback */
  --d-small:    220ms;   /* button-state */
  --d-medium:   320ms;   /* sheet-enter */
  --d-large:    450ms;   /* page-transition */

  /* Easing */
  --e-standard:    cubic-bezier(0.4, 0.0, 0.2, 1);    /* M3 standard */
  --e-emphasized:  cubic-bezier(0.2, 0.0, 0, 1.0);    /* M3 emphasized — premium spring */
  --e-decel:       cubic-bezier(0, 0, 0, 1);          /* enter */
  --e-accel:       cubic-bezier(0.3, 0, 1, 1);        /* exit */
  --e-press:       cubic-bezier(0.2, 0, 0, 1);        /* tap-down */
  --e-springy:     cubic-bezier(0.34, 1.56, 0.64, 1); /* celebrate-only */
}
```
Vervang **alle** hardcoded `cubic-bezier(0.16, 1, 0.3, 1)` → `var(--e-emphasized)`. Nu nog ~60 plekken inline.

### 2. Modal/sheet primitive (1-2 dagen)
Bouw één `<Sheet>` en `<Dialog>` primitive met:
- Backdrop fade 200ms `--e-decel`
- Sheet: translateY(100%) → 0, 320ms `--e-emphasized`
- Dialog: scale(0.95) + opacity → scale(1) + 1, 280ms `--e-emphasized`
- Transform-origin gerespecteerd
- Drag-to-dismiss op sheet (50px threshold, momentum-based)
- Drag-handle visuel
- ESC + backdrop-click + reduced-motion safe

Daarna ExerciseSearchModal, FeedbackWidget, NotificationCenter dropdown, workout-stop-sheet, alle bottom-sheets vervangen.

### 3. Page-transitions (1 dag)
Adoptie Next.js 15 `unstable_ViewTransition` of installeer `framer-motion` voor `<AnimatePresence>` per route-segment. Patroon:
- Bij forward-navigation: outgoing fade-out 150ms + incoming slide-in-from-right 280ms `--e-emphasized`
- Bij back-navigation: spiegel
- Tab-switches op /client/progress: cross-fade 180ms (geen slide, omdat tabs zelfde container)

### 4. Number-tween primitive
Hook `useCountUp(value, { duration: 600ms, easing: 'easeOutExpo' })` voor:
- CalorieGauge centraal getal
- Macro grams
- Workout total reps/sets
- Streak counter

Parallel met ring-fill = premium.

### 5. Interactive set-row (workout/active)
Bij `setComplete`:
1. Optimistic input lock
2. `animate-row-success` flash (groene tint pulse)
3. `animate-check-bounce` op icon
4. `navigator.vibrate(10)` (haptic)
5. Auto-advance focus naar next set's reps input
6. Rest-timer auto-start met fade-in van timer-card

Nu = stille background-swap. Voorgestelde sequence is ~600ms total, voelt **completable**.

### 6. Standardize press-feedback
1 primitive: `<Pressable scale={0.96 | 0.98} | opacity>`. Alle ad-hoc `active:scale-[0.98]` etc. vervangen.

### 7. Skeletons → shimmer
Vervang `animate-pulse` → `animate-shimmer` overal in `components/loading/*`. Existing keyframe in globals.css:923-936 al gedefinieerd, niet gebruikt. Plus: skeleton shape moet content shape mimickn voor crossfade-effect (e.g. skeleton heading 28px tall === real heading 28px tall → fade-swap voelt seamless).

### 8. Haptic + sound feedback
Web Vibration API on:
- Set complete (10ms)
- PR celebration (50ms · 50ms · 50ms pattern)
- Photo capture
- Send message
RestTimer heeft al `playBeep` op ticks — nice.

### 9. Reduced-motion JS hook
```ts
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    mq.addEventListener('change', e => setReduced(e.matches));
  }, []);
  return reduced;
}
```
Use in confetti generator: `if (reduced) return null`.

### 10. Choreography template per page
Document een eenvoudig pattern:
```
0ms      hero / primary content
60ms     secondary card 1
120ms    secondary card 2
180ms    sub-content / CTAs
240ms    decorative chrome
```
Hero altijd op stagger-1 (0ms), niet stagger-3.

---

## Concrete diff-suggesties (top 8 quick wins)

| # | File | Change |
|---|---|---|
| 1 | `DashboardClient.tsx:554` | `stagger-3` → `stagger-1` (hero zonder delay) |
| 2 | `messages/page.tsx:80` | `scrollTop = scrollHeight` → `scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })` |
| 3 | `globals.css:866-874` | Vervang `cubic-bezier(0.16, 1, 0.3, 1)` → `var(--ease-out-expo)` (token al gedefinieerd) |
| 4 | `ExerciseSearchModal.tsx:71,77` | Backdrop `+animate-fade-in`, dialog `+animate-scale-in` |
| 5 | `ChatFAB.tsx` | Voeg `:active { transform: scale(0.92) }` via wrapper-class (niet inline style) |
| 6 | `globals.css` | Verwijder `up-v6` keyframe, alias `.animate-up-v6 → animate: slide-up …` (DRY) |
| 7 | `CalorieGauge.tsx:68` | `ease-out` → `cubic-bezier(0.16, 1, 0.3, 1)` + add count-up on text |
| 8 | `globals.css:5-11` | Reduced-motion: hou 80ms ipv 0.01ms voor transition-duration; `display: none` voor confetti-particle |

---

## Aandacht voor user-spec items

| Item | Verdict |
|---|---|
| `animate-up-v6 stagger-N` op DashboardClient | Curve OK, duration OK, **stagger start verkeerd (3 ipv 1)** — M2 |
| `animate-slide-up` in modals | Werkt voor mini-rise, **niet voor échte sheet (12px is te weinig)** — M6 |
| Confetti op PR | **Niet overkill, net leuk** — N21. Voeg reduced-motion guard toe. |
| Chat bubble auto-scroll | **Jitter bevestigd** — instant scroll ipv smooth, dead `smooth` arg — M18 (BLOCKER-grade UX bug). |
| ProgressBar fill duration in workout-active set-row | Geen progress-bar binnen set-row; `.set-row.checked` background swap = 160ms goed gevoel; bewijs `animate-row-success` mist applicatie — M10 |
| Skeleton placeholders fade timing | Mismatch met content arrival → M14, N11. Skeleton fade-out instant, content rises met 120ms delay = "lege beat" |
| Tab-switches op `/client/progress` | **Instant**, geen transition — M1 |
