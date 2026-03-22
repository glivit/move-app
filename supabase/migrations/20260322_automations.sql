-- Automation Rules & Logs for MŌVE
-- Coach-configurable "als-dan" automation workflows

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Trigger configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'days_inactive',
    'workout_completed',
    'checkin_submitted',
    'streak_milestone',
    'program_week_completed',
    'missed_meals',
    'weight_change',
    'first_workout',
    'subscription_anniversary'
  )),
  trigger_config JSONB DEFAULT '{}',

  -- Action configuration
  action_type TEXT NOT NULL CHECK (action_type IN (
    'send_message',
    'send_notification',
    'send_checkin_request',
    'flag_at_risk'
  )),
  action_config JSONB DEFAULT '{}',

  -- Targeting
  target TEXT DEFAULT 'all_clients' CHECK (target IN ('all_clients', 'specific_clients', 'package_tier')),
  target_config JSONB DEFAULT '{}',

  -- Rate limiting
  cooldown_hours INT DEFAULT 168,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  action_taken TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_coach ON automation_rules(coach_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_client ON automation_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_triggered ON automation_logs(triggered_at);

-- RLS
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own rules
CREATE POLICY "Coaches manage own automation rules"
  ON automation_rules FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Coaches can view logs for their own rules
CREATE POLICY "Coaches view own automation logs"
  ON automation_logs FOR SELECT
  USING (rule_id IN (SELECT id FROM automation_rules WHERE coach_id = auth.uid()));

-- Service role can insert logs (for cron job)
CREATE POLICY "Service role manages automation logs"
  ON automation_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_automation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_rules_updated_at();
