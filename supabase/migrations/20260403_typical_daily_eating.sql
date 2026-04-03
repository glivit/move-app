-- Add typical_daily_eating column to intake_forms
-- Stores free-text description of what the client typically eats in a day
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS typical_daily_eating TEXT;
