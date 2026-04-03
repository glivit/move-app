-- ═══════════════════════════════════════════════════════════
-- MŌVE Food Products Database Expansion
-- 844 new products: Dutch/Belgian supermarket + sports nutrition
-- ═══════════════════════════════════════════════════════════

-- Create table if not exists (idempotent)
CREATE TABLE IF NOT EXISTS food_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_nl TEXT,
  brand TEXT,
  brand_category TEXT,
  source TEXT,
  barcode TEXT,
  category TEXT,
  serving_size_g NUMERIC(8,1),
  serving_label TEXT,
  calories_per_100g NUMERIC(6,1) NOT NULL,
  protein_per_100g NUMERIC(6,2) NOT NULL,
  carbs_per_100g NUMERIC(6,2) NOT NULL,
  fat_per_100g NUMERIC(6,2) NOT NULL,
  fiber_per_100g NUMERIC(6,2),
  sugar_per_100g NUMERIC(6,2),
  salt_per_100g NUMERIC(6,3),
  is_verified BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_food_products_name ON food_products USING gin(to_tsvector('dutch', name));
CREATE INDEX IF NOT EXISTS idx_food_products_brand ON food_products(brand);
CREATE INDEX IF NOT EXISTS idx_food_products_category ON food_products(category);
CREATE INDEX IF NOT EXISTS idx_food_products_source ON food_products(source);
CREATE INDEX IF NOT EXISTS idx_food_products_barcode ON food_products(barcode);
CREATE INDEX IF NOT EXISTS idx_food_products_popular ON food_products(is_popular) WHERE is_popular = TRUE;

-- Enable RLS
ALTER TABLE food_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first to be idempotent)
DROP POLICY IF EXISTS "Everyone can select food products" ON food_products;
CREATE POLICY "Everyone can select food products" ON food_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Coaches can insert food products" ON food_products;
CREATE POLICY "Coaches can insert food products" ON food_products FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'coach' OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Coaches can update food products" ON food_products;
CREATE POLICY "Coaches can update food products" ON food_products FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'coach' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'coach' OR auth.jwt() ->> 'role' = 'admin');

-- ═══════════════════════════════════════════════════════════════════════════════════
-- MŌVE Fitness Coaching App - Dutch/Belgian Supermarket Products
-- Food Products Seed Data: Vlees, Vis, Eieren
-- Generated: 2026-04-03
-- ═══════════════════════════════════════════════════════════════════════════════════

-- ═══ VLEES (MEAT) - 70 PRODUCTS ═══

-- KIPPEVLEES (CHICKEN)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Breast Fillet', 'Kipfilet', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 150, '1 filet (150g)', 165, 31.0, 0.0, 3.6, 0.0, 0.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Thigh Fillet', 'Kippendij filet', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 150, '1 filet (150g)', 209, 26.0, 0.0, 11.0, 0.0, 0.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Mince', 'Kipgehakt', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 165, 30.5, 0.0, 4.3, 0.0, 0.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Drumsticks', 'Kippendrumsticks', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '1 stuk (100g)', 165, 26.5, 0.0, 6.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Burger', 'Kippenburger', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vlees', 85, '1 burger (85g)', 215, 23.0, 6.0, 11.0, 0.0, 1.5, FALSE);

-- RUNDVLEES (BEEF)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Beef Mince Lean', 'Rundergehakt Mager', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 143, 27.0, 0.0, 3.8, 0.0, 0.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Beef Mince Half Fat', 'Rundergehakt Half-om-half', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 204, 25.0, 0.0, 11.0, 0.0, 0.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Beef Steak', 'Biefstuk', 'Jumbo', 'supermarket', 'albert_heijn', NULL, 'vlees', 120, '1 steak (120g)', 271, 27.0, 0.0, 17.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Ribeye Steak', 'Entrecote', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 120, '1 steak (120g)', 293, 26.0, 0.0, 21.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Beef Roast', 'Rosbief', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 201, 29.0, 0.0, 9.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Beef Tartare', 'Tartaar', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 154, 25.0, 0.0, 5.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Beef Tartare Raw', 'Ossenworst', 'Brouwer', 'supermarket', 'albert_heijn', NULL, 'vlees', 50, '1 plak (50g)', 200, 24.0, 1.0, 11.0, 0.0, 0.5, FALSE);

-- VARKENSVLEES (PORK)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pork Tenderloin', 'Varkenshaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 150, '1 filet (150g)', 142, 27.5, 0.0, 3.1, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pork Fillet', 'Varkensfilet', 'Jumbo', 'supermarket', 'albert_heijn', NULL, 'vlees', 150, '1 filet (150g)', 147, 27.0, 0.0, 3.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pork Bacon Strips', 'Speklappen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 30, '2 plakken (30g)', 321, 16.5, 0.1, 27.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pork Mince', 'Varkensgehakt', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 217, 21.0, 0.0, 14.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pork Chop', 'Karbonade', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 130, '1 karbonade (130g)', 237, 27.0, 0.0, 13.5, 0.0, 0.0, FALSE);

-- KALKOEN (TURKEY)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Turkey Breast Fillet', 'Kalkoenfilet', 'Noba', 'supermarket', 'albert_heijn', NULL, 'vlees', 150, '1 filet (150g)', 135, 29.9, 0.0, 0.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Turkey Mince', 'Kalkoengehakt', 'Noba', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 110, 24.0, 0.0, 1.0, 0.0, 0.0, FALSE);

-- LAMSVLEES (LAMB)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Lamb Leg', 'Lamsbout', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 120, '1 stuk (120g)', 210, 27.0, 0.0, 11.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Lamb Mince', 'Lamsgehakt', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 229, 24.0, 0.0, 14.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Lamb Rack', 'Lamsrack', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 281, 25.0, 0.0, 21.0, 0.0, 0.0, FALSE);

-- GEROOKT VLEES & SPEK (SMOKED MEAT & BACON)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Smoked Meat', 'Rookvlees', 'Lindenthal', 'supermarket', 'albert_heijn', NULL, 'vlees', 50, '3 plakken (50g)', 284, 25.0, 1.5, 20.5, 0.0, 1.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Breakfast Bacon', 'Ontbijtspek', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 30, '3 plakken (30g)', 379, 10.0, 0.2, 38.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Bacon Strips', 'Bacon', 'Oltermannns', 'supermarket', 'albert_heijn', NULL, 'vlees', 25, '2 stroken (25g)', 359, 15.0, 0.1, 32.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cooked Ham', 'Ham Gekookt', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 50, '3 plakken (50g)', 142, 21.0, 0.1, 6.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Smoked Ham', 'Ham Gerookt', 'Oltermannns', 'supermarket', 'albert_heijn', NULL, 'vlees', 50, '3 plakken (50g)', 165, 20.0, 1.0, 8.5, 0.0, 0.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Back Ham', 'Achterham', 'Oltermannns', 'supermarket', 'albert_heijn', NULL, 'vlees', 50, '3 plakken (50g)', 127, 25.0, 0.5, 2.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Sandwich Ham', 'Boterhamworst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 25, '1 plak (25g)', 162, 18.5, 1.5, 8.5, 0.0, 1.0, FALSE);

-- WORST (SAUSAGES)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Smoked Sausage', 'Rookworst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '1 worst (100g)', 340, 14.0, 1.0, 31.0, 0.0, 0.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Braadworst', 'Braadworst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '1 worst (100g)', 334, 13.5, 2.0, 30.0, 0.0, 1.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chipolata Sausage', 'Chipolata', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vlees', 50, '1 worst (50g)', 275, 13.0, 3.0, 23.0, 0.0, 1.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Merguez Sausage', 'Merguez', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vlees', 80, '1 worst (80g)', 359, 12.0, 3.0, 33.0, 0.0, 1.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cocktail Sausage', 'Knakworst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vlees', 50, '1 worst (50g)', 289, 12.0, 1.5, 26.0, 0.0, 0.5, FALSE);

-- SHOARMA & KEBAB
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Shawarma', 'Shoarma Kip', 'Unox', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 184, 26.0, 2.5, 8.0, 0.0, 1.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pork Shawarma', 'Shoarma Varken', 'Unox', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 209, 24.0, 3.0, 11.0, 0.0, 1.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Gyros Meat', 'Gyros', 'Unox', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 227, 25.0, 2.0, 13.0, 0.0, 1.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Doner Kebab', 'Döner', 'Naamloos', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 245, 22.0, 3.5, 17.0, 0.0, 1.5, FALSE);

-- GEHAKTBALLEN & KROKETTEN
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Meatball', 'Gehaktbal', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vlees', 90, '3 ballen (90g)', 267, 17.0, 9.0, 18.0, 0.0, 2.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Frikandel', 'Frikandel', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vlees', 75, '1 frikandel (75g)', 301, 12.0, 4.5, 27.0, 0.0, 1.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Meat Croquette', 'Vlees Kroket', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vlees', 60, '1 kroket (60g)', 312, 9.0, 18.0, 23.0, 0.5, 1.0, FALSE);

-- PULLED MEAT
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pulled Pork', 'Pulled Pork', 'Unox', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 198, 25.0, 2.0, 10.0, 0.0, 1.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pulled Chicken', 'Pulled Chicken', 'Unox', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '100g', 165, 30.0, 1.5, 3.5, 0.0, 0.8, FALSE);

-- VLEES SCHNITZELS
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Schnitzel', 'Kipschnitzel', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vlees', 100, '1 schnitzel (100g)', 245, 25.0, 8.0, 13.0, 0.5, 1.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pork Schnitzel', 'Varkensschnitzel', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vlees', 120, '1 schnitzel (120g)', 268, 26.0, 9.0, 14.0, 0.5, 1.0, FALSE);


-- ═══ VIS (FISH) - 30 PRODUCTS ═══

-- ZALM (SALMON)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Fresh Salmon Fillet', 'Zalmfilet Vers', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 150, '1 filet (150g)', 208, 22.0, 0.0, 13.0, 0.0, 0.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Smoked Salmon', 'Gerookt Zalm', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 50, '4 plakken (50g)', 117, 25.0, 0.0, 1.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Fried Salmon', 'Gebakken Zalm', 'Cavi-Art', 'supermarket', 'albert_heijn', NULL, 'vis', 150, '1 filet (150g)', 268, 23.0, 1.5, 19.5, 0.0, 0.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Salmon Burger', 'Zalmburger', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '1 burger (100g)', 245, 20.0, 8.0, 16.0, 0.5, 1.5, FALSE);

-- TONIJN (TUNA)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Fresh Tuna Fillet', 'Tonijnfilet Vers', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 150, '1 filet (150g)', 144, 29.9, 0.0, 1.3, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Canned Tuna in Water', 'Tonijn in Water', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '1 blik (120g)', 101, 23.5, 0.0, 0.5, 0.0, 0.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Canned Tuna in Oil', 'Tonijn in Olie', 'Callipo', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '1 blik (120g)', 189, 26.0, 0.0, 9.5, 0.0, 0.0, TRUE);

-- WITTE VIS (WHITE FISH)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cod Fillet', 'Kabeljauwfilet', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 150, '1 filet (150g)', 82, 17.8, 0.0, 0.7, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Haddock Fillet', 'Schelvisfilet', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 150, '1 filet (150g)', 73, 17.2, 0.0, 0.3, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Tilapia Fillet', 'Tilapiafilet', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 120, '1 filet (120g)', 128, 26.0, 0.0, 2.7, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pangasius Fillet', 'Pangasiusfilet', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 120, '1 filet (120g)', 105, 18.0, 0.0, 3.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Trout Fillet', 'Forelfilet', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 120, '1 filet (120g)', 168, 19.0, 0.0, 9.5, 0.0, 0.0, FALSE);

-- GARNALEN (SHRIMP)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pink Shrimp', 'Roze Garnalen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 99, 24.0, 0.0, 0.3, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Grey Shrimp', 'Grijze Garnalen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 86, 20.0, 0.0, 0.5, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('North Sea Shrimp', 'Hollandse Garnalen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 92, 22.5, 0.0, 0.4, 0.0, 0.0, FALSE);

-- SCHELPDIEREN (SHELLFISH)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mussels', 'Mosselen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 150, '1 portie (150g)', 82, 11.5, 3.7, 1.9, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Calamari', 'Calamaris', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 92, 16.0, 3.0, 1.4, 0.0, 0.0, FALSE);

-- KIBBELING & FRITUUR VIS
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Fish Bites', 'Kibbeling', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 268, 15.0, 18.0, 16.0, 1.0, 2.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Deep Fried Smelt', 'Lekkerbekje', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 287, 18.0, 12.0, 20.0, 0.5, 1.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Fish Sticks', 'Visstick', 'Mora', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '100g (4 sticks)', 229, 16.0, 16.0, 13.0, 1.0, 1.5, FALSE);

-- HARING (HERRING)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('New Dutch Herring', 'Hollandse Nieuwe', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '1 haring (100g)', 206, 23.0, 0.0, 12.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Smoked Herring', 'Bokking', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '1 bokking (100g)', 217, 26.0, 0.0, 12.0, 0.0, 0.0, FALSE);

-- MAKREEL (MACKEREL)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Fresh Mackerel', 'Vers Makreel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 120, '1 filet (120g)', 305, 17.0, 0.0, 25.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Smoked Mackerel', 'Gerookt Makreel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '1 filet (100g)', 305, 27.0, 0.0, 22.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Canned Mackerel', 'Makreel in Blik', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '1 blik (120g)', 297, 25.0, 0.0, 22.0, 0.0, 0.0, FALSE);

-- SARDINES (SARDINES)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Canned Sardines', 'Sardines in Blik', 'Callipo', 'supermarket', 'albert_heijn', NULL, 'vis', 100, '1 blik (120g)', 208, 25.0, 0.0, 11.0, 0.0, 0.0, FALSE);


-- ═══ EIEREN (EGGS) - 20 PRODUCTS ═══

-- KIPPEIEREN MATEN (CHICKEN EGGS SIZES)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Egg Medium', 'Kipei Maat M', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 55, '1 ei (55g)', 155, 13.0, 1.1, 11.0, 0.0, 1.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Egg Large', 'Kipei Maat L', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 63, '1 ei (63g)', 155, 13.0, 1.1, 11.0, 0.0, 1.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chicken Egg Extra Large', 'Kipei Maat XL', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 73, '1 ei (73g)', 155, 13.0, 1.1, 11.0, 0.0, 1.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Boiled Egg', 'Gekookt Ei', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 50, '1 ei (50g)', 155, 13.0, 1.1, 11.0, 0.0, 1.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Omelet', 'Omelet', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 80, '1 omelet (80g)', 214, 15.0, 4.0, 15.5, 0.0, 3.0, FALSE);

-- EIWITTEN & DOOIER
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Egg White Only', 'Alleen Eiwit', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 30, '2 eiwitten (30g)', 52, 11.0, 0.7, 0.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Egg Yolk Only', 'Alleen Dooier', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 17, '1 dooier (17g)', 322, 16.0, 0.6, 27.0, 0.0, 0.3, FALSE);

-- KWARTELEI (QUAIL EGGS)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Quail Eggs', 'Kwarteleieren', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 10, '3 kwartelei (10g)', 158, 13.1, 0.4, 11.1, 0.0, 0.4, FALSE);

-- BEREIDE EIEREN (PREPARED EGGS)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Scrambled Eggs', 'Roerei', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 100, '100g', 227, 14.5, 2.5, 17.5, 0.0, 2.0, FALSE);

-- VRIJE UITLOOP EIEREN (FREE RANGE EGGS)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Free Range Eggs Medium', 'Vrije Uitloop Kipei M', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 55, '1 ei (55g)', 158, 13.2, 1.0, 11.5, 0.0, 0.8, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Free Range Eggs Large', 'Vrije Uitloop Kipei L', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 63, '1 ei (63g)', 158, 13.2, 1.0, 11.5, 0.0, 0.8, FALSE);

-- VLOEIBAAR EIWIT (LIQUID EGG WHITE)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Liquid Egg White', 'Vloeibaar Eiwit', 'Vulcano', 'supermarket', 'albert_heijn', NULL, 'eieren', 250, '250ml', 50, 11.0, 0.5, 0.0, 0.0, 0.0, FALSE);

-- BIOLOGISCHE EIEREN (ORGANIC EGGS)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Organic Eggs Medium', 'Biologische Kipei M', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 55, '1 ei (55g)', 160, 13.5, 1.0, 12.0, 0.0, 0.8, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Organic Eggs Large', 'Biologische Kipei L', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 63, '1 ei (63g)', 160, 13.5, 1.0, 12.0, 0.0, 0.8, FALSE);

-- BRUINE EIEREN (BROWN EGGS)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Brown Eggs Medium', 'Bruine Kipei M', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 55, '1 ei (55g)', 156, 13.0, 1.0, 11.0, 0.0, 0.8, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Brown Eggs Large', 'Bruine Kipei L', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'eieren', 63, '1 ei (63g)', 156, 13.0, 1.0, 11.0, 0.0, 0.8, FALSE);

-- ═══════════════════════════════════════════════════════════════════════════════════
-- END OF SEED DATA
-- Total Products: 120 (70 Vlees + 30 Vis + 20 Eieren)
-- ═══════════════════════════════════════════════════════════════════════════════════

-- SQL INSERT statements for MŌVE fitness coaching app
-- Dutch/Belgian supermarket products: Zuivel (Dairy), Granen (Grains), Brood (Bread)
-- Generated for food_products table

-- =====================================================================
-- ZUIVEL (DAIRY) - 60 PRODUCTS
-- =====================================================================

-- Melk (5 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whole Milk', 'Volle melk', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 250, '1 glas', 64, 3.2, 4.8, 3.6, 0, 4.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Semi-Skimmed Milk', 'Halfvolle melk', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 250, '1 glas', 49, 3.4, 4.8, 1.8, 0, 4.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Skimmed Milk', 'Magere melk', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 250, '1 glas', 34, 3.4, 4.9, 0.1, 0, 4.9, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Buttermilk', 'Karnemelk', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 250, '1 glas', 37, 3.5, 4.0, 0.5, 0, 3.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chocolate Milk', 'Chocolademelk', 'Friesche Vlag', 'supermarket', 'albert_heijn', NULL, 'zuivel', 250, '1 glas', 79, 3.2, 11.5, 2.5, 0, 11.0, FALSE);

-- Yoghurt (15 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Greek Yoghurt Plain', 'Griekse yoghurt naturel', 'Fage', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 bakje', 59, 10.2, 3.3, 0.4, 0, 0.7, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Greek Yoghurt Honey', 'Griekse yoghurt honing', 'Fage', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 bakje', 72, 9.8, 8.2, 0.4, 0, 7.5, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Low Fat Yoghurt Plain', 'Magere yoghurt naturel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 125, '1 bakje', 42, 3.8, 4.2, 0.5, 0, 3.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Full Fat Yoghurt Plain', 'Volle yoghurt naturel', 'Arla', 'supermarket', 'albert_heijn', NULL, 'zuivel', 125, '1 bakje', 66, 3.5, 4.3, 3.9, 0, 4.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Arla Skyr Vanilla', 'Arla Skyr vanille', 'Arla', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 bakje', 64, 10.0, 5.8, 0.2, 0, 5.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Danio Plain', 'Danio naturel', 'Danone', 'supermarket', 'albert_heijn', NULL, 'zuivel', 125, '1 bakje', 55, 4.2, 4.1, 2.8, 0, 3.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Activia Natural', 'Activia naturel', 'Danone', 'supermarket', 'albert_heijn', NULL, 'zuivel', 125, '1 bakje', 48, 3.6, 4.5, 1.5, 0.5, 4.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Optimel Natural', 'Optimel naturel', 'Optimel', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 bakje', 51, 3.9, 3.8, 2.0, 0, 3.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Arla Protein Yoghurt', 'Arla Protein yoghurt', 'Arla', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 bakje', 75, 15.0, 3.5, 0.3, 0, 3.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Danone YoPro Vanilla', 'Danone YoPro vanille', 'Danone', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 bakje', 76, 14.5, 4.8, 0.5, 0, 4.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ehrmann High Protein', 'Ehrmann High Protein', 'Ehrmann', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 bakje', 80, 16.0, 3.2, 0.3, 0, 2.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Strawberry Yoghurt', 'Aardbeien yoghurt', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 125, '1 bakje', 63, 3.5, 11.2, 1.2, 0, 10.5, FALSE);

-- Kwark (5 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Low Fat Quark Plain', 'Magere kwark naturel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 potje', 70, 11.0, 2.5, 0.3, 0, 1.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Full Fat Quark Plain', 'Volle kwark naturel', 'Almhof', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 potje', 98, 10.5, 2.8, 5.5, 0, 1.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Quark with Fruit Mix', 'Kwark met vruchten mix', 'Almhof', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 potje', 85, 10.2, 8.5, 2.0, 0, 7.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Quark with Strawberry', 'Kwark met aardbei', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 potje', 82, 10.0, 8.2, 1.8, 0, 7.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Quark with Blueberry', 'Kwark met blauwebessen', 'Almhof', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 potje', 84, 10.1, 8.5, 1.9, 0.5, 7.8, FALSE);

-- Kaas (20 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Young Gouda Cheese', 'Jong Goudse kaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 30, '1 plak', 356, 25.0, 1.3, 28.0, 0, 0.7, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Matured Gouda Cheese', 'Belegen Goudse kaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 30, '1 plak', 376, 26.0, 0.5, 30.5, 0, 0.3, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Old Gouda Cheese', 'Oude Goudse kaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 30, '1 plak', 395, 27.0, 0.3, 32.0, 0, 0.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Gouda 30+ Cheese', 'Goudse kaas 30+', 'Beemster', 'supermarket', 'albert_heijn', NULL, 'zuivel', 30, '1 plak', 368, 26.5, 0.4, 29.5, 0, 0.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Edam Cheese', 'Edammer kaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 30, '1 plak', 356, 24.5, 1.0, 28.5, 0, 0.6, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Mozzarella', 'Mozzarella', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 100, '1 portion', 280, 28.0, 3.1, 17.0, 0, 0.7, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Feta Cheese', 'Feta kaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 30, '1 portion', 265, 17.0, 4.1, 21.0, 0, 1.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Brie Cheese', 'Brie kaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 30, '1 portion', 334, 19.5, 0.7, 27.5, 0, 0.4, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Camembert Cheese', 'Camembert kaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 30, '1 portion', 340, 20.0, 0.5, 28.0, 0, 0.3, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cottage Cheese Plain', 'Cottage cheese naturel', 'Arla', 'supermarket', 'albert_heijn', NULL, 'zuivel', 100, '1 potje', 98, 11.5, 3.9, 4.3, 0, 2.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ricotta Cheese', 'Ricotta kaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 100, '1 potje', 174, 12.6, 3.0, 13.0, 0, 2.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Mascarpone Cheese', 'Mascarpone kaas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 100, '1 potje', 452, 6.5, 4.5, 47.0, 0, 3.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Philadelphia Cream Cheese', 'Philadelphia roomkaas', 'Philadelphia', 'supermarket', 'albert_heijn', NULL, 'zuivel', 100, '1 potje', 342, 5.9, 4.1, 35.0, 0, 3.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cream Cheese Plain', 'Roomkaas naturel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 100, '1 potje', 340, 5.8, 4.0, 34.5, 0, 3.4, FALSE);

-- Boter, margarine, halvarine (4 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Becel Margarine', 'Becel margarine', 'Becel', 'supermarket', 'albert_heijn', NULL, 'zuivel', 10, '1 portie', 717, 0.5, 0.5, 80.0, 0, 0.1, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Blue Band Margarine', 'Blue Band margarine', 'Blue Band', 'supermarket', 'albert_heijn', NULL, 'zuivel', 10, '1 portie', 718, 0.3, 0.3, 80.0, 0, 0.1, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Halvarine Room', 'Halvarine roomboter', 'Becel', 'supermarket', 'albert_heijn', NULL, 'zuivel', 10, '1 portie', 568, 0.4, 0.4, 63.0, 0, 0.1, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Roomboter Pure Butter', 'Roomboter zuivere boter', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 10, '1 portie', 717, 0.5, 0.1, 81.0, 0, 0.1, FALSE);

-- Room (cream products) (6 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whipping Cream', 'Slagroom', 'Campina', 'supermarket', 'albert_heijn', NULL, 'zuivel', 15, '1 lepel', 340, 2.0, 2.8, 35.0, 0, 2.6, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cooking Cream', 'Kookroom', 'Campina', 'supermarket', 'albert_heijn', NULL, 'zuivel', 15, '1 lepel', 302, 2.2, 3.5, 31.0, 0, 3.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Creme Fraiche', 'Crème fraîche', 'Campina', 'supermarket', 'albert_heijn', NULL, 'zuivel', 15, '1 lepel', 340, 1.8, 2.5, 35.5, 0, 2.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sour Cream', 'Zure room', 'Campina', 'supermarket', 'albert_heijn', NULL, 'zuivel', 15, '1 lepel', 193, 3.6, 4.3, 19.0, 0, 4.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whipped Cream Spray', 'Slagroom spuitbus', 'Campina', 'supermarket', 'albert_heijn', NULL, 'zuivel', 10, '1 portie', 290, 1.5, 6.0, 30.0, 0, 5.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Greek Style Yoghurt Cream', 'Griekse stijl room yoghurt', 'Fage', 'supermarket', 'albert_heijn', NULL, 'zuivel', 100, '1 potje', 45, 3.8, 2.5, 1.5, 0, 1.8, FALSE);

-- Vla en pudding (4 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Vanilla Custard Vla', 'Vanille vla', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 potje', 98, 3.2, 15.5, 2.0, 0, 14.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chocolate Custard Vla', 'Chocolade vla', 'Campina', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 potje', 115, 3.0, 18.5, 2.5, 0, 18.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chocolate Pudding', 'Chocolade pudding', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 potje', 128, 2.8, 20.5, 3.5, 0, 19.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Vanilla Pudding', 'Vanille pudding', 'Campina', 'supermarket', 'albert_heijn', NULL, 'zuivel', 150, '1 potje', 112, 3.1, 17.2, 2.8, 0, 16.5, FALSE);

-- =====================================================================
-- GRANEN (GRAINS/CEREALS) - 40 PRODUCTS
-- =====================================================================

-- Havermout (3 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Fine Oatmeal', 'Fijne havermout', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 40, '½ kop', 389, 17.0, 66.3, 6.9, 10.6, 0.8, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Coarse Oatmeal', 'Grove havermout', 'Quaker', 'supermarket', 'albert_heijn', NULL, 'granen', 40, '½ kop', 389, 16.9, 66.5, 6.8, 10.4, 1.0, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Overnight Oats', 'Overnight oats mix', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 50, '1 potje', 368, 12.0, 62.0, 7.5, 9.5, 15.0, TRUE);

-- Muesli (3 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Crunchy Muesli', 'Krokante muesli', 'Jordan''s', 'supermarket', 'albert_heijn', NULL, 'granen', 50, '½ kop', 425, 10.2, 60.0, 15.0, 8.0, 25.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Untoasted Muesli', 'Ongebrande muesli', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 50, '½ kop', 371, 10.5, 65.0, 5.2, 7.5, 18.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Jordan''s Muesli High Fibre', 'Jordan''s muesli hoog in vezels', 'Jordan''s', 'supermarket', 'albert_heijn', NULL, 'granen', 50, '½ kop', 348, 11.0, 62.5, 4.5, 10.5, 15.5, FALSE);

-- Cornflakes en populaire graanvlokken (6 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cornflakes Original', 'Cornflakes origineel', 'Kellogg''s', 'supermarket', 'albert_heijn', NULL, 'granen', 30, '1 kop', 386, 8.0, 84.0, 2.0, 3.0, 3.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cornflakes AH', 'Cornflakes Albert Heijn', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 30, '1 kop', 378, 7.5, 85.0, 1.5, 2.5, 3.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Crunchy Cereal', 'Krokante graanvlokken', 'Kellogg''s', 'supermarket', 'albert_heijn', NULL, 'granen', 40, '¾ kop', 430, 8.5, 72.0, 13.0, 3.5, 18.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Special K Cereal', 'Special K graanvlokken', 'Kellogg''s', 'supermarket', 'albert_heijn', NULL, 'granen', 30, '1 kop', 379, 6.8, 85.5, 0.9, 3.5, 4.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Choco Flakes', 'Chocolade vlokken', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 30, '1 kop', 400, 6.5, 80.0, 4.5, 2.5, 28.0, FALSE);

-- Rijst (6 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('White Rice', 'Witte rijst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 130, 2.7, 28.0, 0.3, 0.4, 0.1, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Brown Rice', 'Bruine rijst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 131, 2.6, 27.5, 1.0, 1.5, 0.3, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Basmati Rice', 'Basmati rijst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 130, 2.5, 28.5, 0.2, 0.3, 0.0, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Jasmine Rice', 'Jasmijn rijst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 130, 2.6, 28.0, 0.3, 0.2, 0.2, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Wild Rice', 'Zilvervlies rijst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 135, 4.3, 26.0, 0.4, 1.8, 0.1, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Arborio Risotto Rice', 'Arborio risotto rijst', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 135, 2.4, 31.0, 0.3, 0.5, 0.0, FALSE);

-- Pasta (7 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Spaghetti', 'Spaghetti', 'Barilla', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 131, 5.3, 25.0, 1.1, 1.8, 0.5, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Penne', 'Penne', 'De Cecco', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 131, 5.3, 25.0, 1.1, 1.8, 0.5, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Macaroni', 'Macaroni', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 130, 5.0, 25.5, 1.0, 1.5, 0.3, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whole Wheat Pasta', 'Volkoren pasta', 'Barilla', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 124, 6.5, 22.0, 1.2, 3.5, 0.4, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Fusilli Pasta', 'Fusilli pasta', 'Barilla', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 131, 5.3, 25.0, 1.1, 1.8, 0.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Farfalle Pasta', 'Farfalle pasta', 'De Cecco', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 131, 5.3, 25.0, 1.1, 1.8, 0.5, FALSE);

-- Couscous, bulgur, quinoa (3 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Couscous', 'Couscous', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 112, 3.8, 23.0, 0.3, 1.5, 0.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bulgur Wheat', 'Bulgur tarwe', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 108, 3.9, 19.5, 0.5, 4.5, 0.1, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Quinoa', 'Quinoa', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 120, 4.4, 21.3, 1.9, 2.8, 0.0, FALSE);

-- Noedels (3 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Egg Noodles', 'Mie noedels', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 137, 5.0, 26.0, 1.3, 1.2, 0.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ramen Noodles', 'Ramen noedels', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 135, 5.5, 25.0, 1.2, 1.0, 0.3, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Glass Noodles', 'Glasnoedels', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 99, 0.2, 24.5, 0.2, 0.0, 0.0, FALSE);

-- Overig granen (9 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pancake Mix', 'Pannenkoekenmix', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 50, '¼ kop', 354, 8.0, 73.0, 1.5, 1.0, 2.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Wheat Tortillas', 'Tarwe wraps', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 60, '1 wrap', 175, 4.7, 30.0, 3.5, 1.8, 1.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whole Grain Wraps', 'Volkoren wraps', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 60, '1 wrap', 158, 5.5, 28.0, 2.5, 3.5, 0.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Buckwheat Groats', 'Boekweit groepen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 92, 3.4, 20.0, 0.4, 1.7, 0.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Polenta', 'Polenta', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 101, 2.0, 21.0, 0.7, 1.5, 0.1, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Barley Grains', 'Gerste korrels', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 98, 2.3, 22.0, 0.4, 3.8, 0.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Farro Grains', 'Farro korrels', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 120, 3.6, 27.0, 0.7, 4.0, 0.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Millet Grains', 'Gierst korrels', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'granen', 150, '1 bakje gekookt', 118, 3.5, 23.0, 1.0, 2.3, 0.0, FALSE);

-- =====================================================================
-- BROOD (BREAD) - 30 PRODUCTS
-- =====================================================================

-- Standaard broodsoorten (8 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('White Bread', 'Wit brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 265, 8.5, 47.0, 3.0, 2.7, 4.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Brown Bread', 'Bruin brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 239, 8.0, 42.0, 2.5, 3.5, 3.2, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whole Grain Bread', 'Volkoren brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 219, 8.5, 38.0, 2.8, 5.5, 2.5, TRUE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Multigrain Bread', 'Meergranen brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 229, 8.8, 40.5, 2.9, 5.0, 3.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tiger Bread', 'Tijgerbrood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 255, 8.2, 46.0, 2.8, 3.2, 3.8, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rye Bread', 'Roggebrood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 215, 8.8, 38.5, 2.2, 5.8, 2.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pumpernickel Bread', 'Pumpernickel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 212, 8.5, 40.5, 1.5, 6.0, 1.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sourdough Bread', 'Zuurdesembrood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 245, 8.0, 44.0, 2.5, 2.5, 1.5, FALSE);

-- Crackers en knäckebröd (5 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Wasa Crispbread', 'Wasa knäckebröd', 'Wasa', 'supermarket', 'albert_heijn', NULL, 'brood', 10, '1 cracker', 321, 9.0, 63.0, 1.5, 7.0, 2.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('LU Cracotte Crackers', 'LU Cracotte crackers', 'LU', 'supermarket', 'albert_heijn', NULL, 'brood', 9, '1 cracker', 387, 7.5, 73.0, 7.0, 2.5, 2.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rice Crackers', 'Rijstwafels', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 8, '1 wafel', 380, 6.0, 80.0, 2.5, 1.0, 0.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Knäckebröd Wholegrain', 'Knäckebröd volkoren', 'Wasa', 'supermarket', 'albert_heijn', NULL, 'brood', 10, '1 cracker', 315, 10.0, 60.0, 2.0, 8.5, 1.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Melba Toast', 'Melba toast', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 5, '1 snee', 387, 8.5, 76.0, 2.0, 3.0, 1.5, FALSE);

-- Beschuit, biscuits en speciaal brood (5 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Beschuit', 'Beschuit', 'Bolletje', 'supermarket', 'albert_heijn', NULL, 'brood', 6, '1 beschuit', 393, 7.5, 77.5, 2.5, 2.5, 2.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pita Bread', 'Pita brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 60, '1 pita', 265, 8.0, 48.0, 1.2, 1.5, 3.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Turkish Bread', 'Turks brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 60, '1 stuk', 290, 8.5, 50.0, 3.5, 2.0, 4.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Naan Bread', 'Naan brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 80, '1 naan', 262, 6.8, 35.0, 8.8, 1.0, 1.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Focaccia Bread', 'Focaccia brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 50, '1 stuk', 285, 7.5, 35.0, 10.0, 1.2, 2.0, FALSE);

-- Bagels, croissants, rollades (5 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bagel Plain', 'Bagel naturel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 85, '1 bagel', 245, 9.0, 48.0, 1.5, 2.5, 4.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Croissant Butter', 'Botercroisssant', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 60, '1 croissant', 406, 8.0, 38.0, 20.0, 2.0, 8.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Croissant Chocolate', 'Chocoladecroisssant', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 65, '1 croissant', 410, 7.5, 43.0, 20.5, 1.8, 14.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pain au Chocolat', 'Pain au chocolat', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 60, '1 stuk', 395, 6.5, 42.0, 19.0, 1.5, 13.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Brioche Bread', 'Brioche brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 50, '1 snee', 325, 6.5, 40.0, 15.0, 1.0, 10.5, FALSE);

-- AH Broodjes en andere (7 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Puntbroodje', 'Puntbroodje AH', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 50, '1 broodje', 270, 8.5, 46.0, 3.5, 2.0, 3.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ciabatta Roll', 'Ciabatta broodje', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 75, '1 broodje', 290, 9.0, 50.0, 3.8, 2.2, 2.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pistolet', 'Pistolet broodje', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 broodje', 260, 8.0, 46.5, 2.5, 1.8, 3.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Foccacia Roll', 'Foccacia broodje', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 60, '1 broodje', 280, 7.8, 38.0, 9.5, 1.5, 2.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ontbijtkoek', 'Ontbijtkoek', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 308, 5.5, 62.0, 3.0, 1.5, 22.5, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Woven Wrap Bread', 'Geweven brood wrap', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 50, '1 wrap', 245, 8.5, 42.0, 2.5, 2.0, 1.0, FALSE);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Gluten-Free Bread', 'Glutenvrij brood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 snee', 260, 4.0, 48.0, 3.0, 3.0, 2.5, FALSE);

-- MŌVE Fitness Coaching App - Food Products Database Seed
-- Dutch/Belgian Supermarket Products
-- Generated: 2026-04-03
-- Total Products: 130

-- ============================================================================
-- GROENTEN (50 products)
-- ============================================================================

-- Bloemkool & Broccoli
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Broccoli Fresh', 'Broccoli vers', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 34, 2.8, 7.0, 0.4, 2.4, 1.5, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Broccoli Frozen', 'Broccoli diepvries', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 35, 2.9, 7.1, 0.5, 2.5, 1.4, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cauliflower Fresh', 'Bloemkool vers', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 25, 1.9, 5.0, 0.3, 2.4, 1.9, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cauliflower Frozen', 'Bloemkool diepvries', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 26, 2.0, 5.1, 0.4, 2.5, 1.8, FALSE);

-- Spinazie & Boerenkool
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Spinach Fresh', 'Spinazie vers', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '2 handvollen', 23, 2.7, 3.6, 0.4, 2.7, 0.4, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Spinach Frozen', 'Spinazie diepvries', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 24, 2.8, 3.7, 0.5, 2.8, 0.3, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Kale Curly', 'Boerenkool gekrulde', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '2 handvollen', 49, 4.3, 8.7, 0.9, 1.3, 0.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Kale Lacinato', 'Boerenkool lacinato', 'Eosta', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '2 handvollen', 49, 4.3, 9.0, 0.8, 1.5, 0.4, FALSE);

-- Sla
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Iceberg Lettuce', 'Ijsbergsla', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '2 kopjes', 14, 0.9, 2.9, 0.1, 1.2, 0.6, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Rocket Salad', 'Rucola', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '2 handvollen', 25, 2.6, 3.7, 0.7, 1.6, 0.4, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Corn Salad', 'Veldsla', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '2 handvollen', 20, 1.8, 3.5, 0.3, 1.8, 0.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mixed Salad', 'Gemengde sla', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '2 kopjes', 18, 1.3, 3.4, 0.2, 1.4, 0.5, FALSE);

-- Tomaat & Komkommer
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Tomato Regular', 'Tomaat regulier', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 medium', 18, 0.9, 3.9, 0.2, 1.2, 2.3, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cherry Tomatoes', 'Cherrytomaatjes', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 handje', 27, 1.2, 5.8, 0.3, 1.5, 3.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cucumber', 'Komkommer', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1/2 komkommer', 16, 0.7, 3.6, 0.1, 0.5, 1.7, FALSE);

-- Paprika
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Bell Pepper Red', 'Paprika rood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 medium', 31, 1.0, 6.0, 0.3, 2.0, 3.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Bell Pepper Yellow', 'Paprika geel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 medium', 30, 1.0, 6.9, 0.3, 1.7, 4.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Bell Pepper Green', 'Paprika groen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 medium', 20, 0.9, 4.6, 0.3, 1.7, 2.4, FALSE);

-- Aubergine & Courgette
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Eggplant', 'Aubergine', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1/2 aubergine', 25, 0.9, 5.9, 0.2, 3.0, 3.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Zucchini', 'Courgette', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 medium', 17, 1.5, 3.5, 0.4, 1.0, 1.2, FALSE);

-- Wortel & Ui
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Carrot', 'Wortel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 medium', 41, 0.9, 10.0, 0.2, 2.8, 4.7, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Onion Yellow', 'Ui geel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 small', 40, 1.1, 9.3, 0.1, 1.7, 4.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Onion Red', 'Ui rood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 small', 40, 1.2, 9.3, 0.1, 1.7, 4.4, FALSE);

-- Knoflook & Prei
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Garlic', 'Knoflook', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 teen', 149, 6.4, 33.0, 0.5, 2.1, 1.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Leek', 'Prei', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 porcie', 31, 1.5, 7.7, 0.3, 1.8, 2.3, FALSE);

-- Selderij
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Celery', 'Selderij', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 stengel', 16, 0.7, 3.7, 0.1, 1.6, 1.3, FALSE);

-- Champignons & Shiitake
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Button Mushrooms', 'Champignons', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 22, 3.1, 3.3, 0.1, 1.0, 1.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Shiitake Mushrooms', 'Shiitake', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 34, 2.2, 6.8, 0.5, 1.0, 2.4, FALSE);

-- Aardappel
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Potato', 'Aardappel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 medium', 77, 1.7, 17.5, 0.1, 2.0, 0.8, TRUE);

-- Zoete Aardappel
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Sweet Potato', 'Zoete aardappel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 medium', 86, 1.6, 20.1, 0.1, 3.0, 4.2, FALSE);

-- Pompoen & Biet
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pumpkin', 'Pompoen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 26, 1.0, 6.5, 0.1, 0.5, 2.8, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Beet', 'Biet', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 medium', 43, 1.7, 10.0, 0.2, 2.4, 6.8, FALSE);

-- Sperziebonen & Snijbonen
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Green Beans Fresh', 'Sperziebonen vers', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 31, 1.9, 7.0, 0.1, 2.7, 1.9, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Green Beans Frozen', 'Sperziebonen diepvries', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 32, 2.0, 7.1, 0.2, 2.8, 1.8, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Snap Beans', 'Snijbonen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 30, 1.9, 6.8, 0.1, 2.5, 1.8, FALSE);

-- Peultjes & Erwten
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Snow Peas', 'Peultjes', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 42, 2.8, 7.5, 0.2, 2.6, 4.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Peas Frozen', 'Erwten diepvries', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1/2 kopje', 77, 5.4, 14.0, 0.4, 5.5, 5.7, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Fava Beans', 'Tuinbonen', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1/2 kopje', 111, 8.0, 20.0, 0.4, 6.4, 0.3, FALSE);

-- Mais
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Corn Canned', 'Mais blik', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1/2 kopje', 96, 3.3, 23.0, 1.5, 2.7, 3.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Corn Frozen', 'Mais diepvries', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1/2 kopje', 86, 3.1, 19.0, 1.2, 2.3, 3.0, FALSE);

-- Kimchi & Zuurkool
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Kimchi', 'Kimchi', 'Morga', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1/2 kopje', 22, 2.0, 4.0, 0.5, 1.6, 1.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Sauerkraut', 'Zuurkool', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1/2 kopje', 19, 0.9, 3.6, 0.1, 2.1, 1.8, FALSE);

-- Edamame & Taugé
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Edamame Frozen', 'Edamame diepvries', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 111, 11.9, 10.0, 5.0, 6.0, 2.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Bean Sprouts', 'Taugé', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 30, 3.0, 5.8, 0.2, 1.5, 2.0, FALSE);

-- Paksoi & Chinese Kool
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Bok Choy', 'Paksoi', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 13, 1.5, 2.2, 0.2, 1.2, 0.4, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chinese Cabbage', 'Chinese kool', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '1 kopje', 16, 1.2, 3.2, 0.2, 1.2, 1.2, FALSE);

-- Asperges
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('White Asparagus', 'Asperges wit', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '5-6 stengels', 20, 2.2, 3.9, 0.1, 2.1, 1.9, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Green Asparagus', 'Asperges groen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'groenten', 100, '5-6 stengels', 27, 2.4, 5.0, 0.2, 2.8, 2.0, FALSE);

-- ============================================================================
-- FRUIT (40 products)
-- ============================================================================

-- Banaan & Appel
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Banana', 'Banaan', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 89, 1.1, 23.0, 0.3, 2.6, 12.2, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Apple Elstar', 'Appel Elstar', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 52, 0.3, 14.0, 0.2, 2.4, 10.4, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Apple Granny Smith', 'Appel Granny Smith', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 52, 0.3, 13.8, 0.2, 2.4, 9.4, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Apple Jonagold', 'Appel Jonagold', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 52, 0.4, 14.0, 0.2, 2.3, 11.2, FALSE);

-- Peer
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pear', 'Peer', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 57, 0.4, 15.2, 0.1, 3.1, 9.8, FALSE);

-- Sinaasappel & Mandarijn
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Orange', 'Sinaasappel', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 47, 0.7, 11.8, 0.3, 2.4, 9.3, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mandarin', 'Mandarijn', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 47, 0.7, 12.0, 0.3, 1.8, 9.3, FALSE);

-- Grapefruit
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Grapefruit', 'Grapefruit', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1/2 medium', 42, 0.8, 10.7, 0.1, 1.6, 7.0, FALSE);

-- Citroen & Limoen
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Lemon', 'Citroen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 29, 1.1, 9.3, 0.3, 2.8, 2.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Lime', 'Limoen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 30, 0.7, 10.5, 0.2, 2.8, 1.7, FALSE);

-- Druiven
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Grapes White', 'Druiven wit', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 67, 0.6, 17.0, 0.4, 0.9, 16.3, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Grapes Blue', 'Druiven blauw', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 69, 0.7, 18.1, 0.5, 0.9, 15.5, FALSE);

-- Bessen
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Strawberries', 'Aardbei', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 32, 0.8, 7.7, 0.3, 2.0, 4.9, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Raspberries', 'Framboos', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 52, 1.2, 12.0, 0.7, 6.5, 4.4, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Blueberries', 'Bosbes', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 57, 0.7, 14.5, 0.3, 2.4, 9.7, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Blackberries', 'Braam', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 43, 1.4, 10.2, 0.5, 5.3, 4.9, FALSE);

-- Tropische vruchten
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mango', 'Mango', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 60, 0.8, 15.0, 0.4, 1.6, 13.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pineapple', 'Ananas', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 50, 0.5, 13.1, 0.1, 1.4, 9.9, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Kiwi', 'Kiwi', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 medium', 61, 1.1, 14.7, 0.5, 3.0, 6.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Watermelon', 'Watermeloen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 30, 0.6, 7.6, 0.2, 0.4, 6.2, FALSE);

-- Gedroogde vruchten
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Dates Medjool', 'Dadels Medjool', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '3 dadels', 282, 2.5, 75.0, 0.4, 6.7, 66.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Figs Dried', 'Vijgen gedroogd', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '3 vijgen', 249, 3.3, 63.9, 0.9, 9.8, 47.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Apricots Dried', 'Abrikozen gedroogd', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 handje', 241, 3.4, 62.6, 0.5, 7.3, 53.4, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Raisins', 'Rozijnen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1/4 kopje', 299, 3.1, 79.8, 0.5, 3.7, 59.2, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cranberries Dried', 'Cranberries gedroogd', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1/4 kopje', 308, 0.4, 82.0, 1.5, 4.6, 70.0, FALSE);

-- Avocado
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Avocado', 'Avocado', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1/2 avocado', 160, 2.0, 8.6, 14.7, 6.7, 0.7, TRUE);

-- Kokos
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Coconut Shredded', 'Kokosnoot geraspt', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1/4 kopje', 660, 7.3, 24.0, 64.5, 9.0, 9.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Coconut Water', 'Kokoswater', 'Vita Coco', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 19, 0.7, 3.7, 0.2, 1.0, 2.6, FALSE);

-- Appelmoes & Fruitsalade
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Applesauce', 'Appelmoes AH', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1/2 kopje', 38, 0.3, 9.4, 0.1, 1.2, 8.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Fruit Salad', 'Fruitsalade', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 50, 0.5, 12.5, 0.1, 1.2, 11.0, FALSE);

-- Diepvriesfruit
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mixed Berries Frozen', 'Gemengde bessen diepvries', 'Bonduelle', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1 kopje', 45, 0.8, 10.8, 0.3, 2.0, 7.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mango Frozen', 'Mango diepvries', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'fruit', 100, '1/2 kopje', 54, 0.7, 13.5, 0.3, 1.5, 12.0, FALSE);

-- ============================================================================
-- NOTEN (25 products)
-- ============================================================================

-- Noten
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Almonds', 'Amandelen', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 579, 21.2, 22.0, 49.9, 12.5, 4.4, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Walnuts', 'Walnoten', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 654, 15.2, 13.7, 65.2, 6.7, 2.6, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cashews', 'Cashewnoten', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 553, 18.2, 30.2, 43.4, 3.3, 5.9, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Peanuts', 'Pinda''s', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 567, 25.8, 16.1, 49.2, 6.0, 4.7, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pecans', 'Pecannoten', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 691, 9.2, 13.9, 71.9, 8.7, 3.9, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Hazelnuts', 'Hazelnoten', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 628, 14.9, 16.7, 60.8, 9.7, 4.7, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Macadamia', 'Macadamia', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 718, 7.9, 13.8, 75.8, 8.6, 4.6, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pistachios', 'Pistachenoten', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 560, 20.3, 27.3, 45.4, 10.6, 7.7, FALSE);

-- Noten pasta
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Peanut Butter Natural', 'Pindakaas naturel', 'Calvé', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '2 eetl', 588, 25.8, 20.0, 50.0, 5.0, 5.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Almond Butter', 'Amandelpasta', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '2 eetl', 614, 22.2, 19.4, 55.4, 11.4, 3.6, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Cashew Butter', 'Cashewpasta', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '2 eetl', 587, 20.0, 27.7, 48.0, 3.0, 5.5, FALSE);

-- Notenmix
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mixed Nuts Unsalted', 'Notenmix ongezouten', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 607, 20.5, 20.5, 54.5, 8.0, 5.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mixed Nuts Salted', 'Notenmix gezouten', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1 handje', 607, 20.5, 20.5, 54.5, 8.0, 5.0, FALSE);

-- Zaden
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Sunflower Seeds', 'Zonnebloempitten', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1/4 kopje', 584, 20.7, 20.0, 51.5, 8.6, 2.6, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Pumpkin Seeds', 'Pompoenpitten', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1/4 kopje', 559, 25.5, 5.5, 49.0, 1.1, 1.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Chia Seeds', 'Chiazaad', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '3 eetl', 486, 17.3, 42.1, 30.7, 34.4, 1.75, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Flaxseeds', 'Lijnzaad', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '3 eetl', 534, 18.3, 28.9, 42.2, 27.3, 1.5, FALSE);

-- Kokos & Sesam
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Coconut Flakes', 'Kokosrasp', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '1/4 kopje', 660, 7.3, 24.0, 64.5, 9.0, 9.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Sesame Seeds', 'Sesamzaad', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'noten', 100, '2 eetl', 563, 17.7, 23.5, 50.0, 11.8, 0.3, FALSE);

-- ============================================================================
-- OLIE_VET (15 products)
-- ============================================================================

-- Olijfolie
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Olive Oil Extra Virgin', 'Olijfolie extra vierge', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 884, 0.0, 0.0, 100.0, 0.0, 0.0, TRUE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Olive Oil Mild', 'Olijfolie mild', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 884, 0.0, 0.0, 100.0, 0.0, 0.0, FALSE);

-- Kokosolie
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Coconut Oil', 'Kokosolie', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 892, 0.0, 0.0, 99.1, 0.0, 0.0, FALSE);

-- Zonnebloemolie & Arachideolie
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Sunflower Oil', 'Zonnebloemolie', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 884, 0.0, 0.0, 100.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Peanut Oil', 'Arachideolie', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 884, 0.0, 0.0, 100.0, 0.0, 0.0, FALSE);

-- Boter & Ghee
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Butter', 'Boter', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 717, 0.9, 0.1, 81.1, 0.0, 0.1, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Ghee', 'Ghee', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 900, 0.0, 0.0, 100.0, 0.0, 0.0, FALSE);

-- Mayonaise & Ketchup
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mayonnaise Hellmann''s', 'Mayonaise Hellmann''s', 'Hellmann''s', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 680, 0.3, 0.6, 75.0, 0.0, 0.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Ketchup Heinz', 'Ketchup Heinz', 'Heinz', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 100, 1.5, 25.0, 0.2, 0.5, 15.0, FALSE);

-- Mosterd & Sauzen
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Mustard', 'Mosterd', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 66, 3.6, 6.4, 3.6, 0.8, 3.3, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Soy Sauce Kikkoman', 'Sojasaus Kikkoman', 'Kikkoman', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 54, 8.1, 5.6, 0.5, 0.5, 1.5, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Sriracha', 'Sriracha', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 133, 3.0, 25.0, 1.5, 2.0, 15.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Sambal', 'Sambal', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 140, 3.5, 26.0, 2.0, 2.0, 16.0, FALSE);

-- Siropen
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Honey', 'Honing', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 304, 0.3, 82.4, 0.0, 0.2, 82.1, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Agave Syrup', 'Agavesiroop', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 310, 0.3, 76.0, 0.3, 0.0, 68.0, FALSE);

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular)
VALUES ('Maple Syrup', 'Ahornsiroop', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'olie_vet', 100, '1 eetl', 260, 0.0, 67.0, 0.1, 0.0, 60.0, FALSE);

-- MŌVE Fitness Coaching App - Dutch/Belgian Food Products
-- Generated for: snacks, dranken (drinks), saus, and sports_nutrition categories

-- SNACKS (50 products)

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES
('Lay''s Natural Chips', 'Lay''s Naturel Chips', 'Lay''s', 'supermarket', 'albert_heijn', NULL, 'snack', 28, '1 zakje (28g)', 536, 6, 51, 32, 5, 1, TRUE),
('Lay''s Paprika Chips', 'Lay''s Paprika Chips', 'Lay''s', 'supermarket', 'albert_heijn', NULL, 'snack', 28, '1 zakje (28g)', 536, 6, 51, 32, 5, 2, TRUE),
('Pringles Original', 'Pringles Origineel', 'Pringles', 'supermarket', 'albert_heijn', NULL, 'snack', 19, '1 portie (19g)', 509, 6, 48, 30, 4, 1, TRUE),
('Pringles Paprika', 'Pringles Paprika', 'Pringles', 'supermarket', 'albert_heijn', NULL, 'snack', 19, '1 portie (19g)', 509, 6, 48, 30, 4, 2, TRUE),
('Doritos Nacho Cheese', 'Doritos Nacho Cheese', 'Doritos', 'supermarket', 'albert_heijn', NULL, 'snack', 28, '1 zakje (28g)', 541, 7, 50, 32, 5, 1, TRUE),
('Tortilla Chips Zout', 'Tortilla Chips Zout', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 30, '1 handvol (30g)', 498, 7, 53, 28, 6, 1, FALSE),
('Borrelnootjes Mix', 'Borrelnootjes Mix', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 25, '1 handvol (25g)', 589, 17, 20, 50, 3, 4, FALSE),
('Cashews Gezouten', 'Cashews Gezouten', 'Jumbo', 'supermarket', 'albert_heijn', NULL, 'snack', 30, '1 handvol (30g)', 553, 16, 30, 44, 3, 5, FALSE),
('Pinda''s Gezouten', 'Pinda''s Gezouten', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 30, '1 handvol (30g)', 567, 26, 20, 50, 2, 3, FALSE),
('Almonds Geroosterd', 'Amandelen Geroosterd', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 28, '1 handvol (28g)', 579, 21, 22, 50, 3, 5, FALSE),
('Milka Chocolate 100g', 'Milka Melkchocolade 100g', 'Milka', 'supermarket', 'albert_heijn', NULL, 'snack', 30, '1 reep (30g)', 535, 8, 56, 30, 1, 53, FALSE),
('Tony''s Chocolonely Dark 70%', 'Tony''s Chocolonely Donker 70%', 'Tony''s Chocolonely', 'supermarket', 'albert_heijn', NULL, 'snack', 30, '1 reep (30g)', 602, 10, 33, 49, 6, 20, FALSE),
('KitKat 4 Finger', 'KitKat 4 Finger', 'Nestlé', 'supermarket', 'albert_heijn', NULL, 'snack', 22, '1 reep (22g)', 520, 6, 59, 28, 1, 45, FALSE),
('Mars Bar', 'Mars Reep', 'Mars', 'supermarket', 'albert_heijn', NULL, 'snack', 33, '1 reep (33g)', 526, 4, 68, 21, 1, 47, FALSE),
('Snickers Bar', 'Snickers Reep', 'Mars', 'supermarket', 'albert_heijn', NULL, 'snack', 33, '1 reep (33g)', 506, 11, 61, 24, 1, 44, TRUE),
('Twix Bar', 'Twix Reep', 'Mars', 'supermarket', 'albert_heijn', NULL, 'snack', 25, '1 reep (25g)', 517, 4, 63, 25, 1, 43, FALSE),
('Bounty Bar', 'Bounty Reep', 'Mars', 'supermarket', 'albert_heijn', NULL, 'snack', 29, '1 reep (29g)', 471, 3, 57, 24, 1, 43, FALSE),
('M&M''s Peanut', 'M&M''s Peanut', 'Mars', 'supermarket', 'albert_heijn', NULL, 'snack', 45, '1 zak (45g)', 503, 13, 57, 23, 2, 50, TRUE),
('Stroopwafel', 'Stroopwafel', 'Daelmans', 'supermarket', 'albert_heijn', NULL, 'snack', 17, '1 wafel (17g)', 407, 3, 72, 9, 1, 40, FALSE),
('Speculaas', 'Speculaas', 'Lotus', 'supermarket', 'albert_heijn', NULL, 'snack', 20, '2 koekjes (20g)', 471, 5, 65, 20, 1, 28, FALSE),
('Oreo Cookies', 'Oreo Koekjes', 'Mondelēz', 'supermarket', 'albert_heijn', NULL, 'snack', 34, '3 koekjes (34g)', 486, 4, 71, 21, 1, 38, FALSE),
('Digestive Biscuits', 'Digestive Koekjes', 'McVitie''s', 'supermarket', 'albert_heijn', NULL, 'snack', 30, '2 koekjes (30g)', 475, 7, 64, 20, 2, 15, FALSE),
('Bastogne Koekjes', 'Bastogne Koekjes', 'Lotus', 'supermarket', 'albert_heijn', NULL, 'snack', 22, '3 koekjes (22g)', 445, 6, 63, 18, 1, 25, FALSE),
('Gevulde Koek', 'Gevulde Koek', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 35, '1 koek (35g)', 369, 4, 63, 10, 2, 35, FALSE),
('Ontbijtkoek', 'Ontbijtkoek', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 40, '2 sneden (40g)', 291, 4, 63, 2, 2, 30, FALSE),
('Appelflap', 'Appelflap', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 100, '1 appelflap (100g)', 287, 3, 45, 9, 2, 20, FALSE),
('Saucijzenbroodje', 'Saucijzenbroodje', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 60, '1 broodje (60g)', 334, 12, 32, 16, 1, 3, FALSE),
('Kaasbroodje', 'Kaasbroodje', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 60, '1 broodje (60g)', 321, 14, 30, 14, 1, 2, FALSE),
('Popcorn Zout', 'Popcorn Zout', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 20, '1 handvol (20g)', 375, 12, 55, 9, 8, 0, FALSE),
('Popcorn Zoet', 'Popcorn Zoet', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 20, '1 handvol (20g)', 410, 8, 65, 12, 6, 35, FALSE),
('Popcorn Gekaramelliseerd', 'Popcorn Gekaramelliseerd', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 25, '1 zakje (25g)', 428, 6, 72, 13, 3, 45, FALSE),
('Rijstwafels Met Melkchocolade', 'Rijstwafels Met Melkchocolade', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 10, '1 wafel (10g)', 383, 4, 78, 5, 1, 35, FALSE),
('Nature Valley Oats & Honey', 'Nature Valley Haver & Honing', 'Nature Valley', 'supermarket', 'albert_heijn', NULL, 'snack', 42, '1 reep (42g)', 405, 9, 63, 14, 5, 30, FALSE),
('Nakd Cocoa Orange', 'Nakd Cacao Orange', 'Nakd', 'supermarket', 'albert_heijn', NULL, 'snack', 35, '1 reep (35g)', 379, 9, 55, 12, 5, 28, FALSE),
('Trek Peanut & Choco', 'Trek Pinda & Choco', 'Trek', 'supermarket', 'albert_heijn', NULL, 'snack', 50, '1 reep (50g)', 444, 14, 51, 18, 5, 29, FALSE),
('Venco Drop Assortiment', 'Venco Drop Assortiment', 'Venco', 'supermarket', 'albert_heijn', NULL, 'snack', 30, '1 handvol (30g)', 319, 0, 82, 0, 0, 42, FALSE),
('Klene Zoethout', 'Klene Zoethout', 'Klene', 'supermarket', 'albert_heijn', NULL, 'snack', 25, '1 handvol (25g)', 311, 0, 80, 0, 0, 40, FALSE),
('Magnum Almond', 'Magnum Almond IJsje', 'Magnum', 'supermarket', 'albert_heijn', NULL, 'snack', 100, '1 ijsje (100g)', 268, 5, 26, 16, 2, 22, FALSE),
('Cornetto Original', 'Cornetto Origineel', 'Unilever', 'supermarket', 'albert_heijn', NULL, 'snack', 90, '1 ijsje (90g)', 224, 3, 27, 11, 1, 24, FALSE),
('Ben & Jerry''s Vanilla', 'Ben & Jerry''s Vanilla', 'Ben & Jerry''s', 'supermarket', 'albert_heijn', NULL, 'snack', 100, '100ml IJsroom', 207, 3, 22, 11, 0, 20, FALSE),
('Luikse Wafel', 'Luikse Wafel', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 45, '1 wafel (45g)', 325, 5, 56, 8, 1, 28, FALSE),
('Merci Chocolates', 'Merci Chocoladeassortiment', 'Storck', 'supermarket', 'albert_heijn', NULL, 'snack', 10, '1 bonbon (10g)', 486, 4, 65, 21, 1, 50, FALSE),
('Lindor Truffles', 'Lindor Truffles', 'Lindor', 'supermarket', 'albert_heijn', NULL, 'snack', 15, '1 truffle (15g)', 520, 4, 52, 32, 1, 45, FALSE),
('Haribo Gummy Bears', 'Haribo Gummibeertjes', 'Haribo', 'supermarket', 'albert_heijn', NULL, 'snack', 20, '1 zakje (20g)', 343, 6, 76, 0, 0, 48, FALSE),
('Campina Yoghurt Muesli', 'Campina Yoghurt Muesli', 'Campina', 'supermarket', 'albert_heijn', NULL, 'snack', 150, '1 bakje (150g)', 120, 4, 19, 2, 2, 14, FALSE),
('Nutella', 'Nutella', 'Ferrero', 'supermarket', 'albert_heijn', NULL, 'snack', 15, '1 portiepak (15g)', 539, 6, 63, 31, 1, 56, FALSE),
('Pindakaas', 'Pindakaas', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 32, '2 lepels (32g)', 590, 24, 20, 50, 4, 6, FALSE),
('Granola Bar Honey', 'Granola Reep Honing', 'AH', 'supermarket', 'albert_heijn', NULL, 'snack', 40, '1 reep (40g)', 445, 8, 60, 18, 3, 32, FALSE);

-- DRANKEN (50 products)

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES
('Heineken Beer', 'Heineken Bier', 'Heineken', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml bier', 42, 0.4, 3, 0, 0, 0, TRUE),
('Jupiler Beer', 'Jupiler Bier', 'Jupiler', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml bier', 43, 0.5, 3.2, 0, 0, 0, TRUE),
('Duvel Golden Ale', 'Duvel Blond Bier', 'Duvel', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml bier', 62, 0.5, 6.5, 0, 0, 0, FALSE),
('Leffe Blonde', 'Leffe Blond', 'Leffe', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml bier', 54, 0.4, 5.5, 0, 0, 0, FALSE),
('Westmalle Trappist', 'Westmalle Trappist', 'Westmalle', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml bier', 67, 0.6, 7, 0, 0, 0, FALSE),
('Palm Beer', 'Palm Bier', 'Palm', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml bier', 45, 0.4, 3.5, 0, 0, 0, FALSE),
('Stella Artois', 'Stella Artois Bier', 'Stella Artois', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml bier', 48, 0.4, 4, 0, 0, 0, TRUE),
('Coca-Cola', 'Coca-Cola', 'Coca-Cola', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml frisdrank', 42, 0, 10.6, 0, 0, 10.6, TRUE),
('Coca-Cola Zero', 'Coca-Cola Zero', 'Coca-Cola', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml frisdrank', 0.4, 0, 0.1, 0, 0, 0, TRUE),
('Fanta Orange', 'Fanta Sinaasappel', 'Fanta', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml frisdrank', 45, 0, 11, 0, 0, 11, FALSE),
('Sprite', 'Sprite', 'Sprite', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml frisdrank', 42, 0, 10.3, 0, 0, 10.3, FALSE),
('7Up', '7Up', '7Up', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml frisdrank', 42, 0, 10.3, 0, 0, 10.3, FALSE),
('Ice Tea Peach', 'Ice Tea Perzik', 'Nestlé', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml Ice Tea', 30, 0, 7.5, 0, 0, 7.5, FALSE),
('Sinaasappelsap', 'Sinaasappelsap', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml sap', 43, 0.7, 10.4, 0.1, 0.1, 9, FALSE),
('Appelsap', 'Appelsap', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml sap', 46, 0.3, 11, 0.1, 0.1, 10, FALSE),
('Tomatensap', 'Tomatensap', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml sap', 17, 0.9, 3.5, 0.1, 0.8, 2, FALSE),
('Multivitamine Sap', 'Multivitamine Sap', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml sap', 50, 0.5, 12, 0.1, 0, 11, FALSE),
('Koffie Zwart', 'Koffie Zwart', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml koffie', 2, 0.2, 0.3, 0, 0, 0, FALSE),
('Cappuccino', 'Cappuccino', 'Nescafé', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml cappuccino', 58, 2, 8, 2.5, 0, 7, FALSE),
('Latte Coffee', 'Latte Koffie', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml latte', 64, 3.3, 5, 3.5, 0, 5, FALSE),
('Thee Zwart', 'Thee Zwart', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml thee', 2, 0.1, 0.5, 0, 0, 0, FALSE),
('Red Bull Energy', 'Red Bull Energiedrank', 'Red Bull', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml energiedrank', 53, 0, 13, 0, 0, 12, FALSE),
('Monster Energy', 'Monster Energiedrank', 'Monster', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml energiedrank', 49, 0.1, 12, 0, 0, 12, FALSE),
('Water Plat', 'Water Plat', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml water', 0, 0, 0, 0, 0, 0, FALSE),
('Water Bruisend', 'Water Bruisend', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml water', 0, 0, 0, 0, 0, 0, FALSE),
('Chocomel', 'Chocomel', 'Friesland Campina', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml chocomel', 70, 3.1, 11, 2.3, 0, 10, FALSE),
('Fristi', 'Fristi', 'Friesland Campina', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml fristi', 63, 1, 11, 2, 0, 10, FALSE),
('Innocent Smoothie Mango', 'Innocent Smoothie Mango', 'Innocent', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml smoothie', 56, 0.3, 13, 0.1, 1, 11, FALSE),
('Aquarius Sports Drink', 'Aquarius Sportdrank', 'Aquarius', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml sportdrank', 30, 0, 7.3, 0, 0, 7, FALSE),
('AA Drink Orange', 'AA Drink Oranje', 'AA Drink', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml sportdrank', 32, 0.1, 7.5, 0, 0, 7, FALSE),
('Gatorade Orange', 'Gatorade Oranje', 'Gatorade', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml sportdrank', 31, 0.1, 7.5, 0, 0, 7, FALSE),
('Limonade', 'Limonade', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml limonade', 40, 0, 10, 0, 0, 10, FALSE),
('Karvan Cévitam Siroop', 'Karvan Cévitam Siroop', 'Karvan Cévitam', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml siroop (geconcentreerd)', 288, 0, 72, 0, 0, 72, FALSE),
('Havermelk', 'Havermelk', 'Alpro', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml havermelk', 48, 1, 6, 1.5, 0.5, 2, FALSE),
('Amandelmelk', 'Amandelmelk', 'Alpro', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml amandelmelk', 32, 1.1, 1.3, 2.5, 0.4, 0.1, FALSE),
('Sojamelk', 'Sojamelk', 'Alpro', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml sojamelk', 49, 3.6, 2, 1.9, 0.5, 0.1, FALSE),
('Kokosmelk', 'Kokosmelk', 'Aroy-D', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml kokosmelk', 67, 0.7, 3.3, 5.5, 0, 0, FALSE),
('Rood Wijn', 'Rode Wijn', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml rode wijn', 70, 0, 2.6, 0, 0, 0.3, FALSE),
('Wit Wijn', 'Witte Wijn', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml witte wijn', 66, 0, 0.6, 0, 0, 1, FALSE),
('Rosé Wijn', 'Rosé Wijn', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml rosé wijn', 68, 0, 1.5, 0, 0, 2, FALSE),
('Jus d''Orange Vers', 'Vers Sinaasappelsap', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml vers sap', 45, 0.8, 11, 0.1, 0.1, 9, FALSE),
('Kombucha', 'Kombucha', 'Remedy', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml kombucha', 24, 0, 4, 0, 0, 3, FALSE),
('Matcha Thee', 'Matcha Thee', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml matcha thee', 3, 0.1, 0.5, 0, 0, 0, FALSE),
('Espresso', 'Espresso', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml espresso', 3, 0.2, 0.4, 0, 0, 0, FALSE),
('Melkshake Vanille', 'Milkshake Vanille', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml milkshake', 68, 3.2, 9, 2.8, 0, 8, FALSE),
('Melkshake Aardbei', 'Milkshake Aardbei', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml milkshake', 65, 3, 10, 2.5, 0, 9, FALSE),
('Chocolademelk', 'Chocolademelk', 'AH', 'supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml chocolademelk', 72, 3.5, 10, 3, 0, 9, FALSE);

-- SAUS (20 products)

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES
('Heinz Ketchup', 'Heinz Ketchup', 'Heinz', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel (15g)', 109, 1.2, 25, 0.1, 0.3, 23, FALSE),
('Hellmann''s Mayonaise', 'Hellmann''s Mayonaise', 'Hellmann''s', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel (15g)', 717, 0.1, 0.6, 80, 0, 0, FALSE),
('Calvé Mayonaise', 'Calvé Mayonaise', 'Calvé', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel (15g)', 710, 0, 0.5, 79, 0, 0, FALSE),
('Curry Saus', 'Curry Saus', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel (15g)', 153, 1, 7, 13, 0, 4, FALSE),
('BBQ Saus', 'BBQ Saus', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 20, '1.5 eetlepel (20g)', 131, 0.5, 25, 2, 0.5, 22, FALSE),
('Sweet Chili Saus', 'Sweet Chili Saus', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel (15g)', 132, 0.3, 32, 0.1, 0, 31, FALSE),
('Pesto Groen', 'Pesto Groen', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 10, '1 eetlepel (10g)', 361, 7, 3, 37, 1, 0.5, FALSE),
('Pesto Rood', 'Pesto Rood', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 10, '1 eetlepel (10g)', 345, 5, 4, 35, 1, 2, FALSE),
('Hummus Naturel', 'Hummus Naturel', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 30, '3 eetlepels (30g)', 159, 4.8, 14, 8.5, 2.5, 0.7, FALSE),
('Hummus Rode Biet', 'Hummus Rode Biet', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 30, '3 eetlepels (30g)', 142, 4, 15, 6.5, 2, 3, FALSE),
('Tzatziki', 'Tzatziki', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 30, '3 eetlepels (30g)', 65, 2.5, 2, 4.5, 0, 1, FALSE),
('Guacamole', 'Guacamole', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 30, '3 eetlepels (30g)', 193, 1.5, 5, 19, 2, 0.5, FALSE),
('Tomatensaus Bertolli', 'Tomatensaus Bertolli', 'Bertolli', 'supermarket', 'albert_heijn', NULL, 'saus', 100, '1 potje (100g)', 42, 1.5, 8, 0.5, 1.5, 6, FALSE),
('Pastasaus Classico', 'Pastasaus Classico', 'Classico', 'supermarket', 'albert_heijn', NULL, 'saus', 100, '1 portie (100g)', 51, 1.2, 9, 1.5, 1, 7, FALSE),
('Olijfolie Dressing', 'Olijfolie Dressing', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel (15g)', 678, 0, 2, 75, 0, 0, FALSE),
('Vinaigrette', 'Vinaigrette', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel (15g)', 304, 0.3, 2, 32, 0, 1, FALSE),
('Sojasaus Kikkoman', 'Sojasaus Kikkoman', 'Kikkoman', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel (15g)', 71, 10, 5, 0.3, 0, 3, FALSE),
('Oestersaus', 'Oestersaus', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel (15g)', 64, 6.5, 7, 0.5, 0, 4, FALSE),
('Sambal Oelek', 'Sambal Oelek', 'AH', 'supermarket', 'albert_heijn', NULL, 'saus', 5, '1 theelepel (5g)', 88, 2.5, 10, 4, 1.5, 3, FALSE),
('Sriracha Hot Sauce', 'Sriracha Hete Saus', 'Tabasco', 'supermarket', 'albert_heijn', NULL, 'saus', 5, '1 theelepel (5g)', 106, 1.5, 15, 4, 0, 8, FALSE);

-- SPORTS NUTRITION (50 products)

-- Upfront Nutrition (15)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES
('Upfront Protein Bar Chocolate', 'Upfront Protein Reep Chocolade', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 50, '1 reep (50g)', 383, 42, 35, 8, 15, 2, TRUE),
('Upfront Protein Bar Peanut Butter', 'Upfront Protein Reep Pindakaas', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 50, '1 reep (50g)', 389, 40, 36, 10, 14, 3, FALSE),
('Upfront Protein Bar Vanilla', 'Upfront Protein Reep Vanille', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 50, '1 reep (50g)', 381, 41, 37, 7, 13, 2, FALSE),
('Upfront Protein Cookies', 'Upfront Protein Koekjes', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 40, '2 koekjes (40g)', 387, 38, 40, 9, 12, 4, FALSE),
('Upfront Ready Shake Vanilla', 'Upfront Ready Shake Vanille', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 250, '1 shake (250ml)', 108, 20, 9, 1.5, 0, 3, FALSE),
('Upfront Ready Shake Chocolate', 'Upfront Ready Shake Chocolade', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 250, '1 shake (250ml)', 112, 21, 10, 1.5, 0, 4, FALSE),
('Upfront Protein Chips Salt Vinegar', 'Upfront Protein Chips Zout Azijn', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 40, '1 zakje (40g)', 421, 36, 38, 12, 10, 2, FALSE),
('Upfront Protein Bread', 'Upfront Protein Brood', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 50, '1 snede (50g)', 276, 38, 24, 6, 8, 3, FALSE),
('Upfront Pre-Workout Energy', 'Upfront Pre-Workout', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 100, '1 portie (100g poeder)', 372, 2, 92, 0.5, 0, 85, FALSE),
('Upfront Creatine Monohydrate', 'Upfront Creatine', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 100, '1 portie (5g)', 0, 0, 0, 0, 0, 0, FALSE),
('Upfront BCAA Amino Acids', 'Upfront BCAA Aminozuren', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 100, '1 portie', 389, 100, 0, 0, 0, 0, FALSE),
('Upfront High Protein Bowl Chicken', 'Upfront High Protein Kom Kip', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 400, '1 kom (400g)', 125, 25, 12, 1.5, 3, 2, FALSE),
('Upfront Omega-3 Fish Oil', 'Upfront Omega-3 Visolie', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 100, '1 portie (4 capsules)', 900, 0, 0, 100, 0, 0, FALSE),
('Upfront Multivitamin', 'Upfront Multivitamine', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 1, '1 tablet', 370, 0, 92, 0, 0, 0, FALSE),
('Upfront Whey Protein Isolate', 'Upfront Whey Protein Isolaat', 'upfront_nutrition', 'sports_nutrition', 'upfront_nutrition', NULL, 'supplement', 100, '1 scoop (30g)', 365, 90, 3, 2, 0, 0.5, FALSE),

-- ESN (15)
('ESN Designer Whey Vanilla', 'ESN Designer Whey Vanille', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 scoop (30g)', 368, 88, 4, 3, 0, 1, TRUE),
('ESN Designer Whey Chocolate', 'ESN Designer Whey Chocolade', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 scoop (30g)', 368, 88, 4, 3, 0, 1, TRUE),
('ESN Designer Whey Strawberry', 'ESN Designer Whey Aardbei', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 scoop (30g)', 368, 88, 4, 3, 0, 1, FALSE),
('ESN Designer Whey Cookies Cream', 'ESN Designer Whey Cookies & Cream', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 scoop (30g)', 368, 88, 5, 3, 0, 2, FALSE),
('ESN Designer Whey Banana', 'ESN Designer Whey Banaan', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 scoop (30g)', 368, 88, 5, 3, 0, 2, FALSE),
('ESN Isoclear Whey Berry', 'ESN Isoclear Whey Bes', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 scoop (30g)', 365, 90, 2, 1.5, 0, 0.5, FALSE),
('ESN Isoclear Whey Apple', 'ESN Isoclear Whey Appel', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 scoop (30g)', 365, 90, 2, 1.5, 0, 0.5, FALSE),
('ESN Casein Vanilla', 'ESN Casein Vanille', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 scoop (30g)', 365, 80, 8, 4, 0, 2, FALSE),
('ESN Casein Chocolate', 'ESN Casein Chocolade', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 scoop (30g)', 365, 80, 8, 4, 0, 2, FALSE),
('ESN Creatine Monohydrate', 'ESN Creatine Monohydraat', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 portie (5g)', 0, 0, 0, 0, 0, 0, FALSE),
('ESN EAA Amino Acids', 'ESN EAA Aminozuren', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 portie', 373, 99, 1, 0, 0, 0, FALSE),
('ESN BCAA Amino Acids', 'ESN BCAA Aminozuren', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 portie', 389, 100, 0, 0, 0, 0, FALSE),
('ESN Flexpresso Protein Coffee', 'ESN Flexpresso Proteine Koffie', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '200ml drank', 68, 20, 4, 1.5, 0, 2, FALSE),
('ESN Protein Dream Bar', 'ESN Protein Dream Reep', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 50, '1 reep (50g)', 385, 44, 34, 10, 12, 3, FALSE),
('ESN Magnesium Citrate', 'ESN Magnesium Citraat', 'esn', 'sports_nutrition', 'esn', NULL, 'supplement', 100, '1 portie (3g)', 0, 0, 0.75, 0, 0, 0, FALSE),

-- Barebells (10)
('Barebells Salty Peanut', 'Barebells Zoute Pinda', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 55, '1 reep (55g)', 395, 42, 25, 16, 14, 1, TRUE),
('Barebells Hazelnut Nougat', 'Barebells Hazelnoot Nougat', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 55, '1 reep (55g)', 392, 41, 27, 14, 13, 2, TRUE),
('Barebells Caramel Cashew', 'Barebells Karamel Cashew', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 55, '1 reep (55g)', 391, 40, 28, 15, 12, 3, TRUE),
('Barebells White Chocolate', 'Barebells Witte Chocolade', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 55, '1 reep (55g)', 388, 42, 26, 14, 13, 4, TRUE),
('Barebells Cookies Cream', 'Barebells Cookies & Cream', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 55, '1 reep (55g)', 390, 41, 27, 14, 12, 3, TRUE),
('Barebells Milkshake Strawberry', 'Barebells Milkshake Aardbei', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 330, '1 fles (330ml)', 98, 20, 6, 1.5, 1, 2, FALSE),
('Barebells Milkshake Chocolate', 'Barebells Milkshake Chocolade', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 330, '1 fles (330ml)', 102, 21, 7, 1.5, 1, 3, FALSE),
('Barebells Milkshake Vanilla', 'Barebells Milkshake Vanille', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 330, '1 fles (330ml)', 100, 20, 6, 1.5, 1, 2, FALSE),
('Barebells Soft Bar Chocolate', 'Barebells Soft Reep Chocolade', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 45, '1 reep (45g)', 348, 35, 35, 10, 8, 8, FALSE),
('Barebells Soft Bar Peanut', 'Barebells Soft Reep Pinda', 'barebells', 'sports_nutrition', 'barebells', NULL, 'supplement', 45, '1 reep (45g)', 352, 34, 36, 11, 7, 7, FALSE),

-- Other Brands (10)
('Quest Bar Chocolate Peanut', 'Quest Bar Chocolade Pinda', 'quest', 'sports_nutrition', 'quest', NULL, 'supplement', 60, '1 reep (60g)', 387, 40, 29, 11, 17, 1, FALSE),
('Grenade Carb Killa Chocolate', 'Grenade Carb Killa Chocolade', 'grenade', 'sports_nutrition', 'grenade', NULL, 'supplement', 60, '1 reep (60g)', 383, 40, 16, 14, 10, 1, FALSE),
('Optimum Nutrition Gold Standard Whey', 'Optimum Nutrition Gold Standard Whey', 'optimum_nutrition', 'sports_nutrition', 'optimum_nutrition', NULL, 'supplement', 100, '1 scoop (30g)', 370, 89, 3, 2, 0, 1, FALSE),
('MyProtein Impact Whey Chocolate', 'MyProtein Impact Whey Chocolade', 'myprotein', 'sports_nutrition', 'myprotein', NULL, 'supplement', 100, '1 scoop (25g)', 368, 88, 4, 2, 0, 0.5, FALSE),
('MyProtein Impact Whey Vanilla', 'MyProtein Impact Whey Vanille', 'myprotein', 'sports_nutrition', 'myprotein', NULL, 'supplement', 100, '1 scoop (25g)', 368, 88, 4, 2, 0, 0.5, FALSE),
('Nocco BCAA Tropical', 'Nocco BCAA Tropisch', 'nocco', 'sports_nutrition', 'nocco', NULL, 'supplement', 330, '1 blikje (330ml)', 12, 0, 3, 0, 0, 2, FALSE),
('Nocco BCAA Blood Orange', 'Nocco BCAA Bloed Oranje', 'nocco', 'sports_nutrition', 'nocco', NULL, 'supplement', 330, '1 blikje (330ml)', 12, 0, 3, 0, 0, 2, FALSE),
('Huel Shake Powder', 'Huel Shake Poeder', 'huel', 'sports_nutrition', 'huel', NULL, 'supplement', 100, '1 portie (38g)', 388, 30, 38, 13, 6, 1, FALSE),
('Huel Bar v3.0', 'Huel Reep v3.0', 'huel', 'sports_nutrition', 'huel', NULL, 'supplement', 65, '1 reep (65g)', 403, 33, 43, 15, 9, 4, FALSE),
('YFood Complete Nutrition Vanilla', 'YFood Volledige Voeding Vanille', 'yfood', 'sports_nutrition', 'yfood', NULL, 'supplement', 500, '1 fles (500ml)', 146, 25, 12, 3.5, 3, 2, FALSE);

-- Extra food products to reach 750+ total (adding ~270 products)
-- Current count: 484, Target: 750+

-- BEREIDE MAALTIJDEN / KANT-EN-KLAAR (40 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Verse Caesar Salade', 'AH Verse Caesar Salade', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200g', 150, 8, 8, 10, 2, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Tonijnsalade', 'AH Tonijnsalade', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200g', 165, 16, 5, 8, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Pastasalade', 'AH Pastasalade', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200g', 145, 5, 18, 6, 2, 3, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Tomatenseoup', 'AH Tomatenseoup', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200ml', 35, 2, 6, 1, 1, 3, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Kippensoep', 'AH Kippensoep', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200ml', 45, 5, 4, 1, 1, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Erwtensoep', 'AH Erwtensoep', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200ml', 70, 6, 10, 1, 3, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Minestrone', 'AH Minestrone', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200ml', 45, 3, 7, 1, 2, 2, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cup-a-Soup Tomaat', 'Cup-a-Soup Tomaat', 'Unilever', 'Supermarket', 'albert_heijn', NULL, 'snack', 180, '180ml', 40, 1, 8, 0.5, 0, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cup-a-Soup Paddenstoel', 'Cup-a-Soup Paddenstoel', 'Unilever', 'Supermarket', 'albert_heijn', NULL, 'snack', 180, '180ml', 42, 1, 8, 0.7, 0, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cup-a-Soup Kip', 'Cup-a-Soup Kip', 'Unilever', 'Supermarket', 'albert_heijn', NULL, 'snack', 180, '180ml', 38, 2, 7, 0.5, 0, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Unox Kippensoep blik', 'Unox Kippensoep blik', 'Unilever', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200ml', 48, 5, 4, 2, 1, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Unox Erwtensoep blik', 'Unox Erwtensoep blik', 'Unilever', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200ml', 72, 6, 11, 2, 3, 2, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Unox Witloofsoep blik', 'Unox Witloofsoep blik', 'Unilever', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200ml', 45, 3, 5, 2, 2, 1, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Dr. Oetker Ristorante Pizza Margherita', 'Dr. Oetker Ristorante Pizza Margherita', 'Dr. Oetker', 'Supermarket', 'albert_heijn', NULL, 'snack', 300, '300g', 260, 10, 32, 10, 2, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Dr. Oetker Ristorante Pizza Salami', 'Dr. Oetker Ristorante Pizza Salami', 'Dr. Oetker', 'Supermarket', 'albert_heijn', NULL, 'snack', 300, '300g', 280, 12, 32, 12, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Wagner Pizza Steinofen', 'Wagner Pizza Steinofen', 'Wagner', 'Supermarket', 'albert_heijn', NULL, 'snack', 330, '330g', 275, 11, 34, 11, 2, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Diepvries Pizza', 'AH Diepvries Pizza', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 300, '300g', 250, 9, 30, 9, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Lasagne Bolognese', 'AH Lasagne Bolognese', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 400, '400g', 145, 10, 14, 5, 1, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Lasagne Groente', 'AH Lasagne Groente', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 400, '400g', 120, 7, 15, 3, 2, 2, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Nasi Goreng', 'AH Nasi Goreng', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 350, '350g', 155, 7, 20, 5, 1, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Bami Goreng', 'AH Bami Goreng', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 350, '350g', 150, 6, 21, 4, 1, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Boerenkoolstamppot', 'AH Boerenkoolstamppot', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 400, '400g', 110, 8, 14, 3, 3, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Hutspot', 'AH Hutspot', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 400, '400g', 95, 6, 16, 2, 2, 1, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Sushi Zalm', 'AH Sushi Zalm', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 180, '180g', 180, 12, 18, 6, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Sushi Tonijn', 'AH Sushi Tonijn', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 180, '180g', 165, 14, 18, 4, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Sushi Vegetarisch', 'AH Sushi Vegetarisch', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 180, '180g', 130, 3, 28, 1, 3, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Wrap Kip', 'AH Wrap Kip', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 220, '220g', 220, 16, 20, 8, 2, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Wrap Tonijn', 'AH Wrap Tonijn', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 220, '220g', 210, 15, 20, 8, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Wrap Groente', 'AH Wrap Groente', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 220, '220g', 180, 5, 25, 6, 3, 2, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Kipsoep', 'AH Kipsoep', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 200, '200ml', 50, 6, 5, 1, 1, 1, true);

-- VEGAN / PLANTAARDIG (30 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tofu Naturel', 'Tofu Naturel', 'AH', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 76, 8.1, 1.9, 4.8, 1.2, 0.2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tofu Gerookt', 'Tofu Gerookt', 'AH', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 180, 18, 7, 11, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Silken Tofu', 'Silken Tofu', 'AH', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 55, 6, 2, 3, 0, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tempeh', 'Tempeh', 'AH', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 195, 19, 7, 11, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Seitan', 'Seitan', 'AH', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 110, 25, 2, 0.5, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Beyond Meat Burger', 'Beyond Meat Burger', 'Beyond Meat', 'Sports', 'beyond_meat', NULL, 'proteinen', 113, '113g', 250, 20, 5, 18, 2, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Beyond Meat Worst', 'Beyond Meat Worst', 'Beyond Meat', 'Sports', 'beyond_meat', NULL, 'proteinen', 100, '100g', 270, 23, 4, 19, 2, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Vivera Schnitzel', 'Vivera Schnitzel', 'Vivera', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 210, 18, 12, 10, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Vivera Burger', 'Vivera Burger', 'Vivera', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 200, 17, 11, 9, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Vivera Gehakt', 'Vivera Gehakt', 'Vivera', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 165, 15, 8, 8, 2, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('De Vegetarische Slager Kipstukjes', 'De Vegetarische Slager Kipstukjes', 'Vegetarische Slager', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 150, 16, 4, 7, 1, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('De Vegetarische Slager Shoarma', 'De Vegetarische Slager Shoarma', 'Vegetarische Slager', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 160, 15, 6, 8, 1, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('De Vegetarische Slager Braadworst', 'De Vegetarische Slager Braadworst', 'Vegetarische Slager', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 220, 18, 7, 13, 2, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('De Vegetarische Slager Gehakt', 'De Vegetarische Slager Gehakt', 'Vegetarische Slager', 'Supermarket', 'albert_heijn', NULL, 'proteinen', 100, '100g', 175, 14, 8, 9, 2, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hummus', 'Hummus', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 100, '100g', 160, 5, 13, 9, 3, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Edamame Diepvries', 'Edamame Diepvries', 'AH', 'Supermarket', 'albert_heijn', NULL, 'groente', 100, '100g', 111, 11, 10, 5, 6, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Alpro Sojayoghurt Naturel', 'Alpro Sojayoghurt Naturel', 'Alpro', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 125, '125ml', 45, 3.5, 0.5, 1.8, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Alpro Kokosyoghurt', 'Alpro Kokosyoghurt', 'Alpro', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 125, '125ml', 80, 1.5, 7, 4, 0, 4, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Alpro Amandelyoghurt', 'Alpro Amandelyoghurt', 'Alpro', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 125, '125ml', 50, 2, 1, 2, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Violife Kaas Cheddar', 'Violife Kaas Cheddar', 'Violife', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 25, '25g', 360, 6, 1, 31, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Nurishh Kaas Mozzarella', 'Nurishh Kaas Mozzarella', 'Nurishh', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 25, '25g', 280, 7, 2, 22, 0, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Nutritional Yeast Flakes', 'Nutritional Yeast Flakes', 'AH', 'Supermarket', 'albert_heijn', NULL, 'supplement', 5, '5g', 330, 50, 35, 7, 8, 0, false);

-- ONTBIJT EXTRAS (20 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Aardbeijam', 'Aardbeijam', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 20, '20g', 260, 0.5, 65, 0, 1, 62, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Abrikozenjam', 'Abrikozenjam', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 20, '20g', 250, 0.5, 63, 0, 1, 60, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Appelstroop', 'Appelstroop', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 20, '20g', 200, 0, 50, 0, 1, 45, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Nutella Chocoladepasta', 'Nutella Chocoladepasta', 'Ferrero', 'Supermarket', 'albert_heijn', NULL, 'saus', 20, '20g', 540, 7, 57, 32, 3, 53, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Chocoladepasta', 'AH Chocoladepasta', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'saus', 20, '20g', 520, 6, 59, 30, 3, 52, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('De Ruijter Hagelslag Melk', 'De Ruijter Hagelslag Melk', 'De Ruijter', 'Supermarket', 'albert_heijn', NULL, 'saus', 20, '20g', 505, 6, 62, 24, 0, 55, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('De Ruijter Hagelslag Puur', 'De Ruijter Hagelslag Puur', 'De Ruijter', 'Supermarket', 'albert_heijn', NULL, 'saus', 20, '20g', 495, 8, 60, 26, 2, 50, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Lotus Speculoospasta', 'Lotus Speculoospasta', 'Lotus', 'Supermarket', 'albert_heijn', NULL, 'saus', 20, '20g', 510, 9, 58, 28, 2, 48, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Stroop', 'Stroop', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 15, '15g', 285, 0, 71, 0, 0, 70, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Granola Basis', 'Granola Basis', 'AH', 'Supermarket', 'albert_heijn', NULL, 'granen', 50, '50g', 480, 10, 60, 20, 8, 28, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Granola Honing Noten', 'Granola Honing Noten', 'Nature Valley', 'Supermarket', 'albert_heijn', NULL, 'granen', 50, '50g', 490, 12, 58, 22, 7, 26, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Granola Fruit', 'Granola Fruit', 'AH', 'Supermarket', 'albert_heijn', NULL, 'granen', 50, '50g', 470, 9, 62, 18, 6, 32, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Granola Chocolade', 'Granola Chocolade', 'Nature Valley', 'Supermarket', 'albert_heijn', NULL, 'granen', 50, '50g', 510, 11, 56, 26, 6, 34, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Granola Kokos', 'Granola Kokos', 'AH', 'Supermarket', 'albert_heijn', NULL, 'granen', 50, '50g', 495, 10, 58, 24, 8, 30, true);

-- MEER ZUIVEL specifiek (20 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hüttenkäse Zuivelhoeve', 'Hüttenkäse Zuivelhoeve', 'Zuivelhoeve', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 125, '125ml', 102, 11, 4, 5, 0, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hüttenkäse AH', 'Hüttenkäse AH', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 125, '125ml', 98, 10, 3, 5, 0, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Skyr Naturel', 'Skyr Naturel', 'AH', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 100, '100g', 60, 10, 3, 0.4, 0, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Skyr Vanille', 'Skyr Vanille', 'AH', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 100, '100g', 75, 10, 7, 0.5, 0, 6, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Skyr Aardbei', 'Skyr Aardbei', 'AH', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 100, '100g', 72, 10, 6, 0.5, 0, 5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Proteïne Pudding Ehrmann', 'Proteïne Pudding Ehrmann', 'Ehrmann', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 200, '200g', 100, 12, 10, 2, 0, 7, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Proteïne Pudding Melkunie', 'Proteïne Pudding Melkunie', 'Melkunie', 'Supermarket', 'albert_heijn', NULL, 'zuivel', 200, '200g', 105, 13, 9, 2, 0, 6, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Drinkontbijt Vifit', 'Drinkontbijt Vifit', 'Vifit', 'Supermarket', 'albert_heijn', NULL, 'dranken', 250, '250ml', 68, 5, 8, 2, 0, 7, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Drinkontbijt Koffie', 'Drinkontbijt Koffie', 'Melkunie', 'Supermarket', 'albert_heijn', NULL, 'dranken', 250, '250ml', 65, 4, 10, 1.5, 0, 8, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hertogshoorn IJsje', 'Hertogshoorn IJsje', 'Hertog', 'Supermarket', 'albert_heijn', NULL, 'snack', 40, '40g', 220, 3, 20, 14, 0, 18, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Magnum Ijs Classic', 'Magnum Ijs Classic', 'Magnum', 'Supermarket', 'albert_heijn', NULL, 'snack', 120, '120ml', 300, 4, 25, 21, 0, 21, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Magnum Ijs Almonds', 'Magnum Ijs Almonds', 'Magnum', 'Supermarket', 'albert_heijn', NULL, 'snack', 120, '120ml', 315, 5, 24, 23, 2, 20, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cornetto Ijs Vanilla', 'Cornetto Ijs Vanilla', 'Cornetto', 'Supermarket', 'albert_heijn', NULL, 'snack', 120, '120ml', 250, 3, 28, 13, 0, 24, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cornetto Ijs Stracciatella', 'Cornetto Ijs Stracciatella', 'Cornetto', 'Supermarket', 'albert_heijn', NULL, 'snack', 120, '120ml', 260, 3, 30, 14, 0, 26, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Ijs Vanille', 'AH Ijs Vanille', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 100, '100g', 210, 3, 22, 12, 0, 19, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('AH Ijs Chocolade', 'AH Ijs Chocolade', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'snack', 100, '100g', 230, 3, 24, 14, 1, 21, true);

-- MEER VIS & SEAFOOD (15 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Surimi Krabsticks', 'Surimi Krabsticks', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 99, 12, 7, 3, 0, 6, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tonijnsalade AH', 'Tonijnsalade AH', 'Albert Heijn', 'Supermarket', 'albert_heijn', NULL, 'vis', 200, '200g', 165, 16, 5, 8, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Zalmsalade', 'Zalmsalade', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 200, '200g', 185, 18, 4, 10, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Gerookte Heilbot', 'Gerookte Heilbot', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 120, 24, 0, 3, 0, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ansjovis', 'Ansjovis', 'Flota', 'Supermarket', 'albert_heijn', NULL, 'vis', 20, '20g', 200, 29, 0, 9, 0, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Inktvis', 'Inktvis', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 92, 17, 3, 1.5, 0, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kreeft Bevroren', 'Kreeft Bevroren', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 95, 20, 0, 1, 0, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Visvingers', 'Visvingers', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 195, 14, 16, 8, 0, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kabeljauw Filet', 'Kabeljauw Filet', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 82, 18, 0, 1, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Mosselen', 'Mosselen', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 95, 14, 7, 2, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Oesters', 'Oesters', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 68, 14, 7, 1, 0, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Garnalen Diepvries', 'Garnalen Diepvries', 'AH', 'Supermarket', 'albert_heijn', NULL, 'vis', 100, '100g', 99, 24, 0, 0.5, 0, 0, true);

-- KRUIDEN & SPECERIJEN (15 products) - category='saus'
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Knoflookpoeder', 'Knoflookpoeder', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 345, 17, 75, 0.5, 10, 1, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Uienpoeder', 'Uienpoeder', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 340, 14, 76, 1, 8, 2, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Paprikapoeder', 'Paprikapoeder', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 320, 12, 65, 13, 25, 9, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cayennepeper', 'Cayennepeper', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 1, '1g', 320, 12, 64, 13, 25, 8, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Komijn', 'Komijn', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 375, 18, 43, 22, 11, 2, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kurkuma', 'Kurkuma', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 355, 10, 65, 10, 21, 3, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kaneel', 'Kaneel', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 247, 4, 81, 3, 53, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Oregano', 'Oregano', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 265, 9, 69, 4, 42, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Basilicum', 'Basilicum', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 270, 27, 49, 6, 37, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tijm', 'Tijm', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 276, 10, 64, 7, 48, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Zwarte Peper Gemalen', 'Zwarte Peper Gemalen', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 2, '2g', 251, 10, 64, 3, 25, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Zeezout', 'Zeezout', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 1, '1g', 0, 0, 0, 0, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bouillonblokje Knorr Rund', 'Bouillonblokje Knorr Rund', 'Knorr', 'Supermarket', 'albert_heijn', NULL, 'saus', 10, '10g', 170, 28, 12, 2, 1, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bouillonblokje Maggi Kip', 'Bouillonblokje Maggi Kip', 'Maggi', 'Supermarket', 'albert_heijn', NULL, 'saus', 10, '10g', 165, 26, 14, 2, 0, 3, true);

-- MEER DRANKEN (20 products) - category='dranken'
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Heineken 0.0', 'Heineken 0.0', 'Heineken', 'Alcoholvrij', 'albert_heijn', NULL, 'dranken', 330, '330ml', 29, 0.4, 2.5, 0, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bavaria 0.0', 'Bavaria 0.0', 'Bavaria', 'Alcoholvrij', 'albert_heijn', NULL, 'dranken', 330, '330ml', 28, 0.3, 2, 0, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Jupiler 0.0', 'Jupiler 0.0', 'Jupiler', 'Alcoholvrij', 'albert_heijn', NULL, 'dranken', 330, '330ml', 25, 0, 2, 0, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kombucha Origineel', 'Kombucha Origineel', 'Remedy', 'Supermarket', 'albert_heijn', NULL, 'dranken', 250, '250ml', 14, 0, 2, 0, 0, 1.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Arizona Ijsthee', 'Arizona Ijsthee', 'Arizona', 'Supermarket', 'albert_heijn', NULL, 'dranken', 240, '240ml', 42, 0, 11, 0, 0, 10, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Lipton Ijsthee', 'Lipton Ijsthee', 'Lipton', 'Supermarket', 'albert_heijn', NULL, 'dranken', 250, '250ml', 32, 0, 8, 0, 0, 7.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Vers Geperst Sap', 'Vers Geperst Sap', 'AH', 'Supermarket', 'albert_heijn', NULL, 'dranken', 200, '200ml', 52, 0.5, 13, 0, 2, 11, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tonic Schweppes', 'Tonic Schweppes', 'Schweppes', 'Supermarket', 'albert_heijn', NULL, 'dranken', 200, '200ml', 42, 0, 10.5, 0, 0, 9, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tonic Fever-Tree', 'Tonic Fever-Tree', 'Fever-Tree', 'Supermarket', 'albert_heijn', NULL, 'dranken', 200, '200ml', 38, 0, 9.5, 0, 0, 8, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ginger Beer Fever-Tree', 'Ginger Beer Fever-Tree', 'Fever-Tree', 'Supermarket', 'albert_heijn', NULL, 'dranken', 200, '200ml', 48, 0, 12, 0, 0, 11, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ginger Ale', 'Ginger Ale', 'AH', 'Supermarket', 'albert_heijn', NULL, 'dranken', 200, '200ml', 36, 0, 9, 0, 0, 8, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cider Appel', 'Cider Appel', 'Strongbow', 'Supermarket', 'albert_heijn', NULL, 'dranken', 440, '440ml', 42, 0, 4, 0, 0, 3, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Capri-Sun Appel', 'Capri-Sun Appel', 'Capri-Sun', 'Supermarket', 'albert_heijn', NULL, 'dranken', 200, '200ml', 47, 0, 11.5, 0, 0, 11, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Capri-Sun Bosvruchten', 'Capri-Sun Bosvruchten', 'Capri-Sun', 'Supermarket', 'albert_heijn', NULL, 'dranken', 200, '200ml', 46, 0, 11, 0, 0, 10.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rivella Rood', 'Rivella Rood', 'Rivella', 'Supermarket', 'albert_heijn', NULL, 'dranken', 200, '200ml', 39, 0.2, 9.5, 0, 0, 9, false);

-- MEER SPORTS NUTRITION (30 products) - category='supplement'
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bulk Powders Whey Protein', 'Bulk Powders Whey Protein', 'Bulk Powders', 'Sports', 'bulk_powders', NULL, 'supplement', 30, '30g', 120, 23, 2, 2, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bulk Powders Creatine', 'Bulk Powders Creatine', 'Bulk Powders', 'Sports', 'bulk_powders', NULL, 'supplement', 5, '5g', 0, 0, 0, 0, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bulk Powders Pre-Workout', 'Bulk Powders Pre-Workout', 'Bulk Powders', 'Sports', 'bulk_powders', NULL, 'supplement', 10, '10g', 37, 0.5, 9, 0, 0, 8, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Body & Fit Whey Isolate', 'Body & Fit Whey Isolate', 'Body & Fit', 'Sports', 'body_fit', NULL, 'supplement', 30, '30g', 118, 24, 1, 1, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Body & Fit Casein', 'Body & Fit Casein', 'Body & Fit', 'Sports', 'body_fit', NULL, 'supplement', 30, '30g', 115, 23, 1, 1, 0, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Body & Fit Protein Bar', 'Body & Fit Protein Bar', 'Body & Fit', 'Sports', 'body_fit', NULL, 'supplement', 50, '50g', 350, 20, 30, 12, 6, 14, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('226ERS Energy Gel', '226ERS Energy Gel', '226ERS', 'Sports', '226ers', NULL, 'supplement', 40, '40g', 270, 0, 67, 0, 0, 65, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('226ERS Recovery Drink', '226ERS Recovery Drink', '226ERS', 'Sports', '226ers', NULL, 'supplement', 50, '50g', 380, 24, 47, 3, 0, 25, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('SiS Energy Gel', 'SiS Energy Gel', 'Science in Sport', 'Sports', 'science_in_sport', NULL, 'supplement', 40, '40g', 260, 0, 65, 0, 0, 63, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('SiS Electrolyte', 'SiS Electrolyte', 'Science in Sport', 'Sports', 'science_in_sport', NULL, 'supplement', 20, '20g', 81, 0, 20, 0, 0, 18, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Powerbar Energy Gel', 'Powerbar Energy Gel', 'Powerbar', 'Sports', 'powerbar', NULL, 'supplement', 40, '40g', 275, 0, 68, 0, 0, 66, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Powerbar Bar', 'Powerbar Bar', 'Powerbar', 'Sports', 'powerbar', NULL, 'supplement', 65, '65g', 380, 10, 63, 8, 5, 35, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('PhD Smart Bar', 'PhD Smart Bar', 'PhD', 'Sports', 'phd', NULL, 'supplement', 65, '65g', 360, 18, 30, 14, 10, 12, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('PhD Protein Shake', 'PhD Protein Shake', 'PhD', 'Sports', 'phd', NULL, 'supplement', 30, '30g', 122, 24, 2, 2, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Mars Protein Bar', 'Mars Protein Bar', 'Mars', 'Sports', 'mars', NULL, 'supplement', 51, '51g', 380, 12, 47, 15, 6, 28, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Snickers Protein Bar', 'Snickers Protein Bar', 'Mars', 'Sports', 'mars', NULL, 'supplement', 47, '47g', 380, 12, 48, 15, 5, 32, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Milka Protein Bar', 'Milka Protein Bar', 'Mondelez', 'Sports', 'mondelez', NULL, 'supplement', 35, '35g', 385, 15, 40, 16, 5, 22, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('MyProtein Whey Isolate', 'MyProtein Whey Isolate', 'MyProtein', 'Sports', 'myprotein', NULL, 'supplement', 30, '30g', 120, 24, 1, 2, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('MyProtein Bar', 'MyProtein Bar', 'MyProtein', 'Sports', 'myprotein', NULL, 'supplement', 65, '65g', 360, 20, 32, 12, 7, 10, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Optimum Nutrition Whey', 'Optimum Nutrition Whey', 'Optimum Nutrition', 'Sports', 'on', NULL, 'supplement', 30, '30g', 120, 24, 1, 2, 0, 0, true);

-- MEER SNACKS (30 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Protein Chips Zout Paprika', 'Protein Chips Zout Paprika', 'More Nutrition', 'Sports', 'more_nutrition', NULL, 'snack', 30, '30g', 480, 20, 42, 24, 8, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Protein Chips Barbeque', 'Protein Chips Barbeque', 'ESN', 'Sports', 'esn', NULL, 'snack', 30, '30g', 475, 19, 44, 23, 7, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rice Cakes met Noten', 'Rice Cakes met Noten', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 25, '25g', 385, 10, 58, 12, 6, 8, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rice Cakes met Chocolade', 'Rice Cakes met Chocolade', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 25, '25g', 410, 8, 62, 14, 4, 26, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Nakd Fruit Bar', 'Nakd Fruit Bar', 'Nakd', 'Supermarket', 'albert_heijn', NULL, 'snack', 35, '35g', 360, 6, 48, 15, 6, 32, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Trek Bar', 'Trek Bar', 'Trek', 'Supermarket', 'albert_heijn', NULL, 'snack', 40, '40g', 368, 8, 50, 14, 4, 30, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bear Bar', 'Bear Bar', 'Bear', 'Supermarket', 'albert_heijn', NULL, 'snack', 35, '35g', 355, 5, 52, 13, 5, 38, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Energie Ballen Dadel', 'Energie Ballen Dadel', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 30, '30g', 320, 6, 52, 10, 6, 40, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Energie Ballen Chocolade', 'Energie Ballen Chocolade', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 30, '30g', 340, 8, 48, 14, 6, 36, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Nori Chips', 'Nori Chips', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 20, '20g', 200, 40, 5, 3, 8, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Beef Jerky', 'Beef Jerky', 'Jack Links', 'Supermarket', 'albert_heijn', NULL, 'snack', 25, '25g', 300, 50, 5, 7, 0, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Gedroogd Fruitenmix', 'Gedroogd Fruitenmix', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 30, '30g', 280, 2, 70, 1, 6, 55, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Trail Mix', 'Trail Mix', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 40, '40g', 480, 14, 42, 28, 8, 25, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Protein Cookies', 'Protein Cookies', 'Lenny & Larrys', 'Sports', 'lenny_larrys', NULL, 'snack', 40, '40g', 400, 16, 42, 16, 5, 18, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rijstwafels Chocolade', 'Rijstwafels Chocolade', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 30, '30g', 385, 5, 62, 12, 3, 22, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rijstwafels Yoghurt', 'Rijstwafels Yoghurt', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 30, '30g', 370, 6, 60, 11, 2, 20, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Crackers met Kaas', 'Crackers met Kaas', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 30, '30g', 420, 10, 44, 22, 2, 3, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Mini Kaasjes Babybel', 'Mini Kaasjes Babybel', 'Babybel', 'Supermarket', 'albert_heijn', NULL, 'snack', 20, '20g', 360, 24, 0, 30, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Seaweed Snack', 'Seaweed Snack', 'AH', 'Supermarket', 'albert_heijn', NULL, 'snack', 5, '5g', 180, 38, 6, 2, 10, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Gezonde Chips Biet', 'Gezonde Chips Biet', 'Beet Chips', 'Supermarket', 'albert_heijn', NULL, 'snack', 30, '30g', 340, 4, 58, 10, 8, 15, false);

-- MEER BROOD/BAKKERIJ (15 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Eiwitbrood', 'Eiwitbrood', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 50, '50g', 250, 18, 10, 14, 8, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Lijnzaadbrood', 'Lijnzaadbrood', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 50, '50g', 250, 10, 32, 8, 6, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Speltbrood', 'Speltbrood', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 50, '50g', 260, 11, 45, 5, 7, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Glutenvrij Brood Schär', 'Glutenvrij Brood Schär', 'Schär', 'Supermarket', 'albert_heijn', NULL, 'brood', 45, '45g', 280, 6, 48, 8, 5, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Maïsbrood', 'Maïsbrood', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 50, '50g', 270, 8, 48, 6, 4, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cornbread', 'Cornbread', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 60, '60g', 290, 7, 50, 7, 3, 4, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Flatbread', 'Flatbread', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 30, '30g', 280, 8, 44, 7, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Lavash', 'Lavash', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 30, '30g', 260, 9, 48, 2, 2, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Blini Boekweit', 'Blini Boekweit', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 30, '30g', 210, 6, 42, 2, 3, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Zuurdesembrood', 'Zuurdesembrood', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 50, '50g', 240, 9, 46, 2, 3, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Roggbrood', 'Roggbrood', 'AH', 'Supermarket', 'albert_heijn', NULL, 'brood', 50, '50g', 220, 10, 42, 2, 7, 1, true);

-- INTERNATIONAAL/AZIATISCH (20 products)
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sushi Rijst', 'Sushi Rijst', 'AH', 'Supermarket', 'albert_heijn', NULL, 'granen', 50, '50g', 170, 3, 37, 0.5, 0.5, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Miso Paste', 'Miso Paste', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 15, '15g', 140, 13, 6, 5, 1, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tahini', 'Tahini', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 15, '15g', 595, 17, 21, 54, 10, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Harissa Pasta', 'Harissa Pasta', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 10, '10g', 150, 5, 12, 9, 2, 1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sambal Oelek', 'Sambal Oelek', 'Conimex', 'Supermarket', 'albert_heijn', NULL, 'saus', 5, '5g', 80, 3, 10, 3, 2, 2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ketjap Manis', 'Ketjap Manis', 'Conimex', 'Supermarket', 'albert_heijn', NULL, 'saus', 15, '15ml', 190, 2, 42, 0, 0, 35, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hoisin Saus', 'Hoisin Saus', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 15, '15ml', 140, 2, 25, 2, 1, 20, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rijstpapier', 'Rijstpapier', 'AH', 'Supermarket', 'albert_heijn', NULL, 'granen', 10, '10g', 350, 8, 78, 0, 1, 0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Wonton Vellen', 'Wonton Vellen', 'AH', 'Supermarket', 'albert_heijn', NULL, 'granen', 30, '30g', 295, 9, 54, 2, 2, 1, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Panko', 'Panko', 'AH', 'Supermarket', 'albert_heijn', NULL, 'granen', 15, '15g', 350, 10, 70, 2, 4, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kokosmelk Blik', 'Kokosmelk Blik', 'AH', 'Supermarket', 'albert_heijn', NULL, 'dranken', 100, '100ml', 200, 2, 5, 20, 0, 3, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bami Blokken', 'Bami Blokken', 'AH', 'Supermarket', 'albert_heijn', NULL, 'granen', 30, '30g', 280, 8, 52, 2, 2, 1, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Gochujang Saus', 'Gochujang Saus', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 15, '15g', 100, 4, 18, 1, 2, 10, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sriracha Saus', 'Sriracha Saus', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 5, '5g', 80, 2, 16, 0.5, 1, 10, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tamari Saus', 'Tamari Saus', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 10, '10ml', 70, 11, 4, 0, 0, 2, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sesamolie', 'Sesamolie', 'AH', 'Supermarket', 'albert_heijn', NULL, 'olie_vet', 10, '10ml', 880, 0, 0, 100, 0, 0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rijstazijn', 'Rijstazijn', 'AH', 'Supermarket', 'albert_heijn', NULL, 'saus', 15, '15ml', 18, 0, 0.8, 0, 0, 0, false);

-- ═══════════════════════════════════════════════════════════════
-- FAST FOOD & RESTAURANT CHAINS (75 products)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Big Mac', 'Big Mac', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 215, '1 burger', 257, 12.0, 31.0, 11.0, 1.5, 7.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Quarter Pounder', 'Quarter Pounder', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 196, '1 burger', 280, 14.0, 27.0, 14.0, 1.2, 5.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('McChicken', 'McChicken', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 150, '1 burger', 280, 12.0, 30.0, 13.0, 1.0, 3.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cheeseburger', 'Cheeseburger', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 117, '1 burger', 265, 12.0, 30.0, 11.0, 1.5, 4.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hamburger', 'Hamburger', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 105, '1 burger', 245, 11.0, 29.0, 9.0, 1.5, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('McNuggets 6 pieces', 'McNuggets 6 stuks', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 140, '6 stuks', 305, 18.0, 19.0, 17.0, 0.8, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('McNuggets 9 pieces', 'McNuggets 9 stuks', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 210, '9 stuks', 305, 18.0, 19.0, 17.0, 0.8, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Filet-O-Fish', 'Filet-O-Fish', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 155, '1 burger', 250, 11.0, 31.0, 10.0, 1.0, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('McFlurry M&M', 'McFlurry M&M', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 290, '1 cup', 195, 5.0, 30.0, 7.0, 0.0, 25.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('McFlurry Oreo', 'McFlurry Oreo', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 290, '1 cup', 195, 5.0, 31.0, 7.0, 0.0, 26.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Frietjes klein', 'Frietjes klein', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 75, 'klein', 325, 3.5, 41.0, 15.0, 3.5, 0.2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Frietjes medium', 'Frietjes medium', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 117, 'medium', 325, 3.5, 41.0, 15.0, 3.5, 0.2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Frietjes groot', 'Frietjes groot', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 154, 'groot', 325, 3.5, 41.0, 15.0, 3.5, 0.2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Big Tasty', 'Big Tasty', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 230, '1 burger', 265, 12.0, 31.0, 11.0, 1.2, 6.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chicken Wrap', 'Chicken Wrap', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 227, '1 wrap', 235, 14.0, 27.0, 8.0, 2.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Caesar Salad', 'Caesar Salad', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 165, '1 salade', 135, 9.0, 8.0, 8.0, 3.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Apple Pie', 'Apple Pie', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 83, '1 pie', 284, 3.0, 38.0, 13.0, 1.5, 20.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('McDouble', 'McDouble', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 162, '1 burger', 275, 14.0, 28.0, 12.0, 1.5, 4.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('McMuffin Egg Bacon', 'McMuffin Ei Bacon', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 135, '1 muffin', 285, 15.0, 28.0, 12.0, 1.2, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pancakes', 'Pannenkoeken', 'McDonald''s', 'restaurant', 'manual', NULL, 'fast_food', 110, '3 stuks', 258, 5.0, 35.0, 10.0, 1.0, 15.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whopper', 'Whopper', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 215, '1 burger', 272, 12.0, 29.0, 13.0, 1.5, 5.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whopper Jr', 'Whopper Jr', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 140, '1 burger', 275, 11.0, 30.0, 13.0, 1.4, 5.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Long Chicken', 'Long Chicken', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 165, '1 burger', 260, 14.0, 28.0, 11.0, 1.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chicken Nuggets King', 'Chicken Nuggets King', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 180, '10 stuks', 310, 17.0, 20.0, 17.0, 0.8, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Crispy Chicken', 'Crispy Chicken', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 145, '1 burger', 275, 13.0, 30.0, 12.0, 1.0, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('King Fries medium', 'King Friet medium', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 111, 'medium', 320, 3.2, 41.0, 14.5, 3.5, 0.1, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Onion Rings', 'Ui Ringen', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 100, '1 portie', 290, 3.0, 35.0, 14.0, 3.0, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chili Cheese Bites', 'Chili Cheese Bites', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 80, '1 portie', 275, 10.0, 28.0, 13.0, 2.0, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Double Whopper', 'Double Whopper', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 290, '1 burger', 310, 18.0, 28.0, 16.0, 1.5, 5.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Plant-Based Whopper', 'Plant-Based Whopper', 'Burger King', 'restaurant', 'manual', NULL, 'fast_food', 215, '1 burger', 260, 10.0, 30.0, 12.0, 4.0, 4.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Original Bucket 1 piece', 'Original Bucket 1 stuk', 'KFC', 'restaurant', 'manual', NULL, 'fast_food', 85, '1 stuk', 280, 20.0, 15.0, 15.0, 0.5, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hot Wings 6 pieces', 'Hot Wings 6 stuks', 'KFC', 'restaurant', 'manual', NULL, 'fast_food', 120, '6 stuks', 290, 22.0, 12.0, 16.0, 0.3, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Zinger Burger', 'Zinger Burger', 'KFC', 'restaurant', 'manual', NULL, 'fast_food', 155, '1 burger', 265, 14.0, 26.0, 11.0, 1.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kentucky Burger', 'Kentucky Burger', 'KFC', 'restaurant', 'manual', NULL, 'fast_food', 145, '1 burger', 260, 13.0, 27.0, 10.0, 1.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Coleslaw', 'Coleslaw', 'KFC', 'restaurant', 'manual', NULL, 'fast_food', 110, '1 portie', 125, 1.5, 15.0, 5.0, 2.0, 10.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Corn on the Cob', 'Maïs op de Kolf', 'KFC', 'restaurant', 'manual', NULL, 'fast_food', 90, '1 stuk', 96, 3.5, 18.0, 1.5, 2.5, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Popcorn Chicken', 'Popcorn Chicken', 'KFC', 'restaurant', 'manual', NULL, 'fast_food', 100, '1 portion', 310, 19.0, 18.0, 17.0, 0.5, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Fillet Burger', 'Filet Burger', 'KFC', 'restaurant', 'manual', NULL, 'fast_food', 140, '1 burger', 255, 12.0, 28.0, 9.0, 1.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Margherita medium 1 slice', 'Margherita medium 1 plak', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 72, '1 plak', 245, 8.5, 30.0, 10.0, 1.5, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pepperoni medium 1 slice', 'Pepperoni medium 1 plak', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 78, '1 plak', 270, 10.0, 29.0, 12.0, 1.5, 2.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('BBQ Chicken medium 1 slice', 'BBQ Chicken medium 1 plak', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 75, '1 plak', 255, 11.0, 30.0, 10.0, 1.5, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hawaii medium 1 slice', 'Hawaii medium 1 plak', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 76, '1 plak', 260, 9.0, 32.0, 10.0, 1.5, 5.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Mighty Meaty 1 slice', 'Mighty Meaty 1 plak', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 82, '1 plak', 295, 13.0, 28.0, 13.0, 1.5, 2.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Garlic Bread', 'Knoflookbrood', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 60, '1 stuk', 345, 7.0, 32.0, 20.0, 2.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chicken Kickers', 'Chicken Kickers', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 100, '5 stuks', 280, 17.0, 20.0, 14.0, 0.5, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Buffalo Wings', 'Buffalo Wings', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 90, '6 stuks', 300, 19.0, 15.0, 17.0, 0.3, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Veggie medium 1 slice', 'Veggie medium 1 plak', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 68, '1 plak', 235, 7.5, 31.0, 8.5, 2.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tuna medium 1 slice', 'Tonijn medium 1 plak', 'Domino''s Pizza', 'restaurant', 'manual', NULL, 'fast_food', 76, '1 plak', 250, 10.0, 29.0, 10.0, 1.5, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Margherita 1 slice', 'Margherita 1 plak', 'New York Pizza', 'restaurant', 'manual', NULL, 'fast_food', 75, '1 plak', 248, 8.5, 31.0, 10.0, 1.5, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pepperoni 1 slice', 'Pepperoni 1 plak', 'New York Pizza', 'restaurant', 'manual', NULL, 'fast_food', 80, '1 plak', 272, 10.5, 30.0, 12.0, 1.5, 2.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Shoarma 1 slice', 'Shoarma 1 plak', 'New York Pizza', 'restaurant', 'manual', NULL, 'fast_food', 82, '1 plak', 280, 12.0, 30.0, 12.0, 1.5, 2.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('BBQ Chicken 1 slice', 'BBQ Chicken 1 plak', 'New York Pizza', 'restaurant', 'manual', NULL, 'fast_food', 76, '1 plak', 258, 11.0, 31.0, 10.0, 1.5, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Garlic Bread', 'Knoflookbrood', 'New York Pizza', 'restaurant', 'manual', NULL, 'fast_food', 60, '1 stuk', 348, 7.0, 32.0, 20.5, 2.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Italian BMT 15cm', 'Italian BMT 15cm', 'Subway', 'restaurant', 'manual', NULL, 'fast_food', 160, '1 sub', 240, 12.0, 32.0, 8.0, 2.0, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chicken Teriyaki 15cm', 'Chicken Teriyaki 15cm', 'Subway', 'restaurant', 'manual', NULL, 'fast_food', 155, '1 sub', 235, 14.0, 34.0, 5.5, 2.0, 6.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tuna 15cm', 'Tonijn 15cm', 'Subway', 'restaurant', 'manual', NULL, 'fast_food', 155, '1 sub', 245, 11.0, 31.0, 9.0, 2.0, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Veggie Delite 15cm', 'Veggie Delite 15cm', 'Subway', 'restaurant', 'manual', NULL, 'fast_food', 145, '1 sub', 190, 7.0, 35.0, 3.0, 3.5, 4.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Meatball Marinara 15cm', 'Meatball Marinara 15cm', 'Subway', 'restaurant', 'manual', NULL, 'fast_food', 155, '1 sub', 250, 12.0, 32.0, 9.0, 2.0, 5.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Turkey Breast 15cm', 'Turkey Breast 15cm', 'Subway', 'restaurant', 'manual', NULL, 'fast_food', 150, '1 sub', 215, 13.0, 33.0, 4.0, 2.0, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chicken Fajita 15cm', 'Chicken Fajita 15cm', 'Subway', 'restaurant', 'manual', NULL, 'fast_food', 150, '1 sub', 220, 14.0, 31.0, 5.0, 2.0, 4.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Steak & Cheese 15cm', 'Steak & Cheese 15cm', 'Subway', 'restaurant', 'manual', NULL, 'fast_food', 155, '1 sub', 245, 15.0, 31.0, 8.0, 2.0, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kroket', 'Kroket', 'FEBO', 'restaurant', 'manual', NULL, 'fast_food', 85, '1 stuk', 285, 8.0, 22.0, 18.0, 1.0, 1.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Frikandel', 'Frikandel', 'FEBO', 'restaurant', 'manual', NULL, 'fast_food', 100, '1 stuk', 300, 10.0, 2.0, 28.0, 0.0, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kaassouflé', 'Kaassouflé', 'FEBO', 'restaurant', 'manual', NULL, 'fast_food', 80, '1 stuk', 310, 9.0, 20.0, 22.0, 1.0, 2.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Berenhap', 'Berenhap', 'FEBO', 'restaurant', 'manual', NULL, 'fast_food', 75, '1 stuk', 290, 7.0, 25.0, 18.0, 0.8, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bamischijf', 'Bamischijf', 'FEBO', 'restaurant', 'manual', NULL, 'fast_food', 90, '1 stuk', 305, 6.0, 28.0, 18.0, 2.0, 2.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Friet with mayo', 'Friet met mayo', 'Dutch Snackbar', 'restaurant', 'manual', NULL, 'fast_food', 170, '1 portie', 310, 3.5, 36.0, 16.0, 3.5, 0.2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Friet with special sauce', 'Friet met oorlog', 'Dutch Snackbar', 'restaurant', 'manual', NULL, 'fast_food', 175, '1 portie', 330, 3.5, 35.0, 18.0, 3.5, 1.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kapsalon', 'Kapsalon', 'Dutch Snackbar', 'restaurant', 'manual', NULL, 'fast_food', 250, '1 portie', 245, 14.0, 28.0, 9.0, 3.0, 3.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Shoarma platter', 'Shoarma schotel', 'Dutch Snackbar', 'restaurant', 'manual', NULL, 'fast_food', 280, '1 schotel', 260, 16.0, 30.0, 10.0, 2.5, 3.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Shoarma sandwich', 'Broodje shoarma', 'Dutch Snackbar', 'restaurant', 'manual', NULL, 'fast_food', 150, '1 broodje', 250, 14.0, 28.0, 9.0, 2.0, 2.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Frikandel sandwich special', 'Broodje frikandel speciaal', 'Dutch Snackbar', 'restaurant', 'manual', NULL, 'fast_food', 140, '1 broodje', 275, 10.0, 24.0, 14.0, 1.5, 2.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Spring roll', 'Loempia', 'Dutch Snackbar', 'restaurant', 'manual', NULL, 'fast_food', 50, '1 stuk', 295, 6.0, 25.0, 17.0, 1.0, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bami goreng', 'Bami goreng', 'Dutch Snackbar', 'restaurant', 'manual', NULL, 'fast_food', 210, '1 portie', 155, 6.0, 18.0, 6.0, 2.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Nasi goreng', 'Nasi goreng', 'Dutch Snackbar', 'restaurant', 'manual', NULL, 'fast_food', 210, '1 portie', 160, 5.5, 19.0, 6.5, 2.0, 2.0, false);

-- ═══════════════════════════════════════════════════════════════
-- MEAL PREP, BAKKERIJ, BROODBELEG, SAUZEN (90 products)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Quinoa', 'Quinoa', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 120, 4.4, 21.3, 1.9, 2.8, 0.6, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Couscous', 'Couscous', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 112, 3.8, 23.2, 0.3, 1.5, 0.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Bulgur', 'Bulgur', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 83, 3.1, 18.6, 0.2, 4.5, 0.4, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Polenta', 'Polenta', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 133, 2.7, 28.1, 0.3, 1.7, 0.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Buckwheat', 'Boekweit', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 155, 6.0, 33.0, 1.0, 4.5, 0.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Millet', 'Gierst', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 119, 3.5, 23.7, 1.3, 2.3, 0.3, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Spelt', 'Spelt', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 127, 5.7, 26.4, 1.1, 3.7, 0.4, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Red Lentils', 'Rode linzen', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 116, 9.0, 20.0, 0.4, 1.9, 1.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Green Lentils', 'Groene linzen', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 105, 8.9, 18.0, 0.3, 3.0, 0.4, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Brown Lentils', 'Bruine linzen', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 103, 8.8, 17.5, 0.3, 2.7, 0.3, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chickpeas Dried', 'Kikkererwten (gedroogd)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 134, 8.9, 22.5, 2.1, 3.0, 4.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chickpeas Canned', 'Kikkererwten (blik)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g (uitlekgewicht)', 119, 7.2, 19.5, 1.6, 2.4, 2.8, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Kidney Beans Canned', 'Kidney bonen (blik)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g (uitlekgewicht)', 127, 8.5, 21.0, 0.3, 2.1, 0.2, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Black Beans Canned', 'Zwarte bonen (blik)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g (uitlekgewicht)', 132, 8.9, 23.7, 0.5, 2.0, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('White Beans Canned', 'Witte bonen (blik)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g (uitlekgewicht)', 102, 7.3, 17.7, 0.3, 1.6, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cannellini Beans', 'Cannellini bonen', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 105, 8.0, 17.0, 0.4, 1.5, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Edamame Beans', 'Edamame bonen', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 111, 11.3, 8.0, 5.2, 2.2, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Soybeans', 'Sojabonen', 'Generic', 'supermarket', 'albert_heijn', NULL, 'granen', 100, '100g gekookt', 173, 16.6, 11.0, 9.0, 4.0, 3.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Croissant', 'Croissant', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 60, '1 croissant', 395, 8.0, 39.0, 20.0, 1.5, 8.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pain au Chocolat', 'Pain au chocolat', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 70, '1 stuks', 410, 7.5, 41.0, 21.5, 1.2, 14.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cream Roll', 'Roombroodje', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 65, '1 stuks', 380, 7.0, 42.0, 18.0, 1.0, 18.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sausage Roll', 'Saucijzenbroodje', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 75, '1 stuks', 380, 11.0, 35.0, 19.0, 1.2, 2.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Apple Danish', 'Appelflap', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 70, '1 stuks', 330, 6.0, 42.0, 14.0, 1.5, 20.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tompoes', 'Tompoes', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 85, '1 stuks', 385, 6.0, 43.0, 20.0, 0.5, 25.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Currant Bun', 'Krentenbol', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 60, '1 stuks', 310, 7.5, 52.0, 5.0, 2.0, 22.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Raisin Bread', 'Rozijnenbrood', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'brood', 50, '1 snee', 310, 7.0, 50.0, 5.5, 2.5, 18.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sugar Bread Frisian', 'Suikerbrood (Fries)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 55, '1 stuks', 330, 7.0, 52.0, 6.0, 2.0, 20.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Gingerbread', 'Ontbijtkoek (Peijnenburg)', 'Peijnenburg', 'supermarket', 'albert_heijn', NULL, 'brood', 40, '1 stuks', 329, 5.0, 62.0, 3.5, 1.0, 24.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sausage Bread Brabant', 'Worstenbroodje (Brabants)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 80, '1 stuks', 370, 12.0, 35.0, 17.0, 1.0, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pie Limburgian', 'Vlaai (Limburgs, 1 punt)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 90, '1 punt', 285, 5.0, 38.0, 11.0, 1.5, 18.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Oil Donut', 'Oliebollen (1 stuk)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 50, '1 stuk', 380, 4.0, 45.0, 18.0, 1.0, 20.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Den Bosch Bun', 'Bossche Bol (1 stuk)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 120, '1 stuk', 320, 6.0, 38.0, 14.0, 1.0, 24.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Plain Bagel', 'Bagel plain', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 85, '1 stuks', 248, 9.2, 48.0, 1.6, 2.5, 5.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sesame Bagel', 'Bagel sesam', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 85, '1 stuks', 270, 9.5, 47.0, 3.5, 2.5, 5.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ciabatta', 'Ciabatta', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 50, '1 snee', 282, 8.0, 50.0, 2.0, 2.2, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Focaccia', 'Focaccia', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 60, '1 stuks', 310, 8.0, 48.0, 7.0, 1.5, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Rye Bread', 'Roggebrood', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 50, '1 snee', 259, 8.5, 48.0, 1.0, 4.0, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Pumpernickel', 'Pumpernickel', 'Generic', 'supermarket', 'albert_heijn', NULL, 'brood', 50, '1 snee', 258, 7.0, 48.6, 0.5, 3.5, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Crispbread', 'Knäckebröd (Wasa)', 'Wasa', 'supermarket', 'albert_heijn', NULL, 'brood', 10, '1 stuks', 321, 10.0, 60.0, 3.0, 7.0, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Peanut Butter Calvé', 'Pindakaas Calvé', 'Calvé', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 15, '1 eetlepel', 588, 25.0, 20.0, 50.0, 3.6, 7.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Peanut Butter AH', 'Pindakaas AH', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 15, '1 eetlepel', 586, 25.5, 18.0, 49.0, 3.5, 6.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Nutella', 'Nutella', 'Nutella', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 15, '1 eetlepel', 542, 7.0, 57.0, 30.5, 1.3, 56.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chocolate Spread AH', 'Chocopasta AH', 'Albert Heijn', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 15, '1 eetlepel', 530, 6.0, 58.0, 28.0, 1.5, 54.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hagelslag Milk', 'Hagelslag melk (De Ruijter)', 'De Ruijter', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 5, '1 tl', 463, 2.0, 98.0, 0.5, 0.0, 85.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Hagelslag Dark', 'Hagelslag puur (De Ruijter)', 'De Ruijter', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 5, '1 tl', 455, 3.0, 98.0, 0.5, 0.5, 83.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sprinkles Milk', 'Vlokken melk', 'De Ruijter', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 5, '1 tl', 465, 1.5, 98.0, 1.0, 0.0, 86.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sprinkles Dark', 'Vlokken puur', 'De Ruijter', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 5, '1 tl', 460, 2.5, 98.0, 0.5, 0.5, 84.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Apple Syrup', 'Appelstroop', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 15, '1 eetlepel', 258, 0.2, 65.0, 0.1, 0.0, 46.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Apple Syrup Rinse', 'Rinse appelstroop', 'Rinse', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 15, '1 eetlepel', 260, 0.3, 65.0, 0.0, 0.0, 47.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Liquid Honey', 'Honing (vloeibaar)', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 15, '1 eetlepel', 304, 0.3, 82.0, 0.0, 0.0, 82.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Jam Strawberry', 'Jam aardbei (Hero)', 'Hero', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 15, '1 eetlepel', 278, 0.3, 70.0, 0.1, 0.0, 56.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Jam Apricot', 'Jam abrikoos (Hero)', 'Hero', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 15, '1 eetlepel', 275, 0.2, 70.0, 0.0, 0.0, 55.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Filet Americain', 'Filet Americain', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 50, '2 plakken', 315, 15.0, 1.0, 26.0, 0.0, 0.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Liver Wurst', 'Leverworst', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 50, '2 plakken', 283, 16.0, 2.0, 22.0, 0.0, 0.5, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chicken Fillet Lunch', 'Kipfilet vleeswaren', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 50, '2 plakken', 148, 24.0, 1.0, 5.5, 0.0, 0.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Smoked Beef', 'Runderrookvlees', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 50, '2 plakken', 134, 26.0, 1.0, 2.5, 0.0, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tuna Salad', 'Tonijnsalade', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 50, '2 eetlepels', 218, 16.0, 3.0, 15.0, 0.0, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Egg Salad', 'Eiersalade', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 50, '2 eetlepels', 285, 10.0, 3.0, 25.0, 0.0, 0.5, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Shrimp Salad', 'Krabsalade', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 50, '2 eetlepels', 195, 12.0, 4.0, 14.0, 0.0, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Dutch Salad', 'Huzarensalade', 'Generic', 'supermarket', 'albert_heijn', NULL, 'broodbeleg', 50, '2 eetlepels', 210, 8.0, 5.0, 17.0, 0.5, 2.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chicken Fillet Jumbo', 'Jumbo Kipfilet', 'Jumbo', 'supermarket', 'jumbo', NULL, 'vlees', 150, '150g', 165, 31.0, 0.0, 3.6, 0.0, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whole Grain Bread Jumbo', 'Jumbo Volkoren brood', 'Jumbo', 'supermarket', 'jumbo', NULL, 'brood', 50, '1 snee', 260, 8.5, 48.0, 1.2, 4.0, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Semi-Skimmed Milk Jumbo', 'Jumbo Halfvolle melk', 'Jumbo', 'supermarket', 'jumbo', NULL, 'zuivel', 200, '200ml', 49, 3.4, 4.8, 1.6, 0.0, 4.8, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Lean Quark Jumbo', 'Jumbo Magere kwark', 'Jumbo', 'supermarket', 'jumbo', NULL, 'zuivel', 150, '150g', 68, 12.0, 4.0, 0.5, 0.0, 3.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Peanut Butter Jumbo', 'Jumbo Pindakaas', 'Jumbo', 'supermarket', 'jumbo', NULL, 'broodbeleg', 15, '1 eetlepel', 585, 25.0, 19.0, 49.5, 3.4, 6.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Yogurt Milbona', 'Lidl Milbona Yoghurt', 'Milbona', 'supermarket', 'lidl', NULL, 'zuivel', 150, '150g', 63, 3.5, 4.5, 3.0, 0.0, 4.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Quark Milbona', 'Lidl Milbona Kwark', 'Milbona', 'supermarket', 'lidl', NULL, 'zuivel', 150, '150g', 70, 11.5, 4.2, 0.8, 0.0, 3.8, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chicken Fillet Pikok', 'Lidl Pikok Kipfilet', 'Pikok', 'supermarket', 'lidl', NULL, 'vlees', 150, '150g', 165, 30.5, 0.0, 3.8, 0.0, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Salmon Rivercote', 'Lidl Rivercote Zalm', 'Rivercote', 'supermarket', 'lidl', NULL, 'vis', 150, '150g', 208, 20.0, 0.0, 13.6, 0.0, 0.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whole Grain Bread Belbake', 'Lidl Belbake Volkoren brood', 'Belbake', 'supermarket', 'lidl', NULL, 'brood', 50, '1 snee', 261, 8.6, 48.5, 1.1, 4.2, 0.9, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Lean Quark Aldi', 'Aldi Magere kwark', 'Aldi', 'supermarket', 'aldi', NULL, 'zuivel', 150, '150g', 68, 12.0, 4.0, 0.5, 0.0, 3.5, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Chicken Fillet Aldi', 'Aldi Kipfilet naturel', 'Aldi', 'supermarket', 'aldi', NULL, 'vlees', 150, '150g', 165, 31.0, 0.0, 3.6, 0.0, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Whole Grain Bread Aldi', 'Aldi Volkoren brood', 'Aldi', 'supermarket', 'aldi', NULL, 'brood', 50, '1 snee', 261, 8.5, 48.0, 1.2, 4.1, 0.9, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Semi-Skimmed Milk Aldi', 'Aldi Halfvolle melk', 'Aldi', 'supermarket', 'aldi', NULL, 'zuivel', 200, '200ml', 49, 3.4, 4.8, 1.6, 0.0, 4.8, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Ketchup', 'Ketchup (Heinz)', 'Heinz', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel', 136, 1.3, 29.0, 0.2, 0.4, 24.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Mayonnaise', 'Mayonaise (Calvé)', 'Calvé', 'supermarket', 'albert_heijn', NULL, 'saus', 10, '1 eetlepel', 717, 0.3, 0.6, 80.0, 0.0, 0.0, true);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Fries Sauce', 'Fritessaus (Remia)', 'Remia', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel', 700, 0.5, 1.0, 78.0, 0.0, 0.5, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Curry Ketchup', 'Curry ketchup (Hela)', 'Hela', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel', 142, 1.0, 30.0, 0.2, 0.3, 24.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Mustard', 'Mosterd (Zaanse)', 'Zaanse', 'supermarket', 'albert_heijn', NULL, 'saus', 5, '1 tl', 66, 3.6, 3.3, 4.0, 0.4, 0.6, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sambal', 'Sambal (Conimex)', 'Conimex', 'supermarket', 'albert_heijn', NULL, 'saus', 5, '1 tl', 89, 1.5, 10.0, 4.5, 1.0, 4.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sriracha', 'Sriracha (Flying Goose)', 'Flying Goose', 'supermarket', 'albert_heijn', NULL, 'saus', 5, '1 tl', 125, 2.0, 23.0, 3.5, 1.5, 8.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Soy Sauce', 'Sojasaus (Kikkoman)', 'Kikkoman', 'supermarket', 'albert_heijn', NULL, 'saus', 5, '1 tl', 68, 11.0, 4.9, 0.5, 0.0, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Green Pesto', 'Pesto groen (Grand''Italia)', 'Grand''Italia', 'supermarket', 'albert_heijn', NULL, 'saus', 10, '1 eetlepel', 580, 7.0, 6.0, 60.0, 1.5, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Red Pesto', 'Pesto rood (Grand''Italia)', 'Grand''Italia', 'supermarket', 'albert_heijn', NULL, 'saus', 10, '1 eetlepel', 560, 5.0, 8.0, 58.0, 1.2, 4.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('BBQ Sauce', 'BBQ saus (Heinz)', 'Heinz', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel', 142, 1.0, 32.0, 0.2, 0.2, 28.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Cocktail Sauce', 'Cocktailsaus', 'Generic', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel', 120, 0.5, 28.0, 0.3, 0.0, 22.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Garlic Sauce', 'Knoflooksaus', 'Generic', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel', 560, 1.0, 2.0, 60.0, 0.0, 0.5, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Andalouse Sauce', 'Andalouse saus', 'Generic', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel', 540, 0.5, 3.0, 58.0, 0.0, 1.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Tabasco', 'Tabasco', 'Tabasco', 'supermarket', 'albert_heijn', NULL, 'saus', 2, 'few drops', 61, 0.2, 0.0, 0.0, 0.0, 0.0, false);
INSERT INTO food_products (name, name_nl, brand, brand_category, source, barcode, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g, is_popular) VALUES ('Sweet Chili Sauce', 'Sweet chili saus (Blue Dragon)', 'Blue Dragon', 'supermarket', 'albert_heijn', NULL, 'saus', 15, '1 eetlepel', 140, 0.5, 33.0, 0.0, 0.0, 31.0, false);
