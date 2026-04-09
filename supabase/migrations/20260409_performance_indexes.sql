-- ============================================================
-- Performance indexes for hot-path queries
-- Targets: dashboard API (18 parallel queries), client-workout API, nutrition-log API
-- These composite/partial indexes replace single-column scans with direct lookups
-- ============================================================

-- 1. workout_sessions: dashboard queries filter by client + date range + completion status
--    Used by: today's workouts, week workouts, streak computation, client-workout session lookup
--    Before: only idx_workout_sessions_client (single col) + idx_workout_sessions_date (no client filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ws_client_started
  ON workout_sessions(client_id, started_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ws_client_completed
  ON workout_sessions(client_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ws_client_day_incomplete
  ON workout_sessions(client_id, template_day_id, started_at DESC)
  WHERE completed_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ws_client_day_completed
  ON workout_sessions(client_id, template_day_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- 2. workout_sets: latest weight lookups scan all completed sets per exercise
--    Used by: client-workout API (last weights, previous sets)
--    Before: only idx_workout_sets_exercise (single col)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wsets_exercise_completed
  ON workout_sets(exercise_id, created_at DESC)
  WHERE completed = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wsets_exercise_weight
  ON workout_sets(exercise_id, created_at DESC)
  WHERE completed = TRUE AND weight_kg IS NOT NULL;

-- 3. messages: unread count for dashboard notification badge
--    Before: only idx_messages_receiver (single col), scans all messages for user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread
  ON messages(receiver_id)
  WHERE read_at IS NULL;

-- 4. accountability_responses: daily check on dashboard — NO index existed at all
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accountability_client_date
  ON accountability_responses(client_id, date);

-- 5. nutrition_logs: food-level queries (checked items for calorie counting)
--    Existing idx_nutrition_logs_client_date covers the basic case but adding
--    a covering index for the common dashboard query pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nutrition_logs_client_date_full
  ON nutrition_logs(client_id, date, meal_id);

-- 6. broadcasts: dashboard filters by created_at DESC, limit 20
--    No index existed — table scan on every dashboard load
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_broadcasts_recent
  ON broadcasts(created_at DESC);

-- 7. health_metrics: weight tracking queries filter by client + non-null weight + date
--    Existing idx_health_metrics_client covers (client_id, date) but not the weight filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_metrics_weight
  ON health_metrics(client_id, date DESC)
  WHERE weight_kg IS NOT NULL;
