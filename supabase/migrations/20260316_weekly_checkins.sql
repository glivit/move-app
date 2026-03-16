-- Weekly check-in table: lightweight weekly progress (weight + front photo + reflection)
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg DECIMAL(5,1),
  photo_url TEXT,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  nutrition_adherence INTEGER CHECK (nutrition_adherence BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, date)
);

-- RLS
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own weekly check-ins"
  ON weekly_checkins FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coaches can view client weekly check-ins"
  ON weekly_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = weekly_checkins.client_id AND coach_id = auth.uid()
    )
  );

-- Index for quick lookups
CREATE INDEX idx_weekly_checkins_client_date ON weekly_checkins(client_id, date DESC);
