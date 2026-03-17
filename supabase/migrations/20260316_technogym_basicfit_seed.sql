-- Migration: Technogym machines seed — Basic-Fit equipment
-- All Technogym Selection, Element+, Pure Strength, and Cardio lines
-- commonly found in Basic-Fit gyms across the Benelux.
-- Each exercise has Dutch name, instructions, target/secondary muscles.
-- Uses ON CONFLICT DO NOTHING on name to avoid duplicates with existing data.

-- =============================================
-- TECHNOGYM SELECTION LINE — CHEST (Borst)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Chest Press (Selection)', 'Technogym Chest Press', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps'], 'machine', 'Technogym',
 ARRAY['Stel de stoelhoogte in zodat de handgrepen op borsthoogte zijn','Druk je rug goed tegen de rugleuning','Pak de grepen vast en duw naar voren tot je armen bijna gestrekt zijn','Laat gecontroleerd terugkomen — voel de stretch in je borst'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Pectoral Machine (Selection)', 'Technogym Pectoral / Butterfly', 'chest', 'pectoralis major', ARRAY['anterior deltoid'], 'machine', 'Technogym',
 ARRAY['Stel de stoelhoogte in zodat je armen op schouderhoogte komen','Plaats je onderarmen achter de pads','Breng de pads samen voor je borst — knijp je borstspieren','Laat langzaam terugkomen tot je een goede stretch voelt'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Vertical Traction (Selection)', 'Technogym Vertical Traction', 'back', 'latissimus dorsi', ARRAY['biceps','rhomboids'], 'machine', 'Technogym',
 ARRAY['Zit met bovenbenen stevig onder de pads','Pak de brede stang met overhandse grip','Trek de stang naar je bovenborst — ellebogen naar achteren','Laat gecontroleerd terugkomen tot gestrekte armen'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM SELECTION LINE — BACK (Rug)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Low Row (Selection)', 'Technogym Low Row', 'back', 'rhomboids', ARRAY['latissimus dorsi','biceps','rear deltoid'], 'machine', 'Technogym',
 ARRAY['Stel de borstpad in zodat je met gestrekte armen de grepen kunt pakken','Trek de grepen naar je buik — knijp je schouderbladen samen','Houd je borst tegen de pad gedrukt','Laat gecontroleerd terugkomen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Lat Machine (Selection)', 'Technogym Lat Machine', 'back', 'latissimus dorsi', ARRAY['biceps','teres major'], 'machine', 'Technogym',
 ARRAY['Zit stevig met knieën onder de pads','Pak de stang breed vast met overhandse grip','Trek naar je bovenborst — duw je borst naar voren','Laat gecontroleerd terugkomen boven je hoofd'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Pullover Machine (Selection)', 'Technogym Pullover', 'back', 'latissimus dorsi', ARRAY['teres major','pectoralis major'], 'machine', 'Technogym',
 ARRAY['Zit met je rug tegen de pad, gordel vast','Plaats je ellebogen op de arm-pads','Duw de pads in een boog naar je heupen — focus op je lats','Laat gecontroleerd terugkomen boven je hoofd'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Rear Delt / Pectoral Reverse (Selection)', 'Technogym Reverse Pectoral', 'back', 'rear deltoid', ARRAY['rhomboids','trapezius'], 'machine', 'Technogym',
 ARRAY['Draai de butterfly machine om naar reverse stand','Zit met je borst tegen de pad','Pak de grepen en trek je armen naar achteren','Knijp je schouderbladen samen — laat gecontroleerd terugkomen'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM SELECTION LINE — SHOULDERS (Schouders)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Shoulder Press (Selection)', 'Technogym Shoulder Press', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid','triceps'], 'machine', 'Technogym',
 ARRAY['Stel de stoelhoogte in zodat de grepen op schouderhoogte starten','Druk je rug goed tegen de rugleuning','Duw omhoog tot je armen bijna gestrekt zijn','Laat gecontroleerd zakken — niet lager dan 90 graden in je ellebogen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Lateral Raise (Selection)', 'Technogym Lateral Raise', 'shoulders', 'lateral deltoid', ARRAY['trapezius'], 'machine', 'Technogym',
 ARRAY['Zit op de machine met je armen langs de pads','Hef je armen zijwaarts tot net boven schouderhoogte','Houd even vast bovenaan — voel de spanning in je zijschouders','Laat gecontroleerd zakken zonder volledig te ontladen'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM SELECTION LINE — ARMS (Armen)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Arm Curl (Selection)', 'Technogym Arm Curl', 'upper arms', 'biceps', ARRAY['brachialis','forearms'], 'machine', 'Technogym',
 ARRAY['Stel de stoelhoogte in zodat je bovenarm plat op de pad ligt','Pak de stang met onderhandse grip','Curl omhoog tot volledige contractie — knijp je biceps','Laat gecontroleerd zakken zonder je armen volledig te strekken'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Arm Extension (Selection)', 'Technogym Arm Extension / Triceps', 'upper arms', 'triceps', ARRAY['anconeus'], 'machine', 'Technogym',
 ARRAY['Stel de stoelhoogte in zodat je ellebogen op de pad rusten','Pak de grepen met overhandse grip','Strek je armen volledig — knijp je triceps','Laat gecontroleerd terugkomen tot 90 graden'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM SELECTION LINE — LEGS (Benen)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Leg Press (Selection)', 'Technogym Leg Press', 'upper legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'machine', 'Technogym',
 ARRAY['Zit met je rug stevig tegen de rugleuning','Plaats je voeten op schouderbreedte op het platform','Duw het platform weg — strek je benen bijna volledig','Laat gecontroleerd terugkomen tot 90 graden in je knieën'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Leg Extension (Selection)', 'Technogym Leg Extension', 'upper legs', 'quadriceps', ARRAY['vastus medialis','vastus lateralis'], 'machine', 'Technogym',
 ARRAY['Stel de rugpad en enkelpad goed in — enkelpad net boven je voeten','Zit stevig met je rug tegen de pad','Strek je benen volledig — knijp je quadriceps bovenaan','Laat gecontroleerd zakken tot 90 graden'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Leg Curl (Selection)', 'Technogym Leg Curl (liggend)', 'upper legs', 'hamstrings', ARRAY['calves','glutes'], 'machine', 'Technogym',
 ARRAY['Lig op je buik met de enkelpad net boven je hielen','Houd de handgrepen vast voor stabiliteit','Curl je onderbenen omhoog richting je billen','Laat gecontroleerd zakken zonder volledig te strekken'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Seated Leg Curl (Selection)', 'Technogym Leg Curl (zittend)', 'upper legs', 'hamstrings', ARRAY['calves'], 'machine', 'Technogym',
 ARRAY['Stel de stoelhoogte en beenpad goed in','Zit met je rug tegen de rugleuning','Curl je onderbenen naar achteren onder de stoel','Laat gecontroleerd terugkomen — houd spanning op je hamstrings'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Abductor (Selection)', 'Technogym Abductor (benen uit)', 'upper legs', 'abductors', ARRAY['gluteus medius','tensor fasciae latae'], 'machine', 'Technogym',
 ARRAY['Zit met je rug tegen de pad, benen tegen de beenpads','Duw je benen naar buiten tegen de weerstand','Houd even vast in de buitenste positie','Laat gecontroleerd terugkomen — niet volledig sluiten'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Adductor (Selection)', 'Technogym Adductor (benen in)', 'upper legs', 'adductors', ARRAY['gracilis','pectineus'], 'machine', 'Technogym',
 ARRAY['Zit met je rug tegen de pad, benen wijd tegen de pads','Druk je benen naar binnen tegen de weerstand','Knijp je binnenbenen samen in de middenstand','Laat gecontroleerd terugkomen naar de startpositie'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Rotary Calf (Selection)', 'Technogym Rotary Calf', 'lower legs', 'calves', ARRAY['soleus'], 'machine', 'Technogym',
 ARRAY['Stel de schouder-pads in op de juiste hoogte','Plaats je voorvoeten op het platform','Druk omhoog op je tenen tot volledige contractie','Laat je hielen gecontroleerd zakken voor een goede stretch'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Glute Machine (Selection)', 'Technogym Glute Machine', 'upper legs', 'glutes', ARRAY['hamstrings'], 'machine', 'Technogym',
 ARRAY['Sta met je borst tegen de pad, houd de handgrepen vast','Plaats één voet op het pedaal','Duw het pedaal naar achteren — focus op je bilspier','Laat gecontroleerd terugkomen en wissel van been'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM SELECTION LINE — CORE (Kern)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Lower Back (Selection)', 'Technogym Lower Back', 'back', 'erector spinae', ARRAY['glutes'], 'machine', 'Technogym',
 ARRAY['Zit met de pad tegen je bovenrug, voeten stevig op de steunen','Duw naar achteren met je rug — strek je volledig','Houd even vast in de uitgestrekte positie','Laat gecontroleerd terugkomen naar de startpositie'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Rotary Torso (Selection)', 'Technogym Rotary Torso', 'waist', 'obliques', ARRAY['transverse abdominis'], 'machine', 'Technogym',
 ARRAY['Zit stevig met je benen vastgezet','Houd de handgrepen voor je borst','Draai je bovenlichaam naar één kant tegen de weerstand','Laat gecontroleerd terugkomen en herhaal — wissel na de set'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Abdominal Crunch (Selection)', 'Technogym Abdominal Crunch', 'waist', 'rectus abdominis', ARRAY['obliques'], 'machine', 'Technogym',
 ARRAY['Zit met je voeten onder de rollen, houd de grepen vast','Buig naar voren met je buikspieren — niet met je armen trekken','Knijp je buikspieren samen onderaan de beweging','Laat gecontroleerd terugkomen naar rechtop'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM SELECTION LINE — MULTI-FUNCTIONAL
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Multipower / Smith Machine (Selection)', 'Technogym Multipower (Smith Machine)', 'chest', 'pectoralis major', ARRAY['triceps','anterior deltoid','quadriceps'], 'smith machine', 'Technogym',
 ARRAY['Verstelbare Smith Machine voor meerdere oefeningen','Stel de veiligheidsstops in op de juiste hoogte','Ontgrendel de stang door te draaien','Vergrendel na elke set door terug te draaien'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Cable Crossover (Selection)', 'Technogym Cable Crossover Station', 'chest', 'pectoralis major', ARRAY['anterior deltoid','core'], 'cable', 'Technogym',
 ARRAY['Dubbele kabel-station met verstelbare hoogte','Stel de kabels in op de gewenste hoogte','Stap naar voren voor stabiliteit en spanning','Gebruik voor crossovers, flies, rows, curls en meer'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Dual Adjustable Pulley (Selection)', 'Technogym Verstelbare Kabelzuil (DAP)', 'chest', 'pectoralis major', ARRAY['all muscles'], 'cable', 'Technogym',
 ARRAY['Twee onafhankelijke verstelbare kabels','Stel de hoogte in per kabel voor elke oefening','Ideaal voor unilaterale oefeningen en revalidatie','Gebruik met diverse grepen en handvatten'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Kinesis Station (Selection)', 'Technogym Kinesis Station', 'chest', 'pectoralis major', ARRAY['all muscles'], 'cable', 'Technogym',
 ARRAY['Multifunctioneel kabelstation met 360° bewegingsvrijheid','Kies je oefening en stel het gewicht in','De kabels bewegen mee in elke richting','Geschikt voor functionele training en revalidatie'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Assisted Chin Dip (Selection)', 'Technogym Assisted Chin/Dip', 'back', 'latissimus dorsi', ARRAY['biceps','triceps','pectoralis major'], 'machine', 'Technogym',
 ARRAY['Stel het tegengewicht in — meer gewicht = meer hulp','Kniel op het platform','Chin-up: pak de bovenste stang met onderhandse grip en trek omhoog','Dip: pak de dip-handgrepen en laat je zakken tot 90° in je ellebogen'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM ELEMENT+ LINE (Compact, vaak in kleinere Basic-Fits)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Chest Press (Element+)', 'Technogym Chest Press (Element+)', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps'], 'machine', 'Technogym',
 ARRAY['Compacte borstpress — stel de stoel in op borsthoogte','Pak de grepen vast en duw naar voren','Strek bijna volledig — houd spanning','Laat gecontroleerd terugkomen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Lat Pulldown (Element+)', 'Technogym Lat Pulldown (Element+)', 'back', 'latissimus dorsi', ARRAY['biceps','rhomboids'], 'machine', 'Technogym',
 ARRAY['Zit met knieën onder de pads','Pak de stang breed vast','Trek naar je bovenborst met ellebogen naar achteren','Laat gecontroleerd terugkomen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Low Row (Element+)', 'Technogym Low Row (Element+)', 'back', 'rhomboids', ARRAY['latissimus dorsi','biceps'], 'machine', 'Technogym',
 ARRAY['Zit met borst tegen de pad','Pak de grepen en trek naar je buik','Knijp schouderbladen samen','Laat gecontroleerd terugkomen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Shoulder Press (Element+)', 'Technogym Shoulder Press (Element+)', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid','triceps'], 'machine', 'Technogym',
 ARRAY['Stel de stoel in — grepen op schouderhoogte','Duw omhoog tot bijna gestrekt','Laat gecontroleerd zakken tot 90°','Houd je rug tegen de rugleuning'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Leg Press (Element+)', 'Technogym Leg Press (Element+)', 'upper legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'machine', 'Technogym',
 ARRAY['Zit stevig met rug tegen de pad','Voeten schouderbreedte op het platform','Duw weg tot bijna gestrekt — niet locken','Laat gecontroleerd terugkomen tot 90°'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Leg Extension (Element+)', 'Technogym Leg Extension (Element+)', 'upper legs', 'quadriceps', ARRAY['vastus medialis'], 'machine', 'Technogym',
 ARRAY['Stel de enkelpad in net boven je voeten','Strek je benen volledig','Knijp je quadriceps bovenaan','Laat gecontroleerd zakken'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Leg Curl (Element+)', 'Technogym Leg Curl (Element+)', 'upper legs', 'hamstrings', ARRAY['calves'], 'machine', 'Technogym',
 ARRAY['Zit of lig met enkelpad boven je hielen','Curl je onderbenen naar achteren','Focus op je hamstrings','Laat gecontroleerd terugkomen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Abductor/Adductor (Element+)', 'Technogym Abductor/Adductor (Element+)', 'upper legs', 'abductors', ARRAY['adductors','gluteus medius'], 'machine', 'Technogym',
 ARRAY['Dual-functie machine — schakel tussen abductie en adductie','Abductie: duw benen naar buiten','Adductie: druk benen naar binnen','Laat gecontroleerd terugkomen na elke rep'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Arm Curl (Element+)', 'Technogym Arm Curl (Element+)', 'upper arms', 'biceps', ARRAY['brachialis'], 'machine', 'Technogym',
 ARRAY['Stel de pad in zodat je bovenarm stevig rust','Curl omhoog tot volledige contractie','Knijp je biceps bovenaan','Laat gecontroleerd zakken'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Arm Extension (Element+)', 'Technogym Arm Extension (Element+)', 'upper arms', 'triceps', ARRAY['anconeus'], 'machine', 'Technogym',
 ARRAY['Ellebogen op de pad, pak de grepen','Strek je armen volledig','Knijp je triceps','Laat gecontroleerd terugkomen tot 90°'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM PURE STRENGTH LINE (Plate Loaded)
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Incline Chest Press (Pure Strength)', 'Technogym Schuine Borst Press (Plate Loaded)', 'chest', 'upper pectoralis', ARRAY['anterior deltoid','triceps'], 'plate loaded', 'Technogym',
 ARRAY['Laad de gewenste schijven op de machine','Stel de stoel in op de juiste hoogte','Duw schuin omhoog tot bijna gestrekt','Laat gecontroleerd zakken — dieper bereik dan selectorized'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Decline Chest Press (Pure Strength)', 'Technogym Afdalende Borst Press (Plate Loaded)', 'chest', 'lower pectoralis', ARRAY['anterior deltoid','triceps'], 'plate loaded', 'Technogym',
 ARRAY['Laad de schijven en stel de stoel in','Pak de grepen en duw schuin naar beneden','Focus op je onderborst','Laat gecontroleerd terugkomen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Seated Row (Pure Strength)', 'Technogym Roeien Zittend (Plate Loaded)', 'back', 'rhomboids', ARRAY['latissimus dorsi','biceps','rear deltoid'], 'plate loaded', 'Technogym',
 ARRAY['Laad schijven en zit met borst tegen de pad','Trek de grepen naar je buik','Knijp schouderbladen samen','Laat gecontroleerd terugkomen — geniet van het grotere bereik'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Lat Pulldown (Pure Strength)', 'Technogym Lat Pulldown (Plate Loaded)', 'back', 'latissimus dorsi', ARRAY['biceps','teres major'], 'plate loaded', 'Technogym',
 ARRAY['Laad schijven en zit met knieën onder de pads','Pak de brede stang met overhandse grip','Trek naar je bovenborst','Laat gecontroleerd terugkomen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Shoulder Press (Pure Strength)', 'Technogym Shoulder Press (Plate Loaded)', 'shoulders', 'anterior deltoid', ARRAY['lateral deltoid','triceps'], 'plate loaded', 'Technogym',
 ARRAY['Laad schijven en stel de stoel in','Duw omhoog tot bijna gestrekt','Laat gecontroleerd zakken tot schouderhoogte','Plate loaded geeft een vloeiendere beweging'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Leg Press 45° (Pure Strength)', 'Technogym Leg Press 45° (Plate Loaded)', 'upper legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'plate loaded', 'Technogym',
 ARRAY['Laad schijven op de 45-graden leg press','Plaats voeten schouderbreedte op het platform','Ontgrendel en laat het platform zakken tot 90°','Duw krachtig omhoog — niet je knieën locken'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Hack Squat (Pure Strength)', 'Technogym Hack Squat (Plate Loaded)', 'upper legs', 'quadriceps', ARRAY['glutes','hamstrings'], 'plate loaded', 'Technogym',
 ARRAY['Laad schijven en sta op het platform met rug tegen de pad','Schouders onder de schouderpads','Laat je zakken tot bovenbenen parallel zijn','Duw krachtig omhoog door je hielen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym T-Bar Row (Pure Strength)', 'Technogym T-Bar Row (Plate Loaded)', 'back', 'latissimus dorsi', ARRAY['rhomboids','biceps','rear deltoid'], 'plate loaded', 'Technogym',
 ARRAY['Laad schijven op de T-bar','Sta op het platform, borst tegen de pad','Trek naar je borst — knijp schouderbladen samen','Laat gecontroleerd zakken'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Calf Raise (Pure Strength)', 'Technogym Kuit Raise (Plate Loaded)', 'lower legs', 'calves', ARRAY['soleus'], 'plate loaded', 'Technogym',
 ARRAY['Laad schijven en sta met voorvoeten op het platform','Schouders onder de pads','Druk omhoog op je tenen — volledige contractie','Laat je hielen zakken voor maximale stretch'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM CARDIO — Excite & Artis Lines
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Treadmill (Excite Run)', 'Technogym Loopband', 'cardio', 'cardiovascular system', ARRAY['quadriceps','hamstrings','calves','glutes'], 'cardio machine', 'Technogym',
 ARRAY['Stap op de loopband en start op lage snelheid','Verhoog geleidelijk naar je gewenste tempo','Houd je goed vast als je de helling aanpast','Cool down met 5 minuten wandelen op het einde'],
 'cardio', false, true),

(gen_random_uuid(), 'Technogym Elliptical (Excite Synchro)', 'Technogym Crosstrainer / Synchro', 'cardio', 'cardiovascular system', ARRAY['quadriceps','glutes','hamstrings','core'], 'cardio machine', 'Technogym',
 ARRAY['Stap op de pedalen en pak de handgrepen vast','Begin te trappen in een vloeiende elliptische beweging','Gebruik de handgrepen actief voor een full-body workout','Varieer weerstand en helling voor intensiteit'],
 'cardio', false, true),

(gen_random_uuid(), 'Technogym Bike (Excite Bike)', 'Technogym Fiets', 'cardio', 'cardiovascular system', ARRAY['quadriceps','hamstrings','calves'], 'cardio machine', 'Technogym',
 ARRAY['Stel de zadelhoogte in — lichte kniebuiging onderaan','Stel het stuur in op een comfortabele hoogte','Begin te trappen en kies je weerstand','Houd een constant tempo aan — 70-90 rpm is ideaal'],
 'cardio', false, true),

(gen_random_uuid(), 'Technogym Recumbent Bike (Excite Recline)', 'Technogym Ligfiets', 'cardio', 'cardiovascular system', ARRAY['quadriceps','hamstrings'], 'cardio machine', 'Technogym',
 ARRAY['Stel de stoel in zodat je benen licht gebogen zijn in de verste positie','Leun comfortabel achterover','Trap op een constant tempo','Ideaal voor mensen met rugklachten'],
 'cardio', false, true),

(gen_random_uuid(), 'Technogym Stair Climber (Excite Climb)', 'Technogym Trappenklimmer', 'cardio', 'cardiovascular system', ARRAY['quadriceps','glutes','calves','hamstrings'], 'cardio machine', 'Technogym',
 ARRAY['Stap op de machine en houd de handgrepen licht vast','Begin langzaam te trappen','Houd je rug recht — niet te veel op de handgrepen leunen','Verhoog geleidelijk de snelheid'],
 'cardio', false, true),

(gen_random_uuid(), 'Technogym Vario (Excite Vario)', 'Technogym Vario', 'cardio', 'cardiovascular system', ARRAY['quadriceps','glutes','hamstrings','core'], 'cardio machine', 'Technogym',
 ARRAY['Verstelbare paslengte — van stepper tot elliptisch','Stap op en begin met een korte paslengte','Verleng je pas voor meer gluteus activatie','Combineer met armbeweging voor full-body training'],
 'cardio', false, true),

(gen_random_uuid(), 'Technogym Skillmill', 'Technogym Skillmill (Curved Loopband)', 'cardio', 'cardiovascular system', ARRAY['quadriceps','hamstrings','calves','glutes','core'], 'cardio machine', 'Technogym',
 ARRAY['Gebogen loopband aangedreven door je eigen kracht','Leun licht voorover en begin te wandelen/joggen','Hoe meer je naar voren leunt, hoe sneller je gaat','Gebruik de weerstandsknop voor sled-push simulatie'],
 'cardio', false, true),

(gen_random_uuid(), 'Technogym Skillrow', 'Technogym Skillrow (Roeimachine)', 'cardio', 'cardiovascular system', ARRAY['latissimus dorsi','rhomboids','biceps','quadriceps','core'], 'cardio machine', 'Technogym',
 ARRAY['Zit op de roeier, voeten vast in de steunen','Pak de handgreep met overhandse grip','Duw eerst met je benen, dan trek met je rug en armen','Laat gecontroleerd terugkomen — benen, rug, armen in omgekeerde volgorde'],
 'cardio', false, true),

(gen_random_uuid(), 'Technogym Skillbike', 'Technogym Skillbike', 'cardio', 'cardiovascular system', ARRAY['quadriceps','hamstrings','calves','glutes'], 'cardio machine', 'Technogym',
 ARRAY['Stel zadel en stuur in op de juiste hoogte','Kies je trainingsmodus — road, training of power','Multi-gear systeem simuleert echte fiets-versnellingen','Ideaal voor intervaltraining en vermogenstesten'],
 'cardio', false, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TECHNOGYM FUNCTIONAL / FREE WEIGHT STATIONS
-- =============================================
INSERT INTO exercises (id, name, name_nl, body_part, target_muscle, secondary_muscles, equipment, equipment_brand, instructions, category, is_custom, is_visible) VALUES
(gen_random_uuid(), 'Technogym Squat Rack (Pure Strength)', 'Technogym Squat Rack', 'upper legs', 'quadriceps', ARRAY['glutes','hamstrings','core','erector spinae'], 'barbell', 'Technogym',
 ARRAY['Stel de stang in op schouderhoogte in het rack','Stap onder de stang, rug recht','Stap achteruit en squat tot bovenbenen parallel','Duw krachtig omhoog door je hielen'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Half Rack (Pure Strength)', 'Technogym Half Rack', 'upper legs', 'quadriceps', ARRAY['glutes','hamstrings','core'], 'barbell', 'Technogym',
 ARRAY['Veelzijdig rack voor squats, presses, rows en meer','Stel de veiligheidsstangen in op de juiste hoogte','Gebruik de J-hooks voor stangopslag','Inclusief pull-up bar bovenaan'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Adjustable Bench (Pure Strength)', 'Technogym Verstelbare Bank', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps'], 'bench', 'Technogym',
 ARRAY['Verstelbaar van vlak tot 90 graden','Combineer met dumbbells of in het squat rack','Stel de hoek in voor incline, flat of decline','Stevig en stabiel voor zware belasting'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Olympic Bench Press (Pure Strength)', 'Technogym Olympic Bankdrukstation', 'chest', 'pectoralis major', ARRAY['anterior deltoid','triceps'], 'barbell', 'Technogym',
 ARRAY['Vast bankdrukstation met stanghouders','Lig op de bank met je ogen onder de stang','Pak de stang op schouderbreedte','Laat zakken naar je borst en duw krachtig omhoog'],
 'strength', false, true),

(gen_random_uuid(), 'Technogym Dumbbell Rack', 'Technogym Dumbbell Rack', 'upper arms', 'biceps', ARRAY['all muscles'], 'dumbbell', 'Technogym',
 ARRAY['Dumbbells beschikbaar van 1 kg tot 50+ kg','Kies het gewicht passend bij je oefening','Zet dumbbells altijd terug op de juiste plek','Urethaan coating voor duurzaamheid en geluidsdemping'],
 'strength', false, true)
ON CONFLICT DO NOTHING;

-- Done! Total: ~55 Technogym-specifieke machine entries
-- covering Selection, Element+, Pure Strength, Excite/Artis cardio, and functional stations.
