-- ============================================================
-- MŌVE Coaching App — Complete Supabase Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends Supabase Auth users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('coach', 'client')) DEFAULT 'client',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  package TEXT CHECK (package IN ('essential', 'performance', 'elite')),
  start_date DATE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'trialing')),
  goals TEXT,
  medical_notes TEXT,
  intake_completed BOOLEAN DEFAULT FALSE,
  coach_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. CHECK-INS (monthly progress tracking)
-- ============================================================
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Body composition
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,1),
  muscle_mass_kg NUMERIC(5,2),
  visceral_fat_level INTEGER,
  body_water_pct NUMERIC(4,1),
  bmi NUMERIC(4,1),
  -- Tape measurements (cm)
  chest_cm NUMERIC(5,1),
  waist_cm NUMERIC(5,1),
  hips_cm NUMERIC(5,1),
  left_arm_cm NUMERIC(5,1),
  right_arm_cm NUMERIC(5,1),
  left_thigh_cm NUMERIC(5,1),
  right_thigh_cm NUMERIC(5,1),
  left_calf_cm NUMERIC(5,1),
  right_calf_cm NUMERIC(5,1),
  -- Progress photos (Supabase Storage URLs)
  photo_front_url TEXT,
  photo_back_url TEXT,
  photo_left_url TEXT,
  photo_right_url TEXT,
  -- Coach review
  coach_notes TEXT,
  coach_reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkins_client ON checkins(client_id);
CREATE INDEX idx_checkins_date ON checkins(date DESC);

-- ============================================================
-- 3. MESSAGES (coach ↔ client messaging)
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file')),
  file_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ============================================================
-- 4. PROMPTS (weekly check-in questions from coach)
-- ============================================================
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('weekly_1', 'weekly_2', 'custom')),
  is_active BOOLEAN DEFAULT TRUE,
  send_day INTEGER NOT NULL CHECK (send_day BETWEEN 0 AND 6), -- 0=Sunday
  send_time TIME NOT NULL DEFAULT '09:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PROMPT RESPONSES
-- ============================================================
CREATE TABLE prompt_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  energy_score INTEGER CHECK (energy_score BETWEEN 1 AND 10),
  sleep_score INTEGER CHECK (sleep_score BETWEEN 1 AND 10),
  coach_seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_responses_client ON prompt_responses(client_id);
CREATE INDEX idx_prompt_responses_prompt ON prompt_responses(prompt_id);

-- ============================================================
-- 6. VIDEO SESSIONS (Daily.co calls)
-- ============================================================
CREATE TABLE video_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  daily_room_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_sessions_client ON video_sessions(client_id);
CREATE INDEX idx_video_sessions_scheduled ON video_sessions(scheduled_at);

-- ============================================================
-- 7. PROGRAMS (workout programs)
-- ============================================================
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  hevy_program_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  coach_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_programs_client ON programs(client_id);

-- ============================================================
-- 8. MEAL PLANS
-- ============================================================
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content JSONB,
  pdf_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_plans_client ON meal_plans(client_id);

-- ============================================================
-- 9. RESOURCES (coach library)
-- ============================================================
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('video', 'pdf', 'article', 'tip')),
  content_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  visible_to TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. BROADCASTS (coach → multiple clients)
-- ============================================================
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_clients UUID[] DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. INTAKE FORMS (onboarding)
-- ============================================================
CREATE TABLE intake_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  primary_goal TEXT,
  secondary_goals TEXT[],
  training_experience TEXT,
  injuries_limitations TEXT,
  current_activity_level TEXT,
  preferred_training_days TEXT[],
  dietary_preferences TEXT,
  dietary_restrictions TEXT,
  sleep_hours_avg NUMERIC(3,1),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  motivation_statement TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intake_forms_client ON intake_forms(client_id);

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- ============================================================
-- 13. REPORTS (generated PDFs)
-- ============================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES checkins(id),
  title TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_client ON reports(client_id);

-- ============================================================
-- 14. FEEDBACK (user feedback widget)
-- ============================================================
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. CRON LOGS (optional, for tracking cron executions)
-- ============================================================
CREATE TABLE cron_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  details JSONB,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES: users can read own profile, coach can read all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Coach can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Coach can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coach can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    OR auth.uid() = id
  );

-- CHECKINS: clients own theirs, coach sees all
CREATE POLICY "Clients can view own checkins"
  ON checkins FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coach can view all checkins"
  ON checkins FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Clients can insert own checkins"
  ON checkins FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coach can update any checkin"
  ON checkins FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- MESSAGES: participants can see their messages
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Receiver can mark as read"
  ON messages FOR UPDATE
  USING (receiver_id = auth.uid());

-- PROMPTS: coach manages, all can read active
CREATE POLICY "Anyone can view active prompts"
  ON prompts FOR SELECT
  USING (is_active = TRUE OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Coach can manage prompts"
  ON prompts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- PROMPT RESPONSES: clients own theirs, coach sees all
CREATE POLICY "Clients can view own responses"
  ON prompt_responses FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coach can view all responses"
  ON prompt_responses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Clients can submit responses"
  ON prompt_responses FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Coach can update responses"
  ON prompt_responses FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- VIDEO SESSIONS: participants can see their sessions
CREATE POLICY "Clients can view own sessions"
  ON video_sessions FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coach can manage all sessions"
  ON video_sessions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- PROGRAMS: clients see theirs, coach manages all
CREATE POLICY "Clients can view own programs"
  ON programs FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coach can manage all programs"
  ON programs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- MEAL PLANS: clients see theirs, coach manages all
CREATE POLICY "Clients can view own meal plans"
  ON meal_plans FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coach can manage all meal plans"
  ON meal_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- RESOURCES: published visible to all, coach manages
CREATE POLICY "Anyone can view published resources"
  ON resources FOR SELECT
  USING (published = TRUE OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Coach can manage resources"
  ON resources FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- BROADCASTS: coach manages
CREATE POLICY "Coach can manage broadcasts"
  ON broadcasts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- INTAKE FORMS: clients own theirs, coach sees all
CREATE POLICY "Clients can manage own intake"
  ON intake_forms FOR ALL
  USING (client_id = auth.uid());

CREATE POLICY "Coach can view all intakes"
  ON intake_forms FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- NOTIFICATIONS: users see their own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- REPORTS: clients see their own, coach sees all
CREATE POLICY "Clients can view own reports"
  ON reports FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Coach can manage all reports"
  ON reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- FEEDBACK: users can submit, coach can view all
CREATE POLICY "Users can submit feedback"
  ON feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coach can view all feedback"
  ON feedback FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );

-- CRON LOGS: service role only (no user access needed)
CREATE POLICY "Service role only for cron logs"
  ON cron_logs FOR ALL
  USING (FALSE);

-- ============================================================
-- 17. SUPABASE STORAGE BUCKETS
-- ============================================================
-- Run these separately in Supabase Storage settings or via SQL:

INSERT INTO storage.buckets (id, name, public) VALUES ('checkin-photos', 'checkin-photos', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies
CREATE POLICY "Clients can upload own checkin photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'checkin-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own checkin photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'checkin-photos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  ));

CREATE POLICY "Anyone can view public resources"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resources');

CREATE POLICY "Coach can upload resources"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resources' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));

CREATE POLICY "Users can view own reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  ));

CREATE POLICY "Anyone can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- ============================================================
-- 18. REALTIME (enable for messaging)
-- ============================================================
-- In Supabase Dashboard: Database > Replication > Enable for:
-- - messages
-- - notifications
-- - prompt_responses

-- Done! Your MŌVE database is ready.
