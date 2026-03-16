-- Add meal progress columns to accountability_logs
-- so the daily check shows partial diet completion (e.g., 2/5 meals)
ALTER TABLE accountability_logs
  ADD COLUMN IF NOT EXISTS meals_completed INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meals_total INTEGER DEFAULT NULL;

COMMENT ON COLUMN accountability_logs.meals_completed IS 'Number of meals completed at time of accountability check';
COMMENT ON COLUMN accountability_logs.meals_total IS 'Total meals in active nutrition plan at time of accountability check';
