-- Migration 013: Seed base programs (PPL + Home Workout) and a high-protein diet plan
-- Uses exercise lookups by name so it works with existing ExerciseDB data

-- =============================================
-- PROGRAM 1: PUSH / PULL / LEGS (6 dagen)
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_push_day_id UUID;
  v_pull_day_id UUID;
  v_legs_day_id UUID;
  v_push2_day_id UUID;
  v_pull2_day_id UUID;
  v_legs2_day_id UUID;
  v_exercise_id UUID;
BEGIN
  -- Create template
  INSERT INTO program_templates (id, name, description, duration_weeks, days_per_week, difficulty, tags, is_archived)
  VALUES (
    gen_random_uuid(),
    'Push / Pull / Legs',
    'Klassiek 6-daags programma. Push (borst, schouders, triceps), Pull (rug, biceps), Legs (benen, billen). Ideaal voor intermediaire tot gevorderde lifters.',
    8,
    6,
    'intermediate',
    ARRAY['hypertrofie', 'kracht', 'PPL', 'split'],
    false
  ) RETURNING id INTO v_template_id;

  -- === PUSH DAY A ===
  INSERT INTO program_template_days (id, template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (gen_random_uuid(), v_template_id, 1, 'Push A', 'Borst, schouders, triceps', 65, 0)
  RETURNING id INTO v_push_day_id;

  -- Barbell Bench Press
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' AND body_part ILIKE '%chest%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, rpe_target, notes, sort_order)
    VALUES (v_push_day_id, v_exercise_id, 4, 6, 8, 180, '3-1-1-0', 8, 'Compound hoofdoefening. Warm up met 2-3 opwarmsets.', 0);
  END IF;

  -- Incline Dumbbell Press
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%incline dumbbell press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, rpe_target, notes, sort_order)
    VALUES (v_push_day_id, v_exercise_id, 3, 8, 12, 120, '3-0-1-0', 8, 'Bank op 30-45° hoek.', 1);
  END IF;

  -- Dumbbell Shoulder Press
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell shoulder press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_push_day_id, v_exercise_id, 3, 8, 12, 120, 8, 2);
  END IF;

  -- Cable Fly / Crossover
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable crossover%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable fly%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, notes, sort_order)
    VALUES (v_push_day_id, v_exercise_id, 3, 12, 15, 90, '2-1-2-0', 'Focus op squeeze bovenaan.', 3);
  END IF;

  -- Lateral Raise
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lateral raise%' AND name ILIKE '%dumbbell%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_push_day_id, v_exercise_id, 3, 12, 15, 60, 'Licht gewicht, controlled reps.', 4);
  END IF;

  -- Tricep Pushdown
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%tricep%pushdown%' OR name ILIKE '%cable pushdown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_push_day_id, v_exercise_id, 3, 10, 15, 60, 5);
  END IF;

  -- Overhead Tricep Extension
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%overhead tricep%extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_push_day_id, v_exercise_id, 3, 10, 15, 60, 6);
  END IF;

  -- === PULL DAY A ===
  INSERT INTO program_template_days (id, template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (gen_random_uuid(), v_template_id, 2, 'Pull A', 'Rug, biceps, achterste schouders', 65, 1)
  RETURNING id INTO v_pull_day_id;

  -- Barbell Row
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell%row%' AND name ILIKE '%bent over%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, rpe_target, notes, sort_order)
    VALUES (v_pull_day_id, v_exercise_id, 4, 6, 8, 180, '2-1-1-1', 8, 'Rug recht, romp op ~45°. Warm-up sets eerst.', 0);
  END IF;

  -- Lat Pulldown
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' AND name NOT ILIKE '%close%' AND name NOT ILIKE '%reverse%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, sort_order)
    VALUES (v_pull_day_id, v_exercise_id, 3, 8, 12, 120, '3-0-1-1', 1);
  END IF;

  -- Seated Cable Row
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%seated%row%' AND name ILIKE '%cable%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%seated row%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_pull_day_id, v_exercise_id, 3, 10, 12, 90, 2);
  END IF;

  -- Face Pull
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%face pull%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_pull_day_id, v_exercise_id, 3, 15, 20, 60, 'Hoog kabel, externe rotatie bovenaan.', 3);
  END IF;

  -- Barbell Curl
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell curl%' AND name NOT ILIKE '%reverse%' AND name NOT ILIKE '%drag%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_pull_day_id, v_exercise_id, 3, 8, 12, 90, 4);
  END IF;

  -- Hammer Curl
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%hammer curl%' AND name ILIKE '%dumbbell%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_pull_day_id, v_exercise_id, 3, 10, 12, 60, 5);
  END IF;

  -- === LEGS DAY A ===
  INSERT INTO program_template_days (id, template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (gen_random_uuid(), v_template_id, 3, 'Legs A', 'Quadriceps, hamstrings, billen, kuiten', 70, 2)
  RETURNING id INTO v_legs_day_id;

  -- Barbell Squat
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell squat%' AND name NOT ILIKE '%front%' AND name NOT ILIKE '%sumo%' AND name NOT ILIKE '%split%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, rpe_target, notes, sort_order)
    VALUES (v_legs_day_id, v_exercise_id, 4, 6, 8, 180, '3-1-1-0', 8, 'Hoofdoefening. 2-3 opwarmsets. Diepte: minstens parallel.', 0);
  END IF;

  -- Romanian Deadlift
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%romanian deadlift%' AND name ILIKE '%barbell%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%romanian deadlift%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, notes, sort_order)
    VALUES (v_legs_day_id, v_exercise_id, 3, 8, 12, 120, '3-1-1-0', 'Rek in hamstrings voelen. Knieën licht gebogen.', 1);
  END IF;

  -- Leg Press
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_legs_day_id, v_exercise_id, 3, 10, 12, 120, 2);
  END IF;

  -- Leg Curl
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg curl%' AND (name ILIKE '%lying%' OR name ILIKE '%seated%') LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_legs_day_id, v_exercise_id, 3, 10, 15, 90, 3);
  END IF;

  -- Leg Extension
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_legs_day_id, v_exercise_id, 3, 12, 15, 90, 4);
  END IF;

  -- Calf Raise
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%calf raise%' AND name ILIKE '%standing%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%calf raise%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_legs_day_id, v_exercise_id, 4, 12, 20, 60, 'Volle range of motion. Pauzeer onderaan.', 5);
  END IF;

  -- === PUSH DAY B ===
  INSERT INTO program_template_days (id, template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (gen_random_uuid(), v_template_id, 4, 'Push B', 'Borst, schouders, triceps (variatie)', 60, 3)
  RETURNING id INTO v_push2_day_id;

  -- Dumbbell Bench Press
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell bench press%' AND name NOT ILIKE '%incline%' AND name NOT ILIKE '%decline%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, sort_order)
    VALUES (v_push2_day_id, v_exercise_id, 4, 8, 12, 120, 8, 0);
  END IF;

  -- Machine Shoulder Press
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%machine%shoulder press%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%shoulder press%' AND name ILIKE '%machine%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_push2_day_id, v_exercise_id, 3, 10, 12, 90, 1);
  END IF;

  -- Incline Dumbbell Fly
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%incline%fly%' AND name ILIKE '%dumbbell%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, sort_order)
    VALUES (v_push2_day_id, v_exercise_id, 3, 12, 15, 90, '2-1-2-0', 2);
  END IF;

  -- Lateral Raise (cable)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lateral raise%' AND name ILIKE '%cable%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_push2_day_id, v_exercise_id, 4, 12, 15, 60, 3);
  END IF;

  -- Dips
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%tricep%dip%' OR name ILIKE '%chest dip%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_push2_day_id, v_exercise_id, 3, 8, 12, 90, 'Bovenlichaam licht voorover voor meer borst.', 4);
  END IF;

  -- Skull Crushers
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%skull%crush%' OR name ILIKE '%lying tricep%extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_push2_day_id, v_exercise_id, 3, 10, 12, 60, 5);
  END IF;

  -- === PULL DAY B ===
  INSERT INTO program_template_days (id, template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (gen_random_uuid(), v_template_id, 5, 'Pull B', 'Rug, biceps (variatie)', 60, 4)
  RETURNING id INTO v_pull2_day_id;

  -- Pull-ups
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%pull-up%' OR name ILIKE '%pull up%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_pull2_day_id, v_exercise_id, 4, 6, 10, 120, 8, 'Eventueel met gewichtsvest als je 10+ haalt.', 0);
  END IF;

  -- Dumbbell Row
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell%row%' AND (name ILIKE '%one arm%' OR name ILIKE '%single%') LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell row%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_pull2_day_id, v_exercise_id, 3, 8, 12, 90, 1);
  END IF;

  -- Straight Arm Pulldown
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%straight arm%pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_pull2_day_id, v_exercise_id, 3, 12, 15, 60, 2);
  END IF;

  -- Rear Delt Fly
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%rear delt%fly%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%reverse fly%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_pull2_day_id, v_exercise_id, 3, 12, 15, 60, 3);
  END IF;

  -- Incline Dumbbell Curl
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%incline%curl%' AND name ILIKE '%dumbbell%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_pull2_day_id, v_exercise_id, 3, 10, 12, 60, 4);
  END IF;

  -- Concentration Curl
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%concentration curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_pull2_day_id, v_exercise_id, 2, 10, 15, 60, 5);
  END IF;

  -- === LEGS DAY B ===
  INSERT INTO program_template_days (id, template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (gen_random_uuid(), v_template_id, 6, 'Legs B', 'Benen & billen (variatie)', 65, 5)
  RETURNING id INTO v_legs2_day_id;

  -- Front Squat
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%front squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_legs2_day_id, v_exercise_id, 4, 6, 10, 150, 8, 'Ellebogen hoog, core aanspannen.', 0);
  END IF;

  -- Hip Thrust
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%hip thrust%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, sort_order)
    VALUES (v_legs2_day_id, v_exercise_id, 3, 8, 12, 120, '2-1-1-1', 1);
  END IF;

  -- Bulgarian Split Squat
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%bulgarian split squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_legs2_day_id, v_exercise_id, 3, 10, 12, 90, 'Per been. Achtervoet op bank.', 2);
  END IF;

  -- Leg Curl (other variant)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg curl%' AND name ILIKE '%seated%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg curl%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_legs2_day_id, v_exercise_id, 3, 10, 15, 90, 3);
  END IF;

  -- Walking Lunge
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%walking lunge%' OR name ILIKE '%dumbbell lunge%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_legs2_day_id, v_exercise_id, 3, 10, 12, 90, 'Per been. Dumbbells in handen.', 4);
  END IF;

  -- Seated Calf Raise
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%calf raise%' AND name ILIKE '%seated%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%calf raise%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_legs2_day_id, v_exercise_id, 4, 15, 20, 60, 5);
  END IF;

  RAISE NOTICE 'PPL program created: %', v_template_id;
END $$;


-- =============================================
-- PROGRAM 2: HOME WORKOUT (Bodyweight)
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_upper_day_id UUID;
  v_lower_day_id UUID;
  v_full_day_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (id, name, description, duration_weeks, days_per_week, difficulty, tags, is_archived)
  VALUES (
    gen_random_uuid(),
    'Home Workout — Bodyweight',
    'Thuis trainen zonder materiaal. 3 dagen per week, full body aanpak met push-ups, pull-ups, dips en meer. Perfect voor beginners of als aanvulling op gym training.',
    6,
    3,
    'beginner',
    ARRAY['bodyweight', 'thuis', 'geen materiaal', 'calisthenics'],
    false
  ) RETURNING id INTO v_template_id;

  -- === UPPER BODY DAY ===
  INSERT INTO program_template_days (id, template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (gen_random_uuid(), v_template_id, 1, 'Upper Body', 'Borst, rug, schouders, armen', 45, 0)
  RETURNING id INTO v_upper_day_id;

  -- Push-ups
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE 'push-up' OR name ILIKE 'push up' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, notes, sort_order)
    VALUES (v_upper_day_id, v_exercise_id, 4, 10, 20, 90, '2-1-1-0', 'Tot falen of aangegeven reps. Op knieën als nodig.', 0);
  END IF;

  -- Pull-ups
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%pull-up%' OR name ILIKE '%pull up%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_upper_day_id, v_exercise_id, 4, 5, 10, 120, 'Gebruik een deurrekstok. Negatieven als je er geen haalt.', 1);
  END IF;

  -- Dips (bench/chair)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%bench dip%' OR name ILIKE '%chair dip%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dip%' AND body_part ILIKE '%arm%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_upper_day_id, v_exercise_id, 3, 10, 15, 90, 'Gebruik een stoel of bankje. Benen gestrekt voor meer weerstand.', 2);
  END IF;

  -- Diamond Push-ups
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%diamond push%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_upper_day_id, v_exercise_id, 3, 8, 15, 90, 'Handen dicht bij elkaar, driehoek-positie. Triceps focus.', 3);
  END IF;

  -- Pike Push-up (for shoulders)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%pike push%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_upper_day_id, v_exercise_id, 3, 8, 12, 90, 'Heupen hoog, hoofd richting grond. Schouder focus.', 4);
  END IF;

  -- Chin-ups
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%chin-up%' OR name ILIKE '%chin up%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_upper_day_id, v_exercise_id, 3, 5, 10, 90, 'Onderhandse grip. Meer biceps dan pull-ups.', 5);
  END IF;

  -- === LOWER BODY DAY ===
  INSERT INTO program_template_days (id, template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (gen_random_uuid(), v_template_id, 2, 'Lower Body', 'Benen, billen, core', 40, 1)
  RETURNING id INTO v_lower_day_id;

  -- Bodyweight Squat
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%body weight squat%' OR name ILIKE '%bodyweight squat%' OR name ILIKE '%air squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, sort_order)
    VALUES (v_lower_day_id, v_exercise_id, 4, 15, 25, 90, '3-1-1-0', 0);
  END IF;

  -- Lunge
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%bodyweight lunge%' OR (name ILIKE '%lunge%' AND name NOT ILIKE '%barbell%' AND name NOT ILIKE '%dumbbell%' AND name NOT ILIKE '%walking%') LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_lower_day_id, v_exercise_id, 3, 12, 15, 90, 'Per been. Alternerend.', 1);
  END IF;

  -- Glute Bridge
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%glute bridge%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, tempo, notes, sort_order)
    VALUES (v_lower_day_id, v_exercise_id, 3, 15, 20, 60, '2-2-1-0', 'Squeeze billen bovenaan. Eventueel eenbenig.', 2);
  END IF;

  -- Step-up (use a chair)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%step-up%' OR name ILIKE '%step up%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_lower_day_id, v_exercise_id, 3, 10, 15, 90, 'Gebruik een stoel of trap. Per been.', 3);
  END IF;

  -- Calf Raise (bodyweight)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%calf raise%' AND (name ILIKE '%body%' OR name ILIKE '%standing%') LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_lower_day_id, v_exercise_id, 3, 20, 30, 45, 'Op een traprand voor extra stretch.', 4);
  END IF;

  -- Plank
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE 'plank' AND name NOT ILIKE '%side%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_lower_day_id, v_exercise_id, 3, 30, 60, 60, 'Reps = seconden. Rug recht, core aanspannen.', 5);
  END IF;

  -- === FULL BODY DAY ===
  INSERT INTO program_template_days (id, template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (gen_random_uuid(), v_template_id, 3, 'Full Body', 'Totaal lichaam circuit', 40, 2)
  RETURNING id INTO v_full_day_id;

  -- Push-ups (wide)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%wide%push%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE 'push-up' OR name ILIKE 'push up' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_full_day_id, v_exercise_id, 3, 12, 20, 60, 0);
  END IF;

  -- Pull-ups
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%pull-up%' OR name ILIKE '%pull up%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_full_day_id, v_exercise_id, 3, 5, 10, 90, 1);
  END IF;

  -- Squat (bodyweight)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%body weight squat%' OR name ILIKE '%bodyweight squat%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_full_day_id, v_exercise_id, 3, 15, 25, 60, 2);
  END IF;

  -- Dips
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%bench dip%' OR name ILIKE '%chair dip%' LIMIT 1;
  IF v_exercise_id IS NULL THEN
    SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dip%' AND body_part ILIKE '%arm%' LIMIT 1;
  END IF;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, sort_order)
    VALUES (v_full_day_id, v_exercise_id, 3, 10, 15, 60, 3);
  END IF;

  -- Mountain Climbers
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%mountain climber%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_full_day_id, v_exercise_id, 3, 20, 30, 60, 'Reps per been. Hoog tempo.', 4);
  END IF;

  -- Burpees
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%burpee%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, notes, sort_order)
    VALUES (v_full_day_id, v_exercise_id, 3, 8, 12, 90, 'Finisher! Volledige burpee met sprong.', 5);
  END IF;

  RAISE NOTICE 'Home Workout program created: %', v_template_id;
END $$;


-- =============================================
-- DIET PLAN: High Protein Basis
-- =============================================
-- This creates a nutrition plan template that can be assigned to any client.
-- For now we insert it without a client_id, linked to the coach profile.
-- The coach can then assign it via the UI.

DO $$
DECLARE
  v_coach_id UUID;
BEGIN
  -- Find the coach profile
  SELECT id INTO v_coach_id FROM profiles WHERE role = 'coach' LIMIT 1;

  -- If no coach exists yet, skip
  IF v_coach_id IS NULL THEN
    RAISE NOTICE 'No coach profile found, skipping diet plan creation.';
    RETURN;
  END IF;

  -- Insert a template nutrition plan (using the coach as client_id placeholder)
  -- The coach can duplicate/assign this to actual clients
  INSERT INTO nutrition_plans (
    client_id,
    title,
    calories_target,
    protein_g,
    carbs_g,
    fat_g,
    meals,
    guidelines,
    is_active,
    valid_from
  ) VALUES (
    v_coach_id,
    'High Protein Basis — Template',
    2200,
    180,
    220,
    65,
    '[
      {
        "name": "Ontbijt",
        "time": "07:30",
        "items": [
          "4 eieren (scrambled of gebakken)",
          "2 sneetjes volkorenbrood",
          "1 banaan",
          "Koffie (zwart of met magere melk)"
        ],
        "macros": { "calories": 480, "protein": 32, "carbs": 52, "fat": 16 }
      },
      {
        "name": "Snack 1",
        "time": "10:00",
        "items": [
          "Protein shake (1 scoop whey + water)",
          "Handvol amandelen (20g)"
        ],
        "macros": { "calories": 230, "protein": 28, "carbs": 6, "fat": 12 }
      },
      {
        "name": "Lunch",
        "time": "12:30",
        "items": [
          "200g kipfilet (gegrild)",
          "200g rijst (gekookt gewicht)",
          "Gemengde salade met olijfolie",
          "1 appel"
        ],
        "macros": { "calories": 580, "protein": 48, "carbs": 68, "fat": 10 }
      },
      {
        "name": "Snack 2",
        "time": "15:30",
        "items": [
          "250g magere kwark (Skyr)",
          "Handvol blauwe bessen",
          "1 eetlepel honing"
        ],
        "macros": { "calories": 210, "protein": 28, "carbs": 24, "fat": 2 }
      },
      {
        "name": "Avondeten",
        "time": "18:30",
        "items": [
          "200g kipfilet of kalkoen",
          "250g zoete aardappel",
          "Broccoli en bloemkool (gestoomd)",
          "1 eetlepel olijfolie"
        ],
        "macros": { "calories": 520, "protein": 44, "carbs": 54, "fat": 12 }
      },
      {
        "name": "Avond snack",
        "time": "21:00",
        "items": [
          "Caseine shake of protein pudding",
          "Rijstwafel met pindakaas (15g)"
        ],
        "macros": { "calories": 230, "protein": 26, "carbs": 16, "fat": 9 }
      }
    ]'::jsonb,
    E'RICHTLIJNEN:\n• Drink minstens 2.5L water per dag\n• Eet elke 3-4 uur om spierherstel te optimaliseren\n• Neem je protein shake binnen 30 min na training\n• Vervang kipfilet vrij door tonijn, kabeljauw, of magere rundvlees\n• Gebruik kruiden en specerijen naar smaak (0 calorieën)\n• Weekend: 1 vrije maaltijd toegestaan (bewust genieten)\n\nSUPPLEMENTEN:\n• Whey proteïne (na training)\n• Caseine (voor het slapen)\n• Creatine monohydraat 5g/dag\n• Vitamine D3 (herfst/winter)\n• Omega-3 visolie',
    false,
    CURRENT_DATE
  );

  RAISE NOTICE 'High protein diet plan created for coach: %', v_coach_id;
END $$;
