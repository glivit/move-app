-- Video session email reminders tracking
-- Prevents duplicate emails for the same session+type

CREATE TABLE IF NOT EXISTS video_session_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_session_id UUID NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('today', 'tomorrow')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_session_id, reminder_type)
);

-- Index for quick lookups during cron runs
CREATE INDEX idx_video_reminders_session ON video_session_reminders(video_session_id, reminder_type);

-- RLS
ALTER TABLE video_session_reminders ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (cron job)
CREATE POLICY "Service role full access" ON video_session_reminders
  FOR ALL USING (auth.role() = 'service_role');
