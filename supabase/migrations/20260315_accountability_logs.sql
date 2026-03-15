-- Accountability logs table
-- Tracks daily workout and nutrition compliance per client
CREATE TABLE IF NOT EXISTS accountability_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  workout_completed BOOLEAN DEFAULT false,
  nutrition_logged BOOLEAN DEFAULT false,
  workout_reason TEXT,
  nutrition_reason TEXT,
  responded BOOLEAN DEFAULT false,
  responded_at TIMESTAMPTZ,
  coach_seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One log per client per day
  UNIQUE(client_id, date)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_accountability_logs_client_date
  ON accountability_logs(client_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_accountability_logs_date
  ON accountability_logs(date DESC);

-- RLS policies
ALTER TABLE accountability_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for API routes with admin client)
CREATE POLICY "Service role full access" ON accountability_logs
  FOR ALL USING (true) WITH CHECK (true);
