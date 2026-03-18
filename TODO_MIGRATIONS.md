# MOVE App — Nog uit te voeren stappen

## Migraties (Supabase SQL Editor)
Voer deze uit in volgorde:

1. `supabase/migrations/20260316_equipment_brand_column.sql` — equipment_brand kolom op exercises
2. `supabase/migrations/20260316_technogym_basicfit_seed.sql` — 60 Technogym machines
3. `supabase/migrations/20260317_program_schedule.sql` — schedule JSONB op client_programs + program_templates
4. `supabase/migrations/20260318_workout_notification_system.sql` — message_type uitbreiding + performance indexes

## Environment Variables (Vercel Dashboard)
Voeg toe:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Vercel Cron Jobs (vercel.json)
Voeg toe aan `crons` array:
```json
{
  "path": "/api/cron/ai-nudges",
  "schedule": "0 20 * * *"
},
{
  "path": "/api/cron/weekly-report",
  "schedule": "0 8 * * 1"
},
{
  "path": "/api/cron/smart-suggestions",
  "schedule": "0 19 * * 0"
}
```
- `ai-nudges`: Elke dag 20:00 — missed workout + missed nutrition nudges
- `weekly-report`: Elke maandag 08:00 — weekoverzicht per cliënt met AI-gegenereerd bericht
- `smart-suggestions`: Elke zondag 19:00 — analyse en programma-suggesties voor coach

## Git Deploy
```bash
git add -A
git commit -m "feat: complete interactive coaching engine — AI agent, notifications, accountability, weekly reports"
git push origin main
```

## Na deploy testen
1. Log in als client, start workout, voltooi, check of coach push notification krijgt
2. Check coach dashboard — workout feedback sectie linkt naar detail pagina
3. Open workout detail → stuur feedback → check of client push krijgt
4. Test AI agent via /coach/ai-settings → "Test jouw AI agent"
5. Check /coach/activity feed — alle recente workouts en check-ins zichtbaar
6. Check sidebar badges tellen correct (terracotta badges)
7. Test voedingstemplate bewerken via /coach/nutrition
8. Verifieer client workout pagina toont coach feedback card
9. Test cron endpoints handmatig: `/api/cron/ai-nudges`, `/api/cron/weekly-report`, `/api/cron/smart-suggestions`
