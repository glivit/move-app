-- Expand message_type to support workout notifications
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'video', 'file', 'workout_complete', 'system'));

-- Index for finding unreviewed workout sessions quickly (coach dashboard)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_coach_unseen
  ON workout_sessions(completed_at DESC)
  WHERE coach_seen = FALSE AND completed_at IS NOT NULL;

-- Index for coach activity feed: recent completed workouts
CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_recent
  ON workout_sessions(completed_at DESC)
  WHERE completed_at IS NOT NULL;
