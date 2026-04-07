# MŌVE Roadmap — Plan van Aanpak

## Fase 1: Core Workout UX (week 1-2)
Alles wat elke workout-sessie raakt. Kleine fixes, groot effect.

### 11. Reps input auto-select
**Effort:** 1 uur
- `inputMode="numeric"` + `onFocus={(e) => e.target.select()}` op reps veld
- Zelfde gedrag als het weight veld al heeft

### 2. Rest timer fix (stopt bij app switch)
**Effort:** 1-2 dagen
- Probleem: `setInterval` pauzeert in browser background tab
- Oplossing: Sla `timerEndTime = Date.now() + restSeconds * 1000` op, bereken resterende tijd bij elke tick als `endTime - Date.now()`
- Wakker worden na app-switch: timer toont juiste resterende tijd (of 0 als verlopen)
- Vibration API `navigator.vibrate(200)` als timer afloopt
- Voor lock screen: Service Worker + Notification API (`new Notification("Rust voorbij!")`)

### 3 + 4. Oefening toevoegen/bewerken + drag-reorder tijdens workout
**Effort:** 3-4 dagen
- Voeg "+" knop toe onderaan exercise list in workout session
- Modal: zoek uit exercise library, voeg toe aan huidige sessie
- Edit: tik op exercise naam → wijzig sets/reps/gewicht voorschrift
- Verwijder: swipe-left of lang drukken → bevestig
- Drag-reorder: `@dnd-kit/sortable` (werkt goed met React, touch-friendly)
- Alle wijzigingen leven in lokale state tot einde workout

### 5. Opslaan of éénmalig? (na aangepaste workout)
**Effort:** 1 dag
- Bij "Workout voltooien": check of exercises/sets/order afwijken van template
- Zo ja → bottom sheet: "Je hebt aanpassingen gemaakt" met twee knoppen:
  - "Opslaan in programma" → PATCH `program_template_exercises` + `program_template_days`
  - "Alleen deze keer" → gewoon sluiten
- Diff berekenen: vergelijk session exercises vs template exercises (ids, order, sets)

### 6. Smart set prefill
**Effort:** 1 dag
- Na het loggen van set N: prefill set N+1 met `min(voorgeschreven, net gedaan)`
- Logica: `nextWeight = Math.min(prescribed.weight, lastLogged.weight)`
- Idem voor reps: `nextReps = Math.min(prescribed.reps, lastLogged.reps)`
- Visuele hint: als prefill lager is dan voorschrift, toon klein label "aangepast ↓"

---

## Fase 2: PR Systeem + Cardio (week 3-4)

### 1. PR systeem — meerdere types
**Effort:** 2-3 dagen
- Huidige DB: `personal_records` tabel met `record_type IN ('weight', 'reps', 'volume')`
- Al een trigger `check_personal_record()` die weight PR's detecteert
- Uitbreiden:
  - **Weight PR**: zwaarste gewicht voor een oefening (bestaat al)
  - **Reps PR**: meeste reps bij een gegeven gewicht → `record_type = 'reps'`, value = reps, extra kolom `at_weight_kg`
  - **Volume PR**: totaal volume (sets × reps × gewicht) per oefening per sessie → `record_type = 'volume'`
- Update trigger om alle 3 types te checken
- UI: 🏆 badge op set wanneer PR + confetti animatie
- PR history pagina per oefening: grafiek van PRs over tijd
- Coach dashboard: "Charles heeft nieuw PR: Bench Press 85kg"

### 7. Cardio + interval timer
**Effort:** 3-4 dagen
- **Coach kant:**
  - Nieuw exercise type: `category = 'cardio'` in exercises tabel
  - Bij template exercise: extra velden `duration_seconds`, `interval_work_seconds`, `interval_rest_seconds`, `rounds`
  - Coach kan cardio oefening toevoegen aan template dag
- **Client kant:**
  - Cardio exercise in workout toont interval timer i.p.v. sets/reps
  - Timer UI: grote cirkel countdown, work/rest kleurwissel (groen/rood)
  - Ronden teller: "Ronde 3/8"
  - **Lock screen:** Web Audio API met oscillator beep bij fase-wissel + Notification API
  - Fallback: `navigator.vibrate([200, 100, 200])` bij elke overgang
  - Dezelfde `endTime`-methode als rest timer (fase 1) zodat timer niet stopt bij app-switch

---

## Fase 3: Slimme Features (week 5-7)

### 8. AI Trainer (suggesties, coach keurt goed)
**Effort:** 5-7 dagen
- **Data pipeline:** Na elke voltooide workout, aggregeer per oefening:
  - Gemiddeld gewicht, reps, RPE over afgelopen 4 weken
  - Progressie trend (stijgend/plateau/dalend)
  - Volume load per spiergroep per week
- **AI analyse:** Claude API call met gestructureerde prompt:
  - Input: workout history (4 weken), huidig programma, client profiel
  - Output: JSON array van suggesties, elk met `exercise`, `change_type` (verhoog gewicht/reps/sets, deload, swap), `reasoning`
- **Coach approval flow:**
  - Nieuwe tabel: `ai_suggestions(id, client_id, suggestion_json, status, coach_notes, created_at)`
  - Coach dashboard: "AI suggesties" tab met pending items
  - Coach kan: goedkeuren → auto-update template, afwijzen + notitie, aanpassen + goedkeuren
  - Client ziet pas aanpassing na goedkeuring
- **Trigger:** Wekelijks (cron/scheduled task) of na X voltooide workouts

### 10. Boodschappenlijst
**Effort:** 2-3 dagen
- Lees actief `nutrition_plan.meals` (JSON array)
- Aggregeer ingrediënten over 7 dagen:
  - Tel dubbele items op (3× kipfilet 200g → kipfilet 600g)
  - Categoriseer: vlees/vis, zuivel, groenten, fruit, droog, snacks
- UI: checklist per categorie, items aftikbaar
- "Kopieer lijst" knop → clipboard als tekst
- Slim: items die elke week hetzelfde zijn (snacks, ontbijt) markeren als "standaard — altijd in huis"
- Later: integratie met Collect&Go / Deliveroo API (nice-to-have)

---

## Fase 4: Community + AI Advanced (week 8-12)

### 12. Community / social tab
**Effort:** 4-5 dagen
- Nieuwe tabel: `activity_feed(id, client_id, type, metadata, created_at)`
- Types: `workout_completed`, `nutrition_perfect`, `pr_set`, `streak_milestone`
- Na elke workout/nutrition log: insert in activity_feed
- **Privacy:** Geen details — alleen "Glenn heeft een workout voltooid 💪" of "Sarah heeft al 7 dagen perfect gelogd 🔥"
- Feed UI: simpele timeline, nieuwste bovenaan
- Optioneel: 👏 reactie knop (high-five teller)
- Coach kan activity_feed modereren (verberg items)
- RLS: alle clients van dezelfde coach zien elkaars feed

### 9. AI Run Coach
**Effort:** 5-7 dagen
- Nieuw programma type: `program_type = 'running'` op `program_templates`
- Running sessie logging: afstand, tijd, tempo, hartslag, splits
- AI analyse: Claude API met running specifieke prompt
  - Input: running logs (4-8 weken), doel (5K PR, 10K, halve marathon), huidig niveau
  - Output: volgende week schema (easy run, intervals, tempo, long run, rust)
- Zelfde coach approval flow als AI Trainer (feature 8)
- Integratie met health_metrics (hartslag, stappen komen al binnen via wearables)

### 13. AI Form Check (video analyse)
**Effort:** 3-5 dagen
- Client filmt oefening → upload video naar Supabase Storage
- Claude Vision API: stuur video frames (elke 0.5s een frame extracten)
- Prompt: "Analyseer de form van deze [oefening naam]. Check: rug positie, knie tracking, diepte, tempo, ROM. Geef 3 concrete verbeterpunten."
- Resultaat opslaan: `form_checks(id, client_id, exercise_id, video_url, ai_feedback, coach_feedback, created_at)`
- Coach kan AI feedback reviewen en eigen notities toevoegen
- **Disclaimer:** "Dit is een AI-suggestie, geen medisch advies. Bespreek met je coach."
- Video limiet: max 30 seconden, max 50MB

---

## Technische Vereisten

| Feature | Nieuwe tabellen | API calls | Externe deps |
|---------|----------------|-----------|--------------|
| Reps UX | — | — | — |
| Rest timer | — | — | Notification API |
| Exercise edit | — | PATCH template | @dnd-kit/sortable |
| Save changes | — | PATCH template | — |
| Smart prefill | — | — | — |
| PR systeem | ALTER personal_records | — | — |
| Cardio timer | ALTER exercises, template_exercises | — | Web Audio API |
| AI Trainer | ai_suggestions | Claude API | anthropic SDK |
| Grocery list | — | — | — |
| Community | activity_feed | — | — |
| AI Run Coach | running_sessions | Claude API | anthropic SDK |
| AI Form Check | form_checks | Claude Vision API | ffmpeg (frames) |

## Prioriteit Samenvatting

```
Week 1-2:  #11 → #2 → #3+4 → #5 → #6    (core workout)
Week 3-4:  #1 → #7                          (PR + cardio)
Week 5-7:  #8 → #10                         (AI trainer + boodschappen)
Week 8-12: #12 → #9 → #13                   (community + AI advanced)
```
