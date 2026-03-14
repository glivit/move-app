-- Add superset_group_id to group exercises as supersets
ALTER TABLE program_template_exercises
  ADD COLUMN IF NOT EXISTS superset_group_id TEXT DEFAULT NULL;

-- This allows grouping exercises together in the program builder.
-- Exercises with the same superset_group_id (within the same day) form a superset.
-- NULL means standalone exercise.

COMMENT ON COLUMN program_template_exercises.superset_group_id IS 'Groups exercises into supersets within a day. NULL = standalone.';
