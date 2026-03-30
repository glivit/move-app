-- Extended onboarding fields for comprehensive client intake
-- Stap 2: Doel
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS goal_type TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS goal_weight_kg NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS goal_description TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS goal_pace TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS previous_attempts BOOLEAN DEFAULT FALSE;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS previous_attempts_detail TEXT;

-- Stap 3: Leefstijl
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS work_type TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS alcohol TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS caffeine TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS meals_per_day TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS social_context TEXT;

-- Stap 4: Voeding
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS favorite_meals TEXT[];
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS hated_foods TEXT[];
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS allergies TEXT[];
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS cooking_style TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS current_snacks TEXT[];
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS snack_reason TEXT[];
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS snack_preference TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS evening_snacker TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS food_adventurousness INTEGER DEFAULT 5;

-- Stap 5: Training
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS training_location TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS home_equipment TEXT[];
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS training_frequency INTEGER;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS training_types TEXT[];
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS session_duration TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS has_injuries BOOLEAN DEFAULT FALSE;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS has_food_relationship_issues BOOLEAN DEFAULT FALSE;

-- Stap 2: Geslacht op profiel
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intake_completed BOOLEAN DEFAULT FALSE;

-- AI nutrition plan storage
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  coach_approved BOOLEAN DEFAULT FALSE,
  coach_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own plans" ON nutrition_plans FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Coach can manage all plans" ON nutrition_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
CREATE POLICY "System can insert plans" ON nutrition_plans FOR INSERT WITH CHECK (true);
