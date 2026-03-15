-- Add missing columns to intake_forms for onboarding measurements
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add initial photo URLs (taken during onboarding)
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS photo_front_url TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS photo_back_url TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS photo_left_url TEXT;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS photo_right_url TEXT;

-- Add tape measurements (taken during onboarding)
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS chest_cm NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS waist_cm NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS hips_cm NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS left_arm_cm NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS right_arm_cm NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS left_thigh_cm NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS right_thigh_cm NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS left_calf_cm NUMERIC;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS right_calf_cm NUMERIC;
