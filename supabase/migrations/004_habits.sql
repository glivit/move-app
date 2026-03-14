-- Habit tracker: coach creates habits, clients check them off daily

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '✅',
  color TEXT DEFAULT '#8B6914',
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekdays', 'custom')),
  custom_days JSONB, -- [1,2,3,4,5] for mon-fri, etc.
  target_value DECIMAL(10,2), -- e.g., 2.5 for 2.5L water
  target_unit TEXT, -- e.g., 'L', 'stappen', 'minuten'
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id), -- coach or client
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT FALSE,
  value DECIMAL(10,2), -- actual value achieved
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(habit_id, client_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_habits_client ON habits(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(client_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id, date);

-- RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- Habits: clients see own, coach sees all
CREATE POLICY "habits_select" ON habits FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "habits_insert" ON habits FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "habits_update" ON habits FOR UPDATE
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "habits_delete" ON habits FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- Completions: clients manage own, coach sees all
CREATE POLICY "habit_completions_select" ON habit_completions FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "habit_completions_insert" ON habit_completions FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "habit_completions_update" ON habit_completions FOR UPDATE
  USING (client_id = auth.uid());
