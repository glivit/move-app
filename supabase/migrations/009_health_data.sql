-- ============================================================
-- MŌVE Migration 009: Health & Wearable Data
-- Adds: daily health metrics from wearables or manual entry
-- ============================================================

CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER,
  active_calories INTEGER,
  resting_heart_rate INTEGER,
  hrv_ms INTEGER,
  sleep_hours NUMERIC(4,2),
  sleep_quality TEXT CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  water_ml INTEGER,
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,1),
  notes TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'apple_health', 'google_fit', 'garmin', 'whoop', 'oura')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_client ON health_metrics(client_id, date DESC);

-- RLS
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own health metrics"
  ON health_metrics FOR ALL
  USING (client_id = auth.uid());

CREATE POLICY "Coach can view all health metrics"
  ON health_metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
