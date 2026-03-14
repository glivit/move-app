-- Workout feedback: difficulty rating, pain flags, coach suggestions

-- Add difficulty rating + structured feedback to workout_sessions
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS feedback_text TEXT,
  ADD COLUMN IF NOT EXISTS coach_seen BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS coach_notes TEXT;

-- Add pain/discomfort flags to workout_sets
ALTER TABLE workout_sets
  ADD COLUMN IF NOT EXISTS pain_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pain_notes TEXT;

-- Index for coach to find unreviewed feedback
CREATE INDEX IF NOT EXISTS idx_workout_sessions_feedback
  ON workout_sessions(client_id, completed_at DESC)
  WHERE difficulty_rating IS NOT NULL AND coach_seen = FALSE;
