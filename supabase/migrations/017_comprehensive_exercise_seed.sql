-- Migration 017: Comprehensive exercise seed
-- Inserts all common gym exercises including machines, cables, free weights, bodyweight
-- Each exercise has Dutch name, English name, body part, target muscle, equipment, and instructions
-- Uses ON CONFLICT DO NOTHING to avoid duplicates with existing ExerciseDB data

-- =============================================
-- HELPER: ensure no duplicates on name
-- =============================================

-- =============================================
-- CHEST (Borst) — Machines
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Machine Chest Press', 'Machine Borst Press', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps'], 'machine', ARRAY['Stel de stoel in zodat de handgrepen op borsthoogte zijn','Pak de grepen vast met een overhandse grip','Duw naar voren tot je armen bijna gestrekt zijn','Laat gecontroleerd terugkomen tot je een stretch voelt in je borst'], 'strength', false, true),
(gen_random_uuid(), 'Incline Machine Press', 'Schuine Machine Borst Press', 'chest', 'upper pectoralis', ARRAY['anterior deltoid','triceps'], 'machine', ARRAY['Stel de stoel in voor een schuine hoek','Pak de grepen borsthoog vast','Duw schuin omhoog tot bijna gestrekt','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Pec Deck Machine', 'Pec Deck Machine', 'chest', 'pectoralis major', ARRAY['anterior deltoid'], 'machine', ARRAY['Stel de stoel in zodat je armen op schouderhoogte zijn','Plaats je onderarmen tegen de pads','Breng de pads samen voor je borst','Laat gecontroleerd terugkomen met een stretch'], 'strength', false, true),
(gen_random_uuid(), 'Cable Crossover', 'Kabel Crossover', 'chest', 'pectoralis major', ARRAY['anterior deltoid'], 'cable', ARRAY['Stel beide kabels op schouderhoogte in','Stap een stap naar voren','Trek de kabels naar elkaar toe voor je borst','Knijp even samen en laat gecontroleerd terug'], 'strength', false, true),
(gen_random_uuid(), 'Cable Fly Low to High', 'Kabel Vlinders Laag-Hoog', 'chest', 'upper pectoralis', ARRAY['anterior deltoid'], 'cable', ARRAY['Stel kabels op de laagste stand','Pak de handgrepen met licht gebogen armen','Trek in een boog van laag naar hoog voor je borst','Knijp bovenaan samen en laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Cable Fly High to Low', 'Kabel Vlinders Hoog-Laag', 'chest', 'lower pectoralis', ARRAY['anterior deltoid'], 'cable', ARRAY['Stel kabels op de hoogste stand','Trek in een boog naar beneden voor je heupen','Houd je armen licht gebogen door de beweging','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Smith Machine Bench Press', 'Smith Machine Bankdrukken', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps'], 'smith machine', ARRAY['Lig op een vlakke bank onder de Smith machine','Pak de stang iets breder dan schouderbreedte','Ontgrendel en laat zakken tot je borst','Duw krachtig omhoog'], 'strength', false, true),
(gen_random_uuid(), 'Smith Machine Incline Press', 'Smith Machine Schuine Press', 'chest', 'upper pectoralis', ARRAY['anterior deltoid','triceps'], 'smith machine', ARRAY['Zet de bank op 30-45 graden onder de Smith machine','Pak de stang schouderbreedte','Laat zakken naar bovenborst','Duw krachtig omhoog'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- CHEST (Borst) — Free Weights
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Barbell Bench Press', 'Barbell Bankdrukken', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps'], 'barbell', ARRAY['Lig op de bank, voeten plat op de grond','Pak de stang iets breder dan schouderbreedte','Laat de stang gecontroleerd zakken tot je borst','Duw explosief omhoog tot gestrekte armen'], 'strength', false, true),
(gen_random_uuid(), 'Barbell Incline Bench Press', 'Barbell Schuine Bankdrukken', 'chest', 'upper pectoralis', ARRAY['anterior deltoid','triceps'], 'barbell', ARRAY['Zet de bank op 30-45 graden','Pak de stang schouderbreedte','Laat zakken naar je bovenborst','Duw krachtig omhoog'], 'strength', false, true),
(gen_random_uuid(), 'Barbell Decline Bench Press', 'Barbell Afdalende Bankdrukken', 'chest', 'lower pectoralis', ARRAY['anterior deltoid','triceps'], 'barbell', ARRAY['Lig op de dalende bank met voeten vast','Pak de stang schouderbreedte','Laat zakken naar je onderborst','Duw krachtig omhoog'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Bench Press', 'Dumbbell Bankdrukken', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps'], 'dumbbell', ARRAY['Lig op de bank met een dumbbell in elke hand','Start met dumbbells naast je borst','Duw omhoog tot je armen gestrekt zijn','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Incline Press', 'Dumbbell Schuine Press', 'chest', 'upper pectoralis', ARRAY['anterior deltoid','triceps'], 'dumbbell', ARRAY['Zet de bank op 30-45 graden','Houd dumbbells op schouderhoogte','Duw omhoog en breng samen boven je borst','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Fly', 'Dumbbell Vlinders', 'chest', 'pectoralis major', ARRAY['anterior deltoid'], 'dumbbell', ARRAY['Lig op de bank met dumbbells boven je borst','Laat je armen in een boog zakken met licht gebogen ellebogen','Voel de stretch in je borst','Breng de dumbbells terug samen boven je borst'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Pullover', 'Dumbbell Pullover', 'chest', 'pectoralis major', ARRAY['latissimus dorsi','triceps'], 'dumbbell', ARRAY['Lig op de bank, houd één dumbbell met beide handen boven je borst','Laat de dumbbell in een boog achter je hoofd zakken','Voel de stretch in borst en lats','Trek de dumbbell terug boven je borst'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- CHEST (Borst) — Bodyweight
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Push Up', 'Opdrukken', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps','core'], 'body weight', ARRAY['Start in plankpositie met handen schouderbreedte','Laat je lichaam zakken tot je borst bijna de grond raakt','Duw jezelf krachtig omhoog','Houd je core aangespannen door de hele beweging'], 'strength', false, true),
(gen_random_uuid(), 'Chest Dip', 'Borst Dips', 'chest', 'lower pectoralis', ARRAY['anterior deltoid','triceps'], 'body weight', ARRAY['Pak de dip bars vast en hef jezelf op','Leun licht voorover','Laat je lichaam zakken tot je ellebogen op 90 graden zijn','Duw jezelf krachtig omhoog'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- BACK (Rug) — Machines
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Lat Pulldown', 'Lat Pulldown', 'back', 'latissimus dorsi', ARRAY['biceps','rhomboids'], 'machine', ARRAY['Zit met je bovenbenen stevig onder de pads','Pak de brede stang met een overhandse grip','Trek de stang naar je bovenborst','Laat gecontroleerd terugkomen met gestrekte armen'], 'strength', false, true),
(gen_random_uuid(), 'Close Grip Lat Pulldown', 'Lat Pulldown Nauwe Grip', 'back', 'latissimus dorsi', ARRAY['biceps','rhomboids'], 'machine', ARRAY['Gebruik een V-bar of nauwe grip attachment','Trek naar je bovenborst met ellebogen langs je lichaam','Knijp je schouderbladen samen onderaan','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Seated Row Machine', 'Machine Roeien Zittend', 'back', 'rhomboids', ARRAY['latissimus dorsi','biceps','rear deltoid'], 'machine', ARRAY['Stel de borst-pad zo in dat je armen gestrekt de grepen bereiken','Trek de grepen naar je buik','Knijp je schouderbladen samen','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'T-Bar Row Machine', 'T-Bar Roeien Machine', 'back', 'latissimus dorsi', ARRAY['rhomboids','biceps','rear deltoid'], 'machine', ARRAY['Sta op het platform met borst tegen de pad','Pak de grepen vast','Trek naar je borst met schouderbladen samen','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Assisted Pull Up Machine', 'Machine Assisted Optrekken', 'back', 'latissimus dorsi', ARRAY['biceps','rhomboids'], 'machine', ARRAY['Stel het tegengewicht in op je gewenste assistentie','Kniel op het platform','Pak de bovenste stang vast met overhandse grip','Trek jezelf omhoog tot je kin boven de stang is'], 'strength', false, true),
(gen_random_uuid(), 'Reverse Grip Lat Pulldown', 'Lat Pulldown Onderhandse Grip', 'back', 'latissimus dorsi', ARRAY['biceps','rhomboids'], 'machine', ARRAY['Pak de stang met onderhandse grip op schouderbreedte','Trek naar je bovenborst','Focus op de squeeze in je lats onderaan','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Machine Pullover', 'Machine Pullover', 'back', 'latissimus dorsi', ARRAY['teres major','pectoralis major'], 'machine', ARRAY['Zit met je rug tegen de pad','Plaats je ellebogen tegen de arm-pads','Duw de pads in een boog naar je heupen','Laat gecontroleerd terugkomen boven je hoofd'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- BACK (Rug) — Free Weights & Cable
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Barbell Bent Over Row', 'Barbell Roeien Voorovergebogen', 'back', 'latissimus dorsi', ARRAY['rhomboids','biceps','rear deltoid'], 'barbell', ARRAY['Sta met voeten heupbreedte, buig voorover tot 45 graden','Pak de stang met overhandse grip','Trek de stang naar je navel','Knijp schouderbladen samen en laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Barbell Deadlift', 'Deadlift', 'back', 'erector spinae', ARRAY['glutes','hamstrings','trapezius','forearms'], 'barbell', ARRAY['Sta met voeten heupbreedte, stang boven middenvoet','Pak de stang net buiten je benen','Houd je rug recht, borst omhoog','Duw door je benen en trek de stang langs je schenen omhoog'], 'strength', false, true),
(gen_random_uuid(), 'Barbell Romanian Deadlift', 'Roemeense Deadlift', 'back', 'hamstrings', ARRAY['glutes','erector spinae'], 'barbell', ARRAY['Sta met de stang op heuphoogte','Duw je heupen naar achteren met licht gebogen knieën','Laat de stang langs je bovenbenen zakken','Voel de stretch in je hamstrings en kom terug omhoog'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell One Arm Row', 'Dumbbell Eenarm Roeien', 'back', 'latissimus dorsi', ARRAY['rhomboids','biceps','rear deltoid'], 'dumbbell', ARRAY['Plaats een knie en hand op de bank','Houd een dumbbell in de andere hand','Trek de dumbbell naar je heup','Knijp je schouderblad samen bovenaan'], 'strength', false, true),
(gen_random_uuid(), 'Cable Seated Row', 'Kabel Roeien Zittend', 'back', 'rhomboids', ARRAY['latissimus dorsi','biceps'], 'cable', ARRAY['Zit rechtop met voeten op de steunen','Pak de V-bar of rechte stang vast','Trek naar je buik met rechte rug','Knijp schouderbladen samen en laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Cable Face Pull', 'Kabel Face Pull', 'back', 'rear deltoid', ARRAY['rhomboids','trapezius'], 'cable', ARRAY['Stel de kabel op gezichtshoogte in','Pak het touw met overhandse grip','Trek naar je gezicht met ellebogen hoog','Draai je handen naar buiten bovenaan de beweging'], 'strength', false, true),
(gen_random_uuid(), 'Cable Straight Arm Pulldown', 'Kabel Rechte Arm Pulldown', 'back', 'latissimus dorsi', ARRAY['teres major'], 'cable', ARRAY['Sta voor een hoge kabel met rechte stang','Houd je armen gestrekt','Trek de stang in een boog naar je bovenbenen','Knijp je lats samen onderaan'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- BACK (Rug) — Bodyweight
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Pull Up', 'Optrekken', 'back', 'latissimus dorsi', ARRAY['biceps','rhomboids'], 'body weight', ARRAY['Pak de stang met overhandse grip iets breder dan schouderbreedte','Hang met gestrekte armen','Trek jezelf omhoog tot je kin boven de stang is','Laat gecontroleerd zakken tot volledig gestrekt'], 'strength', false, true),
(gen_random_uuid(), 'Chin Up', 'Chinup', 'back', 'latissimus dorsi', ARRAY['biceps'], 'body weight', ARRAY['Pak de stang met onderhandse grip op schouderbreedte','Hang met gestrekte armen','Trek jezelf omhoog tot je kin boven de stang is','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Inverted Row', 'Omgekeerd Roeien', 'back', 'rhomboids', ARRAY['latissimus dorsi','biceps'], 'body weight', ARRAY['Hang onder een stang of TRX op heuphoogte','Houd je lichaam recht als een plank','Trek je borst naar de stang','Laat gecontroleerd zakken met gestrekte armen'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- SHOULDERS (Schouders) — Machines
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Machine Shoulder Press', 'Machine Schouder Press', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid','triceps'], 'machine', ARRAY['Stel de stoel in zodat de grepen op schouderhoogte starten','Pak de grepen vast','Duw omhoog tot je armen bijna gestrekt zijn','Laat gecontroleerd zakken naar de startpositie'], 'strength', false, true),
(gen_random_uuid(), 'Machine Lateral Raise', 'Machine Zijwaartse Raise', 'shoulders', 'lateral deltoid', ARRAY['trapezius'], 'machine', ARRAY['Zit op de machine met je armen langs de pads','Hef je armen zijwaarts tot schouderhoogte','Houd even vast bovenaan','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Machine Reverse Fly', 'Machine Reverse Fly', 'shoulders', 'rear deltoid', ARRAY['rhomboids','trapezius'], 'machine', ARRAY['Zit met je borst tegen de pad','Pak de grepen vast met licht gebogen armen','Trek je armen naar achteren in een boog','Knijp je schouderbladen samen en laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Smith Machine Overhead Press', 'Smith Machine Schouder Press', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid','triceps'], 'smith machine', ARRAY['Zit op een bank onder de Smith machine','Pak de stang op schouderbreedte','Duw omhoog tot bijna gestrekt','Laat gecontroleerd zakken tot schouderhoogte'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- SHOULDERS (Schouders) — Free Weights & Cable
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Barbell Overhead Press', 'Barbell Schouder Press', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid','triceps'], 'barbell', ARRAY['Sta met voeten schouderbreedte, stang op schouderhoogte','Houd de stang iets breder dan schouderbreedte','Duw de stang recht omhoog boven je hoofd','Laat gecontroleerd zakken naar schouderhoogte'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Shoulder Press', 'Dumbbell Schouder Press', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid','triceps'], 'dumbbell', ARRAY['Zit op een bank met dumbbells op schouderhoogte','Duw beide dumbbells omhoog tot bijna gestrekt','Laat gecontroleerd zakken naar schouderhoogte','Houd je core stabiel'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Lateral Raise', 'Dumbbell Zijwaartse Raise', 'shoulders', 'lateral deltoid', ARRAY['trapezius'], 'dumbbell', ARRAY['Sta rechtop met dumbbells langs je zij','Hef je armen zijwaarts tot schouderhoogte','Houd je ellebogen licht gebogen','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Front Raise', 'Dumbbell Voorwaartse Raise', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid'], 'dumbbell', ARRAY['Sta rechtop met dumbbells voor je bovenbenen','Hef één arm naar voren tot schouderhoogte','Laat gecontroleerd zakken en wissel van arm','Houd je elleboog licht gebogen'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Rear Delt Fly', 'Dumbbell Achterste Schouder Fly', 'shoulders', 'rear deltoid', ARRAY['rhomboids','trapezius'], 'dumbbell', ARRAY['Buig voorover tot je bovenlichaam bijna horizontaal is','Houd dumbbells onder je borst','Trek je armen zijwaarts naar buiten','Knijp je schouderbladen samen bovenaan'], 'strength', false, true),
(gen_random_uuid(), 'Cable Lateral Raise', 'Kabel Zijwaartse Raise', 'shoulders', 'lateral deltoid', ARRAY['trapezius'], 'cable', ARRAY['Sta naast een lage kabel met de greep in de verste hand','Hef je arm zijwaarts tot schouderhoogte','Houd even vast bovenaan','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Cable Front Raise', 'Kabel Voorwaartse Raise', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid'], 'cable', ARRAY['Sta met je rug naar een lage kabel','Pak de greep en hef je arm naar voren tot schouderhoogte','Houd je arm licht gebogen','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Barbell Upright Row', 'Barbell Opwaarts Roeien', 'shoulders', 'lateral deltoid', ARRAY['trapezius','biceps'], 'barbell', ARRAY['Sta met de stang voor je bovenbenen, nauwe grip','Trek de stang omhoog langs je lichaam','Hef je ellebogen tot schouderhoogte','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Arnold Press', 'Arnold Press', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid','triceps'], 'dumbbell', ARRAY['Zit met dumbbells op schouderhoogte, handpalmen naar je toe','Draai je handen terwijl je omhoog drukt','Eindig met handpalmen naar voren, armen gestrekt','Draai terug terwijl je zakt naar de startpositie'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- LEGS (Benen) — Machines
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Leg Press', 'Beenpers', 'legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'machine', ARRAY['Zit in de leg press met je rug stevig tegen de rugleuning','Plaats je voeten schouderbreedte op het platform','Ontgrendel en laat het platform zakken tot je knieën op 90 graden zijn','Duw krachtig terug zonder je knieën volledig te locken'], 'strength', false, true),
(gen_random_uuid(), 'Leg Extension', 'Beenstrekker', 'legs', 'quadriceps', ARRAY[]::text[], 'machine', ARRAY['Zit op de machine met je rug tegen de rugleuning','Haak je enkels achter de rolvormige pad','Strek je benen volledig uit','Laat gecontroleerd zakken zonder het gewicht te laten vallen'], 'strength', false, true),
(gen_random_uuid(), 'Seated Leg Curl', 'Zittende Beencurl', 'legs', 'hamstrings', ARRAY['calves'], 'machine', ARRAY['Zit op de machine, plaats de bovenpad op je bovenbenen','Haak je enkels boven de onderste pad','Curl je benen naar beneden en achteren','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Lying Leg Curl', 'Liggende Beencurl', 'legs', 'hamstrings', ARRAY['calves'], 'machine', ARRAY['Lig op je buik met je enkels onder de pad','Houd de handgrepen vast','Curl je benen omhoog tot je een volledige contractie voelt','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Hack Squat', 'Hack Squat', 'legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'machine', ARRAY['Sta op het platform met je rug tegen de schouder-pads','Plaats voeten schouderbreedte','Ontgrendel en zak tot je knieën op 90 graden zijn','Duw krachtig omhoog door je hakken'], 'strength', false, true),
(gen_random_uuid(), 'Pendulum Squat', 'Pendulum Squat', 'legs', 'quadriceps', ARRAY['glutes'], 'machine', ARRAY['Sta op het platform met schouders onder de pads','Houd de handgrepen vast','Zak gecontroleerd door je knieën','Duw omhoog met focus op je quads'], 'strength', false, true),
(gen_random_uuid(), 'Hip Thrust Machine', 'Machine Hip Thrust', 'legs', 'glutes', ARRAY['hamstrings'], 'machine', ARRAY['Zit in de machine met je rug tegen de pad','Plaats je voeten plat op de grond of het platform','Duw je heupen omhoog tot je lichaam een rechte lijn vormt','Knijp je bilspieren samen bovenaan en laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Hip Abduction Machine', 'Machine Heup Abductie', 'legs', 'hip abductors', ARRAY['glutes'], 'machine', ARRAY['Zit op de machine met je benen tegen de binnenste pads','Duw je benen naar buiten tegen de weerstand','Houd even vast in de wijdste positie','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Hip Adduction Machine', 'Machine Heup Adductie', 'legs', 'hip adductors', ARRAY[]::text[], 'machine', ARRAY['Zit op de machine met je benen tegen de buitenste pads','Breng je benen naar elkaar toe','Houd even vast in de smalste positie','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Calf Raise Machine', 'Machine Kuitheffer', 'legs', 'calves', ARRAY[]::text[], 'machine', ARRAY['Sta op het platform met je schouders onder de pads','Plaats de bal van je voet op de rand','Hef je hielen zo hoog mogelijk','Laat gecontroleerd zakken voor een volledige stretch'], 'strength', false, true),
(gen_random_uuid(), 'Seated Calf Raise', 'Zittende Kuitheffer', 'legs', 'soleus', ARRAY['gastrocnemius'], 'machine', ARRAY['Zit op de machine met de pad op je bovenbenen','Plaats de bal van je voeten op het platform','Hef je hielen omhoog','Laat gecontroleerd zakken voor een diepe stretch'], 'strength', false, true),
(gen_random_uuid(), 'Glute Kickback Machine', 'Machine Glute Kickback', 'legs', 'glutes', ARRAY['hamstrings'], 'machine', ARRAY['Sta op de machine met je borst tegen de pad','Plaats één voet op het platform','Trap met de andere voet naar achteren en omhoog','Knijp je bil samen bovenaan en laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Belt Squat Machine', 'Belt Squat Machine', 'legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'machine', ARRAY['Haak de riem aan je heupen','Sta op de platforms met voeten schouderbreedte','Zak in een diepe squat met rechte rug','Duw omhoog door je hakken'], 'strength', false, true),
(gen_random_uuid(), 'Smith Machine Squat', 'Smith Machine Squat', 'legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'smith machine', ARRAY['Sta onder de Smith machine met de stang op je trapezius','Voeten iets voor je lichaam, schouderbreedte','Zak tot parallel of dieper','Duw krachtig omhoog'], 'strength', false, true),
(gen_random_uuid(), 'V-Squat Machine', 'V-Squat Machine', 'legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'machine', ARRAY['Sta op het platform met schouders onder de pads','Voeten schouderbreedte','Zak gecontroleerd door je knieën','Duw omhoog met focus op quads'], 'strength', false, true),
(gen_random_uuid(), 'Leg Press Calf Raise', 'Beenpers Kuithef', 'legs', 'calves', ARRAY[]::text[], 'machine', ARRAY['Zit in de leg press met alleen je tenen op de onderkant van het platform','Duw het platform weg met je tenen','Strek je enkels volledig','Laat gecontroleerd terugkomen'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- LEGS (Benen) — Free Weights
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Barbell Back Squat', 'Barbell Squat', 'legs', 'quadriceps', ARRAY['glutes','hamstrings','core'], 'barbell', ARRAY['Plaats de stang op je bovenrug/trapezius','Sta met voeten schouderbreedte, tenen licht naar buiten','Zak tot je dijen parallel aan de grond zijn','Duw krachtig omhoog door je hakken'], 'strength', false, true),
(gen_random_uuid(), 'Barbell Front Squat', 'Barbell Front Squat', 'legs', 'quadriceps', ARRAY['glutes','core'], 'barbell', ARRAY['Houd de stang op je voorste schouders in een clean-grip','Ellebogen hoog, bovenrug recht','Zak diep met je borst omhoog','Duw omhoog met focus op quads'], 'strength', false, true),
(gen_random_uuid(), 'Bulgarian Split Squat', 'Bulgaarse Split Squat', 'legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'dumbbell', ARRAY['Plaats je achterste voet op een bank achter je','Houd dumbbells langs je zij','Zak door je voorste been tot je knie op 90 graden is','Duw omhoog door je voorste hak'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Lunge', 'Dumbbell Uitvalspas', 'legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'dumbbell', ARRAY['Sta met dumbbells langs je zij','Stap naar voren in een grote pas','Zak tot beide knieën op 90 graden zijn','Duw terug naar de startpositie'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Romanian Deadlift', 'Dumbbell Roemeense Deadlift', 'legs', 'hamstrings', ARRAY['glutes','erector spinae'], 'dumbbell', ARRAY['Sta met dumbbells voor je bovenbenen','Duw je heupen naar achteren met licht gebogen knieën','Laat de dumbbells langs je benen zakken','Voel de stretch in je hamstrings en kom terug omhoog'], 'strength', false, true),
(gen_random_uuid(), 'Goblet Squat', 'Goblet Squat', 'legs', 'quadriceps', ARRAY['glutes','core'], 'dumbbell', ARRAY['Houd een dumbbell tegen je borst met beide handen','Sta met voeten iets breder dan schouderbreedte','Zak diep met je borst omhoog en ellebogen naar binnen','Duw omhoog door je hakken'], 'strength', false, true),
(gen_random_uuid(), 'Barbell Hip Thrust', 'Barbell Hip Thrust', 'legs', 'glutes', ARRAY['hamstrings','core'], 'barbell', ARRAY['Zit met je bovenrug tegen een bank, stang over je heupen','Voeten plat op de grond, knieën op 90 graden','Duw je heupen krachtig omhoog','Knijp je bilspieren samen bovenaan'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Step Up', 'Dumbbell Step Up', 'legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'dumbbell', ARRAY['Sta voor een bank of box met dumbbells langs je zij','Stap op met één voet en duw omhoog','Strek je been volledig bovenaan','Stap gecontroleerd terug naar beneden'], 'strength', false, true),
(gen_random_uuid(), 'Walking Lunge', 'Wandelende Uitvalspas', 'legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'dumbbell', ARRAY['Houd dumbbells langs je zij','Stap naar voren in een uitval','Zak tot beide knieën op 90 graden','Stap door naar de volgende uitval met het andere been'], 'strength', false, true),
(gen_random_uuid(), 'Sumo Deadlift', 'Sumo Deadlift', 'legs', 'glutes', ARRAY['quadriceps','hamstrings','adductors'], 'barbell', ARRAY['Sta breed met tenen naar buiten, stang voor je','Pak de stang met nauwe grip tussen je benen','Houd je borst omhoog en rug recht','Duw door je benen en trek omhoog'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- ARMS (Armen) — Biceps Machines & Cable
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Machine Bicep Curl', 'Machine Bicep Curl', 'arms', 'biceps', ARRAY['brachialis'], 'machine', ARRAY['Zit op de machine met je armen op de pad','Pak de grepen vast met onderhandse grip','Curl de grepen omhoog naar je schouders','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Machine Preacher Curl', 'Machine Preacher Curl', 'arms', 'biceps', ARRAY['brachialis'], 'machine', ARRAY['Zit met je bovenarm op de schuine pad','Pak de greep met onderhandse grip','Curl omhoog met focus op de squeeze','Laat langzaam zakken voor een volledige stretch'], 'strength', false, true),
(gen_random_uuid(), 'Cable Bicep Curl', 'Kabel Bicep Curl', 'arms', 'biceps', ARRAY['brachialis','forearms'], 'cable', ARRAY['Sta voor een lage kabel met rechte stang','Pak vast met onderhandse grip','Curl de stang omhoog naar je schouders','Laat gecontroleerd zakken zonder je ellebogen te bewegen'], 'strength', false, true),
(gen_random_uuid(), 'Cable Hammer Curl', 'Kabel Hammer Curl', 'arms', 'brachialis', ARRAY['biceps','forearms'], 'cable', ARRAY['Gebruik een touw-attachment op een lage kabel','Pak de touwen met neutrale grip','Curl omhoog met duimen naar boven','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Bayesian Cable Curl', 'Bayesian Kabel Curl', 'arms', 'biceps', ARRAY['brachialis'], 'cable', ARRAY['Sta met je rug naar een lage kabel','Pak de greep met één hand achter je','Curl je arm naar voren en omhoog','Krijg een diepe stretch onderaan de beweging'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- ARMS (Armen) — Biceps Free Weights
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Barbell Curl', 'Barbell Bicep Curl', 'arms', 'biceps', ARRAY['brachialis','forearms'], 'barbell', ARRAY['Sta met de stang met onderhandse grip op heupbreedte','Houd je ellebogen langs je lichaam','Curl de stang omhoog naar je schouders','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'EZ Bar Curl', 'EZ Bar Curl', 'arms', 'biceps', ARRAY['brachialis'], 'ez bar', ARRAY['Pak de EZ bar op de binnenste of buitenste grip','Houd je ellebogen stevig langs je lichaam','Curl omhoog met gecontroleerde beweging','Laat langzaam zakken'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Curl', 'Dumbbell Bicep Curl', 'arms', 'biceps', ARRAY['brachialis','forearms'], 'dumbbell', ARRAY['Sta met dumbbells langs je zij, handpalmen naar voren','Curl beide dumbbells tegelijk omhoog','Knijp je biceps samen bovenaan','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Hammer Curl', 'Dumbbell Hammer Curl', 'arms', 'brachialis', ARRAY['biceps','forearms'], 'dumbbell', ARRAY['Sta met dumbbells langs je zij, handpalmen naar elkaar','Curl omhoog met neutrale grip','Houd je ellebogen stevig langs je lichaam','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Incline Dumbbell Curl', 'Schuine Dumbbell Curl', 'arms', 'biceps', ARRAY['brachialis'], 'dumbbell', ARRAY['Lig op een schuine bank (45 graden) met dumbbells hangend','Curl omhoog zonder je bovenarm te bewegen','Voel de extra stretch in je biceps','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Concentration Curl', 'Concentratie Curl', 'arms', 'biceps', ARRAY['brachialis'], 'dumbbell', ARRAY['Zit op een bank, leun naar voren','Steun je elleboog tegen de binnenkant van je dij','Curl de dumbbell omhoog naar je schouder','Laat gecontroleerd zakken voor volledige stretch'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- ARMS (Armen) — Triceps Machines & Cable
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Machine Tricep Dip', 'Machine Tricep Dip', 'arms', 'triceps', ARRAY['chest','anterior deltoid'], 'machine', ARRAY['Zit op de machine met je handen op de grepen','Duw de grepen naar beneden tot je armen gestrekt zijn','Laat gecontroleerd terugkomen tot 90 graden','Houd je ellebogen langs je lichaam'], 'strength', false, true),
(gen_random_uuid(), 'Machine Tricep Extension', 'Machine Tricep Extensie', 'arms', 'triceps', ARRAY[]::text[], 'machine', ARRAY['Zit op de machine met je armen op de pad','Strek je armen volledig uit tegen de weerstand','Knijp je triceps samen onderaan','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Cable Tricep Pushdown', 'Kabel Tricep Pushdown', 'arms', 'triceps', ARRAY[]::text[], 'cable', ARRAY['Sta voor een hoge kabel met rechte stang of V-bar','Houd je ellebogen langs je lichaam','Duw de stang naar beneden tot je armen gestrekt zijn','Laat gecontroleerd terugkomen tot 90 graden'], 'strength', false, true),
(gen_random_uuid(), 'Cable Rope Pushdown', 'Kabel Touw Pushdown', 'arms', 'triceps', ARRAY[]::text[], 'cable', ARRAY['Gebruik een touw-attachment op een hoge kabel','Duw naar beneden en spreid de touwen onderaan','Knijp je triceps samen in de onderste positie','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Cable Overhead Tricep Extension', 'Kabel Overhead Tricep Extensie', 'arms', 'triceps', ARRAY[]::text[], 'cable', ARRAY['Sta met je rug naar een hoge kabel, touw-attachment','Houd het touw boven je hoofd met gebogen armen','Strek je armen boven je hoofd uit','Laat gecontroleerd zakken achter je hoofd'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- ARMS (Armen) — Triceps Free Weights
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Close Grip Bench Press', 'Nauwe Grip Bankdrukken', 'arms', 'triceps', ARRAY['chest','anterior deltoid'], 'barbell', ARRAY['Lig op de bank, pak de stang op schouderbreedte of iets smaller','Laat de stang zakken naar je borst met ellebogen langs je lichaam','Duw omhoog met focus op je triceps','Houd je ellebogen naar voren gericht'], 'strength', false, true),
(gen_random_uuid(), 'Skull Crusher', 'Skull Crusher', 'arms', 'triceps', ARRAY[]::text[], 'ez bar', ARRAY['Lig op de bank met de EZ bar boven je borst','Laat de stang zakken naar je voorhoofd door je ellebogen te buigen','Houd je bovenarmen verticaal','Strek je armen terug omhoog'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Overhead Tricep Extension', 'Dumbbell Overhead Tricep Extensie', 'arms', 'triceps', ARRAY[]::text[], 'dumbbell', ARRAY['Zit of sta met een dumbbell boven je hoofd in beide handen','Laat de dumbbell achter je hoofd zakken','Strek je armen volledig uit boven je hoofd','Houd je ellebogen dicht bij je hoofd'], 'strength', false, true),
(gen_random_uuid(), 'Tricep Dip', 'Tricep Dips', 'arms', 'triceps', ARRAY['chest','anterior deltoid'], 'body weight', ARRAY['Pak de dip bars vast en hef jezelf op','Houd je lichaam recht (niet voorover leunen)','Zak tot je ellebogen op 90 graden zijn','Duw jezelf krachtig omhoog'], 'strength', false, true),
(gen_random_uuid(), 'Diamond Push Up', 'Diamant Opdrukken', 'arms', 'triceps', ARRAY['chest'], 'body weight', ARRAY['Start in opdrukpositie met handen dicht bij elkaar','Vorm een diamant met je duimen en wijsvingers','Laat je lichaam zakken naar je handen','Duw jezelf omhoog met focus op triceps'], 'strength', false, true),
(gen_random_uuid(), 'Dumbbell Kickback', 'Dumbbell Kickback', 'arms', 'triceps', ARRAY[]::text[], 'dumbbell', ARRAY['Buig voorover met een dumbbell in één hand','Houd je bovenarm langs je lichaam, parallel aan de grond','Strek je arm naar achteren tot volledig gestrekt','Knijp je tricep samen en laat gecontroleerd terugkomen'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- CORE (Kern) — Machines & Cable
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Machine Ab Crunch', 'Machine Buik Crunch', 'core', 'rectus abdominis', ARRAY['obliques'], 'machine', ARRAY['Zit op de machine met je borst tegen de pad','Pak de grepen vast','Crunch naar voren door je buikspieren samen te trekken','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Cable Woodchop', 'Kabel Woodchop', 'core', 'obliques', ARRAY['rectus abdominis','transverse abdominis'], 'cable', ARRAY['Stel de kabel hoog in, sta zijwaarts','Pak de greep met beide handen','Draai en trek de kabel diagonaal naar je andere heup','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Cable Crunch', 'Kabel Crunch', 'core', 'rectus abdominis', ARRAY['obliques'], 'cable', ARRAY['Kniel voor een hoge kabel met touw-attachment','Houd het touw naast je hoofd','Crunch naar beneden door je buikspieren samen te trekken','Laat gecontroleerd terugkomen'], 'strength', false, true),
(gen_random_uuid(), 'Cable Pallof Press', 'Kabel Pallof Press', 'core', 'transverse abdominis', ARRAY['obliques'], 'cable', ARRAY['Sta zijwaarts naast een kabel op borsthoogte','Houd de greep tegen je borst','Duw je armen naar voren en houd vast','Weersta de rotatie en breng terug naar je borst'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- CORE (Kern) — Bodyweight
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Plank', 'Plank', 'core', 'transverse abdominis', ARRAY['rectus abdominis','obliques','erector spinae'], 'body weight', ARRAY['Steun op je onderarmen en tenen','Houd je lichaam in een rechte lijn','Span je buikspieren aan','Houd de positie voor de aangegeven tijd'], 'strength', false, true),
(gen_random_uuid(), 'Hanging Leg Raise', 'Hangende Beenhef', 'core', 'rectus abdominis', ARRAY['hip flexors','obliques'], 'body weight', ARRAY['Hang aan een pull-up stang met gestrekte armen','Hef je benen omhoog tot 90 graden','Houd even vast bovenaan','Laat gecontroleerd zakken zonder te zwaaien'], 'strength', false, true),
(gen_random_uuid(), 'Ab Wheel Rollout', 'Ab Wheel Rollout', 'core', 'rectus abdominis', ARRAY['transverse abdominis','obliques','erector spinae'], 'body weight', ARRAY['Kniel met het ab wheel voor je','Rol langzaam naar voren met gestrekte armen','Ga zo ver als je kunt met controle','Rol terug naar de startpositie door je buik aan te spannen'], 'strength', false, true),
(gen_random_uuid(), 'Russian Twist', 'Russian Twist', 'core', 'obliques', ARRAY['rectus abdominis'], 'body weight', ARRAY['Zit met je knieën gebogen, voeten van de grond','Leun licht achterover met rechte rug','Draai je bovenlichaam van links naar rechts','Houd je armen voor je borst of gebruik een gewicht'], 'strength', false, true),
(gen_random_uuid(), 'Dead Bug', 'Dead Bug', 'core', 'transverse abdominis', ARRAY['rectus abdominis'], 'body weight', ARRAY['Lig op je rug met armen gestrekt naar het plafond en knieën op 90 graden','Strek tegelijk je rechterarm achter je hoofd en je linkerbeen naar voren','Houd je onderrug plat op de grond','Wissel van kant'], 'strength', false, true),
(gen_random_uuid(), 'Mountain Climber', 'Mountain Climbers', 'core', 'rectus abdominis', ARRAY['obliques','hip flexors','shoulders'], 'body weight', ARRAY['Start in een hoge plankpositie','Trek je rechterknie naar je borst','Wissel snel van been','Houd je heupen laag en je core aangespannen'], 'strength', false, true),
(gen_random_uuid(), 'Side Plank', 'Zijplank', 'core', 'obliques', ARRAY['transverse abdominis','glutes'], 'body weight', ARRAY['Lig op je zij, steun op je onderarm en de zijkant van je voet','Hef je heupen op tot je lichaam een rechte lijn vormt','Span je core en bilspieren aan','Houd de positie voor de aangegeven tijd'], 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- CARDIO
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Treadmill Run', 'Loopband Hardlopen', 'cardio', 'cardiovascular', ARRAY['quadriceps','hamstrings','calves'], 'machine', ARRAY['Stel je gewenste snelheid en helling in','Begin met wandelen en verhoog geleidelijk','Houd een goede houding met rechte rug','Cool down met langzamer tempo'], 'cardio', false, true),
(gen_random_uuid(), 'Treadmill Incline Walk', 'Loopband Helling Wandelen', 'cardio', 'cardiovascular', ARRAY['glutes','calves','hamstrings'], 'machine', ARRAY['Stel de helling in op 10-15%','Wandel op een matig tempo (5-6 km/u)','Houd je niet vast aan de leuningen','Houd een rechte houding'], 'cardio', false, true),
(gen_random_uuid(), 'Rowing Machine', 'Roeimachine', 'cardio', 'cardiovascular', ARRAY['latissimus dorsi','quadriceps','hamstrings','biceps'], 'machine', ARRAY['Zit op de roeier met voeten in de steunen','Begin met je benen, dan je rug, dan je armen (de catch)','Trek de handgreep naar je borst','Laat terug in omgekeerde volgorde: armen, rug, benen'], 'cardio', false, true),
(gen_random_uuid(), 'Stationary Bike', 'Hometrainer', 'cardio', 'cardiovascular', ARRAY['quadriceps','hamstrings','calves'], 'machine', ARRAY['Stel de zithoogte in zodat je knie licht gebogen is onderaan','Begin rustig te fietsen om op te warmen','Verhoog geleidelijk de weerstand of snelheid','Cool down met lichte weerstand'], 'cardio', false, true),
(gen_random_uuid(), 'Assault Bike', 'Assault Bike', 'cardio', 'cardiovascular', ARRAY['quadriceps','shoulders','arms'], 'machine', ARRAY['Zit op de fiets en pak de handgrepen vast','Trap en duw/trek tegelijk met armen','Verhoog de intensiteit met snellere snelheid','Gebruik voor intervallen of steady state'], 'cardio', false, true),
(gen_random_uuid(), 'Elliptical Trainer', 'Crosstrainer', 'cardio', 'cardiovascular', ARRAY['quadriceps','glutes','hamstrings'], 'machine', ARRAY['Stap op de pedalen en pak de beweegbare handgrepen','Beweeg in een vloeiende elliptische beweging','Stel weerstand in op je gewenste niveau','Houd een rechte houding'], 'cardio', false, true),
(gen_random_uuid(), 'Stairmaster', 'Stairmaster', 'cardio', 'cardiovascular', ARRAY['quadriceps','glutes','calves'], 'machine', ARRAY['Stap op de traploper en pak licht de leuningen vast','Begin op een comfortabel tempo','Maak volledige stappen','Houd je niet te zwaar vast aan de leuningen'], 'cardio', false, true),
(gen_random_uuid(), 'Battle Ropes', 'Battle Ropes', 'cardio', 'cardiovascular', ARRAY['shoulders','arms','core'], 'body weight', ARRAY['Sta in een halve squat positie met een touw in elke hand','Maak afwisselend golven met je armen','Houd je core stabiel','Wissel af tussen golven, slams en cirkels'], 'cardio', false, true),
(gen_random_uuid(), 'Jump Rope', 'Touwtjespringen', 'cardio', 'cardiovascular', ARRAY['calves','shoulders','core'], 'body weight', ARRAY['Houd de grepen op heuphoogte met ellebogen langs je lichaam','Spring laag van de grond met beide voeten','Draai het touw met je polsen, niet je armen','Land zacht op de bal van je voeten'], 'cardio', false, true),
(gen_random_uuid(), 'Sled Push', 'Slee Duwen', 'cardio', 'quadriceps', ARRAY['glutes','calves','core'], 'body weight', ARRAY['Plaats je handen op de hoge grepen van de slee','Leun naar voren in een 45 graden hoek','Duw met krachtige benen, één voor één','Houd je armen gestrekt en rug recht'], 'cardio', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- MOBILITY / WARMUP / COOLDOWN
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Foam Roll Quads', 'Foam Roll Bovenbenen', 'legs', 'quadriceps', ARRAY[]::text[], 'foam roller', ARRAY['Lig op je buik met de foam roller onder je bovenbenen','Rol langzaam van heup tot net boven je knie','Pauzeer op gevoelige plekken','Doe 60-90 seconden per been'], 'mobility', false, true),
(gen_random_uuid(), 'Foam Roll Back', 'Foam Roll Rug', 'back', 'erector spinae', ARRAY['latissimus dorsi'], 'foam roller', ARRAY['Lig op je rug met de foam roller onder je bovenrug','Kruip je armen voor je borst','Rol langzaam van mid-rug tot schouderbladen','Pauzeer op gevoelige plekken'], 'mobility', false, true),
(gen_random_uuid(), 'Hip Flexor Stretch', 'Heup Flexor Stretch', 'legs', 'hip flexors', ARRAY['quadriceps'], 'body weight', ARRAY['Kniel op één knie in een uitvalspas positie','Duw je heupen naar voren','Voel de stretch in de voorkant van je heup','Houd 30-45 seconden per kant'], 'mobility', false, true),
(gen_random_uuid(), 'World Greatest Stretch', 'World Greatest Stretch', 'legs', 'hip flexors', ARRAY['hamstrings','thoracic spine','glutes'], 'body weight', ARRAY['Stap naar voren in een uitvalspas','Plaats je hand aan de binnenkant van je voorvoet','Draai je bovenlichaam open naar de hemel','Strek je voorste been terwijl je terugkomt'], 'warmup', false, true),
(gen_random_uuid(), 'Cat Cow Stretch', 'Kat-Koe Stretch', 'back', 'erector spinae', ARRAY['rectus abdominis'], 'body weight', ARRAY['Ga op handen en knieën staan','Rond je rug omhoog (kat) terwijl je uitademt','Laat je buik zakken en kijk omhoog (koe) terwijl je inademt','Wissel vloeiend af'], 'warmup', false, true),
(gen_random_uuid(), 'Band Pull Apart', 'Band Pull Apart', 'shoulders', 'rear deltoid', ARRAY['rhomboids','trapezius'], 'resistance band', ARRAY['Houd een weerstandsband voor je borst met gestrekte armen','Trek de band uit elkaar door je schouderbladen samen te knijpen','Houd even vast in de breedste positie','Laat gecontroleerd terugkomen'], 'warmup', false, true),
(gen_random_uuid(), 'Banded Shoulder Dislocate', 'Band Schouder Dislocate', 'shoulders', 'rotator cuff', ARRAY['rear deltoid','trapezius'], 'resistance band', ARRAY['Houd een band breed voor je bovenbenen','Breng de band in een grote boog over je hoofd naar je rug','Keer de beweging om','Gebruik een brede grip en ga geleidelijk smaller'], 'warmup', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- FUNCTIONAL / COMPOUND
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Kettlebell Swing', 'Kettlebell Swing', 'legs', 'glutes', ARRAY['hamstrings','core','shoulders'], 'kettlebell', ARRAY['Sta met voeten iets breder dan schouderbreedte','Houd de kettlebell met beide handen','Swing naar achteren tussen je benen','Duw je heupen explosief naar voren om de kettlebell omhoog te zwaaien'], 'strength', false, true),
(gen_random_uuid(), 'Kettlebell Goblet Squat', 'Kettlebell Goblet Squat', 'legs', 'quadriceps', ARRAY['glutes','core'], 'kettlebell', ARRAY['Houd de kettlebell tegen je borst','Sta met voeten schouderbreedte, tenen licht naar buiten','Zak diep in een squat met je borst omhoog','Duw omhoog door je hakken'], 'strength', false, true),
(gen_random_uuid(), 'Kettlebell Turkish Get Up', 'Kettlebell Turkish Get Up', 'core', 'core', ARRAY['shoulders','glutes','quadriceps'], 'kettlebell', ARRAY['Lig op je rug met de kettlebell in één gestrekte arm','Sta gecontroleerd op in fasen','Houd de kettlebell de hele tijd boven je schouder','Keer de beweging om terug naar de liggende positie'], 'strength', false, true),
(gen_random_uuid(), 'Farmers Walk', 'Farmers Walk', 'core', 'forearms', ARRAY['trapezius','core','glutes'], 'dumbbell', ARRAY['Pak twee zware dumbbells op','Sta rechtop met je schouders naar achteren','Loop in een rechte lijn met korte, snelle stappen','Houd je core stabiel en schouders geactiveerd'], 'strength', false, true),
(gen_random_uuid(), 'Landmine Press', 'Landmine Press', 'shoulders', 'anterior deltoid', ARRAY['triceps','core'], 'barbell', ARRAY['Plaats één uiteinde van de stang in een landmine of hoek','Houd het andere uiteinde met één hand op schouderhoogte','Duw de stang omhoog en naar voren','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Landmine Row', 'Landmine Roeien', 'back', 'latissimus dorsi', ARRAY['rhomboids','biceps'], 'barbell', ARRAY['Sta over de landmine stang met voeten wijd','Pak de stang met beide handen of een V-bar','Trek naar je borst met rechte rug','Laat gecontroleerd zakken'], 'strength', false, true),
(gen_random_uuid(), 'Trap Bar Deadlift', 'Trap Bar Deadlift', 'legs', 'quadriceps', ARRAY['glutes','hamstrings','erector spinae'], 'trap bar', ARRAY['Sta in het midden van de trap bar','Pak de hoge of lage grepen vast','Houd je borst omhoog en rug recht','Sta op door je benen te strekken'], 'strength', false, true),
(gen_random_uuid(), 'Face Pull with External Rotation', 'Face Pull met Externe Rotatie', 'shoulders', 'rear deltoid', ARRAY['rotator cuff','trapezius'], 'cable', ARRAY['Stel een kabel hoog in met touw-attachment','Trek naar je gezicht','Draai je handen naar buiten bij het eindpunt','Houd even vast en laat gecontroleerd terugkomen'], 'strength', false, true)
ON CONFLICT DO NOTHING;
