-- Migration: Add equipment_brand column to exercises table
-- Allows filtering exercises by equipment manufacturer (e.g., 'Technogym', 'Matrix')

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment_brand TEXT;

-- Index for fast filtering by brand
CREATE INDEX IF NOT EXISTS idx_exercises_equipment_brand ON exercises(equipment_brand) WHERE equipment_brand IS NOT NULL;

-- Comment
COMMENT ON COLUMN exercises.equipment_brand IS 'Equipment manufacturer, e.g. Technogym, Matrix, Life Fitness. NULL = generic/unbranded exercise.';
