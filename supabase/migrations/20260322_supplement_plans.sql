-- Supplement Plans & Tracking for MŌVE
-- Coach assigns supplement plans, clients check off daily

CREATE TABLE IF NOT EXISTS supplement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES profiles(id) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplement_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES supplement_plans(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  timing TEXT DEFAULT 'ochtend' CHECK (timing IN ('ochtend', 'middag', 'avond', 'voor_training', 'na_training', 'voor_slapen', 'bij_maaltijd')),
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: supplement_logs may already exist from 015_supplements.sql
-- This version adds supplement_item_id link
CREATE TABLE IF NOT EXISTS supplement_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  supplement_item_id UUID REFERENCES supplement_plan_items(id) ON DELETE CASCADE NOT NULL,
  supplement_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  taken BOOLEAN DEFAULT false,
  taken_at TIMESTAMPTZ,
  UNIQUE(client_id, supplement_item_id, date)
);

CREATE INDEX IF NOT EXISTS idx_supplement_plans_client ON supplement_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_supplement_plan_items_plan ON supplement_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_supplement_daily_logs_client ON supplement_daily_logs(client_id, date);

-- RLS
ALTER TABLE supplement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach manages supplement plans"
  ON supplement_plans FOR ALL
  USING (coach_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Clients view own supplement plans"
  ON supplement_plans FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coach manages plan items"
  ON supplement_plan_items FOR ALL
  USING (EXISTS (SELECT 1 FROM supplement_plans sp WHERE sp.id = plan_id AND (sp.coach_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'))));

CREATE POLICY "Clients view own plan items"
  ON supplement_plan_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM supplement_plans sp WHERE sp.id = plan_id AND sp.client_id = auth.uid()));

CREATE POLICY "Clients manage own supplement logs"
  ON supplement_daily_logs FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coach views client supplement logs"
  ON supplement_daily_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Service role full access supplement logs"
  ON supplement_daily_logs FOR ALL
  USING (true)
  WITH CHECK (true);
