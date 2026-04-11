-- Phase 5: enable Supabase Realtime for the tables the coach dashboard
-- watches. Realtime events are filtered through RLS, so the "Coach can view
-- all ..." policies in 001_training_system.sql / 003_nutrition_logs.sql are
-- what gate delivery to the coach client. No new policies needed.
--
-- Each ADD TABLE is wrapped in a DO block so it's safe to re-run — Postgres
-- throws an error if you ADD a table that's already in the publication.

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
