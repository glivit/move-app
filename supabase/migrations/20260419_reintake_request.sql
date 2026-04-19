-- Migration: 20260419_reintake_request.sql
-- Adds coach-initiated "re-intake" request flag on profiles.
--
-- Use case: a client clicked through onboarding with minimal answers
-- (intake_completed = TRUE but data is thin), and the coach wants to
-- ask them to fill it in properly. Setting reintake_requested_at shows
-- a task on the client dashboard without flipping intake_completed
-- (which would trigger the middleware redirect gate).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reintake_requested_at TIMESTAMPTZ;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reintake_requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN profiles.reintake_requested_at IS
  'When the coach requested a re-intake. Shows a task on the client dashboard. Cleared on next onboarding submit.';

COMMENT ON COLUMN profiles.reintake_requested_by IS
  'Which coach requested the re-intake. Nullable FK so coach deletion does not cascade.';

-- Partial index: we only query rows that have a pending re-intake.
CREATE INDEX IF NOT EXISTS idx_profiles_reintake_requested_at
  ON profiles (reintake_requested_at)
  WHERE reintake_requested_at IS NOT NULL;
