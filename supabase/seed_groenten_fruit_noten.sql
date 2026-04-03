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
