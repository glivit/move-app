-- ============================================================
-- MŌVE Migration 007: Periodization & Smart Scheduling
-- Adds: training phases, preferred training days, scheduling metadata
-- ============================================================

-- Training phases within a client program
CREATE TABLE IF NOT EXISTS training_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_program_id UUID NOT NULL REFERENCES client_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phase_type TEXT NOT NULL CHECK (phase_type IN ('prep', 'hypertrophy', 'strength', 'power', 'deload', 'peaking', 'maintenance')),
  week_start INTEGER NOT NULL,
  week_end INTEGER NOT NULL,
  intensity_pct INTEGER CHECK (intensity_pct BETWEEN 0 AND 100),
  volume_modifier NUMERIC(3,2) DEFAULT 1.0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_phases_program ON training_phases(client_program_id);

-- Add preferred training days + scheduling prefs to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_training_days INTEGER[] DEFAULT '{1,3,5}',
  ADD COLUMN IF NOT EXISTS training_time_preference TEXT DEFAULT 'morning'
    CHECK (training_time_preference IN ('morning', 'afternoon', 'evening', 'flexible'));

-- RLS for training_phases
ALTER TABLE training_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can manage training phases"
  ON training_phases FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Clients can view own training phases"
  ON training_phases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM client_programs cp
    WHERE cp.id = training_phases.client_program_id
    AND cp.client_id = auth.uid()
  ));
