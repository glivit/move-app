-- Migration: 20260402_workout_templates.sql
-- Adds is_system_template column to program_templates
-- Seeds 10 popular workout program templates with full exercise prescriptions

-- =============================================
-- STEP 1: Add is_system_template column
-- =============================================
ALTER TABLE program_templates ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN DEFAULT FALSE;

-- =============================================
-- TEMPLATE 1: STARTING STRENGTH (3x5)
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_day_a_id UUID;
  v_day_b_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'Starting Strength (3x5)',
    'Klassieke beginnersroutine met drie dagen per week. Focuses op de big three compoundbewegingen: squat, bench, deadlift. Perfecte basis voor nieuwkomers.',
    8,
    3,
    'beginner',
    ARRAY['strength', 'compound', 'beginner', 'linear progression'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === DAY A ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Day A', 'Lower + Bench', 45, 0)
  RETURNING id INTO v_day_a_id;

  -- Barbell Back Squat 3x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 3, 5, 5, 180, 8, 'Opwarm sets: 1x5 @ 50%, 1x5 @ 75%, dan work sets', 0);
  END IF;

  -- Barbell Bench Press 3x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 3, 5, 5, 180, 8, 'Opwarm sets: 1x5 @ 50%, 1x5 @ 75%, dan work sets', 1);
  END IF;

  -- Barbell Deadlift 1x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 1, 5, 5, 180, 8, 'Opwarm sets: 1x5 @ 50%, 1x3 @ 75%, 1x2 @ 90%, dan 1x5 @ RPE 8', 2);
  END IF;

  -- === DAY B ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Day B', 'Lower + OHP + Row', 45, 1)
  RETURNING id INTO v_day_b_id;

  -- Barbell Back Squat 3x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 3, 5, 5, 180, 8, 'Opwarm sets: 1x5 @ 50%, 1x5 @ 75%', 0);
  END IF;

  -- Barbell Overhead Press 3x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 3, 5, 5, 180, 8, 'Opwarm sets eerst doen', 1);
  END IF;

  -- Barbell Bent Over Row 3x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bent over row%' OR name ILIKE '%barbell row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 3, 5, 5, 180, 8, 'Rug recht houden', 2);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in Starting Strength template: %', SQLERRM;
END $$;

-- =============================================
-- TEMPLATE 2: STRONGLIFTS 5x5
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_day_a_id UUID;
  v_day_b_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'StrongLifts 5x5',
    'Populaire 5x5 beginnersroutine met drie dagen per week. Goed gedocumenteerd progressieschema met lineaire load increases.',
    12,
    3,
    'beginner',
    ARRAY['strength', 'compound', 'beginner', '5x5', 'linear progression'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === DAY A ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Day A', 'Squat + Bench + Row', 50, 0)
  RETURNING id INTO v_day_a_id;

  -- Barbell Back Squat 5x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 5, 5, 5, 180, 7, 'Standaard squat beweging', 0);
  END IF;

  -- Barbell Bench Press 5x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 5, 5, 5, 180, 7, 'Voeten op grond, shoulder blades retracted', 1);
  END IF;

  -- Barbell Bent Over Row 5x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bent over row%' OR name ILIKE '%barbell row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 5, 5, 5, 180, 7, 'Recht rug, explosieve pull', 2);
  END IF;

  -- === DAY B ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Day B', 'Squat + OHP + Deadlift', 50, 1)
  RETURNING id INTO v_day_b_id;

  -- Barbell Back Squat 5x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 5, 5, 5, 180, 7, 'Zelfde als Day A', 0);
  END IF;

  -- Barbell Overhead Press 5x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 5, 5, 5, 180, 7, 'Schouders naar achteren, core tight', 1);
  END IF;

  -- Barbell Deadlift 1x5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 1, 5, 5, 180, 7, 'Slechts 1 set deadlift', 2);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in StrongLifts 5x5 template: %', SQLERRM;
END $$;

-- =============================================
-- TEMPLATE 3: PUSH PULL LEGS (PPL)
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_push_id UUID;
  v_pull_id UUID;
  v_legs_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'Push Pull Legs (PPL)',
    '6-daags split met push/pull/legs twee keer per week. Hypertrofie-gericht met balans tussen kracht en volume. Voor intermediaire tot gevorderde lifters.',
    8,
    6,
    'intermediate',
    ARRAY['hypertrophy', 'split', 'PPL', 'intermediate', 'volume'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === PUSH DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Push A', 'Borst, schouders, triceps', 60, 0)
  RETURNING id INTO v_push_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_push_id, v_exercise_id, 4, 8, 10, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell incline press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_push_id, v_exercise_id, 3, 10, 12, 120, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell shoulder press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_push_id, v_exercise_id, 3, 10, 12, 120, 8, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable lateral raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_push_id, v_exercise_id, 3, 15, 15, 60, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable tricep pushdown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_push_id, v_exercise_id, 3, 12, 15, 90, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell overhead tricep extension%' OR name ILIKE '%overhead tricep extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_push_id, v_exercise_id, 3, 12, 12, 90, 7, 5);
  END IF;

  -- === PULL DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Pull A', 'Rug, biceps', 60, 1)
  RETURNING id INTO v_pull_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bent over row%' OR name ILIKE '%barbell row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_pull_id, v_exercise_id, 4, 8, 10, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_pull_id, v_exercise_id, 3, 10, 12, 120, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable seated row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_pull_id, v_exercise_id, 3, 10, 12, 120, 8, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable face pull%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_pull_id, v_exercise_id, 3, 15, 20, 90, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_pull_id, v_exercise_id, 3, 10, 12, 120, 8, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell hammer curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_pull_id, v_exercise_id, 3, 12, 12, 120, 8, 5);
  END IF;

  -- === LEGS DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 3, 'Legs A', 'Benen, billen', 70, 2)
  RETURNING id INTO v_legs_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 4, 8, 10, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell romanian deadlift%' OR name ILIKE '%romanian deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 3, 10, 12, 120, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 3, 12, 12, 120, 8, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 3, 12, 15, 90, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lying leg curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 3, 12, 15, 90, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%calf raise%' AND name ILIKE '%machine%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 4, 15, 15, 60, 7, 5);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in PPL template: %', SQLERRM;
END $$;

-- =============================================
-- TEMPLATE 4: PHUL (Power Hypertrophy Upper Lower)
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_up_power_id UUID;
  v_low_power_id UUID;
  v_up_hyp_id UUID;
  v_low_hyp_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'PHUL (Power Hypertrophy Upper Lower)',
    '4-daags split met kracht- en hypertrofieblokken. Combineert zware compoundbewegingen met volume voor maximale groei en kracht.',
    10,
    4,
    'intermediate',
    ARRAY['strength', 'hypertrophy', 'split', 'intermediate', 'PHUL'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === UPPER POWER ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Upper Power', 'Zware borst, rug, armen', 50, 0)
  RETURNING id INTO v_up_power_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_power_id, v_exercise_id, 3, 5, 5, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bent over row%' OR name ILIKE '%barbell row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_power_id, v_exercise_id, 3, 5, 5, 180, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_power_id, v_exercise_id, 3, 6, 8, 180, 8, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_power_id, v_exercise_id, 3, 6, 8, 120, 8, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_power_id, v_exercise_id, 2, 8, 10, 120, 8, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%skull crusher%' OR name ILIKE '%ez bar skull crusher%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_power_id, v_exercise_id, 2, 8, 10, 120, 8, 5);
  END IF;

  -- === LOWER POWER ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Lower Power', 'Zware benen', 55, 1)
  RETURNING id INTO v_low_power_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_power_id, v_exercise_id, 3, 5, 5, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_power_id, v_exercise_id, 3, 5, 5, 180, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_power_id, v_exercise_id, 3, 8, 10, 120, 8, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lying leg curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_power_id, v_exercise_id, 3, 8, 10, 120, 8, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%calf raise%' AND name ILIKE '%machine%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_power_id, v_exercise_id, 4, 10, 10, 90, 7, 4);
  END IF;

  -- === UPPER HYPERTROPHY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 3, 'Upper Hypertrophy', 'Volume borst, rug, armen', 55, 2)
  RETURNING id INTO v_up_hyp_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_hyp_id, v_exercise_id, 3, 10, 12, 120, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell one arm row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_hyp_id, v_exercise_id, 3, 10, 12, 120, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell shoulder press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_hyp_id, v_exercise_id, 3, 10, 12, 120, 8, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable seated row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_hyp_id, v_exercise_id, 3, 10, 12, 120, 8, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell lateral raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_hyp_id, v_exercise_id, 3, 12, 15, 90, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_hyp_id, v_exercise_id, 3, 12, 15, 90, 7, 5);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable rope pushdown%' OR name ILIKE '%cable pushdown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_up_hyp_id, v_exercise_id, 3, 12, 15, 90, 7, 6);
  END IF;

  -- === LOWER HYPERTROPHY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 4, 'Lower Hypertrophy', 'Volume benen', 60, 3)
  RETURNING id INTO v_low_hyp_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell front squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_hyp_id, v_exercise_id, 3, 10, 12, 120, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell romanian deadlift%' OR name ILIKE '%romanian deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_hyp_id, v_exercise_id, 3, 10, 12, 120, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_hyp_id, v_exercise_id, 3, 12, 15, 90, 8, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lying leg curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_hyp_id, v_exercise_id, 3, 12, 15, 90, 8, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%hip thrust%' AND name ILIKE '%machine%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_hyp_id, v_exercise_id, 3, 12, 12, 90, 8, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%seated calf raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_low_hyp_id, v_exercise_id, 4, 15, 15, 60, 7, 5);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in PHUL template: %', SQLERRM;
END $$;

-- =============================================
-- TEMPLATE 5: 5/3/1 WENDLER
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_bench_id UUID;
  v_squat_id UUID;
  v_ohp_id UUID;
  v_deadlift_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    '5/3/1 Wendler',
    'Populair periodiseringsprogramma met cyclische opbouw. Vier dagen per week met gericht volume- en intensiteitsvariatie voor duurzame progressie.',
    12,
    4,
    'intermediate',
    ARRAY['periodization', 'strength', 'intermediate', '5/3/1', 'wendler'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === BENCH DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Bench Day', 'Barbell bench press + accessoires', 55, 0)
  RETURNING id INTO v_bench_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_bench_id, v_exercise_id, 3, 3, 5, 180, 8, '5/3/1 progressie: Week 1 = 3x5, Week 2 = 3x3, Week 3 = 5/3/1 (1 rep max attempt)', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell incline press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_bench_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell fly%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_bench_id, v_exercise_id, 3, 12, 12, 90, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable tricep pushdown%' OR name ILIKE '%tricep pushdown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_bench_id, v_exercise_id, 3, 12, 15, 90, 7, 3);
  END IF;

  -- === SQUAT DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Squat Day', 'Barbell squat + accessoires', 55, 1)
  RETURNING id INTO v_squat_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_squat_id, v_exercise_id, 3, 3, 5, 180, 8, '5/3/1 progressie - zie bench day voor schema', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_squat_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_squat_id, v_exercise_id, 3, 12, 12, 90, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lying leg curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_squat_id, v_exercise_id, 3, 12, 12, 90, 7, 3);
  END IF;

  -- === OHP DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 3, 'OHP Day', 'Overhead press + accessoires', 55, 2)
  RETURNING id INTO v_ohp_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_ohp_id, v_exercise_id, 3, 3, 5, 180, 8, '5/3/1 progressie - zie bench day voor schema', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell lateral raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_ohp_id, v_exercise_id, 3, 12, 15, 90, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable face pull%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_ohp_id, v_exercise_id, 3, 15, 15, 90, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell rear delt fly%' OR name ILIKE '%rear delt fly%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_ohp_id, v_exercise_id, 3, 15, 15, 90, 7, 3);
  END IF;

  -- === DEADLIFT DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 4, 'Deadlift Day', 'Barbell deadlift + accessoires', 55, 3)
  RETURNING id INTO v_deadlift_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_deadlift_id, v_exercise_id, 3, 3, 5, 180, 8, '5/3/1 progressie - zie bench day voor schema', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bent over row%' OR name ILIKE '%barbell row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_deadlift_id, v_exercise_id, 3, 8, 8, 120, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_deadlift_id, v_exercise_id, 3, 10, 10, 120, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_deadlift_id, v_exercise_id, 3, 10, 12, 120, 8, 3);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in 5/3/1 Wendler template: %', SQLERRM;
END $$;

-- =============================================
-- TEMPLATE 6: GZCLP
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_day1_id UUID;
  v_day2_id UUID;
  v_day3_id UUID;
  v_day4_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'GZCLP',
    'Beginner-vriendelijke periodisering met 3 rep ranges per dag. Langzame lineaire progressie met veel accessoire volume voor groei.',
    12,
    4,
    'beginner',
    ARRAY['progression', 'beginner', 'GZCLP', 'periodization'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === DAY 1 ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Day 1', 'Bench + Squat + Pull accessoire', 50, 0)
  RETURNING id INTO v_day1_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day1_id, v_exercise_id, 5, 3, 3, 180, 8, 'Zware sterkte fase. Lineaire progressie elk week +2.5kg', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day1_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day1_id, v_exercise_id, 3, 15, 15, 90, 6, 2);
  END IF;

  -- === DAY 2 ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Day 2', 'OHP + Deadlift + Row accessoire', 50, 1)
  RETURNING id INTO v_day2_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day2_id, v_exercise_id, 5, 3, 3, 180, 8, 'Zware sterkte fase', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day2_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell one arm row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day2_id, v_exercise_id, 3, 15, 15, 90, 6, 2);
  END IF;

  -- === DAY 3 ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 3, 'Day 3', 'Squat + Bench + Pull accessoire', 50, 2)
  RETURNING id INTO v_day3_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day3_id, v_exercise_id, 5, 3, 3, 180, 8, 'Zware sterkte fase', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day3_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day3_id, v_exercise_id, 3, 15, 15, 90, 6, 2);
  END IF;

  -- === DAY 4 ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 4, 'Day 4', 'Deadlift + OHP + Row accessoire', 50, 3)
  RETURNING id INTO v_day4_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day4_id, v_exercise_id, 5, 3, 3, 180, 8, 'Zware sterkte fase', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day4_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell one arm row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day4_id, v_exercise_id, 3, 15, 15, 90, 6, 2);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in GZCLP template: %', SQLERRM;
END $$;

-- =============================================
-- TEMPLATE 7: nSUNS 5/3/1
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_day1_id UUID;
  v_day2_id UUID;
  v_day3_id UUID;
  v_day4_id UUID;
  v_day5_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'nSuns 5/3/1',
    'Advanced 5-daags programma met veel volume en zware oplifroutines. Volledige periodisering met dubbele progressie per dag.',
    12,
    5,
    'advanced',
    ARRAY['advanced', 'volume', 'periodization', 'nSuns', '5/3/1'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === DAY 1: BENCH/OHP ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Day 1', 'Bench + OHP', 70, 0)
  RETURNING id INTO v_day1_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day1_id, v_exercise_id, 9, 1, 5, 180, 8, 'nSuns sets: 1x3, 2x5, 3x3, 1x5, 1x3, 1x5, 3x3, 2x5, 1x3+. Progressieve afbouw van gewicht', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day1_id, v_exercise_id, 8, 1, 6, 180, 8, '8 sets van variabele reps in afdalende piramide', 1);
  END IF;

  -- === DAY 2: SQUAT/SUMO ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Day 2', 'Squat + Sumo DL', 70, 1)
  RETURNING id INTO v_day2_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day2_id, v_exercise_id, 9, 1, 5, 180, 8, 'nSuns sets - zie Day 1 bench notes', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%sumo deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day2_id, v_exercise_id, 8, 1, 6, 180, 8, '8 sets van variabele reps', 1);
  END IF;

  -- === DAY 3: OHP/INCLINE ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 3, 'Day 3', 'OHP + Incline Bench', 70, 2)
  RETURNING id INTO v_day3_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day3_id, v_exercise_id, 9, 1, 5, 180, 8, 'nSuns sets', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%smith machine incline press%' OR name ILIKE '%incline bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day3_id, v_exercise_id, 8, 1, 6, 180, 8, '8 sets van variabele reps', 1);
  END IF;

  -- === DAY 4: DEADLIFT/FRONT SQUAT ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 4, 'Day 4', 'Deadlift + Front Squat', 70, 3)
  RETURNING id INTO v_day4_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day4_id, v_exercise_id, 9, 1, 5, 180, 8, 'nSuns sets', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell front squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day4_id, v_exercise_id, 8, 1, 6, 180, 8, '8 sets van variabele reps', 1);
  END IF;

  -- === DAY 5: BENCH/CLOSE GRIP ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 5, 'Day 5', 'Bench + Close Grip', 70, 4)
  RETURNING id INTO v_day5_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day5_id, v_exercise_id, 9, 1, 5, 180, 8, 'nSuns sets', 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%close grip bench press%' OR name ILIKE '%closegrip bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day5_id, v_exercise_id, 8, 1, 6, 180, 8, '8 sets van variabele reps', 1);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in nSuns 5/3/1 template: %', SQLERRM;
END $$;

-- =============================================
-- TEMPLATE 8: UPPER/LOWER SPLIT
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_upper_a_id UUID;
  v_lower_a_id UUID;
  v_upper_b_id UUID;
  v_lower_b_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'Upper/Lower Split',
    '4-daags split met twee upper en twee lower dagen. Balans tussen zware compoundbewegingen en accessoirevolume.',
    8,
    4,
    'intermediate',
    ARRAY['intermediate', 'split', 'upper lower', 'hypertrophy'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === UPPER A ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Upper A', 'Borst, rug, armen', 55, 0)
  RETURNING id INTO v_upper_a_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_a_id, v_exercise_id, 4, 8, 8, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bent over row%' OR name ILIKE '%barbell row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_a_id, v_exercise_id, 4, 8, 8, 180, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell shoulder press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_a_id, v_exercise_id, 3, 10, 10, 120, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_a_id, v_exercise_id, 3, 10, 10, 120, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_a_id, v_exercise_id, 2, 12, 12, 90, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable tricep pushdown%' OR name ILIKE '%tricep pushdown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_a_id, v_exercise_id, 2, 12, 12, 90, 7, 5);
  END IF;

  -- === LOWER A ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Lower A', 'Benen, rug', 60, 1)
  RETURNING id INTO v_lower_a_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_a_id, v_exercise_id, 4, 8, 8, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell romanian deadlift%' OR name ILIKE '%romanian deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_a_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_a_id, v_exercise_id, 3, 12, 12, 120, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lying leg curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_a_id, v_exercise_id, 3, 12, 12, 120, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%calf raise%' AND name ILIKE '%machine%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_a_id, v_exercise_id, 3, 15, 15, 60, 7, 4);
  END IF;

  -- === UPPER B ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 3, 'Upper B', 'Borst, rug, armen (variatie)', 55, 2)
  RETURNING id INTO v_upper_b_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_b_id, v_exercise_id, 4, 10, 10, 120, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable seated row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_b_id, v_exercise_id, 4, 10, 10, 120, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_b_id, v_exercise_id, 3, 10, 10, 120, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell one arm row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_b_id, v_exercise_id, 3, 10, 10, 120, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell hammer curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_b_id, v_exercise_id, 2, 12, 12, 90, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%skull crusher%' OR name ILIKE '%ez bar skull crusher%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_upper_b_id, v_exercise_id, 2, 12, 12, 90, 7, 5);
  END IF;

  -- === LOWER B ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 4, 'Lower B', 'Benen, rug (variatie)', 60, 3)
  RETURNING id INTO v_lower_b_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_b_id, v_exercise_id, 3, 5, 5, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell front squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_b_id, v_exercise_id, 3, 10, 10, 120, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_b_id, v_exercise_id, 3, 12, 12, 90, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%seated leg curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_b_id, v_exercise_id, 3, 12, 12, 90, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%hip thrust%' AND name ILIKE '%machine%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_b_id, v_exercise_id, 3, 12, 12, 90, 8, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%seated calf raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_lower_b_id, v_exercise_id, 3, 15, 15, 60, 7, 5);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in Upper/Lower Split template: %', SQLERRM;
END $$;

-- =============================================
-- TEMPLATE 9: FULL BODY 3x/WEEK
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_day_a_id UUID;
  v_day_b_id UUID;
  v_day_c_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'Full Body 3x/Week',
    'Beginnersroutine met drie volledige lichaamstrainingen per week. Perfecte balans tussen compoundbewegingen en accessoires.',
    8,
    3,
    'beginner',
    ARRAY['beginner', 'full body', 'three days'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === DAY A ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Day A', 'Volledig lichaam', 55, 0)
  RETURNING id INTO v_day_a_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 3, 8, 8, 180, 7, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 3, 8, 8, 180, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bent over row%' OR name ILIKE '%barbell row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 3, 8, 8, 180, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell shoulder press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 2, 10, 10, 120, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 2, 12, 12, 90, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%plank%' AND name NOT ILIKE '%side%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_a_id, v_exercise_id, 3, 30, 30, 60, 7, 'Houd 30 seconden', 5);
  END IF;

  -- === DAY B ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Day B', 'Volledig lichaam', 55, 1)
  RETURNING id INTO v_day_b_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 3, 5, 5, 180, 7, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell incline press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 3, 10, 10, 120, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell lateral raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 2, 12, 12, 90, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable tricep pushdown%' OR name ILIKE '%tricep pushdown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 2, 12, 12, 90, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%hanging leg raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_b_id, v_exercise_id, 3, 10, 10, 90, 7, 5);
  END IF;

  -- === DAY C ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 3, 'Day C', 'Volledig lichaam', 55, 2)
  RETURNING id INTO v_day_c_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell front squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_c_id, v_exercise_id, 3, 8, 8, 180, 7, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_c_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable seated row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_c_id, v_exercise_id, 3, 10, 10, 120, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_c_id, v_exercise_id, 2, 10, 10, 120, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell hammer curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_c_id, v_exercise_id, 2, 12, 12, 90, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable crunch%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_day_c_id, v_exercise_id, 3, 15, 15, 60, 7, 5);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in Full Body 3x/Week template: %', SQLERRM;
END $$;

-- =============================================
-- TEMPLATE 10: BRO SPLIT (5 DAYS)
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_chest_id UUID;
  v_back_id UUID;
  v_shoulders_id UUID;
  v_legs_id UUID;
  v_arms_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'Bro Split (5 Days)',
    '5-daags traditionele bodybuildingsplit met één spiergroep per dag. Maximaal volume per spiergroep voor hypertrofie.',
    8,
    5,
    'intermediate',
    ARRAY['intermediate', 'hypertrophy', 'bodybuilding', 'bro split'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- === CHEST DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Chest Day', 'Borst', 65, 0)
  RETURNING id INTO v_chest_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_chest_id, v_exercise_id, 4, 8, 8, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell incline bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_chest_id, v_exercise_id, 3, 10, 10, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell fly%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_chest_id, v_exercise_id, 3, 12, 12, 120, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable crossover%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_chest_id, v_exercise_id, 3, 12, 15, 90, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%chest dip%' OR name ILIKE '%dip%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_chest_id, v_exercise_id, 3, 10, 20, 90, 8, 'AMRAP (as many reps as possible)', 4);
  END IF;

  -- === BACK DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Back Day', 'Rug', 65, 1)
  RETURNING id INTO v_back_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_back_id, v_exercise_id, 3, 5, 5, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bent over row%' OR name ILIKE '%barbell row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_back_id, v_exercise_id, 4, 8, 8, 180, 8, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_back_id, v_exercise_id, 3, 10, 10, 120, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable seated row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_back_id, v_exercise_id, 3, 10, 10, 120, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable face pull%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_back_id, v_exercise_id, 3, 15, 15, 90, 7, 4);
  END IF;

  -- === SHOULDER DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 3, 'Shoulder Day', 'Schouders', 60, 2)
  RETURNING id INTO v_shoulders_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_shoulders_id, v_exercise_id, 4, 8, 8, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell lateral raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_shoulders_id, v_exercise_id, 4, 12, 15, 90, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell front raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_shoulders_id, v_exercise_id, 3, 12, 12, 90, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell rear delt fly%' OR name ILIKE '%rear delt fly%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_shoulders_id, v_exercise_id, 3, 15, 15, 90, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable lateral raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_shoulders_id, v_exercise_id, 3, 15, 15, 90, 7, 4);
  END IF;

  -- === LEG DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 4, 'Leg Day', 'Benen', 70, 3)
  RETURNING id INTO v_legs_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell back squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 4, 8, 8, 180, 8, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 3, 12, 12, 120, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell romanian deadlift%' OR name ILIKE '%romanian deadlift%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 3, 10, 10, 120, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 3, 12, 12, 90, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lying leg curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 3, 12, 12, 90, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%calf raise%' AND name ILIKE '%machine%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_legs_id, v_exercise_id, 4, 15, 15, 60, 7, 5);
  END IF;

  -- === ARM DAY ===
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 5, 'Arm Day', 'Biceps, triceps', 55, 4)
  RETURNING id INTO v_arms_id;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_arms_id, v_exercise_id, 3, 10, 10, 120, 7, 0);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell hammer curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_arms_id, v_exercise_id, 3, 12, 12, 90, 7, 1);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%incline dumbbell curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_arms_id, v_exercise_id, 3, 12, 12, 90, 7, 2);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable tricep pushdown%' OR name ILIKE '%tricep pushdown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_arms_id, v_exercise_id, 3, 12, 12, 90, 7, 3);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%skull crusher%' OR name ILIKE '%ez bar skull crusher%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_arms_id, v_exercise_id, 3, 10, 10, 120, 7, 4);
  END IF;

  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable overhead tricep extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_arms_id, v_exercise_id, 3, 12, 12, 90, 7, 5);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in Bro Split template: %', SQLERRM;
END $$;
