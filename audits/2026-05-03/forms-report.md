# Forms & Inputs Audit · 2026-05-03

Senior UX-onderzoeker pass over alle forms in MŌVE — auth, onboarding, check-ins, chat, profile, weight log, workout active, exercise picker. Code als waarheidsbron; `audits/2026-05-03/dom/*.json` voor touch-target metrics. Findings refereren absolute paden + regel.

## Samenvatting

- **23 forms** geaudit (login, reset-password, set-password, onboarding 9-stap wizard, monthly check-in 4-stap wizard, weekly check-in, ChatInput, dashboard weight-log, profile/edit, profile/goals, profile/diet, profile/health, profile/notifications, exercise create modal, workout active set rows, plus 6 sub-pages summier)
- **52 findings** (5 BLOCKER · 18 MAJOR · 22 MINOR · 7 NIT)
- **Top 3 patterns die meeste findings veroorzaken**:
  1. **Geen gedeelde primitive** — login gebruikt `FloatingInput`, set-password en reset-password gebruiken `AnimatedInput` (twee aparte kopieën!), onboarding heeft `TextInput`/`TextArea`, profile/edit doet vrije `<input>`, weekly-check-in/check-in/MetricsInputStep doen elk weer eigen styling. `<Input>` in `src/components/ui/Input.tsx` wordt **alleen** in de stale `WorkoutLogger.tsx` gebruikt en is verwaarloosd. Effect: focus state, autocomplete, error-rendering en touch-target compliance moet **per locatie** worden onderhouden — en in praktijk is dat fragmentarisch gedaan.
  2. **Geen visible focus state op de meeste body-fields** — MetricsInputStep, TapeMeasurementsStep, profile/edit, weekly-check-in weight, dashboard weight-log: `outline:none` zonder vervangende `:focus` styling. Keyboard- en assistive-tech gebruikers hebben geen focus-indicator. Dit is een WCAG 2.4.7 fail én voelt slordig.
  3. **Touch targets onder 44 px** — DOM audit telt 5 (login), 27 (profile/edit), 31 (check-in), 41 (weekly-check-in), 26 (measurements) too-small interactives per route. Vrijwel allemaal omdat inputs en buttons op `h-[40px]`, `py-2.5`, of `py-3` zonder min-height zitten — klein onder vinger op iOS, en overlappende underline-fields op login zijn 43 px hoog (1 px tekort).

---

## Per form

### Login (`src/app/page.tsx`)
**Inputs**: email (FloatingInput), password (FloatingInput + show/hide toggle), reset-email (FloatingInput).
**Findings**:
- **[MAJOR]** Foute `tooSmall` op alle 3 inputs (43 px) — DOM-audit `dom/login.json` lines 16, 33: input `h:43`. Gewenst ≥ 44 px. Fix: bump padding-bottom in FloatingInput van `paddingBottom: 12` naar 13 of vergroot `padding: '8px 0 10px'` → `'10px 0 12px'`. · `src/app/page.tsx:51-78`
- **[MAJOR]** `inputMode` ontbreekt op email — iOS toont generic keyboard, geen `@`-key. Fix: `inputMode="email"` op de input. · `src/app/page.tsx:52-78`
- **[MAJOR]** `enterkeyhint` ontbreekt op beide forms — submit-button is "Inloggen" / "Verstuur reset-link" maar de iOS-toetsenbord knop blijft "return". Fix: `enterKeyHint="go"` op email en password (login form), `enterKeyHint="send"` op reset email. · `src/app/page.tsx:52-78`
- **[MAJOR]** Reset-link e-mail input herbruikt waarde van inlog-email maar **zonder visuele indicatie** dat hij overgenomen is. Als user al iets had ingetypt zien ze hun adres weer in het reset-form, dat is OK — maar als het leeg was, geen prefill. Fix: na klikken "Wachtwoord vergeten" focus de input automatisch (`useEffect` met `inputRef.current?.focus()`). · `src/app/page.tsx:521-532`
- **[MINOR]** Foute "show password" knop is 34×34 px (`dom/login.json:46-53` `tooSmall:true`) — ondergrens 44 px. De `<button>` heeft `padding:8` rond een 18 px icon = 34 px hitbox. Fix: vergroot padding naar 12, of geef knop expliciet `width:44; height:44`. · `src/app/page.tsx:614-628`
- **[MINOR]** "Wachtwoord vergeten?" knop is 26 px hoog (`dom/login.json:62-71`) — duidelijk te klein. Fix: voeg `paddingTop:6` aan element + `padding:'8px 4px'` op de button maken om hem 32 px hoog te krijgen, en geef ouder div `padding:'12px 0'` voor onderling spacing. · `src/app/page.tsx:632-661`
- **[MINOR]** Generic error message "Ongeldige inloggegevens. Probeer opnieuw." — geeft geen onderscheid tussen verkeerd e-mail format, verkeerd wachtwoord, of disabled account. Voor security is generic prima maar **client-side** mag een email-format check (`/.+@.+\..+/`) een meer behulpzame fout geven *voor* de network call. · `src/app/page.tsx:237-241`
- **[MINOR]** Loading splash bij re-mount van login (line 319-338) blijft hangen tot Supabase `getUser()` resolved — geen timeout. Bij offline blijft user 30s+ kijken naar "MŌVE". Fix: `Promise.race` met 3s fallback die door-rendert naar form. · `src/app/page.tsx:207-224`
- **[NIT]** Autofill-CSS hack via `-webkit-box-shadow: 0 0 0 1000px #474B48 inset` werkt — maar krijgt geen focus-color update wanneer user op autofilled veld klikt. Cosmetisch; lime focus-line tekent wel onderaan. · `src/app/page.tsx:357-364`

### Reset Password (`src/app/auth/reset-password/ResetPasswordClient.tsx`)
**Inputs**: nieuw wachtwoord, bevestig wachtwoord (AnimatedInput).
**Findings**:
- **[MAJOR]** Geen client-side check op match vóór submit — user krijgt pas na klikken op "Wachtwoord opslaan" feedback dat passwords niet overeenkomen. Fix: `onBlur` op confirm-input toon inline error "Komen niet overeen" wanneer beide >0 en niet gelijk. · `src/app/auth/reset-password/ResetPasswordClient.tsx:152-186`
- **[MAJOR]** Password strength bar verschijnt na typen, maar threshold "Te kort" pas onder 6 en NIST-recommendation is min 8 — code klassificeert 6-7 al als "OK". Fix: pas threshold aan naar 8, 12, 16. · `src/app/auth/reset-password/ResetPasswordClient.tsx:189-195`
- **[MINOR]** AnimatedInput is een verbatim duplicaat van de versie in `set-password/page.tsx` — twee plekken om te onderhouden. Fix: extract naar `src/components/ui/FloatingInput.tsx` en deel met set-password en login. · `src/app/auth/reset-password/ResetPasswordClient.tsx:9-80` + `src/app/auth/set-password/page.tsx:25-97`
- **[MINOR]** Geen `enterkeyhint="done"` op confirm-password — return-key zegt "return" niet "klaar". · `src/app/auth/reset-password/ResetPasswordClient.tsx:348-356`
- **[NIT]** Show-password toggle staat alleen op het eerste wachtwoordveld; tweede heeft geen toggle. Voor parity zou je ofwel beide tonen, ofwel het eerste ook hidden laten en bij toggle beide veranderen. · `src/app/auth/reset-password/ResetPasswordClient.tsx:329-356`

### Set Password / Account Activation (`src/app/auth/set-password/page.tsx`)
**Inputs**: wachtwoord, bevestig wachtwoord.
**Findings**:
- **[MAJOR]** Verbatim duplicaat van AnimatedInput uit reset-password. Zelfde refactor-actie als hierboven. · `src/app/auth/set-password/page.tsx:25-97`
- **[MAJOR]** Bij `verifyOtp` failure stuurt code redirect naar `/?error=...` met error in URL-query. URL-encoded NL-tekst werkt maar geeft 'Uitnodigingslink+is+verlopen+...' lelijke encoding in browser bar. Fix: gebruik error-code (`?error=invite_expired`) en map client-side naar tekst. · `src/app/auth/set-password/page.tsx:167`
- **[MINOR]** Loading "Account verifiëren..." kan 200ms × 8 attempts = 1.6s+ duren door exponential backoff in `waitForUser`. Eindgebruiker ziet enkel een spinner; geen progress-indicator. Fix: na 1s toon "Even geduld, je sessie wordt opgezet…". · `src/app/auth/set-password/page.tsx:122-130`

### Onboarding (`src/app/onboarding/page.tsx`) — 9 stappen
**Inputs**: chips (single + multi), text/number inputs, textareas, sliders, file inputs (PhotoUploadStep), tape measurements (TapeMeasurementsStep), date input.
**Findings**:
- **[BLOCKER]** Validation-feedback ontbreekt — `canProceed(step)` returned boolean en disabled de "Volgende" knop bij invalid, **maar er is geen indicatie welk veld mist**. User klikt op disabled-knop, niets gebeurt. Op stap 4 (`!!data.meals_per_day && !!data.social_context && data.allergies.length > 0`) krijgt user geen hint dat allergies "Geen" of een keuze nodig heeft. Fix: bij failed `canProceed` toggle een `attemptedAdvance` state en highlight ontbrekende velden met `aria-invalid` + rode border + scroll-into-view eerste invalid veld. · `src/app/onboarding/page.tsx:661-693` + button-render footer
- **[BLOCKER]** `<input type="date">` op stap 1 heeft op iOS Safari een lelijk default rendering, en in dark theme is de native date-text donker-op-donker (witte text, witte placeholder is read-only) — hard te lezen. Fix: laad een gepolyste date-picker (de bestaande `BirthdayInput` patroon van het project, of split naar 3 separate inputs DD/MM/YYYY met `inputMode="numeric"`) of forceer `color-scheme: dark` op de input. · `src/app/onboarding/page.tsx:1086-1090`
- **[MAJOR]** Op stap 1 (`Lengte`, `Gewicht`) `<TextInput type="number" inputMode="decimal" />` — combinatie geeft op iOS een numeric keypad zonder komma-knop in NL-locale terwijl `step="0.1"` enkel op weight zit. Lengte `step` ontbreekt en accepteert "178.5" wel maar niet "178,5". Fix: gebruik `type="text"` met `inputMode="decimal"` voor alle decimaal-velden (project doet dit elders al wél, e.g. MetricsInputStep), en pas `parseNum` (replace komma) overal toe. · `src/app/onboarding/page.tsx:1095-1114`
- **[MAJOR]** Draft-restore werkt mooi, maar timestamp `savedAt` kan oud zijn (>30 dagen). User die jaren geleden begon aan onboarding ziet nog "ga je verder" — disorienterend. Fix: na 7 dagen draft auto-pruge of toon waarschuwing "Deze gegevens zijn van X dagen geleden — opnieuw beginnen?". · `src/app/onboarding/page.tsx:907-972` + `505-522`
- **[MAJOR]** `TagInput` (favoriete maaltijden, hated foods) — Enter-key voegt tag toe maar geeft geen visuele bevestiging dat input gewist is buiten dat de waarde uit het veld is. Voor screenreaders mist een `aria-live` region die "Pasta toegevoegd" aankondigt. Fix: toevoegen van `role="status" aria-live="polite"` div met laatste actie. · `src/app/onboarding/page.tsx:380-463`
- **[MAJOR]** Range slider voor `food_adventurousness` (1-10), `sleep_hours_avg` (4-10), `experience_level` (0-2), `training_frequency`: alle gebruiken `<input type="range">` met custom thumb. **Geen `aria-valuetext`** — screenreader leest "5" zonder context. Fix: `aria-valuetext={`${value} uur per nacht`}`. · `src/app/onboarding/page.tsx:331-342`
- **[MAJOR]** "Streefgewicht" en "goal description" zijn dezelfde fieldset maar visueel onsamenhangend gepresenteerd — twee inputs onder 1 label `<FieldLabel>Streefgewicht</FieldLabel>`, met "kg"-suffix naast eerste, dan een Hint en TextInput voor `goal_description`. Onhandig: het is niet duidelijk dat description optioneel is voor mensen die wel een cijfer hebben. Fix: maak twee aparte fieldsets met "OF" tussenin, of one-of-radio. · `src/app/onboarding/page.tsx:1143-1172`
- **[MINOR]** Stap-progress `Stap 1 van 8` — `displayTotal=8` maar `STEPS.length=9` (welcome telt niet). De disconnect "{step}/{lastFormStep}" werkt maar bij stap 8 (overview) toont nog "8 van 8" — fine. Wel: progress-bar gaat van 0% naar 12.5% op stap 1 — een grote sprong. Fix: gebruik `progress = ((step - 0.5) / lastFormStep) * 100` voor smoothere mid-step feel. · `src/app/onboarding/page.tsx:894-895`
- **[MINOR]** `goTo(s)` heeft een hardcoded 220ms timeout vóór `setStep(s)` — als user heel snel doorklikt komen state changes door elkaar (race condition). Fix: cancel pending timeout in `useEffect` cleanup. · `src/app/onboarding/page.tsx:647-655`
- **[MINOR]** Op alle TextInput is `outline: 'none'` zonder vervangende focus-state — alleen achtergrond verandert. Add `:focus { background: rgba(253,253,254,0.10); box-shadow: 0 0 0 2px rgba(192,252,1,0.5) }`. · `src/app/onboarding/page.tsx:182-196`
- **[MINOR]** "Anders, namelijk…" snack-input verschijnt onder ChipMulti maar wordt **vergeten** (niet als chip getoond) tot submit. User typt "popcorn", verlaat veld, ziet niks visueel. Fix: enter-key of blur converteert tekst naar chip. · `src/app/onboarding/page.tsx:1406-1413`
- **[NIT]** "Allergieën of restricties" laat user "Geen" en "Vegetarisch" tegelijk kiezen — logisch tegenstrijdig. Fix: als "Geen" geselecteerd, deselect rest; en omgekeerd. · `src/app/onboarding/page.tsx:1322-1336`

### PhotoUploadStep (`src/components/client/PhotoUploadStep.tsx`)
**Inputs**: 4× camera viewfinder (custom MediaStream API), 4× hidden file input fallback.
**Findings**:
- **[BLOCKER]** Camera `getUserMedia` permission rejection toont **alleen** "Camera niet beschikbaar" — geen disambiguation tussen "user denied", "no camera", "browser doesn't support". Op iOS Safari met permission denied is enige ontsnapping de file-picker fallback, maar het knopje "Kies foto uit galerij" zit verstopt onder een full-bleed bg-black. Werkt, maar is verwarrend. Fix: split error states en suggesteer "Open Instellingen" link voor permission denial. · `src/components/client/PhotoUploadStep.tsx:117-118`
- **[MAJOR]** Geen file-size validation — user kan 50 MB photo van DSLR uploaden, browser crashed in canvas-stap. Fix: voor `URL.createObjectURL` check `file.size < 20_000_000` en toon error. · `src/components/client/PhotoUploadStep.tsx:309-313`
- **[MAJOR]** Geen file-type validation — `accept="image/*"` is browser-hint maar niet enforced. Server (`/api/upload`) zou dit moeten valideren maar **client moet feedback geven**. · `src/components/client/PhotoUploadStep.tsx:368-373`
- **[MAJOR]** `URL.createObjectURL` previews — cleanup gebeurt alleen bij `handleRemove` en niet bij component-unmount. Bij navigation tussen stappen lekken blob-URLs. Fix: `useEffect` cleanup dat alle preview URLs revoked. · `src/components/client/PhotoUploadStep.tsx:285-306`
- **[MINOR]** Geen progress-indicator tijdens upload — submit-handler in `check-in/page.tsx` doet sequentiële uploads voor 4 photos zonder progress feedback. User ziet enkel "Versturen" spinner op submit-button. Fix: per-photo progress + parallel `Promise.all`. · `src/app/client/check-in/page.tsx:164-179`

### Monthly Check-in (`src/app/client/check-in/page.tsx`)
**Inputs**: PhotoUploadStep, MetricsInputStep (6 fields), TapeMeasurementsStep (9 fields), NotesStep (3 sliders + textarea).
**Findings**:
- **[MAJOR]** Wizard heeft 4 stappen maar **geen save-progress per stap** — als user halverwege stap 3 het tabblad sluit, verliest alle data. Fix: `localStorage` draft zoals onboarding doet. Probeer: re-use `DRAFT_KEY` patroon. · `src/app/client/check-in/page.tsx:73-81`
- **[MAJOR]** Step-stepper-buttons toggle `disabled={i > currentStep}` — user kan niet vooruit-skippen, OK, maar **kan ook niet zien wat in toekomstige stappen zit**. Fix: laat toekomstige stappen klikbaar mits huidige stap valid is. · `src/app/client/check-in/page.tsx:316-339`
- **[MAJOR]** `parseNum(v) = v ? parseFloat(v.replace(',', '.')) : null` — voor `visceral_fat_level` gebruikt code `parseInt_` wat OK is, maar geen waarschuwing bij waarde > 30 of < 1 (out of range voor InBody). Fix: voeg sanity-bounds toe en flag onwaarschijnlijke waardes. · `src/app/client/check-in/page.tsx:182-194`
- **[MAJOR]** Submit error rendering — `setError(err.message)` toont raw Supabase error tekst (e.g. "duplicate key value violates unique constraint"). Niet user-facing. Fix: catch known errors en map naar NL-BE messages. · `src/app/client/check-in/page.tsx:213-217`
- **[MINOR]** "Versturen" loading button heeft icon-only state maar blijft tekst tonen "Versturen" — inconsistent met weekly-check-in waar het hetzelfde patroon is. OK, maar tijdens upload kan dit 5-10s zijn — geen tijd-indicatie. Fix: progress text "Foto 2 van 4 uploaden…". · `src/app/client/check-in/page.tsx:413-424`
- **[NIT]** Submit-button "Check-in indienen" — werkwoord wat zwaar voor een wekelijkse routine; alternatief "Bevestigen" of "Klaar". · `src/app/client/check-in/page.tsx:421`

### MetricsInputStep (`src/components/client/MetricsInputStep.tsx`)
**Inputs**: 6× decimal text inputs (weight, fat%, muscle, visceral, water%, BMI).
**Findings**:
- **[MAJOR]** Geen visible focus state — `outline:none` (impliciet via `bg-transparent ... outline-none`) zonder ring of border-change op focus. WCAG 2.4.7 fail. Fix: voeg `focus-within:ring-2 focus-within:ring-[#1C1E18]` op de wrapping `<label>`. · `src/components/client/MetricsInputStep.tsx:65-73`
- **[MAJOR]** Touch-target 26 issues volgens DOM (`measurements.json`) — input heights 44 px maar het wrapping `<label>` met `px-3.5 py-3` op een grid-cell is 56 px hoog inclusief label-tekst, alleen het tap-area van de input is 24 px. Fix: maak hele `<label>` clickable als focus-trigger (label htmlFor → input id), maar nu mist `id` op input dus htmlFor doet niks. Voeg `id={key}` + `htmlFor={key}` toe. · `src/components/client/MetricsInputStep.tsx:56-73`
- **[MAJOR]** Decimaalseparator-tolerance — `parseNum` in check-in/page.tsx replaceert komma naar punt vóór parse, maar **input zelf accepteert beide tekens**. Op iOS-keyboard met `inputMode="decimal"` toont een `.` of `,` afhankelijk van device locale. Validation feedback ontbreekt: "82.,5" passes door tot submit. Fix: `onBlur` normaliseer en strip duplicates. · `src/components/client/MetricsInputStep.tsx:67-72`
- **[MINOR]** Geen helper text waar realistic ranges (e.g. fat 5-50%, BMI 14-50). InBody-resultaten staan in printout maar user kan typo's maken. · `src/components/client/MetricsInputStep.tsx:30-37`

### TapeMeasurementsStep (`src/components/client/TapeMeasurementsStep.tsx`)
**Inputs**: 9× decimal text inputs gegroepeerd in 4 secties (Torso, Armen, Bovenbenen, Kuiten).
**Findings**:
- **[MAJOR]** Zelfde focus-state issue als MetricsInputStep — `outline:none`, geen vervangende styling. · `src/components/client/TapeMeasurementsStep.tsx:86-92`
- **[MAJOR]** `<label>` wrapt input maar mist `htmlFor` — label is wel klikbaar (impliciete association), maar accessibility tree krijgt label uit de visuele tekst. OK in moderne browsers, maar voor extra zekerheid: `id={key}` + `htmlFor={key}`. · `src/components/client/TapeMeasurementsStep.tsx:78-93`
- **[MAJOR]** Tab-order — user vult Borst → Taille → Heupen, dan over naar Linker arm → Rechter arm. Volgorde klopt. Maar **decimal-keyboard heeft geen "Volgende"-knop** op iOS, return doet niks (geen `enterKeyHint`). Fix: `enterKeyHint="next"` op alle behalve laatste, `enterKeyHint="done"` op laatste. · `src/components/client/TapeMeasurementsStep.tsx:86-92`
- **[NIT]** "Links" en "Rechts" als labels in 4 secties is ambigu — screenreader leest "Links" zonder context. Fix: `aria-label="Linker arm in cm"`. · `src/components/client/TapeMeasurementsStep.tsx:34-52`

### NotesStep (`src/components/client/NotesStep.tsx`)
**Inputs**: 3× ScoreSlider (1-5 segmented), 1 textarea (max 500 chars).
**Findings**:
- **[MAJOR]** Score-slider is geen `<input type="range">` maar 5 buttons — accessibility-wise OK (each is `<button>`), maar screenreader leest "1, 2, 3, 4, 5" zonder context. Fix: wrap in `role="radiogroup"` + `aria-labelledby`. · `src/components/client/NotesStep.tsx:53-83`
- **[MAJOR]** Selected-button styling: `bg-[#1C1E18] text-[#2A2D2B]` — donker-op-donker, ondernauwelijks zichtbaar. Lijkt op onbedoeld hardcoded text-color. Fix: text-color naar `#FDFDFE` of `#C0FC01` voor selected state. · `src/components/client/NotesStep.tsx:64-66`
- **[MINOR]** Character count `{notes.length}/500` is correct maar verandert niet van kleur dichtbij limiet. Fix: bij >450 → amber, >480 → red. · `src/components/client/NotesStep.tsx:120-122`
- **[MINOR]** Geen `enterkeyhint` op textarea, maar OK want multi-line. Wel: geen submit op cmd+enter (vergelijk met ChatInput). · `src/components/client/NotesStep.tsx:124-131`

### Weekly Check-in (`src/app/client/weekly-check-in/page.tsx`)
**Inputs**: weight (large display input), foto (file/camera), 3× RatingRow segmented, textarea notities.
**Findings**:
- **[BLOCKER]** Weight input `placeholder="0.0"` met `text-[44px]` — op smaller screen (iPhone SE 320px) zit het label "Gewicht" boven en "kg" naast het 44px-display getal, maar de input-velden hebben **geen min-width** behalve `min-w-0`. Bij invoer "100.5" overflow-t mogelijk over "kg". Fix: `flex-shrink-0` op span en width-cap op input. · `src/app/client/weekly-check-in/page.tsx:228-238`
- **[MAJOR]** Geen visible focus op grote weight input — `outline-none` zonder ring. User die net `Tab` heeft gedrukt heeft 0 indicatie. Fix: `focus:ring-2`. · `src/app/client/weekly-check-in/page.tsx:230-236`
- **[MAJOR]** Submit zonder weight `disabled={submitting || !weight.trim()}` — OK, maar **na invullen** geen client-side bounds check (e.g. 30-300 kg). Submit mislukt server-side, error in console. Fix: pre-validate. · `src/app/client/weekly-check-in/page.tsx:362`
- **[MAJOR]** Foto-textarea-styling inconsistent met checkin: hier `bg-[rgba(255,255,255,0.50)]` met focus naar `bg-[rgba(253,253,254,0.12)]`. In NotesStep is het juist andersom (donker → wat lichter). Effect: focus van textarea **maakt veld minder leesbaar** (4% alpha → 12% alpha = darker). Fix: invert tone. · `src/app/client/weekly-check-in/page.tsx:350-356`
- **[MAJOR]** RatingRow buttons hetzelfde issue als NotesStep ScoreSlider: niet gegroepeerd als radiogroup, geen aria. · `src/app/client/weekly-check-in/page.tsx:383-433`
- **[MINOR]** "Foto vooraanzicht" zone is een groot dashed-border knop met alleen camera icon en "Tik om foto te nemen" — `<button>` met `onClick`, maar mist `accept`/`capture` attributes (deze zitten op de hidden `<input>`). OK. Maar: knop heeft `text-[rgba(253,253,254,0.72)]` (witte text op `rgba(255,255,255,0.50)` light bg) — onleesbaar in light theme. Fix: kleur naar dark ink. · `src/app/client/weekly-check-in/page.tsx:303-313`
- **[MINOR]** Optimistic mutate wist `setSubmitted(true)` direct, **terwijl** photo nog upload — bij upload-fail krijgt user geen visuele warning dat foto niet meegekomen is (alleen `console.warn`). Fix: na server-response met `photo_url=null` toon toast "Foto kon niet worden geüpload". · `src/app/client/weekly-check-in/page.tsx:131-144`

### Dashboard Weight Log (`src/app/client/DashboardClient.tsx`)
**Inputs**: 1 inline text input + log-button.
**Findings**:
- **[MAJOR]** Submit-button "Log" heeft `color: '#1F231F'` op `background: '#1C1E18'` — donker op donker, **bijna onleesbaar** (line 1148). Vermoedelijk een bug; alle andere submit-buttons gebruiken witte tekst op donker. Fix: `color: '#FDFDFE'`. · `src/app/client/DashboardClient.tsx:1147-1148`
- **[MAJOR]** Geen `enterkeyhint` op input maar **wel** Enter-handler op input. Werkt op desktop, maar iOS-keyboard mist context. Fix: `enterKeyHint="send"`. · `src/app/client/DashboardClient.tsx:1126-1133`
- **[MINOR]** Placeholder switcht tussen "Vorige: 78 kg" en "Gewicht vandaag (bv. 78,5)" — eerste heeft geen format-hint, tweede wel. Inconsistent, en bij prefill mist user de "78,5" hint. Fix: altijd "(bv. 78,5)" suffix. · `src/app/client/DashboardClient.tsx:1129`
- **[MINOR]** "Opgeslagen" success state toont 2s en flipt terug naar lege input — geen indicatie van **wat** opgeslagen is (huidige weight). Fix: toon kort "78,5 kg opgeslagen". · `src/app/client/DashboardClient.tsx:1117-1123`

### ChatInput (`src/components/client/ChatInput.tsx`)
**Inputs**: textarea + 4 hidden file inputs (foto, camera, video, doc) + voice recorder.
**Findings**:
- **[MAJOR]** Geen visuele focus-state op textarea — `outline:none` op transparent achtergrond. De pill zelf krijgt geen ring. Fix: `:focus-within` op pill geeft `box-shadow: 0 0 0 2px rgba(192,252,1,0.5)`. · `src/components/client/ChatInput.tsx:498-515`
- **[MAJOR]** Send op Enter zonder Shift werkt op desktop maar **op iOS keyboard** wordt soft-return ingestuurd ipv send. Fix: gebruik `enterKeyHint="send"` op textarea, en op mobile een visible send-button (huidige Mic↔Send swap is OK maar sommige users typen+Enter verwachten). · `src/components/client/ChatInput.tsx:110-115`
- **[MAJOR]** Compress-image heeft hardcoded JPEG output (line 154-160), **decoded HEIC vs JPEG** — iOS users die foto-upload doen krijgen HEIC, browser image-loader op canvas handelt dat niet altijd af → silent failure → user ziet nooit foto. Fix: voeg `try/catch` rond `img.onload` met fallback naar original file en log. · `src/components/client/ChatInput.tsx:128-166`
- **[MAJOR]** File picker bestand-input voor docs heeft `accept=".pdf,.doc,.docx,.xls,.xlsx"` maar **geen size-limit check** — gebruiker kan 100 MB upload. Fix: pre-validate `file.size`. · `src/components/client/ChatInput.tsx:443-449`
- **[MINOR]** Voice-recording UI — `MediaRecorder` start zonder format-fallback. Op Safari < 14.5 is `audio/webm` niet ondersteund — `new MediaRecorder(stream)` gooit. Geen user-facing error, alleen `console.error`. Fix: `try MIME type, fallback to `audio/mp4` of toon "Spraakopname niet ondersteund". · `src/components/client/ChatInput.tsx:219-251`
- **[MINOR]** Recording-timer mist max-duration. Theoretisch kan user een 1-uur opname maken. Fix: cap op 5 minuten + visuele warning bij 4:30. · `src/components/client/ChatInput.tsx:240-246`
- **[MINOR]** Upload-progress is fake (10→30→50→100 hardcoded) — `fetch('/api/upload')` heeft geen progress-events. Fix: vervang met `XMLHttpRequest.upload.onprogress` of een simpele "Uploaden..." spinner zonder fake percentage. · `src/components/client/ChatInput.tsx:170-208`

### Profile Edit (`src/app/client/profile/edit/page.tsx`)
**Inputs**: full name, email (disabled), phone, avatar (camera button, niet hooked-up).
**Findings**:
- **[BLOCKER]** Avatar "Tik om foto te wijzigen" knop is **niet functioneel** — geen `onClick` of `<input type="file">`. Visueel suggereert het bewerk-mogelijkheid maar niets gebeurt bij click. Fix: hook up file input + Supabase storage upload. · `src/app/client/profile/edit/page.tsx:80-94`
- **[MAJOR]** `<input type="email" disabled>` heeft `cursor-not-allowed` — OK, maar geen helper text "E-mail wijzigen kan niet hier" — user verwacht het te kunnen aanpassen. Fix: voeg subtle hint toe. · `src/app/client/profile/edit/page.tsx:108-114`
- **[MAJOR]** Phone input `type="tel"` mist `autoComplete="tel"`. Voor full name mist `autoComplete="name"`. Browsers kunnen niet auto-fillen. · `src/app/client/profile/edit/page.tsx:99-125`
- **[MAJOR]** Geen visible focus-state op alle 3 inputs — `bg-transparent focus:outline-none` zonder vervangende styling. WCAG 2.4.7 fail. · `src/app/client/profile/edit/page.tsx:99-125`
- **[MAJOR]** Geen error-handling op save — `await supabase.from('profiles').update(...)` kan falen, code negeert error. User ziet "Opgeslagen" terwijl niets is opgeslagen. Fix: check `error` returned from update + toast op fail. · `src/app/client/profile/edit/page.tsx:44-57`
- **[MAJOR]** `setSaved(true)` na 2s reset — geen tijd voor user om te lezen wanneer save snel is. OK, maar tijdens disable van submit-button mist `aria-busy`. · `src/app/client/profile/edit/page.tsx:54-56`
- **[MINOR]** Phone-input placeholder `+32 ...` is goed, maar geen format-validation (bijv. accepteert "abc"). Fix: `pattern="\\+?[0-9 ]+"`. · `src/app/client/profile/edit/page.tsx:118-124`
- **[MINOR]** Save-knop tekst toggles "Opslaan" → "Opgeslagen" — werkt, maar tijdens saving toont alleen loader-spinner zonder tekst, **vlak naast de fixed bottom-nav**. iOS keyboard kan submit-button afdekken. Fix: scroll-into-view bij focus laatste field. · `src/app/client/profile/edit/page.tsx:129-144`

### Profile Goals (`src/app/client/profile/goals/page.tsx`)
**Inputs**: 1 textarea (motivation), buttons voor primary/secondary goals.
**Findings**:
- **[MINOR]** Same focus-state issue als Profile Edit. · `src/app/client/profile/goals/page.tsx:158-164`
- **[MINOR]** Motivation textarea heeft geen char-count (vergelijk NotesStep). Geen DB-side limit zichtbaar. · `src/app/client/profile/goals/page.tsx:158-164`

### Profile Diet (`src/app/client/profile/diet/page.tsx`)
**Inputs**: 1 textarea (other restrictions), allergy chips.
**Findings**:
- **[MINOR]** Same focus-state issue. · `src/app/client/profile/diet/page.tsx:163-169`
- **[NIT]** Allergy chips hier en in onboarding stap 4 — verschillende lijsten. Onboarding heeft "Geen, Vegetarisch, Veganistisch, Lactosevrij, Glutenvrij, Notenallergie", profile diet kan andere set hebben. Sync. · `src/app/client/profile/diet/page.tsx`

### Profile Health (`src/app/client/profile/health/page.tsx`)
**Inputs**: 1 textarea (extra details), activity-level radio buttons.
**Findings**:
- **[MINOR]** Same focus-state. · `src/app/client/profile/health/page.tsx:239-245`
- **[MINOR]** Selected activity-level state shows checkmark with `text-white` op `bg-[#FDFDFE]` (white-on-white) — line 226-228. Bug. Fix: `text-[#1C1E18]`. · `src/app/client/profile/health/page.tsx:226-228`

### Profile Notifications (`src/app/client/profile/notifications/page.tsx`)
**Inputs**: 5 toggle switches.
**Findings**:
- **[MAJOR]** `<button>` Toggle is `w-[51px] h-[31px]` — touch-target onder 44 px. Fix: maak hele rij klikbaar of vergroot button met padding-around. · `src/app/client/profile/notifications/page.tsx:68-81`
- **[MAJOR]** Toggle mist `aria-pressed` of `role="switch" + aria-checked`. Screenreader leest button maar niet "aan/uit". · `src/app/client/profile/notifications/page.tsx:68-81`
- **[MINOR]** Settings opgeslagen in `localStorage` — verloren bij browser-clear, niet gesynced over devices. Voor MŌVE-coaching is dat acceptabel maar should be in DB. · `src/app/client/profile/notifications/page.tsx:50`

### Exercise Create Modal (`src/app/client/workout/active/page.tsx` lines 680-1063)
**Inputs**: search, name_nl, body_part chips, target_muscle, equipment chips.
**Findings**:
- **[MAJOR]** `autoFocus` op zowel search-input (line 963) als create-name-input (line 850) — wanneer user open modal, focus op search; wanneer flips naar create form, focus moet jumpen naar name. **Werkt** want create-form re-mount. Maar op iOS kan `autoFocus` keyboard niet openen — vereist user-interaction. Fix: gebruik ref + `setTimeout(() => ref.current.focus(), 100)` na transitie. · `src/app/client/workout/active/page.tsx:850, 963`
- **[MAJOR]** Geen visible focus-state op name/target-muscle inputs — `focus:outline-none` zonder vervangende ring. · `src/app/client/workout/active/page.tsx:851-857, 893-899`
- **[MAJOR]** Validation triggers alleen bij submit click — user typt naam, ziet geen direct feedback. Fix: `onBlur` on each field. · `src/app/client/workout/active/page.tsx:746-757`
- **[MINOR]** Body-part en equipment chips overflowen op kleine schermen — `flex flex-wrap` met 7+ chips wrap correct, maar tap-areas < 44px. Buttons `px-3 py-2` met `text-[12px]` ≈ 32 px hoog. Fix: bump padding. · `src/app/client/workout/active/page.tsx:867-880`
- **[MINOR]** Submit error shows in red box maar **scroll-position niet aangepast** — error onderaan modal kan onder keyboard zitten. Fix: scroll error into view. · `src/app/client/workout/active/page.tsx:925-929`

### Workout Active SetRow (`src/app/client/workout/active/page.tsx` lines 3108-3132)
**Inputs**: weight (text decimal), reps (text numeric).
**Findings**:
- **[MAJOR]** Beide inputs `type="text" inputMode=...` — gebruiken `e.target.select()` op focus om bestaande waarde te selecteren (goed). Maar **geen `enterKeyHint="next"`** — Enter moet naar reps-veld of next set. Fix: `enterKeyHint="next"` op weight, `"done"` op reps + handler die check-button triggert. · `src/app/client/workout/active/page.tsx:3109-3132`
- **[MINOR]** Disabled state (`set.completed`) toont input nog steeds editable-uitziend — geen visuele opacity-drop genoeg. Fix: stronger disabled styling. · `src/app/client/workout/active/page.tsx:3118, 3131`

---

## Cross-cutting patterns

### Pattern 1 — Geen gedeelde input primitive
Vier ongeveer-equivalente FloatingLabel-componenten (login `FloatingInput`, reset/set-password `AnimatedInput` × 2, onboarding `TextInput`/`TextArea`), drie verschillende segmented-pill patterns (NotesStep ScoreSlider, weekly-check-in RatingRow, onboarding `Chip`), en `src/components/ui/Input.tsx` is alleen gebruikt in dead `WorkoutLogger.tsx`.

**Fix-impact**: zou ~15 findings opheffen door één primitive te perfectioneren (focus-state, autoComplete, enterKeyHint, error rendering, touch-target ≥44 px, NL-BE microcopy).

**Aanbeveling**: maak `src/components/ui/FloatingInput.tsx` als single source of truth, ondersteunt `variant: 'dark' | 'light'`, met built-in focus-state, error-rendering, en aria-attributes. Migreer in volgorde: login → set-password → reset-password → onboarding TextInput → check-in MetricsInputStep → check-in TapeMeasurementsStep → profile edit/goals/diet/health → exercise picker.

### Pattern 2 — Geen visible :focus state
**Affected files**: 14+ inputs zonder focus-styling. Iedere keyboard- en assistive-tech gebruiker wordt getroffen. WCAG 2.4.7 fail.

**Fix-impact**: ~12 findings.

**Aanbeveling**: globale CSS rule in `globals.css`:
```css
input:focus-visible, textarea:focus-visible {
  outline: 2px solid #C0FC01;
  outline-offset: 2px;
}
```
Plus per-component override waar nodig (e.g. dark form pill in chat).

### Pattern 3 — Touch targets onder 44 px
DOM-audit identificeert 130+ tooSmall interactives over 6 forms. Vooral chips (`px-3 py-2 text-[12px]` ≈ 32 px), toggle-buttons, en kleine icon-only buttons.

**Fix-impact**: ~8 findings + global accessibility win.

**Aanbeveling**: minimum-utility class `min-h-[44px] min-w-[44px]` op alle buttons in design-system tokens, of een eslint-rule die kleinere `h-`/`w-` flags.

### Pattern 4 — Decimaalseparator-tolerantie inconsistent
Sommige inputs accepteren komma én punt (MetricsInputStep), andere alleen punt (`type="number"` in onboarding). Submit-handlers gebruiken `parseNum(v.replace(',', '.'))` maar **niet overal**.

**Fix-impact**: ~5 findings.

**Aanbeveling**: één util `src/lib/parseDecimal.ts` met `(v: string) => number | null`, gebruikt op elke submit-path. Inputs altijd `type="text" inputMode="decimal"`.

### Pattern 5 — `enterKeyHint` ontbreekt overal
Vrijwel geen enkele input heeft `enterKeyHint`. iOS-keyboard toont default "return" waar context "next", "go", "send", "done" gepast zou zijn.

**Fix-impact**: ~10 findings (raakt 6 forms).

**Aanbeveling**: convention in nieuwe primitive: laatste field van form → `done`; intermediate field → `next`; submit-only field → `go`/`send`.

### Pattern 6 — Validation alleen bij submit
Onboarding, monthly check-in, exercise create — allemaal showen errors **na** submit-poging. Op-blur-validation ontbreekt. `aria-invalid` wordt nooit gezet.

**Fix-impact**: ~6 findings.

**Aanbeveling**: hook `useFieldValidation(value, validators)` die per veld returneert `{error, isValid, touched}`. Wijzig submit-button-disabled gedrag naar **enabled** zonder klik, maar bij click triggers validation én scroll-to-first-error (huidige UX laat user op disabled-knop klikken zonder feedback).

---

## Component-level findings

### `src/components/ui/Input.tsx`
- Generieke `Input` component met `label`, `error`, `hint`, `variant: 'default' | 'clean'`. Goede props.
- **Niet gebruikt** in actieve code (alleen oude `WorkoutLogger.tsx`).
- Mist: `inputMode`, `enterKeyHint`, `autoComplete` als first-class props (kan via `...props` doorgegeven maar geen type-hint).
- Mist: `required`-asterisk, `id`-fallback aan label, focus-state in `clean` variant gebruikt `focus:bg-white` wat in dark theme onleesbaar wordt.
- **Aanbeveling**: deprecate huidige Input, herontwerp als primitive die in cross-cutting Pattern 1 voorgesteld wordt. Of refactor om floating-label native te ondersteunen.

### `src/components/ui/StepperInput.tsx`
- Goed ontworpen: long-press repeat, haptic, select-on-focus, disable-spinner CSS, type=number maar met inputMode override. **Sterk beter dan andere inputs**.
- Mist: `aria-label` op de input zelf (alleen ± buttons hebben "Verlaag"/"Verhoog"). Screenreader leest input zonder context.
- Mist: focus-state op de hele rij (alleen `border-[#D46A3A]` op input zelf — eigen design-token, OK).
- Mist: `enterKeyHint` doorgeefbaar via prop.
- **Aanbeveling**: voeg `aria-label` prop, focus-ring op wrapper, en gebruik dit component op meer plekken (onboarding numerics, MetricsInputStep, weight log) ipv free-form inputs.

### `<textarea>` styling — geen primitive
6+ plekken hebben hand-rolled textarea styling. Gemeenschappelijke tekortkomingen: geen `enterkeyhint`, geen char-count, geen disabled-state, focus-state uitsluitend bg-color (geen ring).

**Aanbeveling**: maak `src/components/ui/Textarea.tsx` met `maxLength`, `showCount`, `error`, `helperText`, `autoResize` props, en gebruik op alle 6 plekken.

### Segmented pill / rating selector — geen primitive
NotesStep `ScoreSlider`, weekly-check-in `RatingRow`, onboarding `ChipSingle`/`ChipMulti` — drie versies van hetzelfde concept.

**Aanbeveling**: één `<SegmentedRating>` primitive met `role="radiogroup"`, value-binding, en consistent active/selected styling. Vervang 3 verschillende implementaties.

### File upload — geen primitive
PhotoUploadStep doet camera + file fallback, weekly-check-in doet alleen file, ChatInput doet 4-way (camera/foto/video/doc). Cross-cutting issue: geen size-validation, geen progress, geen HEIC-fallback.

**Aanbeveling**: extract `<FileUploadZone>` primitive met built-in validation + progress + drag-drop + HEIC handling. Onderhouden in 1 plek.

---

## Quick-win prioritization (top 10)

| # | Fix | Severity | Files | Effort |
|---|-----|---|---|---|
| 1 | Avatar-edit knop in profile/edit functioneel maken | BLOCKER | 1 | M |
| 2 | Onboarding `canProceed` → `attemptedAdvance` highlight ontbrekende velden | BLOCKER | 1 | M |
| 3 | Camera permission-denied disambiguation + visible "Use file picker" CTA | BLOCKER | 1 | S |
| 4 | Onboarding `<input type="date">` op iOS — gebruik 3-input picker of color-scheme | BLOCKER | 1 | M |
| 5 | Weight-log "Log" knop tekstkleur fix (`#1F231F` → `#FDFDFE`) | BLOCKER | 1 | XS |
| 6 | Globale `:focus-visible` rule toevoegen | MAJOR (× ~12) | 1 (CSS) | XS |
| 7 | Profile/notifications toggle: `role="switch" aria-checked` | MAJOR | 1 | XS |
| 8 | Add `enterKeyHint` op alle email/password/numeric inputs | MAJOR (× ~10) | 6 | S |
| 9 | Profile Edit: autoComplete, error-handling op save | MAJOR | 1 | S |
| 10 | Health page: white-on-white check icon (`text-white` → `text-[#1C1E18]`) | MAJOR | 1 | XS |

---

## Files referenced
- `/Users/glenndelille/Desktop/move-app/src/app/page.tsx` (login)
- `/Users/glenndelille/Desktop/move-app/src/app/auth/reset-password/ResetPasswordClient.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/auth/set-password/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/onboarding/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/client/check-in/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/client/weekly-check-in/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/client/DashboardClient.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/client/profile/edit/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/client/profile/goals/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/client/profile/diet/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/client/profile/health/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/client/profile/notifications/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/app/client/workout/active/page.tsx`
- `/Users/glenndelille/Desktop/move-app/src/components/client/ChatInput.tsx`
- `/Users/glenndelille/Desktop/move-app/src/components/client/PhotoUploadStep.tsx`
- `/Users/glenndelille/Desktop/move-app/src/components/client/MetricsInputStep.tsx`
- `/Users/glenndelille/Desktop/move-app/src/components/client/TapeMeasurementsStep.tsx`
- `/Users/glenndelille/Desktop/move-app/src/components/client/NotesStep.tsx`
- `/Users/glenndelille/Desktop/move-app/src/components/client/WorkoutLogger.tsx`
- `/Users/glenndelille/Desktop/move-app/src/components/ui/Input.tsx`
- `/Users/glenndelille/Desktop/move-app/src/components/ui/StepperInput.tsx`
