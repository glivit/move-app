-- Supplements & medications tracker
CREATE TABLE IF NOT EXISTS supplements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT DEFAULT 'dagelijks', -- dagelijks, 2x per dag, wekelijks, etc.
  time_of_day TEXT DEFAULT 'ochtend', -- ochtend, middag, avond, voor workout, na workout
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplement_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplement_id UUID NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE,
  skipped BOOLEAN DEFAULT false,
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplements_client ON supplements(client_id);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_client_date ON supplement_logs(client_id, date);
CREATE INDEX IF NOT EXISTS idx_supplement_logs_supplement ON supplement_logs(supplement_id);
