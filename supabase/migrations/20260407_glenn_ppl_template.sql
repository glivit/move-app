-- Migration: 20260407_glenn_ppl_template.sql
-- Glenn's Push/Pull/Legs A/B program — 5-day hypertrophy split
-- Based on his actual working weights and rep ranges

-- =============================================
-- STEP 0: Add missing exercises
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Cable Reverse Curl', 'Kabel Reverse Curl', 'arms', 'brachioradialis', ARRAY['biceps','forearms'], 'cable', ARRAY['Sta voor een lage kabel met een rechte stang','Pak de stang met overhandse grip (handpalmen naar beneden)','Curl omhoog met je ellebogen langs je lichaam','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Weighted Pull Up', 'Gewogen Optrekken', 'back', 'latissimus dorsi', ARRAY['biceps','rhomboids','rear deltoid'], 'body weight', ARRAY['Hang een gewicht aan een dip belt','Pak de stang met overhandse grip iets breder dan schouderbreedte','Trek jezelf omhoog tot je kin boven de stang is','Laat gecontroleerd zakken tot volledig gestrekt'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TEMPLATE: Glenn's PPL A/B (5-day)
-- =============================================
DO $$
DECLARE
  v_template_id UUID;
  v_day_id UUID;
  v_exercise_id UUID;
BEGIN
  INSERT INTO program_templates (name, description, duration_weeks, days_per_week, difficulty, tags, is_system_template, is_archived)
  VALUES (
    'Glenn PPL A/B (5-dag)',
    'Push/Pull/Legs met A/B variatie. Zware compounds met hypertrofie-accessoires. Bench-georiënteerd push programma, sterke pull-ups en rows op pull dagen, en legs met quad-focus.',
    12,
    5,
    'intermediate',
    ARRAY['hypertrophy', 'ppl', 'push pull legs', '5 days', 'intermediate'],
    true,
    false
  ) RETURNING id INTO v_template_id;

  -- =============================================
  -- DAY 1: PUSH A — Heavy Bench + Accessories
  -- =============================================
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 1, 'Push A', 'Borst + Schouders + Triceps', 70, 0)
  RETURNING id INTO v_day_id;

  -- 1. Bench Press 5x4-8 (heavy)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' AND name NOT ILIKE '%incline%' AND name NOT ILIKE '%close%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 5, 4, 8, 180, 9, 'Set 1: opwarm @ ~90kg. Sets 2-5: work sets @ 100kg. Progressie: meer reps of gewicht.', 0);
  END IF;

  -- 2. Dumbbell Overhead Press 3x8-13
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell shoulder press%' OR name ILIKE '%dumbbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 8, 13, 90, 8, '24kg dumbbells. Focus op volle ROM en gecontroleerde negatief.', 1);
  END IF;

  -- 3. Lateral Raise 3x15-25
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell lateral raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 15, 25, 60, 9, '6-8kg. High reps, squeeze bovenaan. Langzame negatief.', 2);
  END IF;

  -- 4. Dumbbell Overhead Tricep Extension 3x6-12
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell overhead tricep extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 6, 12, 75, 8, 'Piramidessets: 10kg → 14kg → 16kg. Ellebogen stabiel houden.', 3);
  END IF;

  -- 5. Cable Tricep Pushdown 3x8-10
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable tricep pushdown%' AND name NOT ILIKE '%rope%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 8, 10, 60, 8, '30-35kg. Lockout onderaan, 1s squeeze.', 4);
  END IF;

  -- 6. Close Grip Bench Press 3x4-5
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%close grip bench press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 4, 5, 120, 9, '95kg. Grip op schouderbreedte. Focus op tricep lockout.', 5);
  END IF;

  -- =============================================
  -- DAY 2: PULL A — Heavy Pull-ups + Back Thickness
  -- =============================================
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 2, 'Pull A', 'Rug + Biceps + Achter Schouders', 75, 1)
  RETURNING id INTO v_day_id;

  -- 1. Face Pull 3x8-17
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable face pull%' OR name ILIKE '%face pull%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 8, 17, 60, 7, '10-15kg. Warm-up en posture work. Externe rotatie bovenaan.', 0);
  END IF;

  -- 2. Weighted Pull Up 4x5-8
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%weighted pull up%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 4, 5, 8, 150, 9, '+22kg voor zware sets, drop naar +10kg voor laatste set. Volle ROM.', 1);
  END IF;

  -- 3. Dumbbell Row 3x8-10
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell one arm row%' OR name ILIKE '%dumbbell row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 8, 10, 90, 8, '42kg. Trek naar je heup, squeeze schouderblad. Geen body English.', 2);
  END IF;

  -- 4. Close Grip Lat Pulldown 4x4-7
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%close grip lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 4, 4, 7, 90, 9, '80-100kg. Lean licht achterover, trek naar bovenborst.', 3);
  END IF;

  -- 5. Barbell Curl 4x8-10
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 4, 8, 10, 75, 8, '20kg stang. Strict form, geen swing. Langzame negatief.', 4);
  END IF;

  -- 6. Dumbbell Curl 4x6-12
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell curl%' AND name NOT ILIKE '%hammer%' AND name NOT ILIKE '%incline%' AND name NOT ILIKE '%concentration%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 4, 6, 12, 60, 8, '14-18kg. Alternating of samen. Piramidessets.', 5);
  END IF;

  -- 7. Cable Reverse Curl 1x12-15
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable reverse curl%' OR name ILIKE '%reverse curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 1, 12, 15, 60, 7, '20kg. Onderarmen finisher. Overhandse grip.', 6);
  END IF;

  -- =============================================
  -- DAY 3: LEGS A — Quad Dominant
  -- =============================================
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 3, 'Legs A', 'Quads + Gluten + Abductoren', 55, 2)
  RETURNING id INTO v_day_id;

  -- 1. Hip Abduction Machine 4x12-15
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%hip abduction%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 4, 12, 15, 60, 8, '70kg. Activation en glute warm-up. Squeeze buitenste positie.', 0);
  END IF;

  -- 2. Dumbbell Lunge 4x15-20 (per been)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell lunge%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 4, 15, 20, 120, 9, 'Piramidessets: 17.5→20→25→30kg. Diepe stretch, knie voorbij teen mag.', 1);
  END IF;

  -- 3. Leg Extension Machine 3x9-12
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%leg extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 9, 12, 75, 9, '70-80kg. 2s squeeze bovenaan. Piramidessets.', 2);
  END IF;

  -- =============================================
  -- DAY 4: PUSH B — Volume Bench + Delt Focus
  -- =============================================
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 4, 'Push B', 'Borst + Schouders + Triceps', 65, 3)
  RETURNING id INTO v_day_id;

  -- 1. Bench Press 5x4-8 (+ backoff set)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%barbell bench press%' AND name NOT ILIKE '%incline%' AND name NOT ILIKE '%close%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 5, 4, 8, 180, 9, '100kg work sets. Set 4: backoff @ 60kg hoge reps (pump). Set 5: terug naar 100kg.', 0);
  END IF;

  -- 2. Dumbbell Overhead Press 3x8-13
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell shoulder press%' OR name ILIKE '%dumbbell overhead press%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 8, 13, 90, 8, '24kg. Zelfde als Push A. Progressie via reps.', 1);
  END IF;

  -- 3. Lateral Raise 5x12-20 (meer volume)
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell lateral raise%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 5, 12, 20, 45, 9, 'Set 1 licht (4kg x 40 reps = activation). Daarna 12kg. Korte rust, hoge frequentie.', 2);
  END IF;

  -- 4. Dumbbell Overhead Tricep Extension 4x6-15
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell overhead tricep extension%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 4, 6, 15, 75, 8, 'Piramidessets: 12→14→16→16kg. 1 extra set vs Push A.', 3);
  END IF;

  -- 5. Cable Rope Pushdown 3x8-12
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable rope pushdown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 8, 12, 60, 8, 'Touw: spreid onderaan, squeeze triceps. Variatie op rechte stang van Push A.', 4);
  END IF;

  -- =============================================
  -- DAY 5: PULL B — Volume Back + Biceps
  -- =============================================
  INSERT INTO program_template_days (template_id, day_number, name, focus, estimated_duration_min, sort_order)
  VALUES (v_template_id, 5, 'Pull B', 'Rug + Biceps + Achter Schouders', 70, 4)
  RETURNING id INTO v_day_id;

  -- 1. Face Pull 3x8-14
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable face pull%' OR name ILIKE '%face pull%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 8, 14, 60, 7, '10-15kg. Elke pull dag starten met face pulls voor gezonde schouders.', 0);
  END IF;

  -- 2. Cable Seated Row (V-Grip) 4x9-18
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable seated row%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 4, 9, 18, 90, 8, '70-80kg V-grip. Hogere reps dan Pull A rows. Squeeze schouderbladen.', 1);
  END IF;

  -- 3. Pull Up (Bodyweight) 3x10-20
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%pull up%' AND name NOT ILIKE '%assisted%' AND name NOT ILIKE '%weighted%' AND name NOT ILIKE '%lat pulldown%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 10, 20, 90, 8, 'Bodyweight. Hoog volume. Full dead hang start, chin over bar.', 2);
  END IF;

  -- 4. Lat Pulldown (Wide) 3x7-8
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%lat pulldown%' AND name NOT ILIKE '%close%' AND name NOT ILIKE '%reverse%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 7, 8, 90, 9, '85-100kg. Brede grip variant vs close grip op Pull A.', 3);
  END IF;

  -- 5. Dumbbell Curl 3x10-12
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell curl%' AND name NOT ILIKE '%hammer%' AND name NOT ILIKE '%incline%' AND name NOT ILIKE '%concentration%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 10, 12, 60, 8, '16-18kg. Strict form, geen momentum.', 4);
  END IF;

  -- 6. Dumbbell Hammer Curl 3x8-10
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%dumbbell hammer curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 3, 8, 10, 60, 8, '14kg. Neutrale grip voor brachialis + onderarm.', 5);
  END IF;

  -- 7. Cable Reverse Curl 1x12-15
  SELECT id INTO v_exercise_id FROM exercises WHERE name ILIKE '%cable reverse curl%' OR name ILIKE '%reverse curl%' LIMIT 1;
  IF v_exercise_id IS NOT NULL THEN
    INSERT INTO program_template_exercises (template_day_id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, notes, sort_order)
    VALUES (v_day_id, v_exercise_id, 1, 12, 15, 60, 7, '20kg. Onderarm finisher net als Pull A.', 6);
  END IF;

END $$;
