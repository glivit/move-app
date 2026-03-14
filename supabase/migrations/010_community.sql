-- ============================================================
-- MŌVE Migration 010: Community / Group Chat
-- Adds: community posts with likes and comments
-- ============================================================

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'update' CHECK (post_type IN ('update', 'motivation', 'tip', 'achievement', 'question')),
  image_url TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_date ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON community_posts(is_pinned DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id, created_at);

-- RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can view posts
CREATE POLICY "All users can view posts" ON community_posts FOR SELECT USING (true);

-- Coach can create/edit/delete any post, clients can only create
CREATE POLICY "Coach can manage all posts" ON community_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Users can create posts" ON community_posts FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete own posts" ON community_posts FOR DELETE
  USING (author_id = auth.uid());

-- Likes
CREATE POLICY "All users can view likes" ON community_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON community_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own likes" ON community_likes FOR DELETE USING (user_id = auth.uid());

-- Comments
CREATE POLICY "All users can view comments" ON community_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON community_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON community_comments FOR DELETE USING (author_id = auth.uid());
CREATE POLICY "Coach can delete any comment" ON community_comments FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
