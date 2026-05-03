-- ════════════════════════════════════════════════════════════════════
-- dev_feedback — In-app developer feedback widget storage
--
-- Workflow:
--   1. User klikt floating ⚙ bottom-right
--   2. Klikt element op pagina → element_selector + bbox + html captured
--   3. Vult comment + severity in
--   4. Submit → row hier
--   5. Claude Code leest open items via `npx tsx scripts/feedback-inbox.ts`
--      en implementeert fixes; markeert status='resolved'
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dev_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Page context
  url TEXT NOT NULL,
  viewport_width INTEGER,
  viewport_height INTEGER,
  user_agent TEXT,

  -- Element context (optional — null als geen element geselecteerd)
  element_selector TEXT,        -- CSS path (e.g. "div.v6-card > button.ex-kebab")
  element_html TEXT,            -- outerHTML snippet (max 2KB)
  element_text TEXT,            -- textContent (max 200 chars)
  element_bbox JSONB,           -- { x, y, width, height }
  element_styles JSONB,         -- key computed styles (color, bg, font)

  -- User input
  comment TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('blocker', 'major', 'minor', 'nit')),
  category TEXT
    CHECK (category IN ('visual', 'interaction', 'copy', 'performance', 'a11y', 'other') OR category IS NULL),

  -- Optional screenshot — Supabase storage URL (bucket: 'feedback-screenshots')
  screenshot_url TEXT,

  -- Resolution tracking
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'wontfix', 'duplicate')),
  resolved_at TIMESTAMPTZ,
  resolved_commit TEXT,
  resolved_notes TEXT
);

CREATE INDEX idx_dev_feedback_status ON dev_feedback(status, created_at DESC);
CREATE INDEX idx_dev_feedback_user ON dev_feedback(user_id, created_at DESC);

-- RLS — alle authenticated users kunnen INSERT, maar enkel de submitter
-- of een coach/admin kan READ/UPDATE.
ALTER TABLE dev_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_feedback"
  ON dev_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_feedback"
  ON dev_feedback FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

CREATE POLICY "coaches_update_feedback"
  ON dev_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin'))
  );

-- Service role bypasses RLS en kan alle rows lezen/updaten — voor de
-- Claude-side inbox CLI.
COMMENT ON TABLE dev_feedback IS 'In-app feedback widget storage. Read by Claude Code via scripts/feedback-inbox.ts';
