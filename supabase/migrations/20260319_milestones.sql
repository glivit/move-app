-- ============================================================
-- Milestones / Achievements system
-- ============================================================

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_by_client BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_client ON milestones(client_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_unseen ON milestones(client_id) WHERE seen_by_client = FALSE;

-- Prevent duplicate milestones of the same type per client
CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_unique_type ON milestones(client_id, type);

-- RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own milestones"
  ON milestones FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can update own milestones"
  ON milestones FOR UPDATE
  USING (client_id = auth.uid());

CREATE POLICY "Coach can view all milestones"
  ON milestones FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "System can insert milestones"
  ON milestones FOR INSERT
  WITH CHECK (true);
