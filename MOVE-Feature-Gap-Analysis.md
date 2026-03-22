# MŌVE App — Feature Gap Analysis

*Wat mist er om de top coaching app te worden?*

Gebaseerd op analyse van de huidige MŌVE codebase vs. de marktleiders: ABC Trainerize, TrueCoach, PT Distinction, Everfit, en My PT Hub.

---

## Huidige sterke punten van MŌVE

MŌVE heeft al een stevige basis. Dingen die al goed zijn en die niet elke concurrent heeft:

- Eenvoudig dashboard met momentum-tracking (streak, weekoverzicht, gewichtsverandering)
- Gedetailleerde workout-tracking met PR-detectie en set-level logging
- Volledige intake-wizard (10 stappen, foto's, metingen)
- Voedingsplannen met maaltijdstructuur en macro-tracking
- Video coaching via Daily.co integratie
- Coach accountability dashboard met risico-indicatoren
- Push notifications en check-in reminders
- Stripe billing integratie met pakket-tiers
- Nederlandse taal als primaire taal (nichemarkt-voordeel)

---

## Tier 1 — Kritieke ontbrekende features

*Zonder deze features kun je niet concurreren met de top 5. Dit zijn de "table stakes".*

### 1. Habit Tracking System

**Wat het is:** Coaches wijzen dagelijkse gewoontes toe (water drinken, 8 uur slapen, 10.000 stappen, supplementen nemen) die clients afvinken. Niet alleen training en voeding — het volledige gedragsplaatje.

**Waarom het cruciaal is:** ABC Trainerize, PT Distinction, TrueCoach, en Everfit hebben dit allemaal. Het is de #1 feature die coaches noemen als reden om voor een platform te kiezen. Habit coaching verhoogt retentie met 30-40% omdat clients die gewoontes bijhouden langer actief blijven, ook als ze een training missen.

**Wat MŌVE mist:**
- Geen habit-definitie interface voor coaches
- Geen dagelijkse habit check-off voor clients
- Geen habit-streaks of progressie-tracking
- Geen habit-data in het coach dashboard

**Implementatie-idee:** `habits` tabel (coach definieert), `habit_logs` tabel (client checkt af per dag), habit-widget op het client dashboard naast training en voeding, coach ziet compliance-percentage per client.

---

### 2. In-App Chat met Media Support

**Wat het is:** Niet alleen tekst-berichten, maar foto's, video's, voice messages, en GIFs sturen. Clients sturen form-check video's, coaches geven visuele feedback.

**Waarom het cruciaal is:** TrueCoach's #1 selling point is video form checking via chat. Coaches die form-checks doen via WhatsApp of iMessage verliezen context en data. Een in-app oplossing houdt alles bij elkaar.

**Wat MŌVE mist:** Het messaging systeem heeft wel een `message_type` veld (text/image/video/file) en `file_url`, maar er is geen UI voor media uploaden, camera-integratie, of video preview in de chat. Er is ook geen voice message functionaliteit.

**Implementatie-idee:** File upload in chat thread, video recording/upload, image preview inline, voice message opname met Supabase Storage.

---

### 3. Automatisering & Workflows

**Wat het is:** Coaches stellen "als-dan" regels in: als een client 3 dagen geen workout logt, stuur automatisch een motivatie-bericht. Als een client z'n check-in invult, stuur een felicitatie. Als iemand z'n eerste maand voltooit, stuur een milestone-bericht.

**Waarom het cruciaal is:** Dit is hoe je van 10 naar 50+ clients schaalt zonder dat de kwaliteit daalt. ABC Trainerize en PT Distinction bouwen hun hele pitch hieromheen. Coaches die handmatig berichten sturen aan 30+ clients branden op.

**Wat MŌVE mist:**
- Geen trigger-based automatisering
- Geen auto-berichten bij milestones
- Geen "als client X dagen inactief" alerts
- De cron-jobs zijn er (reminders, prompts), maar niet configureerbaar door de coach

**Implementatie-idee:** `automation_rules` tabel met trigger (event type), condition (days inactive, milestone reached), en action (send message, send notification). Coach UI om regels aan te maken. Worker die events checkt.

---

### 4. Progressiefoto Vergelijking

**Wat het is:** Side-by-side vergelijking van foto's over tijd. Slider om tussen twee datums te wisselen. Tijdlijn van alle foto's per hoek.

**Waarom het cruciaal is:** De #1 manier waarop clients hun voortgang zien en gemotiveerd blijven. Elke serieuze coaching app heeft dit. Het is ook de beste marketing — clients delen hun voor/na foto's.

**Wat MŌVE mist:** Er is een `PhotoComparison` en `PhotoSlider` component, maar de check-in pagina lijkt geen full-featured vergelijkings-tool te hebben. Geen tijdlijn-view, geen export voor social media.

**Implementatie-idee:** Dedicated progress photos page met tijdlijn, slider comparison tool, export met branding overlay (MŌVE logo + client naam + datums).

---

### 5. Programma Templates met Periodisering

**Wat het is:** Multi-week programma's die automatisch progrsseren. Week 1: 3x10 @ 60kg, Week 2: 3x10 @ 62.5kg, Week 3: 3x8 @ 67.5kg. De coach stelt het schema in, de app past automatisch de gewichten/reps/sets aan.

**Waarom het cruciaal is:** Serieuze coaches werken met mesocycles en periodisering. Zonder dit moet de coach elke week handmatig het programma aanpassen voor elke client. Dat schaalt niet.

**Wat MŌVE mist:**
- `client_programs` heeft een `current_week` veld maar geen automatische progressie-logica
- Geen percentage-based progressie (bijv. "verhoog gewicht met 2.5% per week")
- Geen deload-week logica
- Geen mesocycle planning

**Implementatie-idee:** `program_progression_rules` per exercise (linear, percentage, wave), automatische suggesties gebaseerd op vorige week prestaties, deload-week markering.

---

## Tier 2 — Differentierende features

*Deze features tillen je boven de concurrentie uit. Niet iedereen heeft ze, maar de top apps wel.*

### 6. Wearable Integratie (Apple Watch, Garmin, Fitbit)

**Wat het is:** Automatisch stappen, hartslag, slaap, en calorieenverbranding importeren vanuit smartwatches.

**Waarom het belangrijk is:** 60%+ van fitness-clients draagt een smartwatch. ABC Trainerize integreert met Apple Health, Fitbit, Garmin, en Withings. Deze data geeft coaches real-time inzicht zonder dat clients handmatig hoeven te loggen.

**Wat MŌVE mist:** Geen enkele wearable integratie. Alle data moet handmatig ingevoerd worden.

**Implementatie-idee:** Apple HealthKit integratie (via React Native of PWA bridge), Google Fit API, Fitbit Web API. Slaap en stappen automatisch syncen naar health_metrics tabel.

---

### 7. Gamification: Badges, Achievements & Challenges

**Wat het is:** Badges voor milestones (eerste workout, 10 workouts, eerste PR, 30-dagen streak). Challenges tussen clients (wie doet de meeste workouts deze maand). Punten systeem.

**Waarom het belangrijk is:** Gamification verhoogt app-engagement met 48% en retentie met 30% (bron: American College of Cardiology, 2024). Everfit's challenges en leaderboards zijn een van hun top features. ABC Trainerize heeft een volledig badges-systeem.

**Wat MŌVE mist:**
- PR celebration is er (confetti), maar geen persistent badge-systeem
- Geen achievement-historie
- Geen challenges of leaderboards
- Geen punten of levels

**Implementatie-idee:** `achievements` tabel (definitie), `user_achievements` tabel (behaald). Badge wall op client profiel. Coach kan challenges aanmaken met leaderboard. Automatische badge-toekenning via event triggers.

---

### 8. Groepsprogramma's & Community

**Wat het is:** Eén programma toewijzen aan meerdere clients tegelijk. Groeps-chat kanalen. Community forum waar clients elkaar motiveren.

**Waarom het belangrijk is:** Dit is hoe coaches schalen van 1-op-1 naar 1-op-veel. Een groepsprogramma van 20 clients tegen een lager tarief = meer omzet met minder werk. Everfit's core pitch is: "Deliver group coaching to 1000s of clients."

**Wat MŌVE mist:** Er is een community-pagina en broadcasts, maar geen groepsprogramma-toewijzing, geen groeps-chat, geen gedeeld forum waar clients interacteren.

**Implementatie-idee:** `program_groups` tabel, bulk-assign UI, groeps-chat kanaal per programma, community feed met posts/likes/comments (deels al aanwezig in API).

---

### 9. Client Self-Service Portal

**Wat het is:** Client kan zelf z'n programma starten (niet wachten op coach), z'n eigen metingen invoeren wanneer ze wil, geschiedenis bekijken van alle workouts, en z'n eigen voortgangsrapporten genereren.

**Waarom het belangrijk is:** Hoe meer de client zelf kan doen, hoe minder "admin" werk voor de coach. PT Distinction en My PT Hub laten clients zelf hun hele journey managen.

**Wat MŌVE mist:**
- Client stats pagina is er, maar beperkt
- Geen workout-historie met zoek/filter (per exercise, per datum)
- Geen zelf-service metingen invoeren (alleen via check-in)
- Geen zelf-rapportage of progress summary exporteren

**Implementatie-idee:** Workout history page met filters, "log meting" knop op elk moment (niet alleen bij check-in), PDF export van voortgangsrapport.

---

### 10. AI-Powered Coaching Assist

**Wat het is:** AI die de coach helpt: automatische workout suggesties gebaseerd op client data, "deze client is at risk" alerts, slimme programma-aanpassingen, en AI-gegenereerde samenvattingen van client voortgang.

**Waarom het belangrijk is:** ABC Trainerize noemt hun AI-coaching features als hun #1 differentiator voor 2025-2026. Coaches met 30+ clients hebben geen tijd om elke client individueel te analyseren — AI kan patronen zien die de coach mist.

**Wat MŌVE al heeft:** Er zijn API routes voor `ai-feedback`, `ai-test`, en `cron/smart-suggestions` + `cron/ai-nudges`, maar het is onduidelijk hoe ver deze zijn uitgewerkt.

**Wat nog ontbreekt:**
- AI-samenvatting van client week ("Glenn had een sterke week: 4/4 workouts, 3 PRs, voeding 80% on track")
- Automatische "red flag" detectie (plotselinge gewichtsdaling, missed workouts pattern)
- AI-suggesties voor programma-aanpassingen
- Coach copilot in de chat (suggestie voor antwoord)

---

## Tier 3 — Nice-to-haves voor premium positionering

*Deze features maken het verschil tussen "goed" en "de beste".*

### 11. Custom Branded App

**Wat het is:** De coach krijgt z'n eigen app in de App Store met eigen logo, kleuren, en naam. Powered by MŌVE onder de motorkap.

**Waarom:** ABC Trainerize en PT Distinction bieden dit aan hun premium tier. Coaches met een eigen merk willen niet dat hun clients een "MŌVE" app downloaden.

**Complexiteit:** Hoog — vereist white-label build pipeline, separate App Store listings.

---

### 12. Supplement & Medicatie Tracking

**Wat het is:** Coach wijst supplementen toe (creatine, vitamine D, eiwitshake), client checkt dagelijks af.

**Waarom:** Er is al een supplements API route. De UI ontbreekt waarschijnlijk.

---

### 13. Slaap & Recovery Score

**Wat het is:** Op basis van slaapdata, HRV (hartslag variabiliteit), en training load een dagelijkse "readiness" score geven. Automatisch deload suggereren als recovery laag is.

**Waarom:** Top athletes en serieuze clients willen dit. Integratie met wearables maakt dit mogelijk.

---

### 14. Coach Dashboard KPI's & Business Metrics

**Wat het is:** Niet alleen client-data, maar ook business metrics: client retention rate, gemiddelde client lifetime, MRR growth, churn risk voorspelling.

**Waarom:** De billing pagina toont al MRR en abonnementen. Uitbreiden met trends, voorspellingen, en actie-suggesties.

---

### 15. Offline Mode & PWA

**Wat het is:** App werkt zonder internet. Workout tracking, habit logging, en voedingsregistratie worden lokaal opgeslagen en gesynchroniseerd wanneer er weer internet is.

**Waarom:** Sportscholen hebben vaak slechte wifi. Clients die buiten trainen hebben niet altijd bereik.

**Wat MŌVE al heeft:** Er is een offline page en service worker setup, plus localStorage voor actieve workout state. Maar volledige offline-first architectuur ontbreekt.

---

## Prioriteringsmatrix

| Feature | Impact op retentie | Coach schaalbaarheid | Implementatie-effort | Prioriteit |
|---|---|---|---|---|
| Habit Tracking | Zeer hoog | Hoog | Medium | 1 |
| Automatisering/Workflows | Hoog | Zeer hoog | Hoog | 2 |
| Media Chat + Form Checks | Hoog | Medium | Medium | 3 |
| Progressiefoto Vergelijking | Hoog | Laag | Laag | 4 |
| Programma Periodisering | Medium | Zeer hoog | Hoog | 5 |
| Gamification/Badges | Hoog | Laag | Medium | 6 |
| Groepsprogramma's | Medium | Zeer hoog | Hoog | 7 |
| AI Coaching Assist | Hoog | Zeer hoog | Hoog | 8 |
| Wearable Integratie | Medium | Laag | Hoog | 9 |
| Client Self-Service | Medium | Hoog | Medium | 10 |

---

## Aanbevolen roadmap

**Fase 1 — Foundation (2-3 weken)**
Habit tracking + Progressiefoto vergelijking + Media in chat.
Dit zijn de features die clients elke dag gebruiken en die direct zichtbaar zijn.

**Fase 2 — Coach Scaling (3-4 weken)**
Automatisering/Workflows + Programma periodisering.
Dit laat coaches opschalen van 15 naar 50+ clients.

**Fase 3 — Engagement & Growth (3-4 weken)**
Gamification + Groepsprogramma's + Client self-service.
Dit verhoogt retentie en opent nieuwe revenue streams (groepsprogramma's).

**Fase 4 — Premium & Differentiatie (ongoing)**
AI coaching assist + Wearable integratie + Custom branded app.
Dit positioneert MŌVE als premium platform.

---

## Conclusie

MŌVE heeft een solide technische basis met goede workout tracking, voedingsplannen, en coach-client communicatie. De belangrijkste gap versus de marktleiders zit in drie gebieden:

1. **Gedragsverandering** — Habit tracking ontbreekt volledig, terwijl dit de #1 retentie-driver is
2. **Coach schaalbaarheid** — Zonder automatisering en periodisering kan een coach max ~15 clients effectief bedienen
3. **Client engagement** — Geen gamification, geen challenges, geen community-gevoel

De goede nieuws: de database-structuur en architectuur van MŌVE zijn flexibel genoeg om deze features toe te voegen zonder grote refactors. De API-route patronen, Supabase integratie, en component-architectuur zijn consistent en uitbreidbaar.

---

*Bronnen: ABC Trainerize, TrueCoach, PT Distinction, Everfit, My PT Hub feature pagina's en reviews (maart 2026)*
