# MOVE App — Nog uit te voeren stappen

## Migraties (Supabase SQL Editor)
Voer deze uit in volgorde:

1. ✅ `ALL_PENDING_MIGRATIONS.sql` — al uitgevoerd (equipment_brand, schedule, message_type, indexes)
2. ✅ `20260316_technogym_basicfit_seed.sql` — al uitgevoerd
3. **NIEUW** `supabase/migrations/20260319_milestones.sql` — Milestones/achievements tabel

## Environment Variables
- ✅ `ANTHROPIC_API_KEY` — al toegevoegd

## Vercel Cron Jobs
- ✅ Al geconfigureerd in vercel.json

## Git Deploy
```bash
git add -A
git commit -m "feat: milestones, photo comparison, coach_seen fix, workout bar redesign"
git push origin main
```

## Na deploy: migratie uitvoeren
Plak `supabase/migrations/20260319_milestones.sql` in Supabase SQL Editor en run.

## Testen
1. Coach badges gaan nu omlaag na workout bekijken (coach_seen fix via /api/coach-seen)
2. Workout bar heeft Stop/Afronden/Hervat knoppen + auto-expire na 6 uur
3. Milestones verschijnen op client progress pagina na workout completion
4. Before/After foto vergelijking op progress pagina (als er 2+ check-ins met foto's zijn)
5. Activity feed toont nu workouts + check-ins correct
