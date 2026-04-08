-- AI message drafts: coach reviews/edits before sending
-- Replaces the old auto-send flow

CREATE TABLE IF NOT EXISTS ai_message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Generated content
  content TEXT NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('workout_feedback', 'missed_workout', 'missed_nutrition', 'weekly_motivation')),
  context_data JSONB DEFAULT '{}',  -- workout stats, days missed, etc.

  -- Draft lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed', 'edited_sent')),
  edited_content TEXT,              -- if coach edits before sending
  sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_drafts_coach_status ON ai_message_drafts(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_client ON ai_message_drafts(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_pending ON ai_message_drafts(status, created_at DESC) WHERE status = 'pending';

-- RLS
ALTER TABLE ai_message_drafts ENABLE ROW LEVEL SECURITY;

-- Only coach can see and manage drafts
CREATE POLICY "ai_drafts_coach_all" ON ai_message_drafts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );
