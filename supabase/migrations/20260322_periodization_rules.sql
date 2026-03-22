-- Periodization & Progression Rules for MŌVE
-- Adds automatic weight/rep progression and deload configuration

-- Progression rules per exercise in a template
CREATE TABLE IF NOT EXISTS program_progression_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_exercise_id UUID REFERENCES program_template_exercises(id) ON DELETE CASCADE NOT NULL,

  progression_type TEXT NOT NULL CHECK (progression_type IN (
    'linear_weight',
    'percentage_weight',
    'linear_reps',
    'wave',
    'rpe_based',
    'custom'
  )),

  config JSONB NOT NULL DEFAULT '{}',
  -- linear_weight: { "increment_kg": 2.5 }
  -- percentage_weight: { "increment_pct": 5 }
  -- linear_reps: { "increment_reps": 1 }
  -- wave: { "wave_weeks": 3, "deload_pct": 60, "increment_per_wave_kg": 2.5 }
  -- rpe_based: { "target_rpe": 8, "adjust_kg": 2.5 }
  -- custom: { "weeks": { "1": { "sets": 3, "reps": 10, "weight_pct": 70 }, ... } }

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progression_rules_exercise ON program_progression_rules(template_exercise_id);

-- Deload config on program template level
ALTER TABLE program_templates ADD COLUMN IF NOT EXISTS
  deload_config JSONB DEFAULT NULL;
  -- { "every_n_weeks": 4, "volume_reduction_pct": 40, "intensity_reduction_pct": 20 }

-- Estimated 1RM tracking
CREATE TABLE IF NOT EXISTS client_estimated_1rm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  estimated_1rm NUMERIC(6,2) NOT NULL,
  calculated_from TEXT DEFAULT 'epley' CHECK (calculated_from IN ('epley', 'brzycki', 'manual')),
  source_session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_1rm_client ON client_estimated_1rm(client_id);
CREATE INDEX IF NOT EXISTS idx_1rm_exercise ON client_estimated_1rm(client_id, exercise_id);

-- RLS
ALTER TABLE program_progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_estimated_1rm ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages progression rules"
  ON program_progression_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Clients view own progression rules"
  ON program_progression_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM program_template_exercises pte
    JOIN program_template_days ptd ON ptd.id = pte.template_day_id
    JOIN client_programs cp ON cp.template_id = ptd.template_id
    WHERE pte.id = program_progression_rules.template_exercise_id
    AND cp.client_id = auth.uid()
  ));

CREATE POLICY "Coach manages 1RM"
  ON client_estimated_1rm FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Clients view own 1RM"
  ON client_estimated_1rm FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Service role manages 1RM"
  ON client_estimated_1rm FOR ALL
  USING (true)
  WITH CHECK (true);
