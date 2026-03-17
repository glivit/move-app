-- Migration: Add schedule support to training programs
-- Allows mapping template days to specific weekdays (1=Monday, 7=Sunday)
-- Format: { "1": "template-day-uuid", "3": "template-day-uuid", ... }

-- Schedule on client_programs: per-client weekday mapping
ALTER TABLE client_programs ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}';

-- Default schedule on program_templates: coach sets default when creating
ALTER TABLE program_templates ADD COLUMN IF NOT EXISTS default_schedule JSONB DEFAULT '{}';

COMMENT ON COLUMN client_programs.schedule IS 'Maps ISO weekday (1=Mon..7=Sun) to template_day_id. E.g. {"1":"uuid","3":"uuid","5":"uuid","6":"uuid"}';
COMMENT ON COLUMN program_templates.default_schedule IS 'Default weekday schedule for new assignments. Same format as client_programs.schedule.';
