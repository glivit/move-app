-- ============================================================
-- Performance indexes for hot-path queries
-- Targets: dashboard API (18 parallel queries), client-workout API, nutrition-log API
-- These composite/partial indexes replace single-column scans with direct lookups
--
-- NOTE: Using regular CREATE INDEX (not CONCURRENTLY) because Supabase SQL Editor
-- runs inside a transaction. At current table sizes this completes in milliseconds.
-- ============================================================

-- 1. workout_sessions: dashboard queries filter by client + date range + completion status
CREATE INDEX IF NOT EXISTS idx_ws_client_started
  ON workout_sessions(client_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ws_client_completed
  ON workout_sessions(client_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ws_client_day_incomplete
  ON workout_sessions(client_id, template_day_id, started_at DESC)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ws_client_day_completed
  ON workout_sessions(client_id, template_day_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- 2. workout_sets: latest weight lookups
CREATE INDEX IF NOT EXISTS idx_wsets_exercise_completed
  ON workout_sets(exercise_id, created_at DESC)
  WHERE completed = TRUE;

CREATE INDEX IF NOT EXISTS idx_wsets_exercise_weight
  ON workout_sets(exercise_id, created_at DESC)
  WHERE completed = TRUE AND weight_kg IS NOT NULL;

-- 3. messages: unread count for dashboard
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(receiver_id)
  WHERE read_at IS NULL;

-- 4. accountability_logs: already has idx_accountability_logs_client_date — skipped

-- 5. nutrition_logs: covering index for dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_client_date_full
  ON nutrition_logs(client_id, date, meal_id);

-- 6. broadcasts: dashboard sorts by created_at DESC
CREATE INDEX IF NOT EXISTS idx_broadcasts_recent
  ON broadcasts(created_at DESC);

-- 7. health_metrics: weight tracking with non-null filter
CREATE INDEX IF NOT EXISTS idx_health_metrics_weight
  ON health_metrics(client_id, date DESC)
  WHERE weight_kg IS NOT NULL;
