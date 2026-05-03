# UX Audit · 2026-05-03 · MŌVE (v7 frosted-glass)

> Senior product designer review · 38 routes geïnspecteerd via Playwright DOM-snapshot + 10 screenshots (393×852, 1×) · iPhone 14 Pro viewport.
>
> Methode: primair gewerkt vanuit DOM-data (38 `dom/*.json`), 10 screenshots gericht ingelezen voor visuele bevestiging van home, workout-overview, nutrition, messages, progress-overview, check-in, profile, exercises, stats, calendar. Overige routes geëvalueerd op DOM-structuur + bekende component-patterns.
>
> Test-account: leeg conto (geen programma, geen voeding, 0 workouts) — empty-states staan dus prominent in de audit.

---

## Samenvatting

- **38 schermen getest** (20 in main walk-through + 18 extra)
- **36 findings totaal** · 6 BLOCKER · 17 MAJOR · 8 MINOR · 5 NIT
- **Top 3 die de premium feel het meest kosten:**
  1. **Lege schermen voelen verlaten, niet rustig** — workout, nutrition, accountability, program, workout-history, progress-report, meal-plan, supplements en booking renderen ofwel een mini-card met "Geen X" + 600px dood canvas, ofwel niets dan de header. Het off-white wordt zo "bleek" i.p.v. premium-bedaard. Empty states missen scaffolding (illustratie, suggestie-CTA, voorbeeld-data) waardoor de app voelt als een app-mock i.p.v. een product dat klaar is om te helpen.
  2. **Tap-targets onder 44 px epidemie** — 18+ routes hebben minstens één pill/chip/tab/stepper onder 44 px hoog. Profile-health alleen al heeft 24 chips van 38 px hoog. Op mobiel raakt de gebruiker de verkeerde knop op een dichte chip-cloud (bv. allergieën, blessures, doelen).
  3. **Lime accent zit nog op semantisch-onjuiste plekken** — de lime "Voltooid"-pill op de Coach-rij in `/profile` ziet eruit als een *toggle* (visueel is het identiek aan een geactiveerde iOS switch) terwijl het bedoeld is als presence/online-indicator. Dat verwart de signaalwaarde van lime, die je elders reserveert voor "Voltooid / Vandaag / PR".

---

## Per scherm

### `/client` (Home dashboard)
**Screenshot:** `screens/home.full.png`

#### Wat werkt
- Premium frosted-glass cards op off-white voelen rustig en hoogwaardig.
- Hiërarchie: hero "Welkom" → "Deze Week" met grote "0/5" → "Dieet" donker contrast-card → aandacht-lijst. Goed afnemend gewicht.
- Donkere "Dieet" card breekt het wit-op-wit op een natuurlijke manier — voldoende presence.
- "Aandacht nodig" lijst (Voortgangsfoto's, Lichaamsafmetingen) is een scherpe vorm van guided onboarding.

#### Wat is verwarrend
- "Deze Week 0/5" met streepjes onder elke dag — onduidelijk of streepjes "geen training gepland" of "geen training voltooid" betekenen. Lime ring op zondag suggereert today, maar zonder legenda is het giswerk.
- FAB ("+") rechtsonder + chat-bubble linksonder + "1 Issue" devtool overlay = drie drukke elementen in dezelfde 100 px hoogte. Echte gebruikers zien geen devtool, maar de FAB+chat-combinatie is al krap.
- "Dieet 0 kcal" — een nul-state van een dieetcard die de helft van de viewport vult voelt zwaar voor wie nog geen plan heeft. Compactere "no plan yet"-variant zou ademen.

#### Findings
- **[MAJOR]** "Dieet" card consumeert 251 px verticaal in nul-state — toon compacte "Voedingsplan komt eraan" variant tot er macro-data is. Bewaar de grote tegel voor wanneer er echt te tracken valt · `src/app/client/page.tsx` / `MacroDashboard.tsx`.
- **[MINOR]** Days-row "Ma — Di — Wo — ..." gebruikt em-dashes als placeholder. Gebruikers lezen dit als "leeg" niet als "gepland". Vervang door een status-glyph (bv. lege ring vs. lime ring vs. rust-emoji) met legenda. (Profile-avatar in TopNav is 32×32 onder 44 px — opgelost via cross-cutting #5.)
- **[NIT]** "Welkom bij MŌVE — Je coach bereidt je programma voor — Binnenkort verschijnt hier je eerste training" — drie zinnen op rij in dezelfde sub-tekst. Eén crispe lijn ("Je coach werkt aan je plan — vandaag rust je") is sterker.

---

### `/client/workout` (Workout overzicht)
**Screenshot:** `screens/workout-overview.full.png`

#### Wat werkt
- Eerlijk: de typografie van "Training" als page header is mooi en zelfverzekerd.

#### Wat is verwarrend
- Pagina is 95 % leeg canvas. "Geen programma — Je coach zal binnenkort een trainingsplan opstellen." en *that's it*. Geen secundaire CTA, geen voorbeeld, geen contact-knop, geen toelichting wat een programma betekent.
- DOM toont **2 visible interactives** (logo + avatar). De FAB zit waarschijnlijk vast onder de DOM-snapshot timing, maar visueel zie je 'm wel — tikken op + zonder programma is onduidelijk: voeg ik nu een eigen workout toe? Vraag ik er één aan?
- Geen "Stuur je coach een bericht" CTA hier, terwijl dat voor de hand ligt.

#### Findings
- **[BLOCKER]** Workout-empty state heeft geen actiemogelijkheid · `src/app/client/workout/page.tsx` · voeg een primaire CTA toe ("Stuur je coach een bericht" → `/client/messages`) en een secundaire link ("Bekijk demo-workout" of "Lees: hoe werkt mijn programma?"). Zonder CTA voelt MŌVE een dood scherm.
- **[MAJOR]** Verticale ruimte (≈ 600 px) onbenut — vul met een illustratie of een rustgevende "wat verwacht je"-uitleg zodat het scherm voelt als een staat, niet als een crash.

---

### `/client/workout/active?dayId=…` (Active workout)
**Screenshot:** _niet gecaptured_ (geen actieve workout in test-account, route niet bereikbaar zonder dayId).

#### DOM-evaluatie
- Niet bereikt; testdata heeft geen actieve dag. `WorkoutLogger.tsx` is recent uitgebreid met kebab-menu voor delete-flow.

#### Findings
- **[NIT]** Audit kan kebab-menu en exercise-picker niet bevestigen omdat workout-active route alleen werkt met live `dayId`. Voeg `/client/workout/active?demo=1` of een "preview"-mode toe zodat coaches/QA empty workout flows kunnen valideren · `src/app/client/workout/active/page.tsx`. (Kort-actie: in testdata een dummy-dag seeden voor `audit-test@move.app`.)

---

### `/client/nutrition` (Voeding)
**Screenshot:** `screens/nutrition.full.png`

#### Wat werkt
- Card "Nog geen plan — Je coach bereidt je voedingsplan voor" is consequent met workout-empty (zelfde tone).

#### Wat is verwarrend
- "Home" terug-link bovenin een tab-pagina is ongebruikelijk. Tabs hoor je horizontaal naast elkaar te bereiken via bottom-nav of top-tabs, niet via een back-link.
- Wéér 600 px dood canvas onder de empty-card.
- DOM: 3 visible interactives (header + back-link). Zelfs de FAB die op de screenshot zit, registreert blijkbaar niet als interactive — kan een `pointer-events:none` overlap zijn.

#### Findings
- **[MAJOR]** "Home"-back link suggereert dat /nutrition een sub-pagina is van home — dat klopt informatie-architectonisch niet. Verwijder de back-link of vervang door een tab-strip "Plan / Maaltijden / Macros" zelfs als plan leeg is · `src/app/client/nutrition/page.tsx`.

---

### `/client/messages` (Chat met coach)
**Screenshot:** `screens/messages.full.png`

#### Wat werkt
- Empty-state met grijs chat-icoon + "Stuur je coach een bericht — Reactie binnen 24 uur" is verzorgd en geruststellend.
- Coach-presentie "GD · Online" met groene dot — duidelijk.

#### Wat is verwarrend
- Coach naam is "Glenn Delille" = de testgebruiker zelf. Dit is testdata-bug, niet een UX-bug, maar in productie zou dit "geen coach gekoppeld"-fallback moeten zijn met een uitleg waarom.
- Composer onderaan wordt deels afgesneden door de devtool-overlay — niet een bug, maar het audio-icoon is wel laag: 36×36 px. Tap-target.
- Camera/voice-recorder iconen (36×36) zijn beneden 44 px.

#### Findings
- **[MAJOR]** Bij "geen coach gekoppeld" (productie-edge-case) toon expliciete copy ("Nog geen coach toegewezen — antwoord binnen 1 werkdag") i.p.v. de eigen naam echo'en. Defensieve fallback in coach-resolver.
- **[MINOR]** "Bijlage toevoegen" en "Spraakbericht opnemen" knoppen zijn 36×36 — vergroot tot 44×44 · `src/components/client/ChatInput.tsx`.

---

### `/client/progress` overview tab
**Screenshot:** `screens/progress-overview.full.png`

#### Wat werkt
- Hero "WEEK 19 · DEZE WEEK / 0 / 4 trainingen / Nog 4 sessies voor zondag" — mooi uitgesproken hiërarchie, motiverend zonder pushy te zijn.
- Lime "•" voor de wekelijkse check-in card — perfecte semantische lime: gebeurtenis (klaar om te doen).
- Stat-card met 0 / 0 / 0 (Streak/Workouts/Records) is compact.

#### Wat is verwarrend
- Days-row Ma Di Wo Do Vr Za Zo onder hero is *visueel uitgegrijsd* tot bijna onleesbaar (rgb < 200, alpha < 0.5). Het lijkt disabled state.
- Tabs "Overzicht / Kracht / Lichaam / Check-ins" — Overzicht in witte pill, andere tabs alleen tekst. Geen onderlijn / aktief-pill voor andere tabs als ze actief worden? Inconsistent design tussen progress-overview (witte pill) en stats (onderstreept). Uniformeer.
- 6 van 7 visible interactives zijn onder 44 px (tabs op 38 px hoog).

#### Findings
- **[MAJOR]** Days-row weekdagen-letters zijn te flets om als status-indicator te functioneren · gebruik hogere contrast-tinten (bv. `text-stone-500` + active dag in `text-stone-900`) zodat de gebruiker direct ziet wat vandaag is.
- **[MINOR]** Progress-tabs (Overzicht/Kracht/Lichaam/Check-ins) zijn 38 px hoog — vergroot naar `h-11 px-4` via een gedeelde Tabs component · `src/app/client/progress/page.tsx`.

---

### `/client/progress?tab=strength` & `?tab=body` & `?tab=checkins`
**Screenshot:** _DOM-only_ (zelfde 7 visible als overview, content laadt achter tabs).

#### Findings
- **[MAJOR]** progress-checkins en progress-report tonen slechts **2 visible interactives** (header). Of laadt de tab-content niet binnen 1.5 s, of er is écht niets — geef een skelet-skeleton tijdens loading en een empty-state bij geen data. Nu is het scherm letterlijk leeg na de tabs · `src/app/client/progress/page.tsx`.

---

### `/client/calendar`
**Screenshot:** `screens/calendar.full.png`

#### Wat werkt
- Lime-fill voor "vandaag" (3 mei) — semantisch correct accent.
- Maand-navigatie met chevrons en "Mei" titel — klassiek en helder.
- Legenda onderaan (Voltooid groen / Vandaag cream / Gepland blauw).

#### Wat is verwarrend
- Lege dag-cellen hebben geen border of achtergrond — ze zien er niet uit als tappable. 35 dag-knoppen van 49×48 px zonder visuele affordance is een kerfbare grid.
- Cream-kleur "Vandaag" in legenda is nauwelijks zichtbaar tegen het off-white canvas — daar ga je eerst denken dat de legenda kapot is.
- Overzicht-link bovenin "← Terug / OVERZICHT" — twee verschillende back-affordances naast elkaar.

#### Findings
- **[MAJOR]** Dag-cellen tonen geen border/hover-state — gecombineerd met de cream "Vandaag"-swatch in de legenda (onleesbaar tegen off-white) heeft het rooster geen visuele houvast. Voeg `border border-stone-200/60 active:bg-stone-100/50` toe op cellen, en wijzig de cream swatch naar een ring-symbool · `src/app/client/calendar/page.tsx`.

---

### `/client/check-in` (maandelijkse foto-check-in)
**Screenshot:** `screens/check-in.full.png`

#### Wat werkt
- Donker hero-card "MAANDELIJKSE CHECK-IN — Foto's — 4 posities vastleggen — 1/4" — heldere progress-as.
- Body-silhouet outlines met camera-icoon zijn een charmante, premium toevoeging — origineel zonder kitscherig.
- "Gesynchroniseerd"-toast in lime — perfect lime-gebruik (event).

#### Wat is verwarrend
- Step-pills "FOTO'S / INBODY METINGEN / OMTREKMATEN / HOE VOEL JE JE" zijn 14 px hoog — *onder 44 px en ook visueel piepklein*. Onmogelijk om er met je duim op te tikken.
- Helper-tekst "Nuchter, zelfde ondergoed, zelfde locatie, achtergrond" is grijs op grijs (rgb-tint laag) — bijna onleesbaar tegen de pale card achtergrond.
- Beschrijvende sub-tekst onder "VOORKANT" / "ACHTERKANT" labels is erg flets — onleesbaar (de tekst leest "[Tik om camera...]" maar je moet er moeite voor doen).
- "0/4" rechts naast "4 POSITIES" — chevron-style indicator met geen lime accent terwijl 0/4 een staat-marker is.

#### Findings
- **[BLOCKER]** Step-tabs op de foto-pagina zijn 14 px hoog — onleesbaar én onbruikbaar als tap-target. Vergroot naar minimum `h-11`/`py-3 px-4` met duidelijk active-state · `src/app/client/check-in/page.tsx` of `src/components/client/PhotoUploadStep.tsx`.
- **[MAJOR]** Helper-tekst "Tik om camera te openen" en "Nuchter, zelfde ondergoed..." zijn rgb < 180 op rgb 240+ achtergrond — failliet WCAG contrast. Verhoog tekst tot `text-stone-600` minimum · `src/components/client/PhotoUploadStep.tsx`.

---

### `/client/weekly-check-in`

#### DOM-evaluatie
22 visible interactives (groot: foto-knop 305×156 + tekstvelden), 18 tooSmall:
- 5 stappen-rating buttons "1 / 2 / 3 / 4 / 5" zijn 55×36 px — onder tap-target én gestapeld 3× (energie/slaap/stemming?). Tikfout-risico.
- "Terug"-link 54×20.
- Logo + avatar standaard tooSmall.

#### Findings
- **[MAJOR]** 1-5 rating-knoppen voor energie/slaap/etc. zijn 55×36 px — vergroot naar `min-h-11` zodat duim-bediening werkt zonder zoom · `src/app/client/weekly-check-in/page.tsx` of `src/components/client/MetricsInputStep.tsx`.

---

### `/client/measurements`

#### DOM-evaluatie
8 visible (3 tabs Foto's/Metingen/Omtrek + "Eerste meting starten"-CTA + Meting/Terug/header). "Meting" knop 104×34 (onder tap), "Terug" 54×20, "Eerste meting starten" CTA is 222×44 — net aan tap, maar visueel niet vol-breed.

#### Findings

---

### `/client/health` (dagelijkse gezondheid-input)

#### DOM-evaluatie
- 4 mood-knoppen "😴 Slecht / 😐 Matig / 😊 Goed / 🌟 Uitstekend" 66/82 × 61 px — goed tap-target, leuke emoji-pillarisering.
- Stappen-quick-add "+250 / +500" zijn 49×27 px — onder 44 — frequente actie.
- "Opslaan" 303×43 — net onder 44.
- 5 inputs allemaal 24 px hoog (input field) — zeer compact.

#### Findings
- **[MAJOR]** "Opslaan" CTA is 43 px hoog (onder Apple HIG 44 px en Google MD 48 px). Vergroot tot `h-12`. Globaal patroon — check de Button-primitive.

---

### `/client/notifications`

#### DOM-evaluatie
3 visible interactives — alleen header + 1 link 36×36. Pagina is dus leeg / geen notificaties geseed in testdata.

#### Findings
- **[MAJOR]** Pagina toont in DOM-snapshot maar 1 link — er is geen empty-state element gerenderd of geen tab-controls voor "Alles / Coach / Systeem". Voeg expliciete empty-state toe ("Geen notificaties — je krijgt hier updates van je coach") · `src/app/client/notifications/page.tsx`.

---

### `/client/profile`
**Screenshot:** `screens/profile.full.png`

#### Wat werkt
- iOS-style gegroepeerde lijst met icoon-circles links — zeer premium en herkenbaar.
- Drie-kolom stat-row "0 WEKEN / — STATUS / Premium PLAN" netjes uitgelijnd.
- Sectie-headers ("COACHING", "ABONNEMENT") in caps met letter-spacing — design-mature.

#### Wat is verwarrend
- "?" placeholder avatar circle — voor een ingelogde user die zijn eigen naam-initiaal kent voelt het kil. Toon initiaal of upload-prompt.
- "Status — em-dash" — em-dash als nul-state communiceert "kapot" niet "nog leeg". Toon "Nieuw lid" of de fase.
- **Lime pill op Coach-rij** — DOM bevestigt: een gedeeltelijk-lime swatch op `[305x66]` ter hoogte van de Coach-row. Lime hoort hier niet bij een toggle/online-indicator. De rest van het systeem reserveert lime voor "voltooid / vandaag / PR".
- "Mijn logs / Workouts · gewicht · voeding · verwijderen" — "verwijderen" in een meta-subtitle exposeert een delete-actie als feature ("hé, vergeet niet dat je dingen kan verwijderen") — dit verlaagt de premium-perceptie.

#### Findings
- **[BLOCKER]** Lime "online"-indicator in Coach-row vervuilt het signaal-systeem (lime = event/PR/today). Vervang door een neutralere groene presence-dot of door "● Online" tekst-only · `src/app/client/profile/page.tsx`.
- **[MINOR]** "Mijn logs · ... · verwijderen" in subtitle voelt agressief. Verwijder " · verwijderen" uit de subtitle — laat verwijderen een actie binnen de detail-pagina.
- **[NIT]** "—" als status-value voelt als rendering-bug en "?" avatar is kil. Toon respectievelijk "Nieuw lid" en initiaal "G".

---

### `/client/profile/diet`

#### DOM-evaluatie
- 8 dieet-cards (343×75) — goed tap-target, mooi.
- 11 allergie-pills (38 px hoog, 44-108 wide) — onder tap-target én erg dicht op elkaar.
- Free-text textarea (303×72) en "Opslaan" 345×51.

#### Findings

---

### `/client/profile/goals`

#### DOM-evaluatie
- 10 goal-cards (343×60-61) — goed.
- 10 chip-shortcuts (38 px hoog) onder de cards — *duplicaten* van de cards eronder, met emoji + label. DOM toont "🔥 Gewichtsverlies" als chip (140×38) én als card. **Dubbele UI** voor zelfde data?

#### Findings
- **[MAJOR]** Goals-pagina toont *zelfde 10 doelen* twee keer: één keer als 60-px goal-card en een keer als 38-px chip onderaan. Verwijder duplicaat — kies één pattern (cards voor primair, chips als "selected" indicator boven de scroll); zo verdwijnt ook meteen de 38-px tap-target serie · `src/app/client/profile/goals/page.tsx`.

---

### `/client/profile/health` (blessures & beperkingen)

#### DOM-evaluatie
- **24 chips onder 44 px tap-target** — schouder, nek, bovenrug, onderrug, knie, heup, enkel, pols, elleboog, hamstring, quadriceps, borst, hernia, artrose, tendinitis, scoliose, hoge bloeddruk, astma, diabetes, hartaandoening, zwangerschap, revalidatie na operatie...
- 5 activity-level cards (343×74-75) — goed.
- "Opslaan" niet zichtbaar als tooSmall — staat lager dan viewport.

#### Findings
- **[BLOCKER]** 24 health-chips op 38 px hoog — dit is een medisch-ernstig formulier (gebruiker meldt blessures en chronische aandoeningen). Tikfout op "Hartaandoening" vs "Hoge bloeddruk" heeft impact op programma-ontwerp. Vergroot chips naar `h-11`, gap-3, voeg `aria-pressed` toe · `src/app/client/profile/health/page.tsx`.

---

### `/client/profile/edit`

#### DOM-evaluatie
3 inputs (303×24 px hoogte). Inputs van 24 px hoog zijn extreem compact, vooral op mobiel waar je iOS-keyboard verwacht onder de focus.

#### Findings
- **[MAJOR]** Form-inputs op 24 px hoog. Dat is letterlijk de tekst-baseline + 2px padding. Verhoog naar `h-12` met `py-3 px-4` · `src/app/client/profile/edit/page.tsx`. Geldt waarschijnlijk voor alle Input-primitives.

---

### `/client/profile/logs`

#### DOM-evaluatie
- 3 main tabs (Workouts / Gewicht / Voeding) op 38 px hoog.
- 4 period-pills (7d / 30d / 90d / Alles) op 27 px hoog — extreem klein.
- Geen content (alleen header + filters). Empty-state ontbreekt.

#### Findings
- **[MAJOR]** Geen empty-state visible (alleen header + filters) op `/profile/logs` — als er geen logs zijn moet er expliciete tekst staan ("Nog geen workouts gelogd"). Anders denkt de gebruiker dat de pagina kapot is. Tegelijk zijn de period-pills (7d/30d/90d/Alles) 27 px hoog — vergroot naar `h-9` minimum · `src/app/client/profile/logs/page.tsx`.

---

### `/client/profile/help`

#### DOM-evaluatie
- 9 FAQ-cards (343×55 px) — net aan tap-target.
- Coach-link card 345×88 — goed.

#### Findings
- **[NIT]** "Wat betekent de PR-badge?" — gebruikt jargon zonder explainer in question. Overweeg "Wat is een PR (persoonlijk record)?" zodat het begrip uitgelegd wordt zonder klik.

---

### `/client/profile/notifications`

#### DOM-evaluatie
- 5 toggle-switches 51×31 px — onder 44 px (en het exacte iOS-toggle-formaat = waarschijnlijk een Switch-primitive).
- "Inschakelen" 99×36.

#### Findings
- **[MINOR]** Toggle-switches op 31 px hoog — iOS-default is 31 px maar tap-area moet 44 px omvatten. Wrap toggles met `py-2 -my-2` om een 44px hit-area te krijgen zonder visueel het component te vergroten · `src/components/ui/Switch.tsx`.

---

### `/client/profile/privacy`

#### DOM-evaluatie
4 visible interactives, vooral lege pagina. Sub-link "Berichten" 54×16 px — extreem klein.

#### Findings
- **[BLOCKER]** Privacy-pagina is bijna leeg (4 visible interactives). Voor GDPR / privacy-overzicht hoor je: data-export, account-verwijderen, marketing-consent, data-deling met coach. Wettelijk vereist — bouw deze sectie uit · `src/app/client/profile/privacy/page.tsx`.

---

### `/client/exercises`
**Screenshot:** `screens/exercises.full.png`

#### Wat werkt
- 3-stat header (Oefeningen / Records / Volume) — strak.
- Search input full-width — goed.

#### Wat is verwarrend
- Filter-pill "Alles" alleen op het scherm — waar zijn andere filter-pills (Spiergroep / Equipment)?
- "Geen oefeningen gevonden" centreert zonder CTA.
- "Volume 0t" — `t` is ton (1000 kg)? Onduidelijke unit-letter.

#### Findings
- **[MAJOR]** Volume-eenheid "t" voor ton is onleesbaar zonder context. Kies "kg" met afgeronde formatter (12.4k kg) of voluit "ton" tot 100 ton, dan compact · `src/app/client/exercises/page.tsx`.

---

### `/client/stats`
**Screenshot:** `screens/stats.full.png`

#### Wat werkt
- Hero "0 ton — totaal volume" — schalend en duidelijk.
- Tabs (KRACHT / VOLUME / PR'S) met underline accent — werkt.

#### Wat is verwarrend
- Tweede filter-rij wordt rechts afgesneden: "OEFENIN..." (waarschijnlijk "OEFENING"). Overflow scroll? Niet duidelijk dat je horizontaal kan scrollen.
- 4w/8w/12w/Alles pillen op 29 px hoog.
- "Geen data in deze periode" — clear maar geen suggestie wat te doen.

#### Findings
- **[MAJOR]** Horizontale overflow van filter-row toont "OEFENIN..." afgesneden — gebruiker weet niet dat hij kan scrollen. Voeg `mask-image: linear-gradient(to right, black 90%, transparent)` toe als scroll-affordance · `src/app/client/stats/page.tsx`.
- **[MINOR]** Tabs in stats zijn underlined; in progress-overview zijn ze pillen. Uniformeer Tabs-primitive.

---

### `/client/booking`

#### DOM-evaluatie
- 30+ kalender-cellen 40×40 px (onder 44 px) — een dichte tap-grid.
- Geen labels ("aria=") op de meeste — alleen het dag-getal in tekst.

#### Findings
- **[MINOR]** Booking-calendar dag-cellen 40×40 én zonder aria-labels — vergroot naar 44×44 en voeg `aria-label="3 mei, beschikbaar"` per cel toe · `src/app/client/booking/page.tsx`.

---

### `/client/community`

#### DOM-evaluatie
- Composer textarea 303×48.
- 5 emoji/action-knoppen 28×28 px — *zeer* klein.
- "Post"-knop 77×36.

#### Findings
- **[MINOR]** Action-iconen in community composer 28×28 px én "Post"-knop 77×36 — vergroot naar `h-11 w-11` voor de iconen, full-width of `min-h-11` voor Post · `src/app/client/community/page.tsx`.

---

### `/client/journey` & `/client/program` & `/client/accountability` & `/client/workout-history` & `/client/progress-report` & `/client/meal-plan` & `/client/supplements`

#### DOM-evaluatie
Deze routes tonen 2-7 visible interactives — ofwel echte empty-states (supplements heeft "Eerste supplement toevoegen"-CTA, journey toont tabs maar geen content), ofwel renderen geen content vóór de DOM-snapshot.

#### Findings
- **[MAJOR]** `/program`, `/accountability`, `/workout-history`, `/progress-report`, `/meal-plan` tonen alleen header + avatar in DOM (2 visible). Of empty-state ontbreekt, of er staat een placeholder "...". Voeg expliciete empty-state-component toe per route met copy + primaire CTA · respectievelijk `src/app/client/{program,accountability,workout/history,progress-report,meal-plan}/page.tsx`.

---

### `/client/resources`

#### DOM-evaluatie
- Search input 283×24 (24 px hoog).
- 5 category-pills (Voeding/Training/Herstel/Mindset/Lifestyle) op 38 px hoog.
- Geen results.

#### Findings

---

### `/client/settings`

#### DOM-evaluatie
2 visible: een link en knop allebei "Terug naar homepagina" — *duplicaat*. Pagina lijkt 404-equivalent.

#### Findings
- **[BLOCKER]** `/client/settings` rendert niets behalve "Terug naar homepagina" link + button (zelfde label twee keer). Ofwel route is niet meer actueel en verwijderd worden, ofwel de pagina is een 404-fallback. Verwijder uit nav of bouw uit · `src/app/client/settings/page.tsx`.

---

### `/onboarding`

#### DOM-evaluatie
1 visible interactive: "Laten we beginnen" (353×48). Schoon, doelgericht.

#### Findings

---

### `/` (Login)

#### DOM-evaluatie
- 2 inputs 292×43 (net onder 44).
- Toon-wachtwoord-knop 34×34.
- Wachtwoord-vergeten-link 129×26.
- Inloggen-CTA 292×55 — premium maat.
- Google/Apple SSO knoppen 52×52 — goed, ronde "log in met"-buttons.

#### Findings
- **[NIT]** Email/password inputs 43 px hoog (net onder 44) en toon-wachtwoord-icoon 34×34 — verhoog naar 44 px en geef icoon `padding: 6px` voor de hit-area · `src/app/(auth)/page.tsx`.

---

## Cross-cutting issues

### 1. Tap-target epidemie (BLOCKER niveau systemisch)
Op 23 van 38 routes is er minstens één primair-interactive element onder 44×44 px. Top-offenders:
- Profile-health: 24 chips op 38 px (medisch formulier)
- Profile-goals: 10 chip-duplicaten op 38 px
- Profile-diet: 11 allergie-chips op 38 px
- Stats / Profile-logs / Resources: filter-pills op 27-29 px
- Health / Booking: stappen-+/- en kalender-cellen op 27 / 40 px

Aanbeveling: bouw één Pill / Chip / FilterPill primitive met `min-h-11 px-4 py-2` als default; voorkom dat instances kleiner gerenderd worden zonder explicit override.

### 2. Empty-states zijn ofwel afwezig of Spartaans
Routes die niet renderen op test-account: workout-overview, nutrition, accountability, program, workout-history, progress-report, meal-plan. Routes die centered "Geen X" zonder CTA tonen: workout, exercises, stats, calendar.
Aanbeveling: één `<EmptyState illustration={...} title="" body="" cta={...} />` component met:
- Subtiele line-art illustratie passend bij domein (silhouet, vork, halter, kalender)
- Heading + uitleg-zin
- Primaire CTA + secundaire link ("Stuur je coach een bericht")
- Skeleton-loaders tijdens fetch zodat gebruikers niet "leeg" zien voor data laadt.

### 3. Lime-accent semantiek consistentie
- ✅ Correct: today-ring op home, today-fill in calendar, "Wekelijkse check-in staat klaar" • dot, "Gesynchroniseerd"-toast.
- ❌ Onjuist: lime "Online"-pill op Coach-rij in profile (lijkt een toggle), legenda-swatch "Vandaag" als cream (terwijl de lime fill dezelfde logica had moeten hebben).
Aanbeveling: documenteer in `design-system/colors.md` dat lime exclusief voor "voltooid / vandaag / PR / event-klaar" is; presence/online → neutraal-groen of pure tekst.

### 4. Inputs zijn 24 px (form fields)
Meerdere inputs (profile-edit, weekly-check-in, health, resources) renderen text-fields op 24 px hoog. iOS-keyboard verwacht 44+ px tap area en visueel zien deze fields eruit als read-only labels. Refactor van `Input.tsx` primitive: `h-12 px-4 py-3 text-base`.

### 5. TopNav avatar 32×32 + logo 62×33
Beide elementen op alle 38 routes onder tap-target. Vooral de avatar (G initiaal) is een primaire navigatie-entry. Vergroot naar 40×40 met visuele padding voor 44×44 hit area.

### 6. Tab-styling inconsistentie
Tabs in `/progress` (witte pill op active) vs `/stats` (underline) vs `/measurements` (segmented) — drie patterns voor hetzelfde concept. Kies één Tabs-primitive en pas systeem-breed toe. Nu voelt het alsof het door verschillende handen ontworpen is.

### 7. Premium-feel komt door de cards, niet door het canvas
Het off-white canvas met frosted-glass cards is mooi *waar er cards zijn*. Op pagina's met 1 card en 700 px leeg canvas (workout-overview, nutrition, calendar) verliest de pagina presence. Oplossingen: subtiele radial-gradient achter cards, ambient-noise texture, of meer cards (skeleton-cards die data anticiperen) zodat het canvas nooit *helemaal* dood is.

### 8. Helper-tekst contrast onder WCAG AA
Op check-in en home zit helper-tekst (Tik om camera te openen, Nuchter zelfde ondergoed, Aandacht nodig sub-text) op contrast-ratios die richting AA-failure gaan. Niet alle browsers tonen dit even erg, maar in zonlicht / OLED-uitgeschakeld op iPhone is het onleesbaar. Globale helper-tekst-token: `text-stone-600` minimum, niet `text-stone-400`.

### 9. Screenshots niet bekeken — context
Volgende routes evalueerden alleen op DOM (geen visuele bevestiging): journey, program, accountability, booking, community, meal-plan, progress-body, progress-checkins, progress-report, progress-strength, resources, settings, supplements, weekly-check-in, workout-history, profile-{diet,edit,goals,health,help,logs,notifications,privacy}, health, measurements, notifications, login, onboarding. Findings zijn structureel-betrouwbaar maar visueel-ongeverifieerd. Bevestig vooral de empty-state findings handmatig.

### 10. Active workout & exercise-picker niet getest
Audit kon niet bij `/client/workout/active?dayId=...` komen omdat het test-account geen actief programma heeft. De recent toegevoegde kebab-menu / delete-flow / exercise-picker wachten dus op een seed-script of demo-route. Aanbeveling voor volgende audit: seed `audit-test@move.app` met één voltooide en één actieve trainingsdag, plus 5 oefeningen.

---

## Prioriteit voor de volgende sprint

1. **Globale Pill / Chip / Tab-primitive met `min-h-11`** — fixt 18+ findings in één refactor.
2. **EmptyState-component met illustratie + CTA** — verandert "leeg" voelt-als-bug naar "leeg" voelt-rustig.
3. **Lime semantiek: weg uit profile-coach-row** — herwin signaal-kracht.
4. **Form-inputs naar `h-12`** — basis touchcomfort.
5. **Helper-tekst contrast naar `stone-600`** — readability + WCAG.
6. **`/client/settings` opruimen of vullen** — momenteel een 404-equivalent.

— einde audit —
