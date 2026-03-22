-- Health Integrations for MŌVE
-- Supports Apple Health, Garmin, Fitbit, Whoop via Terra API

CREATE TABLE IF NOT EXISTS health_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('apple_health', 'garmin', 'fitbit', 'whoop', 'oura', 'polar')),
  external_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_health_integrations_client ON health_integrations(client_id);

-- Add source tracking to health_metrics if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_metrics' AND column_name = 'source') THEN
    ALTER TABLE health_metrics ADD COLUMN source TEXT DEFAULT 'manual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_metrics' AND column_name = 'auto_synced') THEN
    ALTER TABLE health_metrics ADD COLUMN auto_synced BOOLEAN DEFAULT false;
  END IF;
END $$;

-- RLS
ALTER TABLE health_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own health integrations"
  ON health_integrations FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coach views client health integrations"
  ON health_integrations FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Service role manages health integrations"
  ON health_integrations FOR ALL
  USING (true)
  WITH CHECK (true);
