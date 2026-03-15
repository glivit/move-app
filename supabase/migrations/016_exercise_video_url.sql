-- Add video_url column to exercises table
-- Supports YouTube, Vimeo, or direct video URLs for exercise demonstrations

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN exercises.video_url IS 'URL to exercise demonstration video (YouTube, Vimeo, or direct video URL)';
