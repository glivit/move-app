-- Coach availability slots (recurring weekly)
CREATE TABLE IF NOT EXISTS coach_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Blocked dates (holidays, vacation, etc.)
CREATE TABLE IF NOT EXISTS coach_blocked_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add cancellation support to video_sessions
ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);
ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_availability_coach ON coach_availability(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_blocked_dates ON coach_blocked_dates(coach_id, blocked_date);
