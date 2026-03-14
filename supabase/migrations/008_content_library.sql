-- ============================================================
-- MŌVE Migration 008: Content Library 2.0
-- Adds: content types, video support, exercise videos, read tracking
-- ============================================================

-- Upgrade resources table with content types and video support
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'article'
    CHECK (content_type IN ('article', 'video', 'pdf', 'infographic')),
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add video_url to exercises for form demos
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_thumbnail TEXT;

-- Track which resources clients have read/viewed
CREATE TABLE IF NOT EXISTS resource_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_views_user ON resource_views(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_resource ON resource_views(resource_id);

-- RLS for resource_views
ALTER TABLE resource_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own views"
  ON resource_views FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Coach can view all resource views"
  ON resource_views FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
