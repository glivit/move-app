-- ============================================================
-- FIX: check_personal_record trigger FK violation
--
-- Problem: The BEFORE INSERT trigger tried to insert into
-- personal_records with workout_set_id = NEW.id, but the
-- workout_set row doesn't exist yet during BEFORE INSERT.
-- This caused: "violates foreign key constraint
-- personal_records_workout_set_id_fkey"
--
-- Solution: Split into two triggers:
-- 1. BEFORE INSERT/UPDATE: detect PR, set is_pr = TRUE on the row
-- 2. AFTER INSERT/UPDATE: insert/update personal_records with the
--    now-existing workout_set_id
-- ============================================================

-- Drop the old trigger first
DROP TRIGGER IF EXISTS on_workout_set_completed ON workout_sets;

-- Drop the old function
DROP FUNCTION IF EXISTS check_personal_record();

-- 1. BEFORE trigger: only sets the is_pr flag on the row
CREATE OR REPLACE FUNCTION check_personal_record_before()
RETURNS TRIGGER AS $$
DECLARE
  current_max NUMERIC(10,2);
  session_client_id UUID;
BEGIN
  -- Get client_id from workout session
  SELECT client_id INTO session_client_id
  FROM workout_sessions WHERE id = NEW.workout_session_id;

  -- Only check completed, non-warmup sets with weight
  IF NEW.completed = TRUE AND NEW.is_warmup = FALSE AND NEW.weight_kg IS NOT NULL THEN
    SELECT value INTO current_max
    FROM personal_records
    WHERE client_id = session_client_id
    AND exercise_id = NEW.exercise_id
    AND record_type = 'weight';

    IF current_max IS NULL OR NEW.weight_kg > current_max THEN
      NEW.is_pr := TRUE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. AFTER trigger: inserts/updates personal_records (row now exists)
CREATE OR REPLACE FUNCTION update_personal_record_after()
RETURNS TRIGGER AS $$
DECLARE
  current_max NUMERIC(10,2);
  session_client_id UUID;
BEGIN
  -- Only process if this set is marked as a PR
  IF NEW.is_pr = TRUE AND NEW.completed = TRUE AND NEW.is_warmup = FALSE AND NEW.weight_kg IS NOT NULL THEN
    SELECT client_id INTO session_client_id
    FROM workout_sessions WHERE id = NEW.workout_session_id;

    IF session_client_id IS NOT NULL THEN
      INSERT INTO personal_records (client_id, exercise_id, record_type, value, workout_set_id)
      VALUES (session_client_id, NEW.exercise_id, 'weight', NEW.weight_kg, NEW.id)
      ON CONFLICT (client_id, exercise_id, record_type)
      DO UPDATE SET value = EXCLUDED.value, achieved_at = NOW(), workout_set_id = EXCLUDED.workout_set_id;
    END IF;
  END IF;

  RETURN NULL; -- AFTER triggers return NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the two triggers
CREATE TRIGGER on_workout_set_before
  BEFORE INSERT OR UPDATE ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION check_personal_record_before();

CREATE TRIGGER on_workout_set_after
  AFTER INSERT OR UPDATE ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_record_after();
