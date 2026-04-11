-- ============================================================
-- MOVE App — Alle openstaande migraties (plak in Supabase SQL Editor)
-- Veilig om meerdere keren uit te voeren (IF NOT EXISTS overal)
-- ============================================================

-- ─── 1. Equipment Brand kolom ───────────────────────────────
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment_brand TEXT;
CREATE INDEX IF NOT EXISTS idx_exercises_equipment_brand ON exercises(equipment_brand) WHERE equipment_brand IS NOT NULL;

-- ─── 2. Program Schedule ────────────────────────────────────
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}';
ALTER TABLE program_templates ADD COLUMN IF NOT EXISTS default_schedule JSONB DEFAULT '{}';

-- ─── 3. Message Type uitbreiding ────────────────────────────
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'video', 'voice', 'file', 'workout_complete', 'system'));

-- ─── 4. Performance Indexes ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workout_sessions_coach_unseen
  ON workout_sessions(completed_at DESC)
  WHERE coach_seen = FALSE AND completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_recent
  ON workout_sessions(completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- ─── 5. Realtime publications (Phase 5: coach live updates) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'workout_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE workout_sessions';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'nutrition_daily_summary'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE nutrition_daily_summary';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'checkins'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE checkins';
  END IF;
END $$;
