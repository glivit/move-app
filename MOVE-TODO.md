# MŌVE App — Taken & Feature Roadmap

---

## URGENT: Handmatige taken (Glenn)

### SQL Migratie uitvoeren
Ga naar **Supabase Dashboard > SQL Editor** en plak de volledige inhoud van:
`supabase/migrations/003_nutrition_logs.sql`

Zonder dit werken deze features niet:
- Client voeding tracking (afvinken, notities, mood, water)
- Coach compliance overzicht per client

### Password reset rate limit
**Probleem:** "Te veel verzoeken" foutmelding bij wachtwoord reset als coach.
**Oplossing:** Supabase Dashboard > Authentication > Rate Limits > verhoog naar 5/minuut.
Of: wacht 60 seconden tussen pogingen (standaard Supabase limiet).

### Supabase e-mail templates
Ga naar Supabase Dashboard > Authentication > Email Templates en pas aan:
- **Invite** — welkomstmail voor nieuwe cliënten (nu standaard Engels)
- **Reset Password** — wachtwoord reset mail
- **Confirm signup** — bevestigingsmail
Tip: gebruik je MŌVE huisstijl, Nederlands, en je studio naam.

### OAuth providers (optioneel)
- Google Sign-In: Supabase > Auth > Providers > Google
- Apple Sign-In: Supabase > Auth > Providers > Apple

### Deployment
- [ ] Vercel project koppelen
- [ ] Custom domein instellen
- [ ] Environment variables op Vercel zetten
- [ ] Stripe webhooks URL updaten naar productie-domein

---

## FEATURE ROADMAP — Prioriteit gerankt

Na grondige analyse van TrueCoach, TrainHeroic, PT Distinction, My PT Hub, Trainerize, Future, Caliber, Exercise.com en de huidige MŌVE app, hieronder de features die het meeste impact hebben voor jouw business (1 coach, tot 30 premium cliënten, €297-797/maand).

---

### PRIORITEIT 1 — Hoog impact, direct verschil voor cliënten

#### 1. Foto voortgang vergelijking (Before/After)
**Waarom:** Cliënten die visueel hun vooruitgang zien blijven 3x langer. Dit is de #1 motivator.
**Wat:**
- Side-by-side vergelijking van check-in foto's (week 1 vs nu)
- Overlay met datums en gewicht
- Slider-tool om te vegen tussen twee foto's
- Coach kan vergelijkingen delen met cliënt als motivatie
- Auto-groepering per hoek (front, back, left, right)
**Complexiteit:** Medium

#### 2. Workout tijdlijn & progressie grafieken
**Waarom:** Elke concurrent heeft dit. Cliënten willen hun kracht-evolutie zien.
**Wat:**
- Grafiek per oefening (bijv. bench press progressie over 12 weken)
- Volume load tracking (sets × reps × gewicht per week)
- Body weight progressie grafiek
- Persoonlijke records tijdlijn
- Vergelijk periodes (dit blok vs vorig blok)
**Complexiteit:** Medium

#### 3. Push notificaties & herinneringen
**Waarom:** Zonder reminders vergeten cliënten te loggen. Compliance daalt 40% zonder.
**Wat:**
- Workout herinnering (bijv. "Vandaag: Leg Day om 17:00")
- Maaltijd herinnering ("Tijd voor je middageten")
- Check-in herinnering (3 dagen voor deadline)
- Nieuw bericht van coach
- Coach: dagelijks overzicht van wie niet gelogd heeft
**Complexiteit:** Medium (Progressive Web App / service worker)

#### 4. Habit tracker
**Waarom:** PT Distinction, Trainerize en Caliber hebben dit. Premium coaching gaat verder dan training.
**Wat:**
- Coach stelt gewoontes in per cliënt (bijv. "8u slaap", "2.5L water", "10.000 stappen", "creatine nemen")
- Client vinkt dagelijks af
- Streak counter (🔥 12 dagen op rij)
- Wekelijks compliance percentage
- Coach ziet overzicht van alle cliënten
**Complexiteit:** Medium

#### 5. Client dashboard redesign met "Vandaag" focus
**Waarom:** Cliënt moet in 1 blik weten: wat moet ik vandaag doen?
**Wat:**
- Vandaag's workout (met 1-tap start)
- Vandaag's voedingsplan (met snelle afvink)
- Vandaag's gewoontes (checkboxes)
- Volgende video call
- Ongelezen berichten
- Motivatie-element (streak, voortgang quote, PR highlight)
**Complexiteit:** Low-Medium

---

### PRIORITEIT 2 — Differentiators die premium pricing rechtvaardigen

#### 6. Wearable integratie (Apple Health / Google Fit)
**Waarom:** 68% van fitness-app gebruikers wil dat hun app "leert en aanpast" (McKinsey 2025). Wearable data maakt coaching persoonlijker.
**Wat:**
- Stappen automatisch importeren
- Slaap data tonen aan coach
- Hartslag/HRV voor recovery score
- Calorieën verbranding synchroniseren
- "Readiness score" berekenen (goed genoeg hersteld voor zware training?)
**Complexiteit:** High (Apple HealthKit API, Google Fit API)

#### 7. Cliënt-zijde programma feedback
**Waarom:** Future en Caliber onderscheiden zich door bi-directionele feedback.
**Wat:**
- Na elke workout: "Hoe was de moeilijkheidsgraad?" (te makkelijk / perfect / te zwaar)
- Per oefening: "Pijn of ongemak?" markering
- Suggestie veld: "Welke oefening wil je meer/minder?"
- Coach ziet feedback per workout en kan programma aanpassen
**Complexiteit:** Low

#### 8. Periodisering & blokplanning visueel
**Waarom:** TrainHeroic's "Master Calendar" is hun killer feature. Gestructureerde periodisering rechtvaardigt premium coaching.
**Wat:**
- Visuele tijdlijn: mesocyclus → microcyclus → training
- Blokken met labels (Anatomische Adaptatie, Hypertrofie, Kracht, Piek, Deload)
- Auto-deload week instellen
- Volume & intensiteit grafiek over het blok
- Coach plant weken vooruit, cliënt ziet de roadmap
**Complexiteit:** High

#### 9. In-app formulier voor oefeningen (video upload)
**Waarom:** Future's kern-feature is form feedback. Video-analyse onderscheidt premium coaching.
**Wat:**
- Cliënt filmt een set en uploadt via de app
- Coach bekijkt en geeft annotaties/feedback
- Timestamped opmerkingen op de video
- Vergelijk video's over tijd (form verbetering)
**Complexiteit:** High

#### 10. Automatische onboarding flow
**Waarom:** Eerste indruk bepaalt retentie. Nu is het proces handmatig.
**Wat:**
- Nieuwe cliënt ontvangt welkomst-email met link
- Stap-voor-stap: profiel invullen → intake formulier → eerste check-in foto's → goals
- Coach krijgt notificatie "Nieuwe cliënt klaar voor programma"
- Automatische welkomstboodschap in chat
- Optioneel: introductie video van coach
**Complexiteit:** Medium

---

### PRIORITEIT 3 — Nice-to-have die de ervaring afronden

#### 11. Cliënt community / groepschat
**Waarom:** Community verhoogt retentie met 40%. Cliënten motiveren elkaar.
**Wat:**
- Groepskanaal waar alle cliënten in zitten
- Coach post updates, tips, challenges
- Cliënten delen workouts, PR's, maaltijden
- Optioneel: challenges (bijv. "wie logt 7 dagen op rij?")
- Privacy: cliënten zien alleen voornamen
**Complexiteit:** Medium

#### 12. Workout timer & superset flow
**Waarom:** Tijdens actieve workout wil je niet nadenken, alleen volgen.
**Wat:**
- Automatische rust-timer die aftelt na een set
- Superset flow: A1 → A2 → rust → herhaal
- Audio/vibratie notificatie bij einde rust
- "Volgende oefening" preview
- Optioneel: muziek integratie (Spotify widget)
**Complexiteit:** Low-Medium

#### 13. Supplement & medicatie tracker
**Waarom:** Bij premium coaching (€797/maand) verwacht de cliënt totale begeleiding.
**Wat:**
- Coach stelt supplementen in (creatine, vitamine D, omega-3, etc.)
- Cliënt vinkt dagelijks af
- Herinnering als vergeten
- Kan ook voor medicatie (bijv. schildklier)
**Complexiteit:** Low (kan als uitbreiding van habit tracker)

#### 14. PDF exports & rapporten
**Waarom:** Cliënten willen hun voortgang delen (arts, partner, social media).
**Wat:**
- Maandelijks voortgangsrapport (auto-gegenereerd)
- Inhoud: foto vergelijking, gewichtsgrafiek, PR's, compliance stats, coach notities
- Mooie MŌVE branded PDF
- Coach kan rapport persoonlijk aanpassen voor cliënt
**Complexiteit:** Medium

#### 15. Content/kennis bibliotheek 2.0
**Waarom:** Premium coaching = educatie. Cliënten die begrijpen waarom, doen meer mee.
**Wat:**
- Coach uploadt video's, artikelen, infographics
- Categorieën: Training, Voeding, Herstel, Mindset, Slaap
- "Aanbevolen voor jou" op basis van cliënt's doelen
- Cliënt kan markeren als gelezen
- Coach ziet wie wat bekeken heeft
**Complexiteit:** Low-Medium

#### 16. Smart scheduling (beschikbaarheid + booking)
**Waarom:** Heen-en-weer berichten voor een afspraak plannen is tijdverspilling.
**Wat:**
- Coach stelt beschikbare tijdslots in
- Cliënt boekt zelf een video call of in-person sessie
- Automatische bevestiging + herinnering
- Sync met Google Calendar / Apple Calendar
- Annulering met deadline (bijv. 24u van tevoren)
**Complexiteit:** Medium

#### 17. Whitelabel PWA (Progressive Web App)
**Waarom:** Een "echte app" ervaring zonder App Store kosten (€99/jaar Apple, €25 Google).
**Wat:**
- Installeerbaar op home screen (al deels aanwezig)
- App icon met MŌVE logo
- Splash screen
- Offline basis-functies (workout bekijken, voedingsplan)
- Push notificaties via service worker
**Complexiteit:** Medium

#### 18. Multi-language support
**Waarom:** Als je ooit Engelstalige expats in Knokke wilt bedienen.
**Wat:**
- NL/EN toggle in profiel
- Alle UI teksten via i18n
- Oefeningen al in EN+NL (database heeft dit)
**Complexiteit:** Medium-High (veel vertaalwerk)

---

### TOEKOMST — AI & Innovatie (2026+)

#### 19. AI-gestuurde programma suggesties
- Coach krijgt suggesties op basis van cliënt data
- "Jan's bench press stagneert → overweeg meer volume of deload"
- Automatische progressie-suggesties

#### 20. AI voedingsplan generator
- Op basis van doelen, allergieën, voorkeuren
- Coach past aan en keurt goed
- Receptsuggesties met boodschappenlijst

#### 21. Computer vision form check
- Cliënt filmt oefening → AI geeft instant feedback
- Hoekanalyse van gewrichten
- Vergelijk met "ideale" uitvoering

#### 22. Predictive analytics
- Voorspel wanneer cliënt dreigt af te haken (laag compliance)
- Blessure-risico inschatting op basis van volume + slaap + recovery
- Optimale timing voor deload week

---

## Status — Gebouwd

**Sprint 1** (KLAAR):
- [x] Foto voortgang vergelijking (before/after slider, hoeken, datum-selectie)
- [x] Workout progressie grafieken (kracht, volume, PRs, lichaam met AreaCharts)
- [x] Client dashboard "Vandaag" redesign (workout, voeding, habits, PRs)

**Sprint 2** (KLAAR):
- [x] Habit tracker (database, API, client UI met streaks)
- [x] Cliënt programma feedback (moeilijkheid, pijn per oefening, coach suggesties)
- [ ] Push notificaties (PWA) — vereist service worker setup

**Competitive UX Verbeteringen** (KLAAR):
- [x] Timeframe switching op grafieken (4w/8w/12w/alles)
- [x] Smart defaults in workout logging (gewicht propagatie naar volgende set)
- [x] Coach dashboard: workout feedback overzicht met moeilijkheidsgraad
- [x] Workout feedback API voor coach review

**Sprint 3** (KLAAR):
- [x] Smart scheduling (coach beschikbaarheid, client booking, geblokkeerde dagen)
- [x] PDF voortgangsrapporten (preview page + data API)
- [x] Supplement & medicatie tracker (CRUD, dagelijks afvinken, per tijdstip)
- [x] Periodisering & blokplanning visueel (Gantt chart, intensiteitscurve, fase editor)
- [x] Exercise DB uitbreiding (12 nieuwe equipment types, video_url veld)
- [x] Muscle group volume breakdown (donut chart + progress bars)
- [x] Training frequency heatmap (12 weken grid)
- [x] Photo timeline strip met interval markers

**Sprint 4** (TODO):
- [ ] Workout timer & superset flow
- [ ] Automatische onboarding flow
- [ ] Content bibliotheek 2.0 upgrade
- [ ] Video form feedback

**Sprint 5+** (TODO):
- [ ] Wearable integratie
- [ ] Community/groepschat
- [ ] AI features
- [ ] Multi-language support
- [ ] Whitelabel PWA

---

## SQL Migraties — Handmatig uitvoeren

Ga naar **Supabase Dashboard > SQL Editor** en voer in volgorde uit:

1. `supabase/migrations/003_nutrition_logs.sql` — voeding tracking
2. `supabase/migrations/004_habits.sql` — habit tracker
3. `supabase/migrations/005_workout_feedback.sql` — workout feedback
4. `supabase/migrations/006_push_subscriptions.sql` — push notificaties
5. `supabase/migrations/007_periodization.sql` — training phases + preferred days
6. `supabase/migrations/008_content_library.sql` — content bibliotheek
7. `supabase/migrations/009_health_data.sql` — health metrics
8. `supabase/migrations/010_community.sql` — community features
9. `supabase/migrations/011_supersets.sql` — superset groups
10. `supabase/migrations/012_dutch_exercise_names.sql` — NL oefening namen
11. `supabase/migrations/013_seed_programs_and_diet.sql` — seed data
12. `supabase/migrations/014_scheduling.sql` — coach beschikbaarheid & booking
13. `supabase/migrations/015_supplements.sql` — supplement tracker
14. `supabase/migrations/016_exercise_video_url.sql` — video URL op oefeningen
15. `supabase/migrations/20260315_accountability_logs.sql` — accountability logs
