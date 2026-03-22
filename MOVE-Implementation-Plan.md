# MŌVE — Implementatieplan 9 Features

Stap-voor-stap plan, gebaseerd op de bestaande codebase-architectuur (Supabase, Next.js App Router, TypeScript, Zod validatie).

---

## Feature 1: Media Chat + Form Checks

### Doel
Coaches en clients kunnen foto's, video's en voice messages sturen in de chat. Coaches geven visuele form-check feedback.

### Database wijzigingen
Geen — `messages` tabel heeft al `message_type` (text/image/video/file) en `file_url`. Schema is klaar.

### Stappen

**Stap 1: Storage bucket aanmaken**
- Maak Supabase Storage bucket `chat-media` aan (of hergebruik bestaande)
- RLS policy: authenticated users kunnen uploaden, alleen sender/receiver kunnen lezen

**Stap 2: Media upload utility** (`src/lib/chat-media.ts`)
- `uploadChatMedia(file: File, userId: string)` → upload naar Supabase Storage
- Genereer thumbnail voor video's (client-side via canvas)
- Comprimeer afbeeldingen client-side (max 1200px breed, 80% quality)
- Return: `{ url: string, type: 'image' | 'video' | 'file', thumbnailUrl?: string }`

**Stap 3: Chat input uitbreiden** (`src/components/messages/MessageThread.tsx`)
- Media knop naast tekst input (paperclip icon)
- Options: "Foto kiezen", "Camera openen", "Video opnemen", "Bestand"
- File input met `accept="image/*,video/*"`
- Preview van geselecteerde media vóór verzenden
- Upload progress indicator
- Voice message: hold-to-record knop met `MediaRecorder` API

**Stap 4: Chat bubble rendering uitbreiden**
- `message_type === 'image'` → `<img>` met lightbox on tap
- `message_type === 'video'` → `<video>` player met thumbnail
- `message_type === 'file'` → download link met file icon
- Lazy loading voor media in scroll view

**Stap 5: Form Check workflow**
- Client stuurt video vanuit workout pagina ("Stuur form check naar coach")
- Video wordt gekoppeld aan specifieke exercise via `metadata` JSON veld
- Coach ziet in chat: "[Exercise naam] — Form Check" met video
- Coach kan reageren met tekst of annotated screenshot

### Geschatte effort: 5-7 dagen

---

## Feature 2: Automatisering & Workflows

### Doel
Coach configureert "als-dan" regels: triggers (client inactief, milestone bereikt) die automatisch acties uitvoeren (bericht sturen, notificatie).

### Database wijzigingen

```sql
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Trigger
  trigger_type TEXT NOT NULL,
  -- Mogelijke waarden:
  -- 'days_inactive' (geen workout gelogd)
  -- 'workout_completed' (workout afgerond)
  -- 'checkin_submitted' (check-in ingevuld)
  -- 'streak_milestone' (streak van X dagen bereikt)
  -- 'program_week_completed' (week in programma afgerond)
  -- 'missed_meals' (X maaltijden gemist)
  -- 'weight_change' (gewicht veranderd met X%)
  -- 'first_workout' (allereerste workout)
  -- 'subscription_anniversary' (X maanden lid)

  trigger_config JSONB DEFAULT '{}',
  -- Voorbeelden:
  -- { "days": 3 } voor days_inactive
  -- { "streak_days": 30 } voor streak_milestone
  -- { "direction": "down", "percentage": 5 } voor weight_change

  -- Action
  action_type TEXT NOT NULL,
  -- 'send_message' | 'send_notification' | 'send_checkin_request' | 'flag_at_risk'

  action_config JSONB DEFAULT '{}',
  -- { "message": "Hey! Alles goed? Ik merk dat je even niet getraind hebt..." }
  -- { "title": "Goed bezig!", "body": "Je hebt al 30 dagen op rij getraind!" }

  -- Targeting
  target TEXT DEFAULT 'all_clients',
  -- 'all_clients' | 'specific_clients' | 'package_tier'
  target_config JSONB DEFAULT '{}',
  -- { "client_ids": [...] } of { "package": "elite" }

  -- Rate limiting
  cooldown_hours INT DEFAULT 168, -- max 1x per week per client

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) NOT NULL,
  client_id UUID REFERENCES profiles(id) NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  action_taken TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);
```

### Stappen

**Stap 1: Database tabellen + RLS**
- Maak `automation_rules` en `automation_logs` tabellen
- RLS: coach kan alleen eigen rules CRUD-en
- Index op `coach_id`, `is_active`, `trigger_type`

**Stap 2: API routes** (`src/app/api/automations/route.ts`)
- `GET` — lijst alle rules van coach
- `POST` — maak nieuwe rule
- `PATCH` — update rule (toggle active, edit config)
- `DELETE` — verwijder rule
- Zod validatie voor trigger_type en action_type enums

**Stap 3: Automation engine (cron job)** (`src/app/api/cron/automations/route.ts`)
- Draait elke 15 minuten via Vercel Cron
- Per trigger_type: query relevante data
  - `days_inactive`: check `workout_sessions` — laatste workout > X dagen geleden
  - `streak_milestone`: bereken streak per client, check of milestone net bereikt
  - `missed_meals`: check `nutrition_logs` vs verwacht
  - etc.
- Check cooldown via `automation_logs` (niet opnieuw triggeren binnen cooldown_hours)
- Voer action uit: stuur bericht, push notificatie, of flag in dashboard
- Log resultaat in `automation_logs`

**Stap 4: Coach UI — Automation Builder** (`src/app/coach/automations/page.tsx`)
- Lijst van alle regels met active/inactive toggle
- "Nieuwe regel" flow:
  1. Kies trigger (dropdown met beschrijvingen)
  2. Configureer trigger (bijv. aantal dagen)
  3. Kies actie (bericht sturen, notificatie, etc.)
  4. Schrijf bericht (met variabelen: {client_name}, {streak_days}, etc.)
  5. Kies doelgroep (alle clients, specifieke, of per pakket)
  6. Stel cooldown in
- Preview: "Als [trigger] dan [actie] naar [doelgroep]"
- Automation log viewer: wanneer welke regel voor wie getriggerd is

**Stap 5: Template regels**
- Pre-built templates die coach met 1 klik kan activeren:
  - "Motivatie bij inactiviteit" (3 dagen geen workout → bericht)
  - "Felicitatie bij workout" (elke workout → push notificatie)
  - "Streak milestone" (7/14/30/60/90 dagen → bericht)
  - "Check-in herinnering" (geen check-in in 25 dagen → notificatie)

### Geschatte effort: 8-10 dagen

---

## Feature 3: Progressiefoto Vergelijking

### Doel
Side-by-side vergelijking van check-in foto's over tijd, met slider, tijdlijn, en export-functie.

### Database wijzigingen
Geen — `checkins` tabel heeft al `photo_front_url`, `photo_back_url`, `photo_left_url`, `photo_right_url`.

### Stappen

**Stap 1: Progress Photos API** (`src/app/api/progress-photos/route.ts`)
- `GET ?client_id=X` — haal alle check-ins met foto's op, gesorteerd op datum
- Return: `Array<{ date, photos: { front?, back?, left?, right? } }>`
- Genereer signed URLs voor alle foto's (parallel met Promise.all)

**Stap 2: Photo Comparison Component** (`src/components/progress/PhotoCompare.tsx`)
- Twee foto-slots: "voor" en "na"
- Datum-picker per slot (dropdown van beschikbare check-in datums)
- Hoek-selector: front / back / left / right (tabs)
- Slider-vergelijking: sleep horizontale lijn om voor/na te tonen (CSS clip-path)
- Swipe mode: veeg links/rechts om te wisselen
- Pinch-to-zoom op mobiel

**Stap 3: Photo Timeline Component** (`src/components/progress/PhotoTimeline.tsx`)
- Horizontale scroll met thumbnails per check-in datum
- Tap om datum te selecteren
- Indicator voor welke hoeken beschikbaar zijn per datum
- Animatie bij wisselen

**Stap 4: Client Progress Photos Page** (`src/app/client/progress-photos/page.tsx`)
- Combineert PhotoCompare + PhotoTimeline
- Default: meest recente vs. oudste foto
- "Deel mijn voortgang" knop → genereer afbeelding

**Stap 5: Coach Progress Photos View** (`src/app/coach/clients/[id]/photos/page.tsx`)
- Zelfde componenten maar dan vanuit coach perspectief
- Kan alle check-in datums zien
- Notities toevoegen bij specifieke foto's

**Stap 6: Export/Share functie**
- Canvas API: combineer voor + na foto met datums en MŌVE branding
- Download als PNG of deel via Web Share API
- Overlay: client naam (optioneel), datums, en MŌVE logo

### Geschatte effort: 4-5 dagen

---

## Feature 4: Programma Templates met Periodisering

### Doel
Automatische progressie van gewichten, reps, en sets over meerdere weken. Coach stelt het schema in, de app past automatisch aan.

### Database wijzigingen

```sql
-- Progressie-regels per exercise in een template
CREATE TABLE program_progression_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_exercise_id UUID REFERENCES program_template_exercises(id) ON DELETE CASCADE,

  progression_type TEXT NOT NULL,
  -- 'linear_weight' — +X kg per week
  -- 'percentage_weight' — +X% per week
  -- 'linear_reps' — +X reps per week
  -- 'wave' — 3 weken opbouw, 1 week deload
  -- 'rpe_based' — auto-regulatie op basis van RPE
  -- 'custom' — coach definieert per week

  config JSONB NOT NULL,
  -- linear_weight: { "increment_kg": 2.5 }
  -- percentage_weight: { "increment_pct": 5 }
  -- wave: { "wave_weeks": 3, "deload_pct": 60, "increment_per_wave_kg": 2.5 }
  -- rpe_based: { "target_rpe": 8, "adjust_kg": 2.5 }
  -- custom: { "weeks": { "1": { "sets": 3, "reps": 10, "weight_pct": 70 }, "2": {...} } }

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deload week markering op programma niveau
ALTER TABLE program_templates ADD COLUMN IF NOT EXISTS
  deload_config JSONB DEFAULT NULL;
  -- { "every_n_weeks": 4, "volume_reduction_pct": 40, "intensity_reduction_pct": 20 }

-- 1RM tracking voor percentage-based progressie
CREATE TABLE client_estimated_1rm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  estimated_1rm NUMERIC(6,2) NOT NULL,
  calculated_from TEXT, -- 'epley' | 'brzycki' | 'manual'
  source_session_id UUID REFERENCES workout_sessions(id),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, exercise_id)
);
```

### Stappen

**Stap 1: Database + 1RM berekening**
- Maak tabellen aan
- `calculate1RM(weight, reps, formula)` utility functie
- Auto-update 1RM na elke workout (Epley formule: `weight × (1 + reps/30)`)

**Stap 2: Progression Rules API** (`src/app/api/progression-rules/route.ts`)
- CRUD voor progressie-regels per template exercise
- Endpoint om "volgende week" suggesties te berekenen voor een client

**Stap 3: Workout Suggesties Engine** (`src/lib/progression.ts`)
- `calculateNextWeekTargets(clientId, exerciseId, currentWeek)`:
  1. Haal progressie-regel op
  2. Haal vorige week's prestaties op
  3. Bereken doelgewicht/-reps voor komende week
  4. Check of het een deload week is
  5. Return: `{ suggested_weight, suggested_reps, suggested_sets, is_deload }`

**Stap 4: Coach UI — Periodisering instellen**
- In template exercise edit view: "Progressie" tab
- Dropdown: type progressie kiezen
- Config velden dynamisch op basis van type
- Preview: tabel met week 1-8 verwachte gewichten/reps
- Deload configuratie op template niveau

**Stap 5: Client workout view — suggesties tonen**
- In de actieve workout pagina: "Suggestie: 62.5kg × 10" onder elk exercise
- Gebaseerd op progressie-regel + vorige week's prestaties
- Client kan suggestie accepteren (auto-fill) of aanpassen
- Deload week: visuele indicator ("Deload week — herstel focus")

**Stap 6: Coach dashboard — progressie overzicht**
- Per client: grafiek van gewichtprogressie per exercise over weken
- Alert als client consistent onder suggesties presteert (mogelijke stagnatie)
- Overzicht: welke clients in deload week zitten

### Geschatte effort: 7-9 dagen

---

## Feature 5: Apple Health Integratie

### Doel
Automatisch stappen, slaap, hartslag, en calorieën importeren vanuit Apple Health.

### Haalbaarheidsanalyse
Apple HealthKit werkt alleen via native iOS apps (Swift/React Native). Een PWA/web-app kan niet direct HealthKit gebruiken. Er zijn twee opties:

**Optie A: Web-based via Apple Health Export (simpel, beperkt)**
- Client exporteert Apple Health data als XML
- Upload via MŌVE app
- Parse en importeer

**Optie B: Third-party bridge via Terra API of Vital (beste optie)**
- Terra API of Vital.io biedt een REST API die Apple Health, Garmin, Fitbit, Whoop, etc. koppelt
- Client authoriseert via hun SDK (web widget)
- Data wordt automatisch naar jouw webhook gestuurd
- Kosten: ~$0.50-2/user/maand

**Optie C: Native app wrapper (meeste werk)**
- React Native of Capacitor wrapper om de bestaande Next.js app
- Direct HealthKit toegang via native bridge
- Vereist Apple Developer account + App Store review

### Stappen (Optie B — Terra/Vital integratie)

**Stap 1: Terra/Vital account + API setup**
- Maak account aan bij Terra API (https://tryterra.co) of Vital (https://vital.io)
- Configureer webhook URL: `https://move-app.vercel.app/api/webhooks/health-data`
- Genereer API keys, sla op als environment variables

**Stap 2: Database uitbreiding**

```sql
CREATE TABLE health_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  provider TEXT NOT NULL, -- 'apple_health' | 'garmin' | 'fitbit' | 'whoop'
  external_user_id TEXT, -- Terra/Vital user ID
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hergebruik bestaande health_metrics tabel, voeg bronveld toe
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS
  source TEXT DEFAULT 'manual'; -- 'manual' | 'apple_health' | 'garmin' | 'fitbit'
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS
  auto_synced BOOLEAN DEFAULT false;
```

**Stap 3: Connect flow** (`src/app/client/settings/health-connect/page.tsx`)
- "Koppel je gezondheidsdata" pagina
- Toon beschikbare providers (Apple Health, Garmin, Fitbit)
- Terra/Vital widget opent → client authoriseert
- Callback slaat `health_integrations` record op

**Stap 4: Webhook handler** (`src/app/api/webhooks/health-data/route.ts`)
- Ontvang data van Terra/Vital
- Parse en normaliseer (stappen, slaap, hartslag, calorieën)
- Sla op in `health_metrics` tabel met `source` en `auto_synced = true`
- Dedupliceer: niet overschrijven als er al handmatige data is voor die dag

**Stap 5: Dashboard integratie**
- Client dashboard: stappen, slaap, en hartslag widgets (als gekoppeld)
- Coach client view: health data timeline
- Gecombineerde grafiek: training load vs. slaapkwaliteit vs. recovery

### Geschatte effort: 5-7 dagen (met Terra/Vital), 3-4 weken (native app)

---

## Feature 6: Client Self-Service

### Doel
Client kan zelfstandig workout historie bekijken, metingen invoeren, en voortgangsrapporten exporteren.

### Database wijzigingen
Geen — alle data is er al, de UI ontbreekt.

### Stappen

**Stap 1: Workout Historie Page** (`src/app/client/history/page.tsx`)
- Lijst van alle voltooide workouts, gesorteerd op datum
- Filter: per maand, per programma
- Per workout: naam, duur, volume, aantal sets, PRs
- Tap voor detail: alle exercises met sets/reps/gewicht
- Zoek op exercise naam: "Toon alle bench press sessies"

**Stap 2: Exercise Progressie View** (`src/app/client/history/exercise/[id]/page.tsx`)
- Per exercise: grafiek van beste gewicht over tijd
- Tabel met alle sets ooit gedaan
- PR markering in de grafiek
- Volume grafiek (sets × reps × gewicht)

**Stap 3: Meting Invoeren** (`src/app/client/measurements/page.tsx`)
- "Log een meting" knop (niet alleen bij check-in)
- Kies type: gewicht, lichaamsmaten, bodyfat
- Invoer formulier
- Gebruik bestaande `health_metrics` API (`POST /api/health-metrics`)
- Grafiek van metingen over tijd

**Stap 4: Voortgangsrapport** (`src/app/client/progress-report/page.tsx`)
- Automatisch gegenereerd overzicht:
  - Training: workouts per week, totaal volume, PRs
  - Lichaam: gewichtsverloop, metingen vergelijking
  - Voeding: compliance percentage
  - Streak en consistency score
- Periode selector: afgelopen maand, 3 maanden, 6 maanden, jaar
- "Download als PDF" knop (server-side PDF generatie via bestaande reports API)

**Stap 5: Client navigatie updaten**
- Voeg "Historie" en "Metingen" toe aan bottom nav of sidebar
- Quick-link op dashboard naar recente workouts

### Geschatte effort: 6-8 dagen

---

## Feature 7: AI Coaching Assistant

### Doel
AI helpt de coach met client-analyse, programma-suggesties, en geautomatiseerde samenvattingen.

### Bestaande basis
Er is al: `ai-coach.ts` (Glenn persona), `ai-feedback` route, `ai-nudges` cron, `smart-suggestions` cron. De AI infrastructuur is er — het moet uitgebreid worden.

### Stappen

**Stap 1: Weekelijkse Client Samenvatting** (`src/app/api/ai/weekly-summary/route.ts`)
- Input: alle data van afgelopen week per client
  - Workouts (volume, PRs, gemist)
  - Voeding compliance
  - Check-in data
  - Berichten (sentiment)
  - Health metrics (gewicht, slaap)
- Output: 3-5 zinnen samenvatting in coach taal
- "Glenn had een sterke week: 4/4 workouts, 2 PRs op bench press, voeding 85% on track. Gewicht stabiel op 82.3kg. Opvallend: RPE consistent 9+ op squats — overweeg deload."

**Stap 2: Red Flag Detection** (`src/app/api/cron/ai-alerts/route.ts`)
- Automatische detectie patronen:
  - 3+ dagen geen activiteit (ongebruikelijk voor deze client)
  - Plotselinge gewichtsdaling > 2kg in een week
  - Consistente underperformance vs. progressie-doelen
  - Stijgende RPE met dalende gewichten (mogelijke blessure)
  - Check-in mood scores dalend trend
- Alert in coach dashboard met prioriteit (urgent/let op/info)
- Push notificatie naar coach bij urgente alerts

**Stap 3: Programma Suggesties** (`src/app/api/ai/program-suggestions/route.ts`)
- Na analyse van client workout data:
  - "Client stageert op bench press (3 weken geen progressie) — overweeg variatie of deload"
  - "Volume op benen is 40% lager dan bovenlichaam — balans verbeteren?"
  - "Client haalt consistent meer reps dan voorgeschreven — gewicht verhogen"
- Suggesties verschijnen in client detail pagina bij coach

**Stap 4: Chat Copilot** (`src/app/api/ai/chat-suggest/route.ts`)
- Wanneer coach een bericht van client opent:
  - AI leest de context (recent berichten, workout data, check-in)
  - Genereert 2-3 antwoord-suggesties
  - Coach kan klikken om suggestie te gebruiken (en eventueel aanpassen)
- UI: suggesties boven de chat input als kleine chips

**Stap 5: Coach Dashboard AI Widget**
- "AI Insights" sectie op coach homepage
- Top 3 clients die aandacht nodig hebben (met reden)
- Weekelijkse samenvatting van hele clientbase
- Trends: "3 clients stagneren op squats — controleer programmering"

**Stap 6: AI Voedingsanalyse**
- Na check-in: AI analyseert voedingslogs vs. targets
- Concrete suggesties: "Client haalt eiwitdoel niet op trainingsdagen — overweeg shake na training"

### Geschatte effort: 10-12 dagen

---

## Feature 8: Supplement Tracking

### Doel
Coach wijst supplementen toe, client checkt dagelijks af, compliance tracking.

### Bestaande basis
Er is al een `supplements` API route en database tabel. De UI en dagelijkse tracking ontbreken.

### Database wijzigingen

```sql
-- Bestaande supplements tabel controleren en uitbreiden
-- (als deze al bestaat, alleen toevoegen wat mist)

CREATE TABLE IF NOT EXISTS supplement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  coach_id UUID REFERENCES profiles(id) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplement_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES supplement_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Creatine', 'Vitamine D', 'Omega-3', etc.
  dosage TEXT, -- '5g', '2000 IU', '2 capsules'
  timing TEXT, -- 'ochtend', 'bij maaltijd', 'voor training', 'voor slapen'
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE supplement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  supplement_item_id UUID REFERENCES supplement_plan_items(id),
  supplement_name TEXT NOT NULL, -- denormalized voor snelle queries
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  taken BOOLEAN DEFAULT false,
  taken_at TIMESTAMPTZ,
  UNIQUE(client_id, supplement_item_id, date)
);
```

### Stappen

**Stap 1: Database + API**
- Maak tabellen aan
- `GET/POST /api/supplement-plans` — coach beheert plannen
- `GET/POST /api/supplement-logs` — client logt dagelijks
- `GET /api/supplement-compliance?client_id=X&days=30` — compliance data

**Stap 2: Coach UI — Supplement Plan Builder** (`src/app/coach/clients/[id]/supplements/page.tsx`)
- Lijst van toegewezen supplementen
- "Voeg supplement toe" formulier: naam, dosering, timing, notities
- Drag-and-drop volgorde
- Template supplementplannen (bulk toevoegen)
- Compliance overzicht per client (percentage afgelopen 7/30 dagen)

**Stap 3: Client UI — Dagelijkse Supplement Check**
- Widget op client dashboard (naast voeding)
- Checklist van vandaag's supplementen
- Tap om af te vinken (optimistic update)
- Timing indicator (ochtend/middag/avond)
- Streak: "12 dagen op rij alle supplementen genomen"

**Stap 4: Coach Dashboard Integratie**
- Supplement compliance in client overzicht
- Alert als compliance < 70% in afgelopen week
- Supplement data in weekelijkse AI samenvatting

### Geschatte effort: 3-4 dagen

---

## Feature 9: Offline Architecture

### Doel
App werkt zonder internet: workout tracking, habit logging, supplement check-off. Synchroniseert wanneer online.

### Bestaande basis
Er is al: service worker setup, offline pagina, localStorage voor actieve workout state.

### Stappen

**Stap 1: IndexedDB Store** (`src/lib/offline-store.ts`)
- Gebruik `idb` library (lightweight IndexedDB wrapper)
- Stores:
  - `pendingActions` — queue van nog niet gesynchroniseerde acties
  - `cachedData` — dashboard data, programma data, supplement plan
  - `workoutState` — actieve workout state (uitbreiding van huidige localStorage)

```typescript
interface PendingAction {
  id: string
  type: 'workout_set' | 'supplement_log' | 'meal_toggle' | 'measurement'
  payload: any
  timestamp: number
  retries: number
}
```

**Stap 2: Action Queue System** (`src/lib/sync-queue.ts`)
- Wanneer offline: sla actie op in `pendingActions` store
- Wanneer online: verwerk queue in volgorde (FIFO)
- Conflict resolution: server wint bij conflicten, maar merge waar mogelijk
- Retry logic: max 3 pogingen, daarna markeer als failed
- UI indicator: "3 acties wachten op synchronisatie"

**Stap 3: Network-aware API wrapper** (`src/lib/offline-fetch.ts`)
- Wrapper rond `cachedFetch` die offline detecteert
- Online: normaal fetchen + opslaan in IndexedDB cache
- Offline: return cached data + queue mutaties
- `navigator.onLine` + `online`/`offline` events

**Stap 4: Service Worker uitbreiden** (`public/sw.js`)
- Cache strategie: "Network first, cache fallback" voor API calls
- Pre-cache: dashboard data, programma data bij eerste load
- Background sync: verwerk pending actions wanneer verbinding hersteld
- Cache static assets aggressief (JS, CSS, fonts, images)

**Stap 5: Offline-capable componenten**
- Workout page: al grotendeels offline-capable (localStorage), migreer naar IndexedDB
- Supplement check: toggle werkt offline, synced later
- Meal toggle: optimistic update + queue
- Dashboard: toon cached data met "Laatst bijgewerkt: 5 min geleden" indicator

**Stap 6: Sync status UI**
- Kleine indicator in header/footer:
  - Groen bolletje: online en gesynchroniseerd
  - Oranje bolletje: offline, X acties in queue
  - Rood bolletje: sync mislukt, actie vereist
- Pull-to-refresh op mobiel forceert sync

**Stap 7: PWA manifest optimaliseren**
- `display: standalone` voor app-achtige ervaring
- Correct caching in manifest
- App install prompt op iOS en Android

### Geschatte effort: 8-10 dagen

---

## Totaaloverzicht

| # | Feature | Effort | Afhankelijkheden |
|---|---------|--------|------------------|
| 1 | Media Chat + Form Checks | 5-7 dagen | Geen |
| 2 | Automatisering & Workflows | 8-10 dagen | Geen |
| 3 | Progressiefoto Vergelijking | 4-5 dagen | Geen |
| 4 | Programma Periodisering | 7-9 dagen | Geen |
| 5 | Apple Health Integratie | 5-7 dagen | Terra/Vital account |
| 6 | Client Self-Service | 6-8 dagen | Geen |
| 7 | AI Coaching Assistant | 10-12 dagen | Anthropic API key (al aanwezig) |
| 8 | Supplement Tracking | 3-4 dagen | Geen |
| 9 | Offline Architecture | 8-10 dagen | Feature 8 (supplement logs) |

**Totaal geschatte effort: 56-72 dagen**

## Aanbevolen volgorde

**Sprint 1 (Week 1-2):** Feature 8 (Supplements) + Feature 3 (Progress Photos)
→ Snelle wins, direct zichtbaar voor clients, basis voor andere features.

**Sprint 2 (Week 3-4):** Feature 1 (Media Chat) + Feature 6 (Self-Service)
→ Client engagement stijgt, minder "waar kan ik X vinden" vragen.

**Sprint 3 (Week 5-7):** Feature 4 (Periodisering) + Feature 2 (Automatisering)
→ Coach scaling: minder handmatig werk per client.

**Sprint 4 (Week 8-9):** Feature 7 (AI Assistant)
→ Bouwt voort op alle voorgaande data (workouts, supplementen, progressie).

**Sprint 5 (Week 10-11):** Feature 5 (Apple Health) + Feature 9 (Offline)
→ Polish en platform-integratie als de core features staan.
