-- Migration 012: Batch Dutch translations for exercise names
-- Maps English exercise names from ExerciseDB to Dutch (Flemish) names
-- Uses ILIKE for case-insensitive matching

-- =============================================
-- CHEST (Borst)
-- =============================================
UPDATE exercises SET name_nl = 'Barbell Bankdrukken' WHERE name ILIKE 'barbell bench press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Barbell Schuine Bankdrukken' WHERE name ILIKE 'barbell incline bench press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Barbell Afdalende Bankdrukken' WHERE name ILIKE 'barbell decline bench press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Bankdrukken' WHERE name ILIKE 'dumbbell bench press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Schuine Bankdrukken' WHERE name ILIKE 'dumbbell incline bench press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Afdalende Bankdrukken' WHERE name ILIKE 'dumbbell decline bench press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Vlinders' WHERE name ILIKE 'dumbbell fly' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Schuine Vlinders' WHERE name ILIKE 'dumbbell incline fly' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Crossover' WHERE name ILIKE 'cable crossover' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Borst Dips' WHERE name ILIKE 'chest dip' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Opdrukken' WHERE name ILIKE 'push-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Brede Opdrukken' WHERE name ILIKE 'wide grip push-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Machine Borst Press' WHERE name ILIKE 'machine chest press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Smith Machine Bankdrukken' WHERE name ILIKE 'smith machine bench press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Pec Deck Machine' WHERE name ILIKE 'pec deck machine' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Borst Vlinders' WHERE name ILIKE 'cable fly' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Pullover' WHERE name ILIKE 'dumbbell pullover' AND name_nl IS NULL;

-- =============================================
-- BACK (Rug)
-- =============================================
UPDATE exercises SET name_nl = 'Barbell Roeien' WHERE name ILIKE 'barbell bent over row' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Eenarm Roeien' WHERE name ILIKE 'dumbbell one arm row' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Lat Pulldown' WHERE name ILIKE 'lat pulldown' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Brede Lat Pulldown' WHERE name ILIKE 'wide grip lat pulldown' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Optrekken' WHERE name ILIKE 'pull-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Chinup' WHERE name ILIKE 'chin-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Roeien Zittend' WHERE name ILIKE 'cable seated row' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'T-Bar Roeien' WHERE name ILIKE 't-bar row' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Deadlift' WHERE name ILIKE 'barbell deadlift' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Roemeens Deadlift' WHERE name ILIKE 'barbell romanian deadlift' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Roemeens Deadlift' WHERE name ILIKE 'dumbbell romanian deadlift' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Machine Roeien' WHERE name ILIKE 'machine row' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Lat Pulldown' WHERE name ILIKE 'cable lat pulldown' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Rugstrekking' WHERE name ILIKE 'back extension' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Hyperextensie' WHERE name ILIKE 'hyperextension' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Omgekeerd Roeien' WHERE name ILIKE 'inverted row' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Stijfarm Pulldown' WHERE name ILIKE 'cable straight arm pulldown' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Pendlay Roeien' WHERE name ILIKE 'barbell pendlay row' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Roeien' WHERE name ILIKE 'dumbbell row' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Schouder Shrug' WHERE name ILIKE 'dumbbell shrug' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Barbell Shrug' WHERE name ILIKE 'barbell shrug' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Gezicht Trekken' WHERE name ILIKE 'face pull' AND name_nl IS NULL;

-- =============================================
-- SHOULDERS (Schouders)
-- =============================================
UPDATE exercises SET name_nl = 'Barbell Schouder Press' WHERE name ILIKE 'barbell overhead press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Schouder Press' WHERE name ILIKE 'dumbbell shoulder press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Laterale Raise' WHERE name ILIKE 'dumbbell lateral raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Voorwaartse Raise' WHERE name ILIKE 'dumbbell front raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Achterwaartse Vlinders' WHERE name ILIKE 'dumbbell rear delt fly' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Arnold Press' WHERE name ILIKE 'dumbbell arnold press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Laterale Raise' WHERE name ILIKE 'cable lateral raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Voorwaartse Raise' WHERE name ILIKE 'cable front raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Achterwaartse Vlinders' WHERE name ILIKE 'cable rear delt fly' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Machine Schouder Press' WHERE name ILIKE 'machine shoulder press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Machine Laterale Raise' WHERE name ILIKE 'machine lateral raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Barbell Staand Roeien' WHERE name ILIKE 'barbell upright row' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Smith Machine Schouder Press' WHERE name ILIKE 'smith machine shoulder press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Peck Deck Achterwaarts' WHERE name ILIKE 'reverse pec deck' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Gezicht Trekken' WHERE name ILIKE 'cable face pull' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Schuine Laterale Raise' WHERE name ILIKE 'dumbbell incline lateral raise' AND name_nl IS NULL;

-- =============================================
-- ARMS - Biceps
-- =============================================
UPDATE exercises SET name_nl = 'Barbell Bicep Curl' WHERE name ILIKE 'barbell curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Bicep Curl' WHERE name ILIKE 'dumbbell curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Hamer Curl' WHERE name ILIKE 'dumbbell hammer curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Concentratie Curl' WHERE name ILIKE 'dumbbell concentration curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Bicep Curl' WHERE name ILIKE 'cable curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'EZ-Bar Curl' WHERE name ILIKE 'ez-bar curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Schuine Curl' WHERE name ILIKE 'dumbbell incline curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Preacher Curl' WHERE name ILIKE 'preacher curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Machine Bicep Curl' WHERE name ILIKE 'machine bicep curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Zottman Curl' WHERE name ILIKE 'dumbbell zottman curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Hamer Curl' WHERE name ILIKE 'cable hammer curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Spider Curl' WHERE name ILIKE 'spider curl' AND name_nl IS NULL;

-- =============================================
-- ARMS - Triceps
-- =============================================
UPDATE exercises SET name_nl = 'Kabel Tricep Pushdown' WHERE name ILIKE 'cable pushdown' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Tricep Touw Pushdown' WHERE name ILIKE 'cable rope pushdown' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Tricep Dips' WHERE name ILIKE 'triceps dip' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Tricep Kickback' WHERE name ILIKE 'dumbbell kickback' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Overhead Tricep Extensie' WHERE name ILIKE 'dumbbell overhead triceps extension' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Barbell Schedelpletters' WHERE name ILIKE 'barbell lying triceps extension' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'EZ-Bar Schedelpletters' WHERE name ILIKE 'ez-bar skullcrusher' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Overhead Tricep Extensie' WHERE name ILIKE 'cable overhead tricep extension' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Machine Tricep Extensie' WHERE name ILIKE 'machine tricep extension' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Diamant Opdrukken' WHERE name ILIKE 'diamond push-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Smalle Bankdrukken' WHERE name ILIKE 'close grip barbell bench press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Bank Dips' WHERE name ILIKE 'bench dip' AND name_nl IS NULL;

-- =============================================
-- LEGS (Benen)
-- =============================================
UPDATE exercises SET name_nl = 'Barbell Squat' WHERE name ILIKE 'barbell squat' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Barbell Front Squat' WHERE name ILIKE 'barbell front squat' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Goblet Squat' WHERE name ILIKE 'dumbbell goblet squat' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Bulgar Split Squat' WHERE name ILIKE 'bulgarian split squat' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Beenpress' WHERE name ILIKE 'sled leg press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Leg Press' WHERE name ILIKE 'leg press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Beenstrekking' WHERE name ILIKE 'leg extension' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Beencurl Liggend' WHERE name ILIKE 'lying leg curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Beencurl Zittend' WHERE name ILIKE 'seated leg curl' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Hack Squat' WHERE name ILIKE 'hack squat' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Barbell Lunges' WHERE name ILIKE 'barbell lunge' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Lunges' WHERE name ILIKE 'dumbbell lunge' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Wandelende Lunges' WHERE name ILIKE 'walking lunge' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Step-Up' WHERE name ILIKE 'step-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Step-Up' WHERE name ILIKE 'dumbbell step-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Hip Thrust' WHERE name ILIKE 'barbell hip thrust' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Glute Bridge' WHERE name ILIKE 'glute bridge' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Sumo Deadlift' WHERE name ILIKE 'barbell sumo deadlift' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kuitheffen Staand' WHERE name ILIKE 'standing calf raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kuitheffen Zittend' WHERE name ILIKE 'seated calf raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Smith Machine Squat' WHERE name ILIKE 'smith machine squat' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Machine Beenstrekking' WHERE name ILIKE 'machine leg extension' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Heup Abductie' WHERE name ILIKE 'cable hip abduction' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Heup Abductie Machine' WHERE name ILIKE 'hip abduction machine' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Heup Adductie Machine' WHERE name ILIKE 'hip adduction machine' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Trap Bar Deadlift' WHERE name ILIKE 'trap bar deadlift' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Pistol Squat' WHERE name ILIKE 'pistol squat' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Kuitheffen' WHERE name ILIKE 'cable calf raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Sissy Squat' WHERE name ILIKE 'sissy squat' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Eenbenige Beenpress' WHERE name ILIKE 'single leg press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Roemeens Deadlift Eenbenig' WHERE name ILIKE 'single leg romanian deadlift' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kettlebell Swing' WHERE name ILIKE 'kettlebell swing' AND name_nl IS NULL;

-- =============================================
-- CORE (Kern)
-- =============================================
UPDATE exercises SET name_nl = 'Plank' WHERE name ILIKE 'plank' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Zij Plank' WHERE name ILIKE 'side plank' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Crunch' WHERE name ILIKE 'crunch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Fiets Crunch' WHERE name ILIKE 'bicycle crunch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Russische Twist' WHERE name ILIKE 'russian twist' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Hanging Beenheffen' WHERE name ILIKE 'hanging leg raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Hanging Knieheffen' WHERE name ILIKE 'hanging knee raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Houthak' WHERE name ILIKE 'cable woodchop' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Ab Rollout' WHERE name ILIKE 'ab wheel rollout' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Liggend Beenheffen' WHERE name ILIKE 'lying leg raise' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Berg Klimmen' WHERE name ILIKE 'mountain climber' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Crunch' WHERE name ILIKE 'cable crunch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dode Kever' WHERE name ILIKE 'dead bug' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Pallof Press' WHERE name ILIKE 'pallof press' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Omgekeerde Crunch' WHERE name ILIKE 'reverse crunch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'V-Up' WHERE name ILIKE 'v-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Flutter Kicks' WHERE name ILIKE 'flutter kicks' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Decline Crunch' WHERE name ILIKE 'decline crunch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Zit-Ups' WHERE name ILIKE 'sit-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Boer Wandeling' WHERE name ILIKE 'farmer walk' AND name_nl IS NULL;

-- =============================================
-- CARDIO
-- =============================================
UPDATE exercises SET name_nl = 'Loopband Hardlopen' WHERE name ILIKE 'treadmill running' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Roeimachine' WHERE name ILIKE 'rowing machine' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Fietsen' WHERE name ILIKE 'stationary bike' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Elliptische Trainer' WHERE name ILIKE 'elliptical machine' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Springtouw' WHERE name ILIKE 'jump rope' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Burpees' WHERE name ILIKE 'burpee' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Box Sprongen' WHERE name ILIKE 'box jump' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Battle Ropes' WHERE name ILIKE 'battle rope' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Slee Duwen' WHERE name ILIKE 'sled push' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Slee Trekken' WHERE name ILIKE 'sled pull' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Trap Klimmen' WHERE name ILIKE 'stair climber' AND name_nl IS NULL;

-- =============================================
-- COMPOUND / FULL BODY
-- =============================================
UPDATE exercises SET name_nl = 'Clean and Jerk' WHERE name ILIKE 'barbell clean and jerk' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Barbell Clean' WHERE name ILIKE 'barbell clean' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Power Clean' WHERE name ILIKE 'power clean' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Barbell Snatch' WHERE name ILIKE 'barbell snatch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Thruster' WHERE name ILIKE 'barbell thruster' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Dumbbell Thruster' WHERE name ILIKE 'dumbbell thruster' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Turkse Opsta' WHERE name ILIKE 'turkish get-up' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Man Maker' WHERE name ILIKE 'man maker' AND name_nl IS NULL;

-- =============================================
-- MOBILITY / WARMUP
-- =============================================
UPDATE exercises SET name_nl = 'Schuimrol Rug' WHERE name ILIKE 'foam roll upper back' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Schuimrol Benen' WHERE name ILIKE 'foam roll quads' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Heup Opener' WHERE name ILIKE 'hip opener' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Schouder Cirkel' WHERE name ILIKE 'arm circle' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Wereld Grootste Stretch' WHERE name ILIKE 'world%s greatest stretch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kat-Koe Stretch' WHERE name ILIKE 'cat cow stretch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Heup Cirkel' WHERE name ILIKE 'hip circle' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Band Pull-Apart' WHERE name ILIKE 'band pull-apart' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kuit Stretch' WHERE name ILIKE 'calf stretch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Hamstring Stretch' WHERE name ILIKE 'hamstring stretch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Quad Stretch' WHERE name ILIKE 'quad stretch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Schouder Stretch' WHERE name ILIKE 'shoulder stretch' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kind Houding' WHERE name ILIKE 'child pose' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Neerwaartse Hond' WHERE name ILIKE 'downward dog' AND name_nl IS NULL;

-- =============================================
-- ADDITIONAL COMMON VARIATIONS (fuzzy matches)
-- =============================================
-- These use broader patterns to catch ExerciseDB naming variations
UPDATE exercises SET name_nl = 'Dumbbell Laterale Raise' WHERE name ILIKE '%lateral raise%' AND name ILIKE '%dumbbell%' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Kabel Laterale Raise' WHERE name ILIKE '%lateral raise%' AND name ILIKE '%cable%' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Borst Vlinders' WHERE name ILIKE '%chest fly%' AND name_nl IS NULL;
UPDATE exercises SET name_nl = 'Schouder Press' WHERE name ILIKE '%shoulder press%' AND name_nl IS NULL AND name NOT ILIKE '%dumbbell%' AND name NOT ILIKE '%barbell%' AND name NOT ILIKE '%machine%' AND name NOT ILIKE '%smith%';
UPDATE exercises SET name_nl = 'Bicep Curl' WHERE name ILIKE '%bicep curl%' AND name_nl IS NULL AND name NOT ILIKE '%dumbbell%' AND name NOT ILIKE '%barbell%' AND name NOT ILIKE '%cable%' AND name NOT ILIKE '%machine%';
UPDATE exercises SET name_nl = 'Tricep Pushdown' WHERE name ILIKE '%tricep%pushdown%' AND name_nl IS NULL AND name NOT ILIKE '%cable%' AND name NOT ILIKE '%rope%';

-- Body part translations for display (update body_part where still in English)
-- Note: These don't change the body_part column since it's used as a category key,
-- but the UI already maps these to Dutch labels in the frontend.

-- Summary: This migration translates ~170 of the most commonly used exercise names
-- from English to Dutch for the Flemish coaching market.
