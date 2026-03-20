-- Migration: Matrix machines seed — Basic-Fit equipment
-- Matrix Versa series (selectorized) machines commonly found in
-- Basic-Fit gyms across the Benelux. Each exercise has Dutch name,
-- instructions, target/secondary muscles.
-- Uses ON CONFLICT DO NOTHING on name to avoid duplicates.

-- =============================================
-- MATRIX VERSA SERIES — CHEST (Borst)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Matrix Converging Chest Press (Versa VS-S13)', 'Matrix Chest Press', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps'], 'machine', 'Matrix',
 ARRAY['Stel de stoelhoogte in zodat de handgrepen op borsthoogte zijn','Druk je rug stevig tegen de rugleuning','Duw de grepen naar voren in een convergerende beweging — armen komen samen','Laat gecontroleerd terugkomen tot je een stretch voelt in je borst'],
 'strength', false, true),

(gen_random_uuid(), 'Matrix Rear Delt / Pec Fly (Versa VS-S22)', 'Matrix Pec Fly / Rear Delt', 'chest', 'pectoralis major', ARRAY['anterior deltoid'], 'machine', 'Matrix',
 ARRAY['Stel de machine in op fly-stand (armen komen samen voor je borst)','Zit met je rug tegen de pad, pak de grepen vast','Breng je armen samen voor je borst — knijp je borstspieren','Laat langzaam terugkomen tot een goede stretch'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- MATRIX VERSA SERIES — BACK (Rug)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Matrix Diverging Lat Pulldown (Versa VS-S33)', 'Matrix Lat Pulldown', 'back', 'latissimus dorsi', ARRAY['biceps','rhomboids','teres major'], 'machine', 'Matrix',
 ARRAY['Zit met je bovenbenen stevig onder de kniepads','Pak de grepen vast met brede overhandse grip','Trek de grepen naar je bovenborst — ellebogen naar beneden en achteren','Laat gecontroleerd terugkomen tot gestrekte armen'],
 'strength', false, true),

(gen_random_uuid(), 'Matrix Diverging Seated Row (Versa VS-S34)', 'Matrix Seated Row', 'back', 'rhomboids', ARRAY['latissimus dorsi','biceps','rear deltoid'], 'machine', 'Matrix',
 ARRAY['Stel de borstpad in zodat je met gestrekte armen de grepen bereikt','Zit met je borst tegen de pad en pak de grepen vast','Trek naar je buik in een divergerende beweging — knijp je schouderbladen samen','Laat gecontroleerd terugkomen zonder je romp te bewegen'],
 'strength', false, true),

(gen_random_uuid(), 'Matrix Rear Delt (Versa VS-S22 Reverse)', 'Matrix Reverse Fly / Rear Delt', 'back', 'rear deltoid', ARRAY['rhomboids','trapezius'], 'machine', 'Matrix',
 ARRAY['Stel de VS-S22 in op reverse-stand (rear delt)','Zit met je borst tegen de pad, pak de grepen vast','Trek je armen naar achteren — knijp je schouderbladen samen','Laat gecontroleerd terugkomen — houd spanning in je achterste schouders'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- MATRIX VERSA SERIES — SHOULDERS (Schouders)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Matrix Converging Shoulder Press (Versa VS-S23)', 'Matrix Shoulder Press', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid','triceps'], 'machine', 'Matrix',
 ARRAY['Stel de stoelhoogte in zodat de grepen op schouderhoogte starten','Druk je rug stevig tegen de rugleuning','Duw omhoog in een convergerende beweging — armen komen samen boven je hoofd','Laat gecontroleerd zakken tot schouderhoogte'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- MATRIX VERSA SERIES — ARMS (Armen)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Matrix Biceps Curl (Versa VS-S40)', 'Matrix Biceps Curl', 'upper arms', 'biceps', ARRAY['brachialis','forearms'], 'machine', 'Matrix',
 ARRAY['Stel de stoelhoogte in zodat je bovenarmen plat op de pad liggen','Pak de grepen vast met onderhandse grip','Curl omhoog tot volledige contractie — knijp je biceps bovenaan','Laat gecontroleerd zakken — houd spanning, niet volledig strekken'],
 'strength', false, true),

(gen_random_uuid(), 'Matrix Triceps Press (Versa VS-S42)', 'Matrix Triceps Press', 'upper arms', 'triceps', ARRAY['anconeus'], 'machine', 'Matrix',
 ARRAY['Zit met je rug tegen de pad, ellebogen op de armsteunen','Pak de grepen vast met neutrale grip','Strek je armen volledig naar beneden — knijp je triceps','Laat gecontroleerd terugkomen tot 90 graden in je ellebogen'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- MATRIX VERSA SERIES — LEGS (Benen)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Matrix Leg Press / Calf Press (Versa VS-S70)', 'Matrix Leg Press', 'upper legs', 'quadriceps', ARRAY['glutes','hamstrings','calves'], 'machine', 'Matrix',
 ARRAY['Zit met je rug stevig tegen de rugleuning','Plaats je voeten op schouderbreedte op het platform','Duw het platform weg tot je benen bijna gestrekt zijn — niet locken','Laat gecontroleerd terugkomen tot 90 graden in je knieën'],
 'strength', false, true),

(gen_random_uuid(), 'Matrix Leg Extension (Versa VS-S71)', 'Matrix Leg Extension', 'upper legs', 'quadriceps', ARRAY['vastus medialis','vastus lateralis'], 'machine', 'Matrix',
 ARRAY['Stel de rugpad en enkelpad in — enkelpad net boven je voeten','Zit stevig met je rug tegen de rugleuning','Strek je benen volledig — knijp je quadriceps bovenaan','Laat gecontroleerd zakken tot 90 graden — niet lager'],
 'strength', false, true),

(gen_random_uuid(), 'Matrix Seated Leg Curl (Versa VS-S72)', 'Matrix Seated Leg Curl', 'upper legs', 'hamstrings', ARRAY['calves','glutes'], 'machine', 'Matrix',
 ARRAY['Stel de rugpad en enkelpad goed in — enkelpad net boven je hakken','Zit met je rug stevig tegen de rugleuning','Curl je benen naar beneden en achteren — knijp je hamstrings','Laat gecontroleerd terugkomen — houd spanning'],
 'strength', false, true),

(gen_random_uuid(), 'Matrix Hip Adductor / Abductor (Versa VS-S74)', 'Matrix Adductor / Abductor', 'upper legs', 'adductors', ARRAY['abductors','hip flexors'], 'machine', 'Matrix',
 ARRAY['Stel de machine in op adductie (benen sluiten) of abductie (benen openen)','Zit met je rug tegen de pad, benen achter de knie-pads','Adductie: druk je benen samen — knijp je binnenbenen','Abductie: duw je benen uit elkaar — voel je buitenste heup werken'],
 'strength', false, true),

(gen_random_uuid(), 'Matrix Glute Machine (Versa VS-S78)', 'Matrix Glute Machine', 'upper legs', 'glutes', ARRAY['hamstrings'], 'machine', 'Matrix',
 ARRAY['Stel de machine in en sta met je borst tegen de pad','Plaats één voet op het platform achter je','Duw het platform naar achteren en omhoog — knijp je bilspier bovenaan','Laat gecontroleerd terugkomen en wissel van been'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- MATRIX VERSA SERIES — CORE (Kern)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Matrix Abdominal (Versa VS-S53)', 'Matrix Ab Crunch', 'waist', 'abdominals', ARRAY['obliques'], 'machine', 'Matrix',
 ARRAY['Zit op de machine en pak de grepen boven je schouders vast','Plaats je voeten achter de enkelrollen','Crunch naar voren en beneden — knijp je buikspieren','Laat gecontroleerd terugkomen — houd spanning in je core'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- MATRIX CARDIO — commonly found at Basic-Fit
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Matrix Treadmill', 'Matrix Loopband', 'cardio', 'cardiovascular system', ARRAY['quadriceps','hamstrings','calves','glutes'], 'machine', 'Matrix',
 ARRAY['Stap op de loopband en start met lopen op lage snelheid','Verhoog geleidelijk de snelheid naar je gewenste tempo','Houd een rechte houding aan — kijk vooruit, niet naar beneden','Cool down door geleidelijk af te bouwen in de laatste minuten'],
 'cardio', false, true),

(gen_random_uuid(), 'Matrix Elliptical / Crosstrainer', 'Matrix Crosstrainer', 'cardio', 'cardiovascular system', ARRAY['quadriceps','glutes','hamstrings','arms'], 'machine', 'Matrix',
 ARRAY['Stap op de pedalen en pak de beweegbare handgrepen vast','Maak vloeiende, elliptische bewegingen met je benen','Gebruik je armen actief mee voor een full-body workout','Houd een constant tempo aan en wissel eventueel weerstand af'],
 'cardio', false, true),

(gen_random_uuid(), 'Matrix Upright Bike', 'Matrix Hometrainer', 'cardio', 'cardiovascular system', ARRAY['quadriceps','hamstrings','calves'], 'machine', 'Matrix',
 ARRAY['Stel de zadelhoogte in — je been moet bijna gestrekt zijn onderaan','Zit rechtop en pak het stuur licht vast','Trap in een constant tempo — houd je kern stabiel','Verhoog de weerstand voor meer intensiteit'],
 'cardio', false, true),

(gen_random_uuid(), 'Matrix Recumbent Bike', 'Matrix Ligfiets', 'cardio', 'cardiovascular system', ARRAY['quadriceps','hamstrings'], 'machine', 'Matrix',
 ARRAY['Stel de stoel in zodat je been bijna gestrekt is bij de verste pedaalpositie','Leun comfortabel achterover en pak de zijgrepen vast','Trap in een gelijkmatig tempo','Ideaal voor lagere rugbelasting — focus op je bovenbenen'],
 'cardio', false, true),

(gen_random_uuid(), 'Matrix ClimbMill', 'Matrix Trappenklimmer', 'cardio', 'cardiovascular system', ARRAY['quadriceps','glutes','calves','hamstrings'], 'machine', 'Matrix',
 ARRAY['Stap op de draaiende treden en houd de leuningen licht vast','Begin op een laag tempo om te wennen','Stap volledig door op elke trede — activeer je billen','Leun niet te veel op de leuningen, dat vermindert het effect'],
 'cardio', false, true),

(gen_random_uuid(), 'Matrix Rower', 'Matrix Roeimachine', 'cardio', 'cardiovascular system', ARRAY['latissimus dorsi','quadriceps','biceps','core'], 'machine', 'Matrix',
 ARRAY['Zit op de roeimachine, voeten vast in de steunen','Begin de beweging vanuit je benen — duw af','Trek daarna de handgreep naar je buik — schouderbladen samen','Keer de beweging om: armen, romp, benen — herhaal vloeiend'],
 'cardio', false, true)
ON CONFLICT DO NOTHING;
