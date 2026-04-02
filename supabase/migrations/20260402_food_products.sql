-- Supabase migration: Create food_products table with seed data
-- Created: 2026-04-02

-- Create table
CREATE TABLE IF NOT EXISTS food_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_nl TEXT,
  brand TEXT,
  brand_category TEXT, -- 'supermarket', 'sports_nutrition', 'supplement'
  source TEXT, -- 'albert_heijn', 'upfront_nutrition', 'esn', 'manual'
  barcode TEXT,
  category TEXT, -- 'vlees', 'zuivel', 'granen', 'groenten', 'fruit', 'noten', 'dranken', 'supplement', 'snack', 'brood', 'vis', 'eieren', 'olie_vet', 'saus'
  serving_size_g NUMERIC(8,1),
  serving_label TEXT, -- e.g., '1 plak', '1 portie', '1 scoop'
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

-- Create indexes for fast search
CREATE INDEX idx_food_products_name ON food_products USING gin(to_tsvector('dutch', name));
CREATE INDEX idx_food_products_brand ON food_products(brand);
CREATE INDEX idx_food_products_category ON food_products(category);
CREATE INDEX idx_food_products_source ON food_products(source);
CREATE INDEX idx_food_products_barcode ON food_products(barcode);
CREATE INDEX idx_food_products_popular ON food_products(is_popular) WHERE is_popular = TRUE;

-- Enable RLS
ALTER TABLE food_products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can SELECT
CREATE POLICY "Everyone can select food products"
  ON food_products
  FOR SELECT
  USING (true);

-- RLS Policy: Coaches can INSERT
CREATE POLICY "Coaches can insert food products"
  ON food_products
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'coach' OR auth.jwt() ->> 'role' = 'admin');

-- RLS Policy: Coaches can UPDATE
CREATE POLICY "Coaches can update food products"
  ON food_products
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'coach' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'coach' OR auth.jwt() ->> 'role' = 'admin');

-- Seed data: Albert Heijn - Vlees & Vis
INSERT INTO food_products (name, brand, brand_category, source, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_popular) VALUES
('Kipfilet', 'AH', 'supermarket', 'albert_heijn', 'vlees', 165, 31, 0, 3.6, true),
('Kippendij', 'AH', 'supermarket', 'albert_heijn', 'vlees', 177, 17.5, 0, 12, false),
('Kipgehakt', 'AH', 'supermarket', 'albert_heijn', 'vlees', 143, 18, 0, 7.5, false),
('Rundergehakt mager', 'AH', 'supermarket', 'albert_heijn', 'vlees', 157, 21, 0, 8, true),
('Biefstuk', 'AH', 'supermarket', 'albert_heijn', 'vlees', 131, 21, 0, 5, false),
('Varkenshaas', 'AH', 'supermarket', 'albert_heijn', 'vlees', 105, 22, 0, 2, true),
('Zalm', 'AH', 'supermarket', 'albert_heijn', 'vis', 208, 20, 0, 14, true),
('Tonijn in water', 'AH', 'supermarket', 'albert_heijn', 'vis', 109, 25, 0, 1, true),
('Garnalen', 'AH', 'supermarket', 'albert_heijn', 'vis', 71, 14, 1, 1, false),
('Tilapia', 'AH', 'supermarket', 'albert_heijn', 'vis', 96, 20, 0, 2, false),
('Gerookte zalm', 'AH', 'supermarket', 'albert_heijn', 'vis', 200, 23, 0, 12, false);

-- Seed data: Albert Heijn - Zuivel
INSERT INTO food_products (name, brand, brand_category, source, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_popular) VALUES
('Griekse yoghurt 0%', 'AH', 'supermarket', 'albert_heijn', 'zuivel', 100, '100g', 57, 10, 4, 0, true),
('Griekse yoghurt 10%', 'AH', 'supermarket', 'albert_heijn', 'zuivel', 100, '100g', 130, 5, 4, 10, false),
('Kwark mager', 'AH', 'supermarket', 'albert_heijn', 'zuivel', 100, '100g', 48, 8, 4, 0.1, false),
('Cottage cheese', 'AH', 'supermarket', 'albert_heijn', 'zuivel', 100, '100g', 92, 12, 3, 3.5, false),
('Melk halfvol', 'AH', 'supermarket', 'albert_heijn', 'zuivel', 100, '100ml', 47, 3.5, 4.8, 1.5, true),
('Eieren', 'AH', 'supermarket', 'albert_heijn', 'eieren', 100, '1 ei ~50g', 155, 13, 1.1, 11, true),
('Mozzarella', 'AH', 'supermarket', 'albert_heijn', 'zuivel', 100, '100g', 280, 18, 1, 22, false),
('Parmezaan', 'AH', 'supermarket', 'albert_heijn', 'zuivel', 100, '1 portie 30g', 392, 33, 0, 29, false),
('Hüttenkäse', 'AH', 'supermarket', 'albert_heijn', 'zuivel', 100, '100g', 92, 12, 2.5, 3.5, false),
('Skyr', 'AH', 'supermarket', 'albert_heijn', 'zuivel', 100, '100g', 63, 11, 4, 0.2, false);

-- Seed data: Albert Heijn - Granen & Brood
INSERT INTO food_products (name, brand, brand_category, source, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_popular) VALUES
('Witte rijst (droog)', 'AH', 'supermarket', 'albert_heijn', 'granen', 100, '100g droog', 360, 7, 78, 1, true),
('Bruine rijst (droog)', 'AH', 'supermarket', 'albert_heijn', 'granen', 100, '100g droog', 353, 7.5, 74, 2.5, false),
('Havermout', 'AH', 'supermarket', 'albert_heijn', 'granen', 100, '100g droog', 372, 13, 58, 7, true),
('Volkoren brood', 'AH', 'supermarket', 'albert_heijn', 'brood', 35, '1 plak', 86.45, 3.5, 14.35, 1.225, true),
('Wit brood', 'AH', 'supermarket', 'albert_heijn', 'brood', 30, '1 plak', 79.5, 2.4, 14.7, 0.9, true),
('Volkoren pasta (droog)', 'AH', 'supermarket', 'albert_heijn', 'granen', 100, '100g droog', 348, 13, 62, 2.5, false),
('Witte pasta (droog)', 'AH', 'supermarket', 'albert_heijn', 'granen', 100, '100g droog', 357, 12, 71, 1.5, false),
('Wraps volkoren', 'AH', 'supermarket', 'albert_heijn', 'brood', 60, '1 wrap', 174, 4.8, 26.4, 4.8, false),
('Couscous (droog)', 'AH', 'supermarket', 'albert_heijn', 'granen', 100, '100g droog', 355, 12, 72, 1, false),
('Quinoa (droog)', 'AH', 'supermarket', 'albert_heijn', 'granen', 100, '100g droog', 368, 14, 64, 6, false),
('Cruesli naturel', 'AH', 'supermarket', 'albert_heijn', 'granen', 100, '100g', 435, 9, 60, 17, false);

-- Seed data: Albert Heijn - Groenten & Fruit
INSERT INTO food_products (name, brand, brand_category, source, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_popular) VALUES
('Broccoli', 'AH', 'supermarket', 'albert_heijn', 'groenten', 34, 2.8, 7, 0.4, true),
('Sperziebonen', 'AH', 'supermarket', 'albert_heijn', 'groenten', 31, 1.8, 7, 0.1, false),
('Spinazie', 'AH', 'supermarket', 'albert_heijn', 'groenten', 23, 2.9, 3.6, 0.4, false),
('Tomaat', 'AH', 'supermarket', 'albert_heijn', 'groenten', 18, 0.9, 3.9, 0.2, true),
('Komkommer', 'AH', 'supermarket', 'albert_heijn', 'groenten', 15, 0.7, 3.6, 0.1, false),
('Paprika rood', 'AH', 'supermarket', 'albert_heijn', 'groenten', 31, 1, 6, 0.3, false),
('Banaan', 'AH', 'supermarket', 'albert_heijn', 'fruit', 89, 1.1, 23, 0.3, true),
('Appel', 'AH', 'supermarket', 'albert_heijn', 'fruit', 52, 0.3, 14, 0.2, true),
('Avocado', 'AH', 'supermarket', 'albert_heijn', 'fruit', 160, 2, 9, 15, false),
('Zoete aardappel', 'AH', 'supermarket', 'albert_heijn', 'groenten', 86, 1.6, 20, 0.1, false),
('Aardappelen', 'AH', 'supermarket', 'albert_heijn', 'groenten', 77, 2, 17, 0.1, true);

-- Seed data: Albert Heijn - Noten & Zaden
INSERT INTO food_products (name, brand, brand_category, source, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_popular) VALUES
('Amandelen', 'AH', 'supermarket', 'albert_heijn', 'noten', 30, '30g portie', 575, 21, 22, 49, false),
('Walnoten', 'AH', 'supermarket', 'albert_heijn', 'noten', 30, '30g portie', 654, 15, 14, 65, false),
('Pindakaas (naturel)', 'AH', 'supermarket', 'albert_heijn', 'noten', 32, '2 eetlepels', 588, 25, 20, 50, true),
('Cashewnoten', 'AH', 'supermarket', 'albert_heijn', 'noten', 30, '30g portie', 553, 18, 30, 44, false),
('Lijnzaad', 'AH', 'supermarket', 'albert_heijn', 'noten', 15, '1 eetlepel', 534, 18, 29, 42, false);

-- Seed data: Albert Heijn - Overig
INSERT INTO food_products (name, brand, brand_category, source, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g) VALUES
('Olijfolie', 'AH', 'supermarket', 'albert_heijn', 'olie_vet', 15, '1 eetlepel', 884, 0, 0, 100),
('Kokosolie', 'AH', 'supermarket', 'albert_heijn', 'olie_vet', 15, '1 eetlepel', 862, 0, 0, 100),
('Honing', 'AH', 'supermarket', 'albert_heijn', 'snack', 20, '1 eetlepel', 304, 0.3, 82, 0);

-- Seed data: Upfront Nutrition - Bars & Meals
INSERT INTO food_products (name, brand, brand_category, source, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g) VALUES
('Protein Bar Chocolate', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'snack', 60, '1 bar', 583.33, 50, 50, 20),
('Protein Bar Cookie Dough', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'snack', 60, '1 bar', 575, 50, 46.67, 21.67),
('Protein Bar Caramel', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'snack', 60, '1 bar', 580, 50, 48.33, 20),
('High Protein Maaltijd Kip Rijst', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'snack', 100, '100g', 130, 15, 12, 3),
('High Protein Maaltijd Pasta Bolognese', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'snack', 100, '100g', 125, 14, 11, 3),
('Protein Pudding Vanilla', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'snack', 100, '100g', 88, 13, 5, 1.5),
('Protein Pudding Chocolate', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'snack', 100, '100g', 90, 13, 6, 1.5),
('Protein Shake Vanilla', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'dranken', 100, '100ml', 60, 10, 3, 0.5),
('Protein Shake Chocolate', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'dranken', 100, '100ml', 62, 10, 3.5, 0.5),
('Protein Pancake Mix', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'granen', 100, '100g droog', 365, 45, 30, 5),
('Protein Cookie', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'snack', 50, '1 cookie', 380, 40, 36, 10),
('Protein Muesli', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'granen', 100, '100g', 370, 30, 42, 8),
('Zero Sauce', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'saus', 100, '100ml', 5, 0, 1, 0),
('Protein Chips BBQ', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'snack', 100, '100g', 380, 40, 32, 8),
('Protein Wrap', 'Upfront Nutrition', 'sports_nutrition', 'upfront_nutrition', 'brood', 65, '1 wrap', 246.15, 30.77, 21.54, 4.62);

-- Seed data: ESN - Protein Powders & Bars
INSERT INTO food_products (name, brand, brand_category, source, category, serving_size_g, serving_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g) VALUES
('Designer Whey Vanilla', 'ESN', 'sports_nutrition', 'esn', 'dranken', 100, '100g droog', 375, 78, 5, 5),
('Designer Whey Chocolate', 'ESN', 'sports_nutrition', 'esn', 'dranken', 100, '100g droog', 378, 77, 6, 5.5),
('Designer Whey Strawberry', 'ESN', 'sports_nutrition', 'esn', 'dranken', 100, '100g droog', 374, 78, 5, 4.5),
('Isoclear Whey Isolate Green Apple', 'ESN', 'sports_nutrition', 'esn', 'dranken', 100, '100g droog', 385, 90, 2, 0.5),
('Isoclear Whey Isolate Lemon', 'ESN', 'sports_nutrition', 'esn', 'dranken', 100, '100g droog', 383, 90, 2, 0.5),
('Designer Bar Chocolate', 'ESN', 'sports_nutrition', 'esn', 'snack', 45, '1 bar', 355.56, 35.56, 35.56, 8.89),
('Designer Bar Coconut', 'ESN', 'sports_nutrition', 'esn', 'snack', 45, '1 bar', 351.11, 33.33, 37.78, 8.89),
('Flexpresso Coffee Protein', 'ESN', 'sports_nutrition', 'esn', 'dranken', 100, '100ml', 38, 6, 2, 0.5),
('Protein Cream Hazelnut', 'ESN', 'sports_nutrition', 'esn', 'snack', 100, '100g', 470, 22, 35, 28),
('Crank Pump Pre-Workout', 'ESN', 'sports_nutrition', 'esn', 'supplement', 12, '1 scoop', 125, 0, 25, 0),
('Creatine Monohydrate', 'ESN', 'sports_nutrition', 'esn', 'supplement', 5, '5g', 0, 0, 0, 0),
('Ashwagandha', 'ESN', 'sports_nutrition', 'esn', 'supplement', 1, '1 capsule', 0, 0, 0, 0),
('Omega-3', 'ESN', 'sports_nutrition', 'esn', 'supplement', 1, '1 capsule', 9, 0, 0, 1),
('Vitamin D3+K2', 'ESN', 'sports_nutrition', 'esn', 'supplement', 1, '1 druppel', 0, 0, 0, 0),
('Magnesium', 'ESN', 'sports_nutrition', 'esn', 'supplement', 1, '1 capsule', 0, 0, 0, 0);
