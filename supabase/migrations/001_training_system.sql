-- ============================================================
-- MŌVE Training System — Migration 001
-- Adds: exercises, program templates, workout tracking,
--        nutrition plans, personal records
-- ============================================================

-- ============================================================
-- 1. EXERCISES (Exercise library — ExerciseDB + custom)
-- ============================================================
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_nl TEXT,
  body_part TEXT NOT NULL,
  target_muscle TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment TEXT NOT NULL DEFAULT 'body weight',
  gif_url TEXT,
  instructions TEXT[] DEFAULT '{}',
  coach_tips TEXT,
  coach_notes TEXT,
  category TEXT NOT NULL DEFAULT 'strength' CHECK (category IN ('strength', 'cardio', 'mobility', 'warmup', 'cooldown')),
  is_custom BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  exercisedb_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_body_part ON exercises(body_part);
CREATE INDEX idx_exercises_target ON exercises(target_muscle);
CREATE INDEX idx_exercises_equipment ON exercises(equipment);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_visible ON exercises(is_visible) WHERE is_visible = TRUE;

-- ============================================================
-- 2. PROGRAM TEMPLATES (Reusable training programs)
-- ============================================================
CREATE TABLE program_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER DEFAULT 8,
  days_per_week INTEGER DEFAULT 4,
  difficulty TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PROGRAM TEMPLATE DAYS (Training days within a template)
-- ============================================================
CREATE TABLE program_template_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  focus TEXT,
  estimated_duration_min INTEGER DEFAULT 60,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_template_days_template ON program_template_days(template_id);

-- ============================================================
-- 4. PROGRAM TEMPLATE EXERCISES (Exercises per training day)
-- ============================================================
CREATE TABLE program_template_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_day_id UUID NOT NULL REFERENCES program_template_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  sort_order INTEGER DEFAULT 0,
  sets INTEGER NOT NULL DEFAULT 3,
  reps_min INTEGER NOT NULL DEFAULT 8,
  reps_max INTEGER DEFAULT 12,
  rest_seconds INTEGER DEFAULT 90,
  tempo TEXT,
  rpe_target NUMERIC(3,1),
  weight_suggestion TEXT,
  notes TEXT,
  superset_group TEXT
);

CREATE INDEX idx_template_exercises_day ON program_template_exercises(template_day_id);
CREATE INDEX idx_template_exercises_exercise ON program_template_exercises(exercise_id);

-- ============================================================
-- 5. CLIENT PROGRAMS (Assigned programs per client)
-- ============================================================
CREATE TABLE client_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  current_week INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  coach_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_programs_client ON client_programs(client_id);
CREATE INDEX idx_client_programs_active ON client_programs(client_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- 6. WORKOUT SESSIONS (Completed workouts by clients)
-- ============================================================
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_program_id UUID REFERENCES client_programs(id) ON DELETE SET NULL,
  template_day_id UUID REFERENCES program_template_days(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_sessions_client ON workout_sessions(client_id);
CREATE INDEX idx_workout_sessions_date ON workout_sessions(started_at DESC);
CREATE INDEX idx_workout_sessions_program ON workout_sessions(client_program_id);

-- ============================================================
-- 7. WORKOUT SETS (Individual logged sets)
-- ============================================================
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  set_number INTEGER NOT NULL DEFAULT 1,
  prescribed_reps INTEGER,
  actual_reps INTEGER,
  weight_kg NUMERIC(6,2),
  rpe NUMERIC(3,1),
  is_warmup BOOLEAN DEFAULT FALSE,
  is_pr BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_sets_session ON workout_sets(workout_session_id);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_id);
CREATE INDEX idx_workout_sets_pr ON workout_sets(exercise_id, is_pr) WHERE is_pr = TRUE;

-- ============================================================
-- 8. NUTRITION PLANS (Structured macro-based plans)
-- ============================================================
CREATE TABLE nutrition_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  calories_target INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fat_g INTEGER,
  meals JSONB DEFAULT '[]',
  guidelines TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nutrition_plans_client ON nutrition_plans(client_id);
CREATE INDEX idx_nutrition_plans_active ON nutrition_plans(client_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- 9. PERSONAL RECORDS (Auto-tracked PRs)
-- ============================================================
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('weight', 'reps', 'volume')),
  value NUMERIC(10,2) NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workout_set_id UUID REFERENCES workout_sets(id) ON DELETE SET NULL
);

CREATE INDEX idx_personal_records_client ON personal_records(client_id);
CREATE INDEX idx_personal_records_exercise ON personal_records(client_id, exercise_id);
CREATE UNIQUE INDEX idx_personal_records_unique ON personal_records(client_id, exercise_id, record_type);

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

-- EXERCISES: everyone can read visible, coach can manage
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible exercises"
  ON exercises FOR SELECT
  USING (is_visible = TRUE OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Coach can manage exercises"
  ON exercises FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- PROGRAM TEMPLATES: coach manages all
ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can manage program templates"
  ON program_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Clients can view templates of assigned programs"
  ON program_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM client_programs
    WHERE template_id = program_templates.id
    AND client_id = auth.uid()
  ));

-- PROGRAM TEMPLATE DAYS: follow template access
ALTER TABLE program_template_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can manage template days"
  ON program_template_days FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Clients can view days of assigned programs"
  ON program_template_days FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM client_programs cp
    WHERE cp.template_id = program_template_days.template_id
    AND cp.client_id = auth.uid()
  ));

-- PROGRAM TEMPLATE EXERCISES: follow template access
ALTER TABLE program_template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach can manage template exercises"
  ON program_template_exercises FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Clients can view exercises of assigned programs"
  ON program_template_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM program_template_days ptd
    JOIN client_programs cp ON cp.template_id = ptd.template_id
    WHERE ptd.id = program_template_exercises.template_day_id
    AND cp.client_id = auth.uid()
  ));

-- CLIENT PROGRAMS: clients see own, coach manages all
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own programs"
  ON client_programs FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coach can manage all client programs"
  ON client_programs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- WORKOUT SESSIONS: clients own theirs, coach sees all
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own workout sessions"
  ON workout_sessions FOR ALL
  USING (client_id = auth.uid());

CREATE POLICY "Coach can view all workout sessions"
  ON workout_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- WORKOUT SETS: follow session access
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own workout sets"
  ON workout_sets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = workout_sets.workout_session_id
    AND ws.client_id = auth.uid()
  ));

CREATE POLICY "Coach can view all workout sets"
  ON workout_sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- NUTRITION PLANS: clients see own, coach manages all
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own nutrition plans"
  ON nutrition_plans FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coach can manage all nutrition plans"
  ON nutrition_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- PERSONAL RECORDS: clients see own, coach sees all
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own records"
  ON personal_records FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can insert own records"
  ON personal_records FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coach can view all records"
  ON personal_records FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

-- ============================================================
-- 11. HELPER FUNCTION: Auto-detect PRs
-- ============================================================
CREATE OR REPLACE FUNCTION check_personal_record()
RETURNS TRIGGER AS $$
DECLARE
  current_max NUMERIC(10,2);
  session_client_id UUID;
BEGIN
  -- Get client_id from workout session
  SELECT client_id INTO session_client_id
  FROM workout_sessions WHERE id = NEW.workout_session_id;

  -- Only check completed, non-warmup sets
  IF NEW.completed = TRUE AND NEW.is_warmup = FALSE AND NEW.weight_kg IS NOT NULL THEN
    -- Check weight PR
    SELECT value INTO current_max
    FROM personal_records
    WHERE client_id = session_client_id
    AND exercise_id = NEW.exercise_id
    AND record_type = 'weight';

    IF current_max IS NULL OR NEW.weight_kg > current_max THEN
      INSERT INTO personal_records (client_id, exercise_id, record_type, value, workout_set_id)
      VALUES (session_client_id, NEW.exercise_id, 'weight', NEW.weight_kg, NEW.id)
      ON CONFLICT (client_id, exercise_id, record_type)
      DO UPDATE SET value = EXCLUDED.value, achieved_at = NOW(), workout_set_id = EXCLUDED.workout_set_id;

      NEW.is_pr := TRUE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workout_set_completed
  BEFORE INSERT OR UPDATE ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION check_personal_record();

-- Done! Training system tables ready.
