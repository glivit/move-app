-- Nutrition logging: clients check off meals and add notes
-- Coach can see compliance in real-time

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES nutrition_plans(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Which meal moment was completed
  meal_id TEXT NOT NULL,          -- matches the meal.id from the nutrition plan JSON
  meal_name TEXT NOT NULL,        -- denormalized for easy display

  -- What the client actually ate (can differ from plan)
  completed BOOLEAN DEFAULT FALSE,
  foods_eaten JSONB DEFAULT '[]',  -- array of { name, grams, calories, protein, carbs, fat, image }
  client_notes TEXT,               -- "Had dit vervangen door..." or general notes

  -- Tracking
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One log per meal per day per client
  UNIQUE(client_id, date, meal_id)
);

-- Daily summary for quick coach overview
CREATE TABLE IF NOT EXISTS nutrition_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Totals for the day
  meals_planned INT DEFAULT 0,
  meals_completed INT DEFAULT 0,
  total_calories INT DEFAULT 0,
  total_protein INT DEFAULT 0,
  total_carbs INT DEFAULT 0,
  total_fat INT DEFAULT 0,

  -- Client daily note
  daily_note TEXT,
  mood TEXT CHECK (mood IN ('great', 'good', 'ok', 'bad', 'terrible')),
  water_liters DECIMAL(3,1),

  -- Coach review
  coach_seen BOOLEAN DEFAULT FALSE,
  coach_seen_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_client_date ON nutrition_logs(client_id, date);
CREATE INDEX IF NOT EXISTS idx_nutrition_daily_summary_client ON nutrition_daily_summary(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_daily_summary_coach ON nutrition_daily_summary(coach_seen, date DESC);

-- RLS
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_daily_summary ENABLE ROW LEVEL SECURITY;

-- Nutrition logs: clients manage their own, coach sees all
CREATE POLICY "nutrition_logs_select" ON nutrition_logs FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "nutrition_logs_insert" ON nutrition_logs FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "nutrition_logs_update" ON nutrition_logs FOR UPDATE
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- Daily summary: same pattern
CREATE POLICY "nutrition_daily_select" ON nutrition_daily_summary FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "nutrition_daily_insert" ON nutrition_daily_summary FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "nutrition_daily_update" ON nutrition_daily_summary FOR UPDATE
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );
